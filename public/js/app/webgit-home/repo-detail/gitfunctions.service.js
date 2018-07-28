(function () {
    angular.module('RepoDetailModule').service('gitfunctions', ['$http', '$routeParams', '$q', function ($http, $routeParams, $q) {
        var repoName = encodeURIComponent(decodeURIComponent($routeParams.repoName));
        return {
            stageFile: stageFile,
            unstageFile: unstageFile,
            stageAllFiles: stageAllFiles,
            unstageAllFiles: unstageAllFiles,
            commit: commit,
            push: push,
            resetAllChanges: resetAllChanges,
            resetUnstagedChanges: resetUnstagedChanges,
            selectStash: selectStash,
            getFileDiff: getFileDiff,
            stashLocalChanges: stashLocalChanges,
            getStashList: getStashList,
            dropSelectedStash: dropSelectedStash,
            applyStash: applyStash
        };

        function applyStash(name, pop) {
            return $http.post('/repo/' + repoName + '/applystash', { pop: pop, name: name }).then(function (res) {
                return res.data;
            });
        }

        function dropSelectedStash(stashName) {
            return $http.delete('/repo/' + repoName + '/dropstash/' + stashName).then(function (res) {
                return res.data;
            });
        }

        function getStashList() {
            return $http.get('/repo/' + repoName + '/getstashlist').then(function (res) {
                return res.data;
            });
        }

        function stashLocalChanges(includeUntracked) {
            return $http.post('/repo/' + repoName + '/stashlocal', { includeUntracked: includeUntracked }).then(function (res) {
                return res.data;
            });
        }

        function getFileDiff(file, tags) {
            if (getFileDiff.canceler) {
                // if this request already exists, cancel the request;
                getFileDiff.canceler.resolve();
            }
            getFileDiff.canceler = $q.defer();
            return $http.get('/repo/' + repoName + '/getfilediff?filename=' + encodeURIComponent(file) + '&tags=' + encodeURIComponent(tags.join(',')), { timeout: getFileDiff.canceler.promise }).then(function (res) {
                if(!res || !res.data) {
                    return;
                }
                if (!res.data.errorCode) {
                    return res.data.output.join('\n');
                }
                else if(res.data.output){
                    // TODO: Handle CRLF errors here.
                    return res.data.output.join('\n');
                }
                return res.data;
            });
        }

        function selectStash(stash) {
            if (selectStash.canceler) {
                // if this request already exists, cancel the request;
                selectStash.canceler.resolve();
            }
            selectStash.canceler = $q.defer();
            return $http.get('/repo/' + repoName + '/selectstash?name=' + stash.name, { timeout: selectStash.canceler.promise }).then(function (res) {
                return res.data;
            });
        }

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