(function() {
    var repoDetailModule = angular.module('RepoDetailModule', ['ngRoute']);
    var repoName = null;
    var $commitModal = null;
    
    repoDetailModule
        .component('repoDetail', {
            templateUrl: '/js/app/repositories/repo-detail/repo-detail.html',
            controller: ['$routeParams', 'repoDetailService', '$sce', '$scope', '$filter',
              function RepoDetailController($routeParams, repoDetailService, $sce, $scope, $filter) {
    
                repoName = $routeParams.repoName;
    
                this.repoName = repoName;

                var vm = this;

                $commitModal = $('#commit-modal');
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

                vm.commitMap = {};

                repoDetailService.getCommits().then(function(commits) {
                    parseCommits(commits);
                    vm.commits = commits;
                });

                $scope.$on('windowfocus', function() {
                    if(($commitModal.data('bs.modal') || {})._isShown) {
                        // do not refresh when the modal window is open. use the refresh button instead.
                        return;
                    }
                    vm.refreshLocalChanges();
                });

                $commitModal.on('hide.bs.modal', function (e) {
                    vm.refreshLocalChanges();
                });

                vm.refreshLocalChanges();

                return;

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

                    console.log(file.tags);
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
                    console.log('checking for local updates...');
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

        return;

        function getDiffBetweenCommits(commits) {
            return $http.get('/repo/' + repoName + '/diffbetweencommits?commit1=' + commits[0] + '&commit2=' + commits[1]).then(function(res) {
                return res.data;
            });
        }

        function unstageAllFiles() {
            return $http.get('/repo/' + repoName + '/unstageallfiles').then(function(res) {
                return res.data;
            });
        }

        function stageAllFiles() {
            return $http.get('/repo/' + repoName + '/stageallfiles').then(function(res) {
                return res.data;
            });
        }

        function getCommit(hash) {
            return $http.get('/repo/' + repoName + '/getcommit/' + hash).then(function(res) {
                return res.data;
            });
        }

        function getCommits() {
            return $http.get('/repo/' + repoName + '/getrepolog').then(function(res) {
                return res.data;
            });
        }

        function refreshLocalChanges() {
            return $http.get('/repo/' + repoName + '/refreshlocal').then(function(res) {
                return res.data;
            });
        }

        function getFileDiff(file, tags) {
            return $http.get('/repo/' + repoName + '/getfilediff?filename=' + encodeURIComponent(file) + '&tags=' + encodeURIComponent(tags.join(','))).then(function(res) {
                return res.data;
            });
        }

        function stageFile(file, tags) {
            console.log(tags);
            return $http.get('/repo/' + repoName + '/stagefile?filename=' + encodeURIComponent(file) + '&tags=' + encodeURIComponent(tags.join(','))).then(function(res) {
                return res.data;
            });
        }

        function unstageFile(file, tags) {
            return $http.get('/repo/' + repoName + '/unstagefile?filename=' + encodeURIComponent(file) + '&tags=' + encodeURIComponent(tags.join(','))).then(function(res) {
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