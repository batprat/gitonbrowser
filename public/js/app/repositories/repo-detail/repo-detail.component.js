(function() {
    var repoDetailModule = angular.module('RepoDetailModule', ['ngRoute']);
    var repoName = null;
    
    repoDetailModule
        .component('repoDetail', {
            templateUrl: '/js/app/repositories/repo-detail/repo-detail.html',
            controller: ['$routeParams', 'repoDetailService', '$sce', '$scope',
              function RepoDetailController($routeParams, repoDetailService, $sce, $scope) {
                console.log('inside repo details controller');
    
                repoName = $routeParams.repoName;
    
                this.repoName = repoName;

                var vm = this;

                vm.selectedCommit = null;
                vm.modifiedFileNames = [];

                vm.selectCommit = selectCommit;
                vm.selectFile = selectFile;
                vm.refreshLocalChanges = refreshLocalChanges;
                vm.showCommitDialog = showCommitDialog;
                vm.showDiffForFileOnCommitModal = showDiffForFileOnCommitModal;

                repoDetailService.getCommits().then(function(commits) {
                    vm.commits = commits;
                });

                $scope.$on('windowfocus', function() {
                    vm.refreshLocalChanges();
                });

                $('#commit-modal').on('hide.bs.modal', function (e) {
                    vm.refreshLocalChanges();
                });

                vm.refreshLocalChanges();

                return;

                function showDiffForFileOnCommitModal(file) {
                    vm.diffOnCommitModal = {
                        file: file
                    };

                    var isUntracked = false,
                        isDeleted = false;

                    if(file.tags.indexOf('untracked') > -1) {
                        isUntracked = true;
                    }

                    if(file.tags.indexOf('deletedunstaged') > -1) {
                        isDeleted = true;
                    }

                    repoDetailService.getFileDiff(file.name, isUntracked, isDeleted).then(function(diff) {
                        // praty
                        var commitDetails = parseDiff(diff);
                        vm.diffOnCommitModal.safeDiff = $sce.trustAsHtml(commitDetails[0].diff);
                    });
                }

                function showCommitDialog() {
                    // use vm.localStatus
                    $('#commit-modal').modal('show');
                    
                }

                function refreshLocalChanges() {
                    console.log('checking for local updates...');
                    return repoDetailService.refreshLocalChanges().then(function(data) {
                        vm.localStatus = parseLocalStatus(data);
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
        this.getFileDiff = function(file, isUntracked, isDeleted) {
            return $http.get('/repo/' + repoName + '/getfilediff?filename=' + encodeURIComponent(file) + '&isUntracked=' + isUntracked + '&isDeleted=' + isDeleted).then(function(res) {
                return res.data;
            });
        };

        this.refreshLocalChanges = function() {
            return $http.get('/repo/' + repoName + '/refreshlocal').then(function(res) {
                return res.data;
            });
        };
        this.getCommits = function() {
            return $http.get('/repo/' + repoName + '/getrepolog').then(function(res) {
                return res.data;
            });
        };

        this.getCommit = function(hash) {
            return $http.get('/repo/' + repoName + '/getcommit/' + hash).then(function(res) {
                return res.data;
            });
        };
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