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

                repoDetailService.getCommits().then(function(commits) {
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
                    var fileToSelect = $filter('filter')(vm.localStatus, {tags: 'unstaged'}, true);
                    if(fileToSelect.length > 0) {
                        fileToSelect = fileToSelect[0];
                    }
                    else {
                        fileToSelect = $filter('filter')(vm.localStatus, {tags: 'staged'}, true)[0];
                    }
                    showDiffForFileOnCommitModal(fileToSelect);
                }

                function refreshLocalChanges() {
                    console.log('checking for local updates...');
                    return repoDetailService.refreshLocalChanges().then(function(data) {
                        vm.localStatus = parseLocalStatus(data);

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
                    var hash = commit.hash;
                    vm.selectedCommit = hash;

                    repoDetailService.getCommit(hash).then(function(data) {
                        var d = data.split('\n');

                        vm.commitDetails = {
                            hash: d[0].substring('commit '.length),
                            author: d[1].substring('Author: '.length),
                            date: new Date(d[2].substring('Date:   '.length))
                        };

                        var i = 3,
                            str = d[i],
                            message = '';
                        while(str.indexOf('diff') !== 0) {
                            message += str + '\n';
                            str = d[++i];
                        }

                        vm.commitDetails.message = message;
                        var diff = d.slice(i);
                        vm.commitDetails.diff = diff.join('\n');

                        vm.commitDetails.diffDetails = parseDiff(vm.commitDetails.diff);
                        // pre select the first file of the commit.
                        vm.selectFile(vm.commitDetails.diffDetails[0]);
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

        return;

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
                    commitType: diff[i + 1].indexOf('new') === 0 ? 'new' : (diff[i + 1].indexOf('similarity') === 0 ? 'rename' : 'edit')
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