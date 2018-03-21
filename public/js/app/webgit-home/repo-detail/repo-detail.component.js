// TODO: Handle error codes.
(function() {
    var repoDetailModule = angular.module('RepoDetailModule', ['ngRoute']);
    var repoName = null;
    var $commitModal = null;
    var $pushModal = null;
    var $stashModal = null;
    var $responseModal = $('#response-modal');
    var $responseModalTitle = $responseModal.find('#response-title');
    var $responseModalBody = $responseModal.find('#response-body');

    var $sce = null;
    
    repoDetailModule
        .component('repoDetail', {
            templateUrl: '/js/app/webgit-home/repo-detail/repo-detail.html',
            controller: ['$routeParams', 'repoDetailService', '$sce', '$scope', '$filter', 'UtilsService',
              function RepoDetailController($routeParams, repoDetailService, $sceLocal, $scope, $filter, UtilsService) {
                $sce = $sceLocal;
                // repoName = UtilsService.decodePath($routeParams.repoName);
                repoName = $routeParams.repoName;
    
                this.repoName = repoName;

                var vm = this;
                var $mainLogContainer = $('#main-log-container');
                var $mainLogLoadingIndicator = $('#main-log-loading-indicator');

                $commitModal = $('#commit-modal');
                $pullModal = $('#pull-modal');
                $pushModal = $('#push-modal');
                $stashModal = $('#stash-modal');
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

                vm.commitMessage = '';
                vm.remote = null;
                vm.remoteBranches = [];
                vm.currentLocalBranch = null;
                vm.localBranches = [];
                vm.pullOptions = {
                  mergeOption: 'merge'
                };

                vm.commitMap = {};
                vm.stashes = [];

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

                initialize();
                refreshLog().then(loadGraph);
                vm.refreshLocalChanges();
                bindLazyLoadingCommits();

                // TODO: comment out this.
                window.vm = vm;

                return;

                function loadGraph() {
                    
                }

                function selectFileInStash(file) {
                    if(vm.selectedStash.name === 'Local Changes') {
                        vm.selectedStash.selectedFile = file;
                        repoDetailService.getFileDiff(file.fileName, file.tags).then(function(diff) {
                            // debugger;
                            var parsedDiff = parseDiff(diff);
                            vm.selectedStash.selectedFile.safeDiff = parsedDiff[0].safeDiff;
                            // vm.selectedStash.diffDetails = parseDiff(diff);
                            // vm.selectedStash.selectedFile = vm.selectedStash.diffDetails[0];
                            // vm.diffSelectedStashFile = vm.selectedStash.diffDetails[0].safeDiff;
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
                    if(stash.name === 'Local Changes') {
                        // show local changes.
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
    
                        var local = {name: 'Local Changes', description: 'There are no stashes.'};
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
                  $pushModal.modal('show');
                }

                function push() {
                  $responseModal.one('hide.bs.modal', function() {
                    refreshLog();
                    $pushModal.modal('hide');
                  });
                  $responseModalTitle.text('Pushing ' + vm.currentLocalBranch + ' to ' + vm.remote + '/' + vm.pushOptions.remoteBranch);
                  $responseModal.modal('show');
                  return repoDetailService.push(vm.remote, vm.pushOptions.remoteBranch).then(function(data) {
                    $responseModalBody.html(data.errors.join('<br />').replace('\n', '<br />'));
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

                function initialize() {
                  return repoDetailService.initRepo().then(function(d) {
                    vm.remote = d.remote;
                    vm.remoteBranches = d.remoteBranches.slice(1).map(function(b) {
                      // remove `origin/` from the branch names.
                      return b.substring('origin/'.length);
                    });    // first is the reference to origin/HEAD
                    vm.currentLocalBranch = d.currentBranch;
                    vm.localBranches = d.localBranches;
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
                      });
                    }
                  });
                }

                function refreshLog(page) {
                  if(!page) {
                    page = +$mainLogContainer.data('pageNum');
                  }
                  return repoDetailService.getCommits(page).then(function(commits) {
                    if(commits.length == 0) {
                      return false;
                    }
                    parseCommits(commits);
                    vm.commits = commits;
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
                    Array.prototype.push.apply(vm.commits, commits);
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

                function parseCommits(commits) {
                    commits = commits.map(function(c) {
                        c.parentHashes = c.parentHashes.split(' ');
                        c.branches = [];
                        c.fromNow = moment(c.date).fromNow();

                        vm.commitMap[c.hash] = c;
                        return c;
                    });



                    // TODO: Add code here to draw branches.
                    return;

                    var branches = {};
                    var commitBranchMap = {};
                    var commitMap = {};

                    var branchNum = 0;

                    commits.forEach(function(c) { commitMap[c.hash] = c; });

                    commits.forEach(function(commit, idx) {
                        if(!commit.branches[0]) {
                            commit.branches.push(++branchNum);
                        }
                        commit.parentHashes.forEach(function(parentHash, idx) {
                            if(idx == 1) {
                                // for 2nd parent hash, the current commit is also present on the (new, so + 1) branch of the new commit.
                                commit.branches.push(branchNum + 1);
                                commit.branches = commit.branches.sort();
                            }
                            var parentCommit = commitMap[parentHash];
                            if(parentCommit) {
                                // first parent commit will have branch same as that of current commit.
                                // second parent commit will have new branch.
                                parentCommit.branches.push(idx == 0 ? commit.branches[0] : ++branchNum);
                            }
                        });
                    });
                }

                function unstageAllFiles() {
                    repoDetailService.unstageAllFiles().then(function(res) {
                        if(res === '') {
                            vm.refreshLocalChanges();
                        }
                    });
                }

                function stageAllFiles() {
                    repoDetailService.stageAllFiles().then(function(res) {
                        if(res === '') {
                            vm.refreshLocalChanges();
                        }
                    });
                }

                function unstageFile() {
                    repoDetailService.unstageFile(vm.fileSelectedOnCommitModal.name, vm.fileSelectedOnCommitModal.tags).then(function(res) {
                        if(res === '') {
                            vm.refreshLocalChanges();
                        }
                    });
                }

                function stageFile() {
                    repoDetailService.stageFile(vm.fileSelectedOnCommitModal.name, vm.fileSelectedOnCommitModal.tags).then(function(res) {
                        if(res === '') {
                            vm.refreshLocalChanges();
                        }
                    });
                }

                function showDiffForFileOnCommitModal(file) {
                    if(!file) {
                        return;
                    }
                    vm.diffOnCommitModal = {
                        file: file
                    };

                    vm.fileSelectedOnCommitModal = file;
                    repoDetailService.getFileDiff(file.name, file.tags).then(function(diff) {
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
                        vm.localStatus = parseLocalStatus(data);
                        vm.stagedFiles = $filter('filter')(vm.localStatus, {tags: 'staged'}, true);
                        vm.unstagedFiles = $filter('filter')(vm.localStatus, {tags: 'unstaged'}, true);

                        if(($commitModal.data('bs.modal') || {})._isShown) {
                            showDefaultFileOnCommitModalDialog();
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
        
    repoDetailModule.service('repoDetailService', ['$http', function($http) {
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

        return;

        function getStashList() {
            return $http.get('/repo/' + repoName + '/getstashlist').then(function(res) {
                return res.data;
            });
        }

        function selectStash(stash) {
            return $http.get('/repo/' + repoName + '/selectstash?name=' + stash.name).then(function(res) {
                return res.data;
            });
        }

        function push(remoteName, remoteBranch) {
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
                    return res.data.output.join('\n');
                }
                return res.data;
            });
        }

        function getFileDiff(file, tags) {
            return $http.get('/repo/' + repoName + '/getfilediff?filename=' + encodeURIComponent(file) + '&tags=' + encodeURIComponent(tags.join(','))).then(function(res) {
                if(!res.data.errorCode) {
                    return res.data.output.join('\n');
                }
                return res.data;
            });
        }

        function stageFile(file, tags) {
            console.log(tags);
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
        data = data.split('\n').filter(function(d) { return d.length > 0; });


        var t = [];
        data.forEach(function(f) {
            var fileTags = [];
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
            }
            if(f[0].trim().length) {
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
                    commitType: diff[i + 1].indexOf('new') === 0 ? 'new' : (diff[i + 1].indexOf('similarity') === 0 ? 'rename' : ( diff[i + 1].indexOf('deleted') === 0 ? 'deleted' : 'edit'))
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