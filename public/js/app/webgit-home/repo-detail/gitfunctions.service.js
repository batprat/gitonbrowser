(function () {
    angular.module('RepoDetailModule').service('gitfunctions', ['$http', '$routeParams', function ($http, $routeParams) {
        var repoName = encodeURIComponent(decodeURIComponent($routeParams.repoName));
        return {
            stageFile: stageFile,
            unstageFile: unstageFile,
            stageAllFiles: stageAllFiles,
            unstageAllFiles: unstageAllFiles,
            commit: commit,
            push: push,
            resetAllChanges: resetAllChanges,
            resetUnstagedChanges: resetUnstagedChanges
        };

        function resetUnstagedChanges(deleteUntracked) {
            return $http.post('/repo/' + repoName + '/resetunstaged', { deleteUntracked: deleteUntracked }).then(function (res) {
                return res.data;
            });
        }

        function resetAllChanges(deleteUntracked) {
            return $http.post('/repo/' + repoName + '/resetall', { deleteUntracked: deleteUntracked }).then(function (res) {
                return res.data;
            });
        }

        function push(remoteName, remoteBranch, newRemoteBranchName) {
            if (remoteBranch == 'create-new-branch') {
                return $http.post('/repo/' + repoName + '/pushnewbranch', {
                    remoteName: remoteName,
                    newRemoteBranchName: newRemoteBranchName
                }).then(function (res) {
                    return res.data;
                })
            }
            return $http.get('/repo/' + repoName + '/push?remotename=' + remoteName + '&remotebranch=' + remoteBranch).then(function (res) {
                return res.data;
            });
        }

        function commit(message) {
            return $http.get('/repo/' + repoName + '/commit?message=' + window.encodeURIComponent(message)).then(function (res) {
                if (!res.data.errorCode) {
                    return res.data.output.join('\n');
                }
                else {
                    // alert('there was an error');
                    return Promise.reject(res.data.errors);
                }
            });
        }

        function stageFile(file, tags) {
            return $http.get('/repo/' + repoName + '/stagefile?filename=' + encodeURIComponent(file) + '&tags=' + encodeURIComponent(tags.join(','))).then(function (res) {
                if (!res.data.errorCode) {
                    return res.data.output.join('\n');
                }
                return res.data;
            });
        }

        function unstageFile(file, tags) {
            return $http.get('/repo/' + repoName + '/unstagefile?filename=' + encodeURIComponent(file) + '&tags=' + encodeURIComponent(tags.join(','))).then(function (res) {
                if (!res.data.errorCode) {
                    return res.data.output.join('\n');
                }
                return res.data;
            });
        }

        function unstageAllFiles() {
            return $http.get('/repo/' + repoName + '/unstageallfiles').then(function (res) {
                if (!res.data.errorCode) {
                    return res.data.output.join('\n');
                }
                return res.data;
            });
        }

        function stageAllFiles() {
            return $http.get('/repo/' + repoName + '/stageallfiles').then(function (res) {
                if (!res.data.errorCode) {
                    return res.data.output.join('\n');
                }
                return res.data;
            });
        }
    }]);
})();