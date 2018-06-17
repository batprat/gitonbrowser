// TODO: Handle error codes.
(function() {
    var repoDetailModule = angular.module('RepoDetailModule', ['ngRoute', 'WebgitHomeModule']);
    var repoName = null;
    var $commitModal = null;
    var $pushModal = null;
    var $stashModal = null;
    var $resetAllFilesModal = null;
    var $resetUnstagedFilesModal = null;
    var $newBranchModal = null;
    var $responseModal = $('#response-modal');
    var $responseModalTitle = $responseModal.find('#response-title');
    var $responseModalBody = $responseModal.find('#response-body');
    var $conflictModal = null;

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
            controller: ['$routeParams', 'repoDetailService', '$sce', '$scope', '$filter', 'UtilsService', '$timeout',
              function RepoDetailController($routeParams, repoDetailService, $sceLocal, $scope, $filter, UtilsService, $timeout) {
                $sce = $sceLocal;
                repoName = encodeURIComponent(decodeURIComponent($routeParams.repoName));
    
                this.repoName = repoName;

                var vm = this;
                var $mainLogContainer = $('#main-log-container');
                var $mainLogLoadingIndicator = $('#main-log-loading-indicator');

                $commitModal = $('#commit-modal');
                $pullModal = $('#pull-modal');
                $pushModal = $('#push-modal');
                $stashModal = $('#stash-modal');
                $resetAllFilesModal = $('#reset-all-modal');
                $resetUnstagedFilesModal = $('#reset-unstaged-modal');
                $newBranchModal = $('#new-branch-modal');
                $conflictModal = $('#conflict-modal');
                vm.selectedCommit = null;
                vm.modifiedFileNames = [];

                vm.selectCommit = selectCommit;
                vm.selectFileInLog = selectFileInLog;
                vm.refreshLocalChanges = refreshLocalChanges;
                vm.showCommitDialog = showCommitDialog;
                vm.showDiffForFileOnCommitModal = showDiffForFileOnCommitModal;
                vm.stageFile = stageFile;
                vm.unstageFile = unstageFile;
                vm.stageAllFiles = stageAllFiles;
                vm.unstageAllFiles = unstageAllFiles;
                vm.showPullDialog = showPullDialog;
                vm.showPushDialog = showPushDialog;
                vm.showStashDialog = showStashDialog;
                vm.selectStash = selectStash;
                vm.commit = commit;
                vm.commitAndPush = commitAndPush;
                vm.pull = pull;
                vm.push = push;
                vm.selectedStash = null;
                vm.selectFileInStash = selectFileInStash;
                vm.stashLocalChanges = stashLocalChanges;
                vm.dropSelectedStash = dropSelectedStash;
                vm.applyStash = applyStash;
                vm.showResetAllFilesModal = showResetAllFilesModal;
                vm.resetAllChanges = resetAllChanges;
                vm.showResetUnstagedFilesModal = showResetUnstagedFilesModal;
                vm.resetUnstagedChanges = resetUnstagedChanges;
                vm.createNewBranch = createNewBranch;
                vm.showModalToHandleConflict = showModalToHandleConflict;
                vm.showDiffOnConflictModal = showDiffOnConflictModal;
                vm.markFileAsResolvedDuringConflict = markFileAsResolvedDuringConflict;
                vm.abortRebase = abortRebase;
                vm.continueRebase = continueRebase;
                vm.showRemoveFileBtnOnConflictModal = showRemoveFileBtnOnConflictModal;
                vm.getMetaOfConflictedFile = getMetaOfConflictedFile;
                vm.continueMerge = continueMerge;
                vm.abortMerge = abortMerge;
                vm.mergeConflictCommitMessage = '';
                vm.mainSearch = mainSearch;

                vm.commitMessage = '';
                vm.remote = null;
                vm.remoteBranches = [];
                vm.currentLocalBranch = null;
                vm.localBranches = [];
                vm.pullOptions = {
                  mergeOption: 'merge'
                };
                vm.stashLocalIncludeUntracked = true;
                vm.popStash = false;
                vm.resetAllDeleteUntracked = false;

                vm.commitMap = {};
                vm.stashes = [];
                vm.newBranch = {
                    atRevision: '',
                    name: '',
                    checkout: true
                };

                vm.diffOnConflictModal = null;

                var commitsBackup = null;
                var commitMapBackup = null;
                var graphBackup = null;

                $scope.$on('windowfocus', function() {
                    if(($commitModal.data('bs.modal') || {})._isShown) {
                        // do not refresh when the modal window is open. use the refresh button instead.
                        return;
                    }
                    vm.refreshLocalChanges();
                });

                $responseModal.on('hide.bs.modal', function(e) {
                  $responseModalBody.html('');
                  $responseModalTitle.html('');
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

                function mainSearch() {
                    var searchText = vm.mainSearchInp;

                    if(typeof searchText == 'undefined' || searchText.length == 0 || (searchText = searchText.trim()).length == 0) {
                        restoreCommits();
                        return;
                    }

                    clearGraph();
                    var promise = null;

                    var shaRegex = /\b[0-9a-f]{5,40}\b/;
                    if(shaRegex.test(searchText)) {
                        // it is probably an SHA.
                        promise = repoDetailService.searchForHash(searchText).then(function(commits) {
                            vm.commitDetails = null;
                            parseCommits(commits);
                            vm.commits = commits;
                            resetCommitMap();
                            return vm.commits;
                        });
                    }

                    // search in commit messages.

                    if(promise) {
                        promise.then(searchByCommitMessage);
                    }
                    else {
                        searchByCommitMessage();
                    }

                    function searchByCommitMessage() {
                        return repoDetailService.searchForCommitMessage(searchText).then(function(commits) {
                            parseCommits(commits);
                            if(promise) {
                                vm.commits = vm.commits || [];
                            }
                            else {
                                vm.commits = [];
                            }
    
                            resetTempCommits();
    
                            // Array.prototype.push.apply(vm.commits, commits);
                            vm.commits = addUniqueCommits(vm.commits, commits);
    
                            resetCommitMap();
                            return vm.commits;
                        });
                    }
                }


                /**
                 * Adds commits2 to commits1. Skips duplicates. Does not modify, returns new array.
                 */
                function addUniqueCommits(commits1, commits2) {
                    var commits1Copy = commits1.slice(0);

                    var hashes = commits1.map(function(c) {
                        return c.hash;
                    });

                    var uniqueCommits = commits2.filter(function(c) {
                        return hashes.indexOf(c.hash) == -1;
                    });

                    Array.prototype.push.apply(commits1Copy, uniqueCommits);

                    return commits1Copy;
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
                    $('#log-rows-container').css('width', 'calc(100% - '+ varWidth +')');

                    ctx.drawImage(graphBackup, 0, 0);
                }

                function clearGraph() {
                    var canvas = document.getElementById('log-graph');
                    if(!canvas) {
                        return;
                    }
                    var ctx = canvas.getContext('2d');

                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    canvas.width = 0;
                    canvas.height = 0;
                }

                function abortMerge() {
                    return repoDetailService.abortMerge().then(function(d) {
                        if(!d.errorCode) {
                            refreshLocalChanges();
                            refreshLog();
                            $conflictModal.modal('hide');
                        }
                    });
                }

                function continueMerge() {
                    // continue merge means commit.
                    return repoDetailService.commit(vm.mergeConflictCommitMessage).then(function(d) {
                        if(typeof d == 'string') {
                            // the commit was successful.
                            // close the conflict modal.
                            refreshLocalChanges();
                            refreshLog();
                            $conflictModal.modal('hide');
                        }
                    });
                }

                function unselectFilesAfterLocalRefresh() {
                    vm.diffOnConflictModal = null;
                    showDefaultFileOnCommitModalDialog();
                }

                function getMetaOfConflictedFile(conflictedFile) {
                    if(!conflictedFile) {
                        return;
                    }
                    var tags = conflictedFile.tags;
                    var name = '';
                    var description = '';
                    switch(true) {
                        case tags.indexOf('deletedbyus') > -1: {
                            name = 'DU';
                            description = 'This file is deleted in the other branch and modified on your branch.';
                            break;
                        }
                        case tags.indexOf('bothmodified') > -1: {
                            name = 'UU';
                            description = 'This file is modified on both the branches.';
                            break;
                        }
                        case tags.indexOf('deletedbythem') > -1: {
                            name = 'UD';
                            description = 'This file is deleted on your branch and probably edited on the other.';
                            break;
                        }
                    }
                    return {
                        name: name,
                        description: description
                    };
                }

                function showRemoveFileBtnOnConflictModal() {
                    if(vm.diffOnConflictModal && vm.diffOnConflictModal.file) {
                        return vm.diffOnConflictModal.file.tags.indexOf('deletedbyus') > -1 || vm.diffOnConflictModal.file.tags.indexOf('deletedbythem') > -1;
                    }
                    return false;
                }

                function continueRebase() {
                    repoDetailService.refreshLocalChanges().then(function(d) {
                        var localStatus = parseLocalStatus(d.localStatus);
                        if(localStatus.length == 0) {
                            // there is nothing to apply here.
                            // run git rebase --skip
                            repoDetailService.skipRebase().then(function(d) {
                                if(!d.errorCode) {
                                    refreshLocalChanges();
                                    refreshLog();
                                    $conflictModal.modal('hide');
                                }
                            });
                        }
                        else {
                            repoDetailService.continueRebase().then(function(d) {
                                if(!d.errorCode) {
                                    $conflictModal.modal('hide');
                                }
                                refreshLocalChanges();
                                refreshLog();
                                // TODO: handle error here.
                            });
                        }
                    });
                }

                function abortRebase() {
                    repoDetailService.abortRebase().then(function(d) {
                        if(d.errorCode) {
                            // TODO: handle error here.
                        }
                        refreshLocalChanges();
                        refreshLog();
                        $conflictModal.modal('hide');
                    });
                }

                function markFileAsResolvedDuringConflict(add) {
                    if(add) {
                        return repoDetailService.stageFile(vm.diffOnConflictModal.file.name, vm.diffOnConflictModal.file.tags).then(function(res) {
                            // TODO: Handle errors here. Probably CRLF errors.
                            if(res === '' || (res.output && res.output.join('\n').trim().length == 0)) {
                                vm.diffOnConflictModal = null;
                                vm.refreshLocalChanges();
                            }
                        });
                    }
                    else {
                        return repoDetailService.removeFile(vm.diffOnConflictModal.file.name, vm.diffOnConflictModal.file.tags).then(function(res) {
                            // TODO: Handle errors here. Probably CRLF errors.
                            if(!res.errorCode) {
                                vm.diffOnConflictModal = null;
                                vm.refreshLocalChanges();
                            }
                        });
                    }
                }

                function showDiffOnConflictModal(conflictedFile) {
                    vm.diffOnConflictModal = {
                        file: conflictedFile
                    };

                    if(conflictedFile.tags.indexOf('deletedbyus') > -1 || conflictedFile.tags.indexOf('deletedbythem') > -1) {
                        // no diff for this file. Pick an option to keep or delete this file.
                        return;
                    }

                    return repoDetailService.getFileDiff(conflictedFile.name, conflictedFile.tags).then(function(diff) {
                        if(typeof diff == 'object') {
                            diff = diff.output.join('\n').trim();
                            // TODO: Handle errors here.. probably CRLF errors.
                        }
                        var conflictDetails = parseDiff(diff);
                        vm.diffOnConflictModal.safeDiff = $sce.trustAsHtml(conflictDetails[0].diff);
                    });
                }

                function showModalToHandleConflict() {
                    switch(vm.progress.type) {
                        case 'rebase':
                        case 'merge': {
                            $conflictModal.modal('show');
                            break;
                        }
                    }
                }

                function initLogContextMenu() {
                    $('#main-log-container').on('contextmenu', '.commit', function() {
                        // I could've put the following line inside the build block below, but I wanna keep it as clean as possible.
                        vm.selectCommit($(this).data('commitHash'));
                    });
                    $.contextMenu({
                        // define which elements trigger this menu
                        selector: "#main-log-container .commit",
                        build: function($trigger, e) {
                            var commitHash = $trigger.data('commitHash');
                            var commit = vm.commitMap[commitHash];
                            var hasLocalBranches = commit && commit.localBranches && commit.localBranches.length > 0;
                            var options = {
                                items: {
                                    createNewBranch: {
                                        name: 'Create new branch', 
                                        callback: function(key, opt, rootMenu, originalEvent) { 
                                            showNewBranchModal(commitHash);
                                        }
                                    },
                                    checkoutBranch: {
                                        name: 'Checkout branch', 
                                        disabled: !hasLocalBranches
                                    },
                                    rebaseBranchOn: {
                                        name: 'Rebase current branch on',
                                        items: {}
                                    },
                                    mergeIntoCurrent: {
                                        name: 'Merge into current branch',
                                        items: {}
                                    }
                                }
                            };

                            var rebaseOptions = [];

                            if(hasLocalBranches) {
                                options.items.checkoutBranch.items = {};
                                
                                for(var i = 0; i < commit.localBranches.length; i++) {
                                    options.items.checkoutBranch.items[commit.localBranches[i]] = {
                                        name: commit.localBranches[i],
                                        callback: checkoutLocalBranch
                                    };

                                    options.items.mergeIntoCurrent.items[commit.localBranches[i]] = {
                                        name: commit.localBranches[i],
                                        callback: mergeLocalBranch
                                    };
                                }
                            }

                            // rebase options - start
                            if(hasLocalBranches || (commit.remoteBranches && commit.remoteBranches.length > 0)) {
                                Array.prototype.push.apply(rebaseOptions, commit.localBranches);
                                Array.prototype.push.apply(rebaseOptions, commit.remoteBranches);
                            }
                            else {
                                rebaseOptions.push(commit.hash);
                            }

                            for(var i = 0; i < rebaseOptions.length; i++) {
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

                function mergeLocalBranch(branchName) {
                    $responseModalTitle.text('Merging');
                    $responseModal.modal('show');
                    return repoDetailService.mergeIntoCurrent(branchName).then(function(d) {
                        $responseModalBody.html(d.output.join('\n').trim().replace('\n', '<br />'));
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
                    $logRowsContainer.css('width', 'calc(100% - '+ varWidth +')');
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
                    var getParentFromHash = function(h) {
                        return vm.commitMap[h];
                    },
                    hashes = commits.map(function(c) {
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

                    for(var i = 0; i < commits.length; i++) {
                        currCommit = commits[i];

                        for(j = 0; j < currCommit.parentHashes.length; j++) {
                            currParent = vm.commitMap[currCommit.parentHashes[j]];
                            if(!currParent) {
                                // ideally, this case should'nt ever come because of the temp commits.
                                continue;
                            }

                            // draw a line from currCommit.x to parent.x
                            if(currParent.x == currCommit.x) {
                                // draw a straight line.
                                ctx.beginPath();
                                ctx.strokeStyle = colors[currParent.x % colors.length];
                                ctx.moveTo(currCommit.x * logGraphDefaults.distanceBetweenBranches + c, halfy + y * i);
                                ctx.lineTo(currParent.x * logGraphDefaults.distanceBetweenBranches + c, halfy + y * hashes.indexOf(currParent.hash));
                                ctx.stroke();
                            }
                            else if(currParent.x > currCommit.x) {
                                // curve to lane to right, then straight down.
                                ctx.beginPath();
                                ctx.strokeStyle= colors[currParent.x % colors.length];
                                ctx.moveTo(currCommit.x * logGraphDefaults.distanceBetweenBranches + c, halfy + y * i);
                                ctx.bezierCurveTo(currCommit.x * logGraphDefaults.distanceBetweenBranches + c, 
                                    halfy + y * i + y , 
                                    currParent.x * logGraphDefaults.distanceBetweenBranches + c, 
                                    halfy + y * i, 
                                    currParent.x * logGraphDefaults.distanceBetweenBranches + c, 
                                    halfy + y * i + y);
                                ctx.moveTo(currParent.x * logGraphDefaults.distanceBetweenBranches + c, halfy + y * i + y);
                                ctx.lineTo(currParent.x * logGraphDefaults.distanceBetweenBranches + c, halfy + y * hashes.indexOf(currParent.hash));
                                ctx.stroke();
                            }
                            else if(currParent.x < currCommit.x) {
                                ctx.beginPath();
                                ctx.strokeStyle= colors[currCommit.x % colors.length];
                                ctx.moveTo(currCommit.x * logGraphDefaults.distanceBetweenBranches + c, halfy + y * i);
                                ctx.lineTo(currCommit.x * logGraphDefaults.distanceBetweenBranches + c, halfy + y * (hashes.indexOf(currParent.hash) - 1));
                                ctx.moveTo(currCommit.x * logGraphDefaults.distanceBetweenBranches + c, halfy + y * (hashes.indexOf(currParent.hash) - 1));
                                ctx.bezierCurveTo(currCommit.x * logGraphDefaults.distanceBetweenBranches + c, 
                                    halfy + y * (hashes.indexOf(currParent.hash) - 1) + y , 
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
                    var PIx2 = 2*Math.PI;
                    for(var i = 0; i < commits.length; i++) {
                        currCommit = commits[i];

                        ctx.beginPath();
                        ctx.fillStyle = colors[currCommit.x % colors.length];
                        ctx.arc(currCommit.x * logGraphDefaults.distanceBetweenBranches + c, halfy + y * i, logGraphDefaults.commitRadius, 0, PIx2);
                        ctx.fill();
                        ctx.stroke();
                    }
                }

                function rebaseCurrentBranchOn(branchNameOrRevision) {
                    $responseModalTitle.text('Rebasing');
                    $responseModal.modal('show');
                    return repoDetailService.rebaseCurrentBranchOn(branchNameOrRevision).then(function(d) {
                        $responseModalBody.html(d.output.join('\n').trim().replace('\n', '<br />'));
                        refreshLocalChanges();
                        refreshLog();
                    });
                }

                function checkoutLocalBranch(branchName) {
                    return repoDetailService.checkoutLocalBranch(branchName).then(function(d) {
                        initializeRemote();
                        refreshLog();
                        refreshLocalChanges();
                        $responseModalTitle.html('Checkout Branch');
                        $responseModalBody.html(d.errors.join('\n').trim().replace('\n', '<br />'));
                        $responseModal.modal('show');
                    });
                }

                function createNewBranch() {
                    var revision = vm.newBranch.atRevision;
                    var checkoutAfterCreate = vm.newBranch.checkout;
                    var branchName = vm.newBranch.name;
                    return repoDetailService.createNewBranch(revision, branchName, checkoutAfterCreate).then(function(d) {
                        $newBranchModal.modal('hide');
                        var text = d.errors.join('\n').trim();
                        if(text.length) {
                            $responseModalTitle.html('Create New Branch');
                            $responseModalBody.html(text.replace('\n', '<br />'));
                            $responseModal.modal('show');
                        }
                        refreshLog();
                    });
                }

                function showNewBranchModal(commitHash) {
                    vm.newBranch.atRevision = commitHash;
                    vm.newBranch.name = '';
                    vm.newBranch.checkout = true;
                    $newBranchModal.modal('show');
                    $scope.$apply();                        // guilty :(
                }

                function showResetUnstagedFilesModal() {
                    $resetUnstagedFilesModal.modal('show');
                }

                function showResetAllFilesModal() {
                    $resetAllFilesModal.modal('show');
                }

                function resetUnstagedChanges() {
                    var deleteUntrackedFiles = vm.resetUnstagedDeleteUntracked;

                    return repoDetailService.resetUnstagedChanges(deleteUntrackedFiles).then(function(d) {
                        $resetUnstagedFilesModal.modal('hide');
                        refreshLocalChanges();

                        if(!d.errorCode) {
                            return;
                        }

                        $responseModalTitle.html('Reset output');
                        $responseModalBody.html(d.errors.join('\n').trim().replace('\n', '<br />'));
                        $responseModalBody.modal('show');
                    });
                }

                function resetAllChanges() {
                    var deleteUntrackedFiles = vm.resetAllDeleteUntracked;

                    return repoDetailService.resetAllChanges(deleteUntrackedFiles).then(function(d) {
                        $resetAllFilesModal.modal('hide');
                        refreshLocalChanges();
                        vm.diffOnCommitModal.safeDiff = '';     // reset the text on the commit modal.

                        if(!d.errorCode) {
                            return;
                        }

                        $responseModalTitle.html('Reset output');
                        $responseModalBody.html(d.errors.join('\n').trim().replace('\n', '<br />'));
                        $responseModalBody.modal('show');
                    });
                }

                function applyStash() {
                    $responseModalTitle.text('Applying Stash ' + vm.selectedStash.name);
                    $responseModal.modal('show');
                    return repoDetailService.applyStash(vm.selectedStash.name, vm.popStash).then(function(d) {
                        if(d.errorCode) {
                            $responseModalBody.html(d.errors.join('<br />').replace(/\n/g, '<br />'));
                        }
                        else {
                            $responseModalBody.html(d.output.join('<br />').replace(/\n/g, '<br />'));
                        }

                        if(!d.errorCode) {
                            if(vm.popStash) {
                                updateStashes();
                            }
                            refreshLocalChanges();
                        }
                    });
                }

                function dropSelectedStash() {
                    $responseModalTitle.text('Dropping Stash ' + vm.selectedStash.name);
                    $responseModal.modal('show');
                    return repoDetailService.dropSelectedStash(vm.selectedStash.name).then(function(d) {
                        $responseModalBody.html(d.output.join('<br />'));
                        updateStashes();
                    });
                }

                function stashLocalChanges() {
                    $responseModalTitle.text('Saving Local Changes...');
                    $responseModal.modal('show');
                    return repoDetailService.stashLocalChanges(vm.stashLocalIncludeUntracked).then(function(d) {
                        $responseModalBody.html(d.output.join('<br />'));
                        refreshLocalChanges();
                        updateStashes();
                    });
                }
                
                function selectFileInStash(file) {
                    if(vm.selectedStash.name === 'Local Changes') {
                        vm.selectedStash.selectedFile = file;
                        repoDetailService.getFileDiff(file.fileName, file.tags).then(function(diff) {
                            var parsedDiff = parseDiff(diff);
                            vm.selectedStash.selectedFile.safeDiff = parsedDiff[0].safeDiff;
                        });
                    }
                    else {
                        vm.selectedStash.selectedFile = file;
                    }
                }
                
                /*
                    Select a stash from list of stashes. And select the first file in the list.
                */
                function selectStash() {
                    // TODO: Show loading dialog.
                    var stash = vm.selectedStash;

                    if(!stash.name) {
                        return;
                    }

                    if(stash.name === 'Local Changes') {
                        // show local changes.
                        if(repoDetailService.selectStash.canceler) {
                            repoDetailService.selectStash.canceler.resolve();
                        }
                        if(vm.localStatus) {
                            vm.selectedStash.diffDetails = vm.localStatus.map(function(f) {
                                return {
                                    fileName: f.name,
                                    commitType: f.tags.indexOf('added') > -1 ? 'new' : (f.tags.indexOf('deleted') > -1 ? 'deleted' : 'modified'),
                                    tags: f.tags
                                };
                            });

                            vm.selectedStash.selectedFile = vm.selectedStash.diffDetails[0];

                            selectFileInStash(vm.selectedStash.selectedFile);
                        }

                        return;
                    }

                    return repoDetailService.selectStash(stash).then(function(op) {
                        vm.selectedStash.diffDetails = parseDiff(op.output.join(''));
                        vm.selectedStash.selectedFile = vm.selectedStash.diffDetails[0];
                        vm.diffSelectedStashFile = vm.selectedStash.diffDetails[0].safeDiff;
                    });
                }

                function showStashDialog() {
                    // TODO: Show loading dialog.
                    updateStashes();
                    $stashModal.modal('show');
                }

                function updateStashes() {
                    return repoDetailService.getStashList().then(function(stashList) {
                        stashList = stashList.output.join('').trim().split('\n');

                        vm.stashes = stashList.map(function(s) {
                            s = s.split(/:(.+)/);
    
                            return {
                                name: s[0],
                                description: s[1]
                            };
                        });
                        
                        // TODO: if no local changes, show no local changes in description.
                        var local = {name: 'Local Changes', description: 'Local changes.'};
                        vm.selectedStash = vm.stashes.length > 0 ? vm.stashes[0] : local;
    
                        vm.stashes.splice(0, 0, local);

                        vm.selectStash();
                    });
                }

                function commitAndPush() {
                  commit().then(function() {
                    vm.showPushDialog();
                  });
                }

                function showPushDialog() {
                  vm.pushOptions = {};
                  $pushModal.modal('show');
                }

                function push() {
                  $responseModal.one('hide.bs.modal', function() {
                    refreshLog();
                    $pushModal.modal('hide');
                  });
                  $responseModalTitle.text('Pushing ' + vm.currentLocalBranch + ' to ' + vm.remote + '/' + vm.pushOptions.remoteBranch);
                  $responseModal.modal('show');
                  return repoDetailService.push(vm.remote, vm.pushOptions.remoteBranch, vm.pushOptions.newRemoteBranchName).then(function(data) {
                    $responseModalBody.html(data.errors.join('<br />').replace('\n', '<br />'));
                    initializeRemote();
                  });
                }

                function pull() {
                  $responseModalTitle.text('Pulling');
                  $responseModal.modal('show');
                  return repoDetailService.pull({
                    remoteBranch: vm.pullOptions.remoteBranch,
                    mergeOption: vm.pullOptions.mergeOption
                  }).then(function(response) {
                    $responseModalBody.html(response.errors.join('').replace(/\n/g, '<br />') + response.output.join('').replace(/\n/g, '<br />'));
                    // TODO: refresh the main log.
                  });
                }

                function initializeRemote() {
                  return repoDetailService.initRepo().then(function(d) {
                    vm.remote = d.remote;
                    vm.remoteBranches = d.remoteBranches.slice(1)
                                            .map(function(b) {
                                                // remove `origin/` from the branch names.
                                                return b.substring('origin/'.length);
                                            });    // first is the reference to origin/HEAD
                    vm.currentLocalBranch = d.currentBranch;
                    vm.localBranches = d.localBranches;

                    // try to determine the default selected  remote branch in the pull dialog
                    if(vm.remoteBranches.indexOf('origin/' + vm.currentLocalBranch) > -1) {
                        vm.pullOptions.remoteBranch = 'origin/' + vm.currentLocalBranch;
                    }
                  });
                }

                function showPullDialog() {
                  $pullModal.modal('show');
                }

                function bindLazyLoadingCommits() {
                  var lazyLoadingInProgress = false;
                  var noMoreCommits = false;
                  $mainLogContainer.on('scroll', function() {
                    if(lazyLoadingInProgress || noMoreCommits) {
                      return;
                    }
                    if($mainLogContainer.scrollTop() + $mainLogContainer.innerHeight() + 50 >= $mainLogContainer[0].scrollHeight) {   // start loading before 50px from the bottom.
                      lazyLoadingInProgress = true;
                      // load next batch of commits.
                      var page = +$mainLogContainer.data('pageNum');
                      page++;
                      $mainLogContainer.data('pageNum', page);
                      $mainLogLoadingIndicator.show();
                      getNextBatchOfLog(page).then(function(commits) {
                        $mainLogLoadingIndicator.hide();
                        lazyLoadingInProgress = false;

                        // no commits returned; reached the bottom.
                        if(commits === false) {
                          noMoreCommits = true;
                        }
                        else {
                            $timeout(loadGraph).then(function() {
                                backupGraph();
                            });
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
                  return repoDetailService.getCommits(1).then(function(commits) {
                    if(commits.length == 0) {
                      return false;
                    }
                    parseCommits(commits);
                    vm.commits = commits;
                    resetCommitMap();
                    backupCommits();
                    $timeout(loadGraph).then(function() {
                        backupGraph();
                    });
                    return vm.commits;
                  });
                }

                function getNextBatchOfLog(page) {
                  return repoDetailService.getCommits(page).then(function(commits) {
                    if(commits.length == 0) {
                      return false;
                    }
                    parseCommits(commits);
                    vm.commits = vm.commits || [];

                    resetTempCommits();

                    Array.prototype.push.apply(vm.commits, commits);

                    resetCommitMap();

                    backupCommits();

                    return vm.commits;
                  });
                }

                function commit() {
                    return repoDetailService.commit(vm.commitMessage).then(function(res) {
                        vm.commitMessage = '';      // reset the commit message.
                        // close the modal.
                        // TODO: An error must throw an exception and be handled in the catch statement.
                        $commitModal.modal('hide');
                        
                        // refresh the log so that new commits now appear in it.
                        return refreshLog().then(function() {
                          // refresh local to remove committed files from modified files' list.
                          return vm.refreshLocalChanges();
                        });
                    }).catch(function(err) {
                      $responseModalTitle.text('Error!');
                      $responseModalBody.html(err.join('<br />'));
                      $responseModal.modal('show');
                    });
                }

                function resetTempCommits() {
                    // remove temp commits from vm.commits as the real commits might have arrived.
                    vm.commitMap = {};
                    vm.commits = vm.commits.filter(function(c) {
                        return !c.isTemp;
                    });
                }

                function resetCommitMap() {
                    var createTempCommit = function(hash) {
                        return {
                            children: [],
                            hash: hash,
                            isTemp: true,
                            parentHashes: []
                        };
                    };

                    vm.commitMap = {};
                    for(var i = 0; i < vm.commits.length; i++) {
                        vm.commitMap[vm.commits[i].hash] = vm.commits[i];
                    }

                    for(var i = 0; i < vm.commits.length; i++) { 
                        for(var j = 0; j < vm.commits[i].parentHashes.length; j++) {
                            if(!vm.commitMap[vm.commits[i].parentHashes[j]]) {
                                vm.commitMap[vm.commits[i].parentHashes[j]] = createTempCommit(vm.commits[i].parentHashes[j]);
                                vm.commits.push(vm.commitMap[vm.commits[i].parentHashes[j]]);
                            }
                            vm.commitMap[vm.commits[i].parentHashes[j]].children.push(vm.commits[i].hash);
                        }
                    }
                }

                function parseCommits(commits) {
                    commits = commits.map(function(c) {
                        c.parentHashes = c.parentHashes.split(' ');
                        c.fromNow = moment(c.date).fromNow();
                        c.children = [];

                        vm.commitMap[c.hash] = c;
                        return c;
                    });

                    
                }

                function setGraphInfo() {
                    var commits = vm.commits;

                    if(commits.length == 0) {
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
                        t = null,
                        tempCommit = null;

                    var branchIdx = null;

                    for(var i = 0; i < commits.length; i++) {
                        
                        currCommit = commits[i];
                        nextCommit = commits[i + 1];
                        first = true;
                        for(j = 0; j < currCommit.parentHashes.length; j++) {
                            idx = openBranches.indexOf(currCommit.parentHashes[j]);
                            if(idx > -1) {
                                // in case a commit is on branch-2 and there are some commits on branch-1 after (chronogically) our commit;
                                // but parent of our commit is supposed to be on branch-1 (since branch-2 started from its parent).
                                // Then the parent should be on branch-1. 
                                // It should look as if branch-2 is coming out of branch-1. Therefore the parent will be on branch-1;
                                t = vm.commitMap[openBranches[idx]];
                                if(!t) {
                                    t = tempCommit;
                                }

                                if(typeof t.x != 'undefined') {
                                    if(t.x > currCommit.x) {
                                        t.x = currCommit.x;
                                    }
                                    else {
                                        // keep t.x as it is.
                                    }
                                }
                                else {
                                    t.x = currCommit.x;
                                }
                                openBranches[idx] = false;
                            }
                            else if(typeof currCommit.x == 'undefined') {
                                // new branch!
                                // check if openBranches has a vacancy. if yes, fill it.

                                branchIdx = openBranches.indexOf(false);
                                if(branchIdx > -1) {
                                    openBranches[branchIdx] = currCommit.hash;
                                }
                                else {
                                    openBranches.push(currCommit.hash);
                                    branchIdx = openBranches.length - 1;
                                }



                                currCommit.x = branchIdx;
                                j--;
                                continue;
                            }
                            else if(first) {
                                // replace the openBranch with current parent.
                                first = false;
                                // openBranches.splice(openBranches.indexOf(currCommit.hash), 1, currCommit.parentHashes[j]);
                                branchIdx = openBranches.indexOf(currCommit.hash);
                                openBranches[branchIdx] = currCommit.parentHashes[j];

                                vm.commitMap[currCommit.parentHashes[j]].x = currCommit.x;
                            }
                            else {
                                branchIdx = openBranches.indexOf(false);
                                if(branchIdx > -1) {
                                    openBranches[branchIdx] = currCommit.parentHashes[j];
                                }
                                else {
                                    openBranches.push(currCommit.parentHashes[j]);
                                    branchIdx = openBranches.length - 1;
                                }
                                vm.commitMap[currCommit.parentHashes[j]].x = branchIdx;
                            }
                        }
                    }
                    // maxX will be used to set the width of the canvas.
                    vm.maxX = openBranches.length;
                }

                function unstageAllFiles() {
                    repoDetailService.unstageAllFiles().then(function(res) {
                        // TODO: Handle errors here. Probably CRLF errors.
                        if(res === '' || (res.output && res.output.join('\n').trim().length == 0)) {
                            vm.refreshLocalChanges();
                        }
                    });
                }

                function stageAllFiles() {
                    repoDetailService.stageAllFiles().then(function(res) {
                        // TODO: Handle errors here. Probably CRLF errors.
                        if(res === '' || (res.output && res.output.join('\n').trim().length == 0)) {
                            vm.refreshLocalChanges();
                        }
                    });
                }

                function unstageFile() {
                    repoDetailService.unstageFile(vm.fileSelectedOnCommitModal.name, vm.fileSelectedOnCommitModal.tags).then(function(res) {
                        // TODO: Handle errors here. Probably CRLF errors.
                        if(res === '' || (res.output && res.output.join('\n').trim().length == 0)) {
                            vm.refreshLocalChanges();
                        }
                    });
                }

                function stageFile() {
                    repoDetailService.stageFile(vm.fileSelectedOnCommitModal.name, vm.fileSelectedOnCommitModal.tags).then(function(res) {
                        // TODO: Handle errors here. Probably CRLF errors.
                        if(res === '' || (res.output && res.output.join('\n').trim().length == 0)) {
                            vm.refreshLocalChanges();
                        }
                    });
                }

                function showDiffForFileOnCommitModal(file) {
                    if(file.tags.indexOf('bothmodified') > -1 && file.tags.indexOf('staged') > -1) {
                        // no diff for this.
                        // TODO: Should we show a conflict message here?
                        vm.diffOnCommitModal.safeDiff = '';
                        vm.diffOnCommitModal.file = file;
                        return;
                    }
                    if(!file) {
                        vm.diffOnCommitModal.safeDiff = '';
                        return;
                    }
                    vm.diffOnCommitModal = {
                        file: file
                    };

                    vm.fileSelectedOnCommitModal = file;
                    repoDetailService.getFileDiff(file.name, file.tags).then(function(diff) {
                        if(typeof diff == 'object') {
                            diff = diff.output.join('\n').trim();
                            // TODO: Handle errors here.. probably CRLF errors.
                        }
                        var commitDetails = parseDiff(diff);
                        vm.diffOnCommitModal.safeDiff = $sce.trustAsHtml(commitDetails[0].diff);
                    });
                }

                function showCommitDialog() {
                    // use vm.localStatus
                    $commitModal.modal('show');
                    $commitModal.one('shown.bs.modal', function() {
                        // select the first commit to show the diff.
                        showDefaultFileOnCommitModalDialog();
                    });
                    $commitModal.one('hide.bs.modal', function() {
                        vm.diffOnCommitModal = null;
                    });
                }

                function showDefaultFileOnCommitModalDialog() {
                    var fileToSelect = vm.unstagedFiles.length > 0 ? vm.unstagedFiles[0] : vm.stagedFiles[0];
                    showDiffForFileOnCommitModal(fileToSelect);
                }

                function refreshLocalChanges() {
                    return repoDetailService.refreshLocalChanges().then(function(data) {
                        if(data.progress) {
                            vm.progress = {};
                            switch(data.progress) {
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
                        vm.stagedFiles = $filter('filter')(vm.localStatus, {tags: 'staged'}, true);
                        vm.unstagedFiles = $filter('filter')(vm.localStatus, {tags: 'unstaged'}, true);

                        if(($commitModal.data('bs.modal') || {})._isShown) {
                            unselectFilesAfterLocalRefresh();
                        }
                    });
                }

                function selectFileInLog(file) {
                    vm.selectedFileDiff = $sce.trustAsHtml(file.diff);
                    vm.selectedFileDiffRaw = file.diff;
                }

                function selectCommit(commit) {
                    if(typeof commit === 'string') {
                        commit = vm.commitMap[commit];
                    }
                    var hash = commit.hash;
                    vm.selectedCommit = hash;

                    repoDetailService.getCommit(hash).then(function(data) {
                        var d = data.split('\n');

                        var isMergeCommit = false;

                        if(d[1].indexOf('Merge') == 0) {
                            isMergeCommit = true;
                        }

                        if(!isMergeCommit) {
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
                        while(str.indexOf('diff') !== 0 && d[i + 1] != undefined) {
                            message += str + '\n';
                            str = d[++i];
                        }

                        vm.commitDetails.message = message;

                        if(!isMergeCommit) {
                            var diff = d.slice(i);
                            vm.commitDetails.diff = diff.join('\n');
    
                            vm.commitDetails.diffDetails = parseDiff(vm.commitDetails.diff);
                            // pre select the first file of the commit.
                            vm.selectFileInLog(vm.commitDetails.diffDetails[0]);
                        }

                        if(isMergeCommit) {
                            repoDetailService.getDiff(vm.commitDetails.merges).then(function(diff) {
                                vm.commitDetails.diff = diff;

                                vm.commitDetails.diffDetails = parseDiff(vm.commitDetails.diff);
                                // pre select the first file of the commit.
                                vm.selectFileInLog(vm.commitDetails.diffDetails[0]);
                            });
                        }
                    });
                }
              }
            ],
            controllerAs: 'vm'
        }); 
        
    repoDetailModule.service('repoDetailService', ['$http', '$q', function($http, $q) {
        this.unstageFile = unstageFile;
        this.stageFile = stageFile;
        this.getFileDiff = getFileDiff;
        this.refreshLocalChanges = refreshLocalChanges;
        this.getCommits = getCommits;
        this.getCommit = getCommit;
        this.stageAllFiles = stageAllFiles;
        this.unstageAllFiles = unstageAllFiles;
        this.getDiff = getDiffBetweenCommits;
        this.commit = commit;
        this.initRepo = initRepo;
        this.pull = pull;
        this.push = push;
        this.selectStash = selectStash;
        this.getStashList = getStashList;
        this.stashLocalChanges = stashLocalChanges;
        this.dropSelectedStash = dropSelectedStash;
        this.applyStash = applyStash;
        this.resetAllChanges = resetAllChanges;
        this.resetUnstagedChanges = resetUnstagedChanges;
        this.createNewBranch = createNewBranch;
        this.checkoutLocalBranch = checkoutLocalBranch;
        this.rebaseCurrentBranchOn = rebaseCurrentBranchOn;
        this.doResetHEADFile = doResetHEADFile;
        this.abortRebase = abortRebase;
        this.continueRebase = continueRebase;
        this.removeFile = removeFile;
        this.skipRebase = skipRebase;
        this.mergeIntoCurrent = mergeIntoCurrent;
        this.abortMerge = abortMerge;
        this.searchForHash = searchForHash;
        this.searchForCommitMessage = searchForCommitMessage;

        return;

        function searchForCommitMessage(searchText) {
            return $http.post('/repo/' + repoName + '/searchforcommitmessage', {text: window.encodeURIComponent(searchText)}).then(function(res) {
                return res.data;
            });
        }

        function searchForHash(hash) {
            return $http.post('/repo/' + repoName + '/searchforhash', {hash: hash}).then(function(res) {
                return res.data;
            });
        }

        function abortMerge() {
            return $http.post('/repo/' + repoName + '/abortmerge').then(function(res) {
                return res.data;
            });
        }

        function mergeIntoCurrent(branchName) {
            return $http.post('/repo/' + repoName + '/merge', {obj: branchName}).then(function(res) {
                return res.data;
            });
        }

        function skipRebase() {
            return $http.post('/repo/' + repoName + '/skiprebase').then(function(res) {
                return res.data;
            });
        }

        function continueRebase() {
            return $http.post('/repo/' + repoName + '/continuerebase').then(function(res) {
                return res.data;
            });
        }

        function abortRebase() {
            return $http.post('/repo/' + repoName + '/abortrebase').then(function(res) {
                return res.data;
            });
        }

        function doResetHEADFile(fileName) {
            return $http.post('/repo/' + repoName + '/resetheadfile', {
                fileName: window.encodeURIComponent(fileName)
            }).then(function(res) {
                return res.data;
            });
        }

        function rebaseCurrentBranchOn(branchNameOrRevision) {
            return $http.post('/repo/' + repoName + '/rebasecurrentbranchon', {
                branchNameOrRevision: branchNameOrRevision
            }).then(function(res) {
                return res.data;
            });
        }

        function checkoutLocalBranch(branchName) {
            return $http.post('/repo/' + repoName + '/checkoutlocalbranch', {
                branchName: encodeURIComponent(branchName)
            }).then(function(res) {
                return res.data;
            });
        }

        function createNewBranch(revision, branchName, checkoutAfterCreate) {
            return $http.post('/repo/' + repoName + '/createnewbranch', {revision: revision, branchName: branchName, checkoutAfterCreate: checkoutAfterCreate}).then(function(res) {
                return res.data;
            });
        }

        function resetUnstagedChanges(deleteUntracked) {
            return $http.post('/repo/' + repoName + '/resetunstaged', {deleteUntracked: deleteUntracked}).then(function(res) {
                return res.data;
            });
        }

        function resetAllChanges(deleteUntracked) {
            return $http.post('/repo/' + repoName + '/resetall', {deleteUntracked: deleteUntracked}).then(function(res) {
                return res.data;
            });
        }

        function applyStash(name, pop) {
            return $http.post('/repo/' + repoName + '/applystash', {pop: pop, name: name}).then(function(res) {
                return res.data;
            });
        }

        function dropSelectedStash(stashName) {
            return $http.delete('/repo/' + repoName + '/dropstash/' + stashName).then(function (res) {
                return res.data;
            });
        }

        function stashLocalChanges(includeUntracked) {
            return $http.post('/repo/' + repoName + '/stashlocal', {includeUntracked: includeUntracked}).then(function(res) {
                return res.data;
            });
        }

        function getStashList() {
            return $http.get('/repo/' + repoName + '/getstashlist').then(function(res) {
                return res.data;
            });
        }

        function selectStash(stash) {
            if(selectStash.canceler) {
                // if this request already exists, cancel the request;
                selectStash.canceler.resolve();
            }
            selectStash.canceler = $q.defer();
            return $http.get('/repo/' + repoName + '/selectstash?name=' + stash.name, {timeout: selectStash.canceler.promise}).then(function(res) {
                return res.data;
            });
        }

        function push(remoteName, remoteBranch, newRemoteBranchName) {
          if(remoteBranch == 'create-new-branch') {
              return $http.post('/repo/' + repoName + '/pushnewbranch', {
                    remoteName: remoteName,
                    newRemoteBranchName: newRemoteBranchName
              }).then(function(res) {
                  return res.data;
              })
          }
          return $http.get('/repo/' + repoName + '/push?remotename=' + remoteName + '&remotebranch=' + remoteBranch).then(function(res) {
            return res.data;
          });
        }

        function pull(options) {
          var remoteBranch = options.remoteBranch,
              mergeOption = options.mergeOption;

          return $http.get('/repo/' + repoName + '/pull?remotebranch=' + remoteBranch + '&mergeoption=' + mergeOption).then(function(res) {
            return res.data;
          });
        }

        /**
          Initializes stuff like remote name, local and remote branches, etc. One time stuff.
        */
        function initRepo() {
          return $http.get('/repo/' + repoName + '/initrepo').then(function(res) {
            return res.data.output;
          });
        }

        function commit(message) {
            return $http.get('/repo/' + repoName + '/commit?message=' + window.encodeURIComponent(message)).then(function(res) {
                if(!res.data.errorCode) {
                    return res.data.output.join('\n');
                }
                else {
                    // alert('there was an error');
                    return Promise.reject(res.data.errors);
                }
            });
        }

        function getDiffBetweenCommits(commits) {
            return $http.get('/repo/' + repoName + '/diffbetweencommits?commit1=' + commits[0] + '&commit2=' + commits[1]).then(function(res) {
                if(!res.data.errorCode) {
                    return res.data.output.join('\n');
                }y
                return res.data;
            });
        }

        function unstageAllFiles() {
            return $http.get('/repo/' + repoName + '/unstageallfiles').then(function(res) {
                if(!res.data.errorCode) {
                    return res.data.output.join('\n');
                }
                return res.data;
            });
        }

        function stageAllFiles() {
            return $http.get('/repo/' + repoName + '/stageallfiles').then(function(res) {
                if(!res.data.errorCode) {
                    return res.data.output.join('\n');
                }
                return res.data;
            });
        }

        function getCommit(hash) {
            return $http.get('/repo/' + repoName + '/getcommit/' + hash).then(function(res) {
                if(!res.data.errorCode) {
                    return res.data.output.join('\n');
                }
                return res.data;
            });
        }

        function getCommits(page) {
            page = page || 1;
            return $http.get('/repo/' + repoName + '/getrepolog?page=' + page).then(function(res) {
                return res.data;
            });
        }

        function refreshLocalChanges() {
            return $http.get('/repo/' + repoName + '/refreshlocal').then(function(res) {
                if(!res.data.errorCode) {
                    return {
                        progress: res.data.extraInfo && res.data.extraInfo.progress,
                        localStatus: res.data.output.join('\n')
                    };
                }
                return res.data;
            });
        }

        function getFileDiff(file, tags) {
            if(getFileDiff.canceler) {
                // if this request already exists, cancel the request;
                getFileDiff.canceler.resolve();
            }
            getFileDiff.canceler = $q.defer();
            return $http.get('/repo/' + repoName + '/getfilediff?filename=' + encodeURIComponent(file) + '&tags=' + encodeURIComponent(tags.join(',')), {timeout: getFileDiff.canceler.promise}).then(function(res) {
                if(!res.data.errorCode) {
                    return res.data.output.join('\n');
                }
                return res.data;
            });
        }

        function removeFile(name, tags) {
            return $http.post('/repo/' + repoName + '/removefile', {
                name: name,
                tags:tags.join(',')
            }).then(function(res) {
                if(!res.data.errorCode) {
                    return res.data;
                }
                return res.data;
            });
        }

        function stageFile(file, tags) {
            return $http.get('/repo/' + repoName + '/stagefile?filename=' + encodeURIComponent(file) + '&tags=' + encodeURIComponent(tags.join(','))).then(function(res) {
                if(!res.data.errorCode) {
                    return res.data.output.join('\n');
                }
                return res.data;
            });
        }

        function unstageFile(file, tags) {
            return $http.get('/repo/' + repoName + '/unstagefile?filename=' + encodeURIComponent(file) + '&tags=' + encodeURIComponent(tags.join(','))).then(function(res) {
                if(!res.data.errorCode) {
                    return res.data.output.join('\n');
                }
                return res.data;
            });
        }
    }]);

    function parseLocalStatus(data) {
        if(typeof data == 'object') {
            // TODO: handle data.errors here. They are probably CRLF errors.
            data = data.output.join('\n').trim();
        }
        data = data.split('\n').filter(function(d) { return d.length > 0; });


        var t = [];
        data.forEach(function(f) {
            var fileTags = [];

            var firstTwoCharacters = f.substring(0, 2);
            if(firstTwoCharacters == 'DD' || firstTwoCharacters == 'AA' || firstTwoCharacters.indexOf('U') > -1) {
                // conflict state.
                switch(firstTwoCharacters) {
                    case 'UU': {
                        // unmerged, both modified
                        fileTags.push('unstaged', 'conflicted', 'conflictedunstaged', 'unmerged', 'bothmodified');
                        t.push({
                            name: f.substring(3),
                            tags: fileTags
                        });
                        fileTags = [];
                        fileTags.push('staged', 'conflicted', 'conflictedstaged', 'unmerged', 'bothmodified');
                        t.push({
                            name: f.substring(3),
                            tags: fileTags
                        });
                        break;
                    }
                    case 'DU': {
                        // unmerged, deleted by us.
                        fileTags.push('unstaged', 'conflicted', 'conflictedunstaged', 'unmerged', 'deletedbyus');
                        t.push({
                            name: f.substring(3),
                            tags: fileTags
                        });
                        break;
                    }
                    case 'UD': {
                        // unmerged, deleted by them.
                        fileTags.push('unstaged', 'conflicted', 'conflictedunstaged', 'unmerged', 'deletedbythem');
                        t.push({
                            name: f.substring(3),
                            tags: fileTags
                        });
                        break;
                    }
                }
                vm.conflict = true;
                return;
            }
            switch(f[0]) {
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
            if(f[0].trim().length && f[0] != '?') {     // `?` == untracked, will be handled below.
                t.push({
                    name: f.substring(3),
                    tags: fileTags
                });
            }

            fileTags = [];

            switch(f[1]) {
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
            if(f[1].trim().length) {
                t.push({
                    name: f.substring(3),
                    tags: fileTags
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
        for(var i = 0; i < diff.length; i++) {
            line = diff[i];

            if(line.indexOf('diff') === 0) {
                currDiff = {
                    fileName: line.substring(line.indexOf('b/') + 2),
                    commitType: diff[i + 1].indexOf('new') === 0 ? 'new' : (diff[i + 1].indexOf('similarity') === 0 ? 'rename' : ( diff[i + 1].indexOf('deleted') === 0 ? 'deleted' : 'modified'))
                };

                currDiff.diff = line;

                for(i = i + 1; i < diff.length; i++) {
                    if(diff[i].indexOf('diff') === 0) {
                        i--;
                        diffDetails.push(currDiff);
                        break;
                    }
                    else {
                        var formattedStr = diff[i];
                        // strip tags off formattedStr.
                        formattedStr = formattedStr.replace(/\</g, '&lt;').replace(/\>/g, '&gt;');
                        if(formattedStr.indexOf('+') === 0) {
                            formattedStr = '<span class="line-added">' + formattedStr + '</span>'
                        }
                        else if(formattedStr.indexOf('-') === 0) {
                            formattedStr = '<span class="line-removed">' + formattedStr + '</span>';
                        }
                        else if(formattedStr.indexOf('@') === 0 || formattedStr.indexOf('\\') === 0) {
                            formattedStr = '<span class="line-special">' + formattedStr + '</span>';
                        }

                        currDiff.diff = currDiff.diff + '\n' + formattedStr;
                        currDiff.safeDiff = $sce.trustAsHtml(currDiff.diff);
                    }
                }
            }
        }

        if(currDiff) {
            diffDetails.push(currDiff);
        }
        
        return diffDetails;
    }
})();