// TODO: Handle error codes.
(function() {
    var repoDetailModule = angular.module('RepoDetailModule', ['ngRoute']);
    var repoName = null;
    var $commitModal = null;
    var $responseModal = $('#response-modal');
    var $responseModalTitle = $responseModal.find('#response-title');
    var $responseModalBody = $responseModal.find('#response-body');
    
    repoDetailModule
        .component('repoDetail', {
            templateUrl: '/js/app/repositories/repo-detail/repo-detail.html',
            controller: ['$routeParams', 'repoDetailService', '$sce', '$scope', '$filter', 'UtilsService',
              function RepoDetailController($routeParams, repoDetailService, $sce, $scope, $filter, UtilsService) {
                // repoName = UtilsService.decodePath($routeParams.repoName);
                repoName = $routeParams.repoName;
    
                this.repoName = repoName;

                var vm = this;
                var $mainLogContainer = $('#main-log-container');
                var $mainLogLoadingIndicator = $('#main-log-loading-indicator');

                $commitModal = $('#commit-modal');
                $pullModal = $('#pull-modal');
                vm.selectedCommit = null;
                vm.modifiedFileNames = [];

                vm.selectCommit = selectCommit;
                vm.selectFile = selectFile;
                vm.refreshLocalChanges = refreshLocalChanges;
                vm.showCommitDialog = showCommitDialog;
                vm.showDiffForFileOnCommitModal = showDiffForFileOnCommitModal;
                vm.stageFile = stageFile;
                vm.unstageFile = unstageFile;
                vm.stageAllFiles = stageAllFiles;
                vm.unstageAllFiles = unstageAllFiles;
                vm.showPullDialog = showPullDialog;
                vm.commit = commit;
                vm.pull = pull;

                vm.commitMessage = '';
                vm.remote = null;
                vm.remoteBranches = [];
                vm.currentLocalBranch = null;
                vm.localBranches = [];
                vm.pullOptions = {
                  mergeOption: 'merge'
                };

                vm.commitMap = {};

                $scope.$on('windowfocus', function() {
                    if(($commitModal.data('bs.modal') || {})._isShown) {
                        // do not refresh when the modal window is open. use the refresh button instead.
                        return;
                    }
                    vm.refreshLocalChanges();
                });

                $commitModal.on('hide.bs.modal', function (e) {
                    
                });

                $responseModal.on('hide.bs.modal', function(e) {
                  $responseModalBody.html('');
                });

                initialize();
                refreshLog();
                vm.refreshLocalChanges();
                bindLazyLoadingCommits();

                return;

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
                      refreshLog(page).then(function(commits) {
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
                    vm.commits = vm.commits || [];
                    Array.prototype.push.apply(vm.commits, commits);
                    return vm.commits;
                  });
                }

                function commit() {
                    repoDetailService.commit(vm.commitMessage).then(function(res) {
                        vm.commitMessage = '';      // reset the commit message.
                        // close the modal.
                        // TODO: An error must throw an exception and be handled in the catch statement.
                        $commitModal.modal('hide');
                        
                        // refresh the log so that new commits now appear in it.
                        return refreshLog().then(function() {
                          // refresh local to remove committed files from modified files' list.
                          return vm.refreshLocalChanges();
                        });
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
                    $commitModal.on('shown.bs.modal', function() {
                        // select the first commit to show the diff.
                        showDefaultFileOnCommitModalDialog();
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

                function selectFile(file) {
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
                            vm.selectFile(vm.commitDetails.diffDetails[0]);
                        }

                        if(isMergeCommit) {
                            repoDetailService.getDiff(vm.commitDetails.merges).then(function(diff) {
                                vm.commitDetails.diff = diff;

                                vm.commitDetails.diffDetails = parseDiff(vm.commitDetails.diff);
                                // pre select the first file of the commit.
                                vm.selectFile(vm.commitDetails.diffDetails[0]);
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

        return;

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
                    alert('there was an error');
                }
                console.log(res.data);
            });
        }

        function getDiffBetweenCommits(commits) {
            return $http.get('/repo/' + repoName + '/diffbetweencommits?commit1=' + commits[0] + '&commit2=' + commits[1]).then(function(res) {
                if(!res.data.errorCode) {
                    return res.data.output.join('\n');
                }
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

        var t = data.map(function(f) {
            var fileTags = [];

            switch(f[0]) {
                case 'M': {
                    fileTags.push('modifiedstaged', 'staged');
                    break;
                }
                case 'D': {
                    fileTags.push('deletedstaged', 'staged');
                    break;
                }
                case 'A': {
                    fileTags.push('addedstaged', 'staged');
                    break;
                }
            }

            switch(f[1]) {
                case 'M': {
                    fileTags.push('modifiedunstaged', 'unstaged');
                    break;
                }
                case 'D': {
                    fileTags.push('deletedunstaged', 'unstaged');
                    break;
                }
                case '?': {
                    fileTags.push('addedunstaged', 'unstaged', 'untracked');
                    break;
                }
            }

            return {
                name: f.substring(3),
                tags: fileTags
            };
        });

        return t;
    }

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