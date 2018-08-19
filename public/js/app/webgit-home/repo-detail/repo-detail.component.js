// TODO: Handle error codes.
(function () {
    var repoDetailModule = angular.module('RepoDetailModule', ['ngRoute']);
    var repoName = null;

    var $sce = null;

    var logGraphDefaults = {
        lineWidth: 2,
        commitRadius: 5,
        distanceBetweenBranches: 20,
        commitBorderWidth: 2,
        commitBorderColor: '#000000',
        connectionWidth: 2,
        colors: ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3']       // colors of the rainbow :)
    };

    repoDetailModule
        .component('repoDetail', {
            templateUrl: '/js/app/webgit-home/repo-detail/repo-detail.html',
            controller: ['$routeParams', 'repoDetailService', '$sce', '$scope', '$filter', 'UtilsService', '$timeout', 'gitfunctions', '$responseModal', '$confirmationModal',
                function RepoDetailController($routeParams, repoDetailService, $sceLocal, $scope, $filter, UtilsService, $timeout, gitfunctions, $responseModal, $confirmationModal) {
                    $sce = $sceLocal;
                    repoName = encodeURIComponent(decodeURIComponent($routeParams.repoName));

                    this.repoName = repoName;

                    var vm = this;

                    vm.repoDetailService = repoDetailService;

                    var $mainLogContainer = $('#main-log-container');
                    var $mainLogLoadingIndicator = $('#main-log-loading-indicator');

                    vm.modals = {
                        commit: null,
                        push: null,
                        stash: null,
                        cherrypick: null,
                        conflict: null,
                        pull: null,
                        newBranch: null,
                        deleteLocalBranch: null
                    };

                    vm.selectedCommit = null;
                    vm.modifiedFileNames = [];

                    vm.parseLocalStatus = parseLocalStatus;
                    vm.parseDiff = parseDiff;
                    vm.selectCommit = selectCommit;
                    vm.selectFileInLog = selectFileInLog;
                    vm.refreshLocalChanges = refreshLocalChanges;
                    vm.showCommitDialog = showCommitDialog;
                    vm.showPullDialog = showPullDialog;
                    vm.showStashDialog = showStashDialog;
                    vm.showModalToHandleConflict = showModalToHandleConflict;
                    
                    vm.mainSearch = mainSearch;
                    vm.filterOutTempCommits = filterOutTempCommits;
                    vm.refreshLog = refreshLog;
                    vm.onPush = onPush;
                    vm.showPushDialog = showPushDialog;

                    vm.commitMessage = '';
                    vm.remote = null;
                    vm.remoteBranches = [];
                    vm.currentLocalBranch = null;
                    vm.localBranches = [];
                    

                    vm.commitMap = {};

                    vm.diffOnConflictModal = null;

                    var commitsBackup = null;
                    var commitMapBackup = null;
                    var graphBackup = null;

                    $scope.$on('logNgRepeatFinished', function (ngRepeatFinishedEvent) {
                        loadGraph();
                        backupGraph();
                    });

                    $scope.$on('windowfocus', function () {
                        if ((vm.modals.commit.data('bs.modal') || {})._isShown) {
                            // do not refresh when the modal window is open. use the refresh button instead.
                            return;
                        }
                        vm.refreshLocalChanges();
                    });

                    initializeRemote();
                    refreshLog();
                    vm.refreshLocalChanges();

                    bindLazyLoadingCommits();
                    initLogContextMenu();

                    $('[data-toggle="popover"]').popover();

                    // TODO: comment out this.
                    window.vm = vm;

                    return;

                    function onPush() {
                        initializeRemote();
                    }

                    function filterOutTempCommits(hash) {
                        return !vm.commitMap[hash].isTemp;
                    }

                    function mainSearch() {
                        var searchText = vm.mainSearchInp;

                        if (typeof searchText == 'undefined' || searchText.length == 0 || (searchText = searchText.trim()).length == 0) {
                            restoreCommits();
                            return;
                        }

                        clearGraph();

                        return repoDetailService.searchForText(searchText).then(function (commits) {
                            vm.commitDetails = null;
                            parseCommits(commits);
                            vm.commits = commits;
                            vm.hashes = vm.commits.map(function(c) { return c.hash; });
                            resetCommitMap();
                            return vm.commits;
                        });
                    }

                    /**
                     * Stores commits in `commitsBackup` and `commitMapBackup`. Restore using `restoreCommits`
                    */
                    function backupCommits() {
                        commitsBackup = vm.commits;
                        commitMapBackup = vm.commitMap;
                    }

                    /**
                     * Restores commits backed up using `backupCommits`
                     */
                    function restoreCommits() {
                        vm.commits = commitsBackup;
                        vm.commitMap = commitMapBackup;
                        vm.hashes = vm.commits.map(function(c) { return c.hash; });
                        $timeout(restoreGraph);
                    }

                    function backupGraph() {
                        var canvas = document.getElementById('log-graph');

                        graphBackup = null;
                        graphBackup = new Image();
                        graphBackup.src = canvas.toDataURL("image/png");
                    }

                    function restoreGraph() {
                        var canvas = document.getElementById('log-graph');
                        canvas.width = graphBackup.width;
                        canvas.height = graphBackup.height;

                        var varWidth = canvas.width.toString() + 'px';
                        var ctx = canvas.getContext('2d');

                        $('#graph-container').css('flex', '0 0 ' + varWidth);
                        $('#log-rows-container').css('width', 'calc(100% - ' + varWidth + ')');

                        ctx.drawImage(graphBackup, 0, 0);
                    }

                    function clearGraph() {
                        var canvas = document.getElementById('log-graph');
                        if (!canvas) {
                            return;
                        }
                        var ctx = canvas.getContext('2d');

                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        canvas.width = 0;
                        canvas.height = 0;
                    }

                    function showModalToHandleConflict() {
                        vm.modals.conflict.modal('show');
                    }

                    function initLogContextMenu() {
                        $('#main-log-container').on('contextmenu', '.commit', function () {
                            // I could've put the following line inside the build block below, but I wanna keep it as clean as possible.
                            vm.selectCommit($(this).data('commitHash'));
                        });
                        $.contextMenu({
                            // define which elements trigger this menu
                            selector: "#main-log-container .commit",
                            build: function ($trigger, e) {
                                var commitHash = $trigger.data('commitHash');
                                var commit = vm.commitMap[commitHash];
                                var hasLocalBranches = commit && commit.localBranches && commit.localBranches.length > 0;
                                var hasRemoteBranches = commit && commit.remoteBranches && commit.remoteBranches.length > 0;
                                
                                var options = {
                                    items: {
                                        createNewBranch: {
                                            name: 'Create new branch',
                                            callback: function (key, opt, rootMenu, originalEvent) {
                                                showNewBranchModal(commitHash);
                                            }
                                        },
                                        checkoutBranch: {
                                            name: 'Checkout branch',
                                            disabled: !hasLocalBranches && !hasRemoteBranches
                                        },
                                        rebaseBranchOn: {
                                            name: 'Rebase current branch on',
                                            items: {}
                                        },
                                        mergeIntoCurrent: {
                                            name: 'Merge into current branch',
                                            items: {}
                                        },
                                        cherrypick: {
                                            name: 'Cherry pick commit',
                                            callback: function() {
                                                showCherrypickModal(commitHash);
                                            }
                                        },
                                        deleteLocalBranch: {
                                            name: 'Delete local branch',
                                            items: {}
                                        }
                                    }
                                };

                                var rebaseOptions = [];

                                if (hasLocalBranches) {
                                    options.items.checkoutBranch.items = {};

                                    for (var i = 0; i < commit.localBranches.length; i++) {
                                        options.items.checkoutBranch.items[commit.localBranches[i]] = {
                                            name: commit.localBranches[i],
                                            callback: checkoutLocalBranch
                                        };

                                        options.items.mergeIntoCurrent.items[commit.localBranches[i]] = {
                                            name: commit.localBranches[i],
                                            callback: mergeLocalBranch
                                        };

                                        options.items.deleteLocalBranch.items[commit.localBranches[i]] = {
                                            name: commit.localBranches[i],
                                            callback: deleteLocalBranch
                                        }
                                    }
                                }

                                if(hasRemoteBranches) {
                                    options.items.checkoutBranch.items = options.items.checkoutBranch.items || {};

                                    for(var i = 0; i < commit.remoteBranches.length; i++) {
                                        options.items.checkoutBranch.items[commit.remoteBranches[i]] = {
                                            name: commit.remoteBranches[i],
                                            callback: checkoutRemoteBranch
                                        };
                                    }
                                }



                                // rebase options - start
                                if (hasLocalBranches || (commit.remoteBranches && commit.remoteBranches.length > 0)) {
                                    Array.prototype.push.apply(rebaseOptions, commit.localBranches);
                                    Array.prototype.push.apply(rebaseOptions, commit.remoteBranches);
                                }
                                else {
                                    rebaseOptions.push(commit.hash);
                                }

                                for (var i = 0; i < rebaseOptions.length; i++) {
                                    options.items.rebaseBranchOn.items[rebaseOptions[i]] = {
                                        name: rebaseOptions[i],
                                        callback: rebaseCurrentBranchOn
                                    };
                                }
                                // rebase options - end

                                return options;
                            }
                        });
                    }

                    function deleteLocalBranch(branchName) {
                        vm.modals.deleteLocalBranch.modal('show');
                        vm.localBranchToDelete = branchName;

                        $scope.$apply();                        // again guilty :( as this is a non angular event.
                    }

                    function showCherrypickModal(hash) {
                        vm.cherrypickHash = hash;
                        vm.modals.cherrypick.modal('show');
                        $scope.$apply();                        // guilty :( have to do this as this is a non angular event.
                    }

                    function mergeLocalBranch(branchName) {
                        $responseModal.title('Merging');
                        $responseModal.show();
                        return repoDetailService.mergeIntoCurrent(branchName).then(function (d) {
                            if(d.errorCode) {
                                $responseModal.bodyHtml(d.errors.join('\n').trim().replace('\n', '<br />'));
                            }
                            else {
                                $responseModal.bodyHtml(d.output.join('\n').trim().replace('\n', '<br />'));
                            }
                            refreshLocalChanges();
                            refreshLog();
                        });
                    }

                    function loadGraph() {
                        setGraphInfo();
                        var $graphContainer = $('#graph-container');
                        var $logRowsContainer = $('#log-rows-container');
                        var varWidth = (((vm.maxX + 1) * logGraphDefaults.distanceBetweenBranches) + logGraphDefaults.distanceBetweenBranches).toString() + 'px';
                        $graphContainer.css('flex', '0 0 ' + varWidth);
                        $logRowsContainer.css('width', 'calc(100% - ' + varWidth + ')');
                        // $graphContainer.empty().append('<canvas id="log-graph" height="'+ $graphContainer.height() +'" width="'+ $graphContainer.width() +'"></canvas>');
                        var $canvas = $('#log-graph').attr({
                            width: $graphContainer.width(),
                            height: $graphContainer.height()
                        });

                        var graph = document.getElementById('log-graph');
                        var ctx = graph.getContext("2d");
                        var commits = vm.commits;

                        drawConnections(ctx, commits);
                        drawCommits(ctx, commits);

                    }

                    function drawConnections(ctx, commits) {
                        var getParentFromHash = function (h) {
                            return vm.commitMap[h];
                        },
                            hashes = commits.map(function (c) {
                                return c.hash;
                            });

                        var currCommit = null,
                            parents = null,
                            currParent = null,
                            j = null;

                        var colors = logGraphDefaults.colors;

                        var m = 10,
                            c = 10,
                            y = 40,
                            halfy = y / 2;

                        ctx.lineWidth = logGraphDefaults.connectionWidth;

                        for (var i = 0; i < commits.length; i++) {
                            currCommit = commits[i];

                            for (j = 0; j < currCommit.parentHashes.length; j++) {
                                currParent = vm.commitMap[currCommit.parentHashes[j]];
                                if (!currParent) {
                                    // ideally, this case should'nt ever come because of the temp commits.
                                    continue;
                                }

                                // draw a line from currCommit.x to parent.x
                                if (currParent.x == currCommit.x) {
                                    // draw a straight line.
                                    ctx.beginPath();
                                    ctx.strokeStyle = colors[currParent.x % colors.length];
                                    ctx.moveTo(currCommit.x * logGraphDefaults.distanceBetweenBranches + c, halfy + y * i);
                                    ctx.lineTo(currParent.x * logGraphDefaults.distanceBetweenBranches + c, halfy + y * hashes.indexOf(currParent.hash));
                                    ctx.stroke();
                                }
                                else if (currParent.x > currCommit.x) {
                                    // curve to lane to right, then straight down.
                                    ctx.beginPath();
                                    ctx.strokeStyle = colors[currParent.x % colors.length];
                                    ctx.moveTo(currCommit.x * logGraphDefaults.distanceBetweenBranches + c, halfy + y * i);
                                    ctx.bezierCurveTo(currCommit.x * logGraphDefaults.distanceBetweenBranches + c,
                                        halfy + y * i + y,
                                        currParent.x * logGraphDefaults.distanceBetweenBranches + c,
                                        halfy + y * i,
                                        currParent.x * logGraphDefaults.distanceBetweenBranches + c,
                                        halfy + y * i + y);
                                    ctx.moveTo(currParent.x * logGraphDefaults.distanceBetweenBranches + c, halfy + y * i + y);
                                    ctx.lineTo(currParent.x * logGraphDefaults.distanceBetweenBranches + c, halfy + y * hashes.indexOf(currParent.hash));
                                    ctx.stroke();
                                }
                                else if (currParent.x < currCommit.x) {
                                    ctx.beginPath();
                                    ctx.strokeStyle = colors[currCommit.x % colors.length];
                                    ctx.moveTo(currCommit.x * logGraphDefaults.distanceBetweenBranches + c, halfy + y * i);
                                    ctx.lineTo(currCommit.x * logGraphDefaults.distanceBetweenBranches + c, halfy + y * (hashes.indexOf(currParent.hash) - 1));
                                    ctx.moveTo(currCommit.x * logGraphDefaults.distanceBetweenBranches + c, halfy + y * (hashes.indexOf(currParent.hash) - 1));
                                    ctx.bezierCurveTo(currCommit.x * logGraphDefaults.distanceBetweenBranches + c,
                                        halfy + y * (hashes.indexOf(currParent.hash) - 1) + y,
                                        currParent.x * logGraphDefaults.distanceBetweenBranches + c,
                                        halfy + y * (hashes.indexOf(currParent.hash) - 1),
                                        currParent.x * logGraphDefaults.distanceBetweenBranches + c,
                                        halfy + y * (hashes.indexOf(currParent.hash) - 1) + y);

                                    ctx.stroke();
                                }
                            }
                        }
                    }

                    function drawCommits(ctx, commits) {
                        ctx.lineWidth = logGraphDefaults.commitBorderWidth;
                        ctx.strokeStyle = logGraphDefaults.commitBorderColor;

                        var m = 10,
                            c = 10,
                            y = 40,
                            halfy = y / 2;

                        var currCommit = null;

                        var colors = logGraphDefaults.colors;
                        var PIx2 = 2 * Math.PI;
                        for (var i = 0; i < commits.length; i++) {
                            currCommit = commits[i];

                            ctx.beginPath();
                            ctx.fillStyle = colors[currCommit.x % colors.length];
                            ctx.arc(currCommit.x * logGraphDefaults.distanceBetweenBranches + c, halfy + y * i, logGraphDefaults.commitRadius, 0, PIx2);
                            ctx.fill();
                            ctx.stroke();
                        }
                    }

                    function rebaseCurrentBranchOn(branchNameOrRevision) {
                        $responseModal.title('Rebasing');
                        $responseModal.show();
                        return repoDetailService.rebaseCurrentBranchOn(branchNameOrRevision).then(function (d) {
                            $responseModal.bodyHtml(d.output.join('\n').trim().replace('\n', '<br /><br />'));
                            refreshLocalChanges();
                            refreshLog();
                        });
                    }

                    function checkoutLocalBranch(branchName) {
                        return repoDetailService.checkoutLocalBranch(branchName).then(function (d) {
                            initializeRemote();
                            refreshLog();
                            refreshLocalChanges();
                            $responseModal.title('Checkout Branch');
                            $responseModal.bodyHtml(d.errors.join('\n').trim().replace('\n', '<br />'));
                            $responseModal.show();
                        });
                    }

                    function checkoutRemoteBranch(branchName) {
                        // when checking out a remote branch, if its local counterpart is present, we need to show a warning modal that head of that branch will be reset to its origin head.
                        $confirmationModal.title('Warning!');
                        $confirmationModal.bodyHtml('This will reset local branch with the name "' + branchName.substring('origin/'.length) + '"');
                        var promise = $confirmationModal.show();

                        promise.then(function() {
                            // checkout remote branch.
                            gitfunctions.checkoutRemoteBranch(branchName).then(function(d) {
                                $responseModal.title('Checking out ' + branchName);
                                if(d.errorCode) {
                                    $responseModal.bodyHtml(d.errors.join('\n').trim().replace('\n', '<br />'));
                                }
                                else {
                                    $responseModal.bodyHtml(d.output.join('\n').trim().replace('\n', '<br />'));
                                }
                                $responseModal.show();
                                refreshLog();
                            });
                        }).catch(function() {
                            // do nothing.
                        });
                    }

                    function showNewBranchModal(commitHash) {
                        vm.newBranchAtRevision = commitHash;
                        vm.modals.newBranch.modal('show');

                        $scope.$apply();                        // to populate newBranchAtRevision. guilty :(
                    }

                    

                    

                    function showStashDialog() {
                        // TODO: Show loading dialog.
                        vm.modals.stash.modal('show');
                    }

                    function initializeRemote() {
                        return repoDetailService.initRepo().then(function (d) {
                            vm.remote = d.remote;
                            vm.remoteBranches = d.remoteBranches.slice(1)
                                .map(function (b) {
                                    // remove `origin/` from the branch names.
                                    return b.substring('origin/'.length);
                                });    // first is the reference to origin/HEAD
                            vm.currentLocalBranch = d.currentBranch;
                            vm.localBranches = d.localBranches;

                            // try to determine the default selected  remote branch in the pull dialog
                            if (vm.remoteBranches.indexOf(vm.currentLocalBranch) > -1) {
                                vm.currentRemoteBranch = vm.currentLocalBranch;
                            }
                        });
                    }

                    function showPullDialog() {
                        vm.modals.pull.modal('show');
                    }

                    function bindLazyLoadingCommits() {
                        var lazyLoadingInProgress = false;
                        var noMoreCommits = false;
                        $mainLogContainer.on('scroll', function () {
                            if (lazyLoadingInProgress || noMoreCommits) {
                                return;
                            }
                            if ($mainLogContainer.scrollTop() + $mainLogContainer.innerHeight() + 50 >= $mainLogContainer[0].scrollHeight) {   // start loading before 50px from the bottom.
                                lazyLoadingInProgress = true;
                                // load next batch of commits.
                                var page = +$mainLogContainer.data('pageNum');
                                page++;
                                $mainLogContainer.data('pageNum', page);
                                $mainLogLoadingIndicator.show();
                                getNextBatchOfLog(page).then(function (commits) {
                                    $mainLogLoadingIndicator.hide();
                                    lazyLoadingInProgress = false;

                                    // no commits returned; reached the bottom.
                                    if (commits === false) {
                                        noMoreCommits = true;
                                    }
                                });
                            }
                        });
                    }

                    /**
                     * Refreshes the log from page 1.
                    */
                    function refreshLog() {
                        // 1 below is the page num. 
                        return repoDetailService.getCommits(1).then(function (commits) {
                            if (commits.length == 0) {
                                return false;
                            }
                            parseCommits(commits);
                            vm.commits = commits;
                            vm.hashes = vm.commits.map(function(c) { return c.hash; });
                            resetCommitMap();
                            backupCommits();
                            return vm.commits;
                        });
                    }

                    function getNextBatchOfLog(page) {
                        return repoDetailService.getCommits(page).then(function (commits) {
                            if (commits.length == 0) {
                                return false;
                            }
                            parseCommits(commits);
                            vm.commits = vm.commits || [];
                            vm.hashes = vm.commits.map(function(c) { return c.hash; });

                            resetTempCommits();

                            Array.prototype.push.apply(vm.commits, commits);
                            Array.prototype.push.apply(vm.hashes, commits.map(function(c) { return c.hash }));

                            resetCommitMap();

                            backupCommits();

                            return vm.commits;
                        });
                    }

                    

                    function resetTempCommits() {
                        // remove temp commits from vm.commits as the real commits might have arrived.
                        vm.commitMap = {};
                        vm.commits = vm.commits.filter(function (c) {
                            return !c.isTemp;
                        });
                        vm.hashes = vm.commits.map(function(c) { return c.hash; });
                    }

                    function resetCommitMap() {
                        var createTempCommit = function (hash) {
                            return {
                                children: [],
                                hash: hash,
                                isTemp: true,
                                parentHashes: []
                            };
                        };

                        vm.commitMap = {};
                        for (var i = 0; i < vm.commits.length; i++) {
                            vm.commitMap[vm.commits[i].hash] = vm.commits[i];
                        }

                        for (var i = 0; i < vm.commits.length; i++) {
                            for (var j = 0; j < vm.commits[i].parentHashes.length; j++) {
                                if (!vm.commitMap[vm.commits[i].parentHashes[j]]) {
                                    vm.commitMap[vm.commits[i].parentHashes[j]] = createTempCommit(vm.commits[i].parentHashes[j]);
                                    vm.commits.push(vm.commitMap[vm.commits[i].parentHashes[j]]);
                                }
                                vm.commitMap[vm.commits[i].parentHashes[j]].children.push(vm.commits[i].hash);
                            }
                        }
                    }

                    function parseCommits(commits) {
                        commits = commits.map(function (c) {
                            c.parentHashes = c.parentHashes.split(' ');
                            c.fromNow = moment(c.date).fromNow();
                            c.children = [];

                            vm.commitMap[c.hash] = c;
                            return c;
                        });


                    }

                    function setGraphInfo() {
                        var commits = vm.commits;

                        if (commits.length == 0) {
                            return;
                        }

                        var openBranches = [];
                        var branchLevel = 0;

                        commits[0].x = branchLevel;

                        openBranches[branchLevel] = commits[0].hash;

                        var nextCommit = null,
                            currCommit = null;

                        var x = null,
                            idx = null,
                            first = null,
                            tempCommit = null,
                            parentCommit = null;

                        var branchIdx = null;

                        for (var i = 0; i < commits.length; i++) {

                            currCommit = commits[i];
                            nextCommit = commits[i + 1];

                            first = true;
                            for (j = 0; j < currCommit.parentHashes.length; j++) {
                                idx = openBranches.indexOf(currCommit.parentHashes[j]);
                                if (idx > -1) {
                                    // in case our commit is on branch-2 (imagine to the right of the first branch) and there are some commits on branch-1 after (chronogically) our commit;
                                    // but parent of our commit is supposed to be on branch-1 (since branch-2 started from its parent).
                                    // Then the parent should be on branch-1. 
                                    // It should look as if branch-2 is coming out of branch-1. Therefore the parent will be on branch-1;
                                    parentCommit = vm.commitMap[openBranches[idx]];
                                    if (!parentCommit) {
                                        parentCommit = tempCommit;
                                    }

                                    if (typeof parentCommit.x != 'undefined') {
                                        if(typeof currCommit.x == 'undefined') {
                                            // assign the next available x to currCommit.
                                            branchIdx = openBranches.indexOf(false);
                                            if (branchIdx > -1) {
                                                openBranches[branchIdx] = currCommit.hash;
                                            }
                                            else {
                                                openBranches.push(currCommit.hash);
                                                branchIdx = openBranches.indexOf(currCommit.hash);
                                            }
                                            currCommit.x = branchIdx;
                                        }

                                        // parentCommit.x is defined.. that means this branch's parent is merged
                                        // so lets remove this from the openBranches array.

                                        var tempIdx = openBranches.indexOf(currCommit.hash);
                                        openBranches[tempIdx] = false;


                                        if (parentCommit.x > currCommit.x) {
                                            parentCommit.x = currCommit.x;
                                        }
                                        else {
                                            // keep t.x as it is.
                                        }
                                    }
                                    else {
                                        parentCommit.x = currCommit.x;
                                    }
                                    openBranches[idx] = false;
                                }
                                else if (typeof currCommit.x == 'undefined') {
                                    // new branch!
                                    // check if openBranches has a vacancy. if yes, fill it.

                                    branchIdx = openBranches.indexOf(false);
                                    if (branchIdx > -1) {
                                        openBranches[branchIdx] = currCommit.hash;
                                    }
                                    else {
                                        openBranches.push(currCommit.hash);
                                        branchIdx = openBranches.indexOf(currCommit.hash);
                                    }



                                    currCommit.x = branchIdx;
                                    j--;            // we just asssigned x to the currCommit. We did not process its parent as we were supposed to in this iteration. So j--
                                    continue;
                                }
                                else if (first) {
                                    // replace the openBranch with current parent.
                                    first = false;
                                    // openBranches.splice(openBranches.indexOf(currCommit.hash), 1, currCommit.parentHashes[j]);
                                    branchIdx = openBranches.indexOf(currCommit.hash);

                                    if(branchIdx == -1) {
                                        branchIdx = openBranches.indexOf(false);
                                    }
                                    
                                    if(branchIdx == -1) {
                                        // new open branch.
                                        openBranches.push(currCommit.parentHashes[j]);
                                        branchIdx = openBranches.indexOf(currCommit.parentHashes[j]);
                                    }
                                    else {
                                        openBranches[branchIdx] = currCommit.parentHashes[j];
                                    }

                                    vm.commitMap[currCommit.parentHashes[j]].x = branchIdx;
                                }
                                else {
                                    branchIdx = openBranches.indexOf(false);
                                    if (branchIdx > -1) {
                                        openBranches[branchIdx] = currCommit.parentHashes[j];
                                    }
                                    else {
                                        openBranches.push(currCommit.parentHashes[j]);
                                        branchIdx = openBranches.indexOf(currCommit.parentHashes[j]);
                                    }
                                    vm.commitMap[currCommit.parentHashes[j]].x = branchIdx;
                                }
                            }
                        }
                        // maxX will be used to set the width of the canvas.
                        vm.maxX = openBranches.length;
                    }

                    function showCommitDialog() {
                        vm.modals.commit.modal('show');
                    }

                    function showPushDialog() {
                        vm.modals.push.modal('show');
                    }

                    function refreshLocalChanges() {
                        return gitfunctions.refreshLocalChanges().then(function (data) {
                            if (data.progress) {
                                vm.progress = {};
                                switch (data.progress) {
                                    case 'rebase-progress': {
                                        vm.progress.message = 'Rebase in progress.';
                                        vm.progress.type = 'rebase';
                                        break;
                                    }
                                    case 'merge-progress': {
                                        vm.progress.message = 'Merge in progress';
                                        vm.progress.type = 'merge';
                                        break;
                                    }
                                    case 'revert-progress': {
                                        vm.progress.message = 'Revert in progress';
                                        vm.progress.type = 'revert';
                                        break;
                                    }
                                    case 'interactive-rebase-progress': {
                                        vm.progress.message = 'Interactive rebase in progress';
                                        vm.progress.type = 'interactiverebase';
                                        break;
                                    }
                                }
                            }
                            else {
                                vm.progress = null;
                            }
                            vm.localStatus = parseLocalStatus(data.localStatus);
                            vm.stagedFiles = $filter('filter')(vm.localStatus, { tags: 'staged' }, true);
                            vm.unstagedFiles = $filter('filter')(vm.localStatus, { tags: 'unstaged' }, true);

                            return vm.localStatus;
                        });
                    }

                    function selectFileInLog(file) {
                        vm.selectedFileDiff = $sce.trustAsHtml(file.diff);
                        vm.selectedFileDiffRaw = file.diff;
                    }

                    function selectCommit(commit) {
                        if (typeof commit === 'string') {
                            commit = vm.commitMap[commit];
                        }
                        var hash = commit.hash;
                        vm.selectedCommit = hash;
                        vm.commitDetails = 'loading';        // reset the commitDetails.

                        repoDetailService.getCommit(hash).then(function (data) {
                            var commitBranchDetails = data.commitBranchDetails.output.join('\n').trim().split('\n');
                            var tagDetails = data.tagDetails.output.join('\n').trim().split('\n');
                            var d = data.commitDetails.output.join('\n').trim().split('\n');

                            var isMergeCommit = false;

                            if (d[1].indexOf('Merge') == 0) {
                                isMergeCommit = true;
                            }

                            if (!isMergeCommit) {
                                vm.commitDetails = {
                                    hash: d[0].substring('commit '.length),
                                    author: d[1].substring('Author: '.length),
                                    date: new Date(d[2].substring('Date:   '.length))
                                };
                            }
                            else {
                                vm.commitDetails = {
                                    hash: d[0].substring('commit '.length),
                                    author: d[2].substring('Author: '.length),
                                    date: new Date(d[3].substring('Date:   '.length)),
                                    merges: d[1].substring('Merge: '.length).split(' ')
                                }
                            }

                            vm.commitDetails.parentHashes = commit.parentHashes;
                            vm.commitDetails.children = commit.children;

                            var i = isMergeCommit ? 4 : 3,
                                str = d[i],
                                message = '';
                            while (str.indexOf('diff') !== 0 && d[i + 1] != undefined) {
                                message += str + '\n';
                                str = d[++i];
                            }

                            vm.commitDetails.message = message;

                            if (!isMergeCommit) {
                                var diff = d.slice(i);
                                vm.commitDetails.diff = diff.join('\n');

                                vm.commitDetails.diffDetails = parseDiff(vm.commitDetails.diff);
                                // pre select the first file of the commit.
                                vm.selectFileInLog(vm.commitDetails.diffDetails[0]);
                            }

                            if (isMergeCommit) {
                                repoDetailService.getDiff(vm.commitDetails.merges).then(function (diff) {
                                    vm.commitDetails.diff = diff;

                                    vm.commitDetails.diffDetails = parseDiff(vm.commitDetails.diff);
                                    // pre select the first file of the commit.
                                    vm.selectFileInLog(vm.commitDetails.diffDetails[0]);
                                });
                            }

                            var branch = null;
                            vm.commitDetails.branches = [];
                            for(var i = 0; i < commitBranchDetails.length; i++) {
                                branch = commitBranchDetails[i];
                                if(branch[0] == "*") {
                                    // local branch
                                    vm.commitDetails.branches.push({
                                        type: 'local',
                                        name: branch.substring('* '.length)
                                    });
                                }
                                else {
                                    // remote branch
                                    if(branch.indexOf(' -> ') > -1) {
                                        // skip this branch as it will get repeated
                                        continue;
                                    }

                                    vm.commitDetails.branches.push({
                                        type: 'remote',
                                        name: branch.substring('  remotes/'.length)
                                    });
                                }
                            }

                            if(tagDetails && tagDetails.length && tagDetails[0].length > 0) {
                                vm.commitDetails.tags = tagDetails;
                            }
                            else {
                                vm.commitDetails.tags = [];
                            }
                        });
                    }
                }
            ],
            controllerAs: 'vm'
        });

    repoDetailModule.service('repoDetailService', ['$http', '$q', function ($http, $q) {
        this.getCommits = getCommits;
        this.getCommit = getCommit;
        this.getDiff = getDiffBetweenCommits;
        this.initRepo = initRepo;
        this.checkoutLocalBranch = checkoutLocalBranch;
        this.rebaseCurrentBranchOn = rebaseCurrentBranchOn;
        this.doResetHEADFile = doResetHEADFile;
        this.mergeIntoCurrent = mergeIntoCurrent;
        this.searchForText = searchForText;

        return;

        function searchForText(searchText) {
            return $http.post('/repo/' + repoName + '/searchfortext', { text: window.encodeURIComponent(searchText) }).then(function (res) {
                return res.data;
            });
        }

        function mergeIntoCurrent(branchName) {
            return $http.post('/repo/' + repoName + '/merge', { obj: branchName }).then(function (res) {
                return res.data;
            });
        }

        function doResetHEADFile(fileName) {
            return $http.post('/repo/' + repoName + '/resetheadfile', {
                fileName: window.encodeURIComponent(fileName)
            }).then(function (res) {
                return res.data;
            });
        }

        function rebaseCurrentBranchOn(branchNameOrRevision) {
            return $http.post('/repo/' + repoName + '/rebasecurrentbranchon', {
                branchNameOrRevision: branchNameOrRevision
            }).then(function (res) {
                return res.data;
            });
        }

        function checkoutLocalBranch(branchName) {
            return $http.post('/repo/' + repoName + '/checkoutlocalbranch', {
                branchName: encodeURIComponent(branchName)
            }).then(function (res) {
                return res.data;
            });
        }

        /**
          Initializes stuff like remote name, local and remote branches, etc. One time stuff.
        */
        function initRepo() {
            return $http.get('/repo/' + repoName + '/initrepo').then(function (res) {
                return res.data.output;
            });
        }

        function getDiffBetweenCommits(commits) {
            return $http.get('/repo/' + repoName + '/diffbetweencommits?commit1=' + commits[0] + '&commit2=' + commits[1]).then(function (res) {
                if (!res.data.errorCode) {
                    return res.data.output.join('\n');
                } y
                return res.data;
            });
        }

        function getCommit(hash) {
            return $http.get('/repo/' + repoName + '/getcommit/' + hash).then(function (res) {
                if (!res.data.errorCode) {
                    return res.data;
                }
                return res.data;
            });
        }

        function getCommits(page) {
            page = page || 1;
            return $http.get('/repo/' + repoName + '/getrepolog?page=' + page).then(function (res) {
                return res.data;
            });
        }
    }]);

    function parseLocalStatus(data) {
        if (typeof data == 'object') {
            // TODO: handle data.errors here. They are probably CRLF errors.
            data = data.output.join('\n').trim();
        }
        data = data.split('\n').filter(function (d) { return d.length > 0; });


        var t = [];
        vm.conflict = false;
        data.forEach(function (f) {
            var fileTags = [];

            var firstTwoCharacters = f.substring(0, 2);
            if (firstTwoCharacters == 'DD' || firstTwoCharacters == 'AA' || firstTwoCharacters.indexOf('U') > -1) {
                // conflict state.
                switch (firstTwoCharacters) {
                    case 'UU': {
                        // unmerged, both modified
                        fileTags.push('unstaged', 'conflicted', 'conflictedunstaged', 'unmerged', 'bothmodified');
                        t.push({
                            name: f.substring(3),
                            tags: fileTags,
                            commitType: 'modifiedconflicted'
                        });
                        fileTags = [];
                        fileTags.push('staged', 'conflicted', 'conflictedstaged', 'unmerged', 'bothmodified');
                        t.push({
                            name: f.substring(3),
                            tags: fileTags,
                            commitType: 'modifiedconflicted'
                        });
                        break;
                    }
                    case 'DU': {
                        // unmerged, deleted by us.
                        fileTags.push('unstaged', 'conflicted', 'conflictedunstaged', 'unmerged', 'deletedbyus');
                        t.push({
                            name: f.substring(3),
                            tags: fileTags,
                            commitType: 'deletedconflicted'
                        });
                        break;
                    }
                    case 'UD': {
                        // unmerged, deleted by them.
                        fileTags.push('unstaged', 'conflicted', 'conflictedunstaged', 'unmerged', 'deletedbythem');
                        t.push({
                            name: f.substring(3),
                            tags: fileTags,
                            commitType: 'deletedconflicted'
                        });
                        break;
                    }
                }
                vm.conflict = true;
                return;
            }
            switch (f[0]) {
                case 'M': {
                    fileTags.push('modified', 'modifiedstaged', 'staged');
                    break;
                }
                case 'D': {
                    fileTags.push('deleted', 'deletedstaged', 'staged');
                    break;
                }
                case 'A': {
                    fileTags.push('added', 'addedstaged', 'staged');
                    break;
                }
                case '!': {
                    fileTags.push('ignored');
                    // TODO: Handle this case
                    break;
                }
            }
            if (f[0].trim().length && f[0] != '?') {     // `?` == untracked, will be handled below.
                t.push({
                    name: f.substring(3),
                    tags: fileTags,
                    commitType: fileTags.indexOf('modified') > -1 ? 'modified' : (fileTags.indexOf('deleted') > -1 ? 'deleted' : (fileTags.indexOf('added') > -1 ? 'new' : 'ignored'))
                });
            }

            fileTags = [];

            switch (f[1]) {
                case 'M': {
                    fileTags.push('modified', 'modifiedunstaged', 'unstaged');
                    break;
                }
                case 'D': {
                    fileTags.push('deleted', 'deletedunstaged', 'unstaged');
                    break;
                }
                case '?': {
                    fileTags.push('added', 'addedunstaged', 'unstaged', 'untracked');
                    break;
                }

                case '!': {
                    fileTags.push('ignored');
                    // TODO: Handle this case
                    break;
                }
            }
            if (f[1].trim().length) {
                t.push({
                    name: f.substring(3),
                    tags: fileTags,
                    commitType: fileTags.indexOf('modified') > -1 ? 'modified' : (fileTags.indexOf('deleted') > -1 ? 'deleted' : (fileTags.indexOf('added') > -1 ? 'new' : 'ignored'))
                });
            }

        });

        return t;
    }

    // Accepts a diff string and parses into diff object
    function parseDiff(diff) {
        var diffDetails = [];
        diff = diff.split('\n');

        var line = null,
            currDiff = null;
        for (var i = 0; i < diff.length; i++) {
            line = diff[i];

            if (line.indexOf('diff') === 0) {
                currDiff = {
                    name: line.substring(line.indexOf('b/') + 2),
                    commitType: diff[i + 1].indexOf('new') === 0 ? 'new' : (diff[i + 1].indexOf('similarity') === 0 ? 'rename' : (diff[i + 1].indexOf('deleted') === 0 ? 'deleted' : 'modified'))
                };

                currDiff.diff = line;

                for (i = i + 1; i < diff.length; i++) {
                    if (diff[i].indexOf('diff') === 0) {
                        i--;
                        diffDetails.push(currDiff);
                        break;
                    }
                    else {
                        var formattedStr = diff[i];
                        // strip tags off formattedStr.
                        formattedStr = formattedStr.replace(/\</g, '&lt;').replace(/\>/g, '&gt;');
                        if (formattedStr.indexOf('+') === 0) {
                            formattedStr = '<span class="line-added">' + formattedStr + '</span>'
                        }
                        else if (formattedStr.indexOf('-') === 0) {
                            formattedStr = '<span class="line-removed">' + formattedStr + '</span>';
                        }
                        else if (formattedStr.indexOf('@') === 0 || formattedStr.indexOf('\\') === 0) {
                            formattedStr = '<span class="line-special">' + formattedStr + '</span>';
                        }

                        currDiff.diff = currDiff.diff + '\n' + formattedStr;
                        currDiff.safeDiff = $sce.trustAsHtml(currDiff.diff);
                    }
                }
            }
        }

        if (currDiff) {
            diffDetails.push(currDiff);
        }

        return diffDetails;
    }
})();