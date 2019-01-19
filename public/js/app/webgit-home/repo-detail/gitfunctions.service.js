(function () {
    angular.module('RepoDetailModule').service('gitfunctions', ['$http', '$routeParams', '$q', function ($http, $routeParams, $q) {
        var repoName = encodeURIComponent(decodeURIComponent($routeParams.repoName));
        return {
            stageFiles: stageFiles,
            unstageFiles: unstageFiles,
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
            applyStash: applyStash,
            cherrypickCommit: cherrypickCommit,
            removeFile: removeFile,
            refreshLocalChanges: refreshLocalChanges,
            skipRebase: skipRebase,
            continueRebase: continueRebase,
            abortRebase: abortRebase,
            abortMerge: abortMerge,
            getMergeMsg: getMergeMsg,
            checkoutRemoteBranch: checkoutRemoteBranch,
            resetFiles: resetFiles,
            pull: pull,
            createNewBranch: createNewBranch,
            deleteLocalBranch: deleteLocalBranch,
            revertCommit: revertCommit
        };

        function revertCommit(hash, doNotCommit) {
            return $http.post('/repo/' + repoName + '/revertcommit', { hash: hash, doNotCommit: doNotCommit }).then(function (res) {
                return res.data;
            });
        }

        function deleteLocalBranch(branchName, force) {
            return $http.post('/repo/' + repoName + '/deletelocalbranch', { branchName: branchName, force: force }).then(function (res) {
                return res.data;
            });
        }

        function createNewBranch(revision, branchName, checkoutAfterCreate) {
            return $http.post('/repo/' + repoName + '/createnewbranch', { revision: revision, branchName: branchName, checkoutAfterCreate: checkoutAfterCreate }).then(function (res) {
                return res.data;
            });
        }

        function pull(options) {
            var remoteBranch = options.remoteBranch,
                mergeOption = options.mergeOption;

            return $http.get('/repo/' + repoName + '/pull?remotebranch=' + remoteBranch + '&mergeoption=' + mergeOption).then(function (res) {
                return res.data;
            });
        }

        function resetFiles(files, tags) {
            tags = tags.map(function(tagsList) {
                return tagsList.join(',');
            });

            tags = tags.join(':');

            return $http.post('/repo/' + repoName + '/resetfiles', {
                fileNames: encodeURIComponent(files.join(':')),
                tags: tags
            }).then(function (res) {
                // if (!res.data.errorCode) {
                //     return res.data.output.join('\n');
                // }
                return res.data;
            });
        }

        function checkoutRemoteBranch(branchName) {
            return $http.post('/repo/' + repoName + '/checkoutremotebranch', { branchName: branchName }).then(function (res) {
                return res.data;
            });
        }

        function getMergeMsg() {
            return $http.post('/repo/' + repoName + '/getmergemsg').then(function (res) {
                return res.data;
            });
        }

        function abortMerge() {
            return $http.post('/repo/' + repoName + '/abortmerge').then(function (res) {
                return res.data;
            });
        }

        function abortRebase() {
            return $http.post('/repo/' + repoName + '/abortrebase').then(function (res) {
                return res.data;
            });
        }

        function continueRebase() {
            return $http.post('/repo/' + repoName + '/continuerebase').then(function (res) {
                return res.data;
            });
        }

        function skipRebase() {
            return $http.post('/repo/' + repoName + '/skiprebase').then(function (res) {
                return res.data;
            });
        }

        function refreshLocalChanges() {
            return $http.get('/repo/' + repoName + '/refreshlocal').then(function (res) {
                if (!res.data.errorCode) {
                    return {
                        progress: res.data.extraInfo && res.data.extraInfo.progress,
                        localStatus: res.data.output.join('\n')
                    };
                }
                return res.data;
            });
        }

        function removeFile(name, tags) {
            return $http.post('/repo/' + repoName + '/removefile', {
                name: name,
                tags: tags.join(',')
            }).then(function (res) {
                if (!res.data.errorCode) {
                    return res.data;
                }
                return res.data;
            });
        }

        function cherrypickCommit(hash, noCommit) {
            return $http.post('/repo/' + repoName + '/cherrypick', {
                hash: hash,
                noCommit: noCommit
            }).then(function(res) {
                return res.data;
            });
        }

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

        function getFileDiff(file, tags, ignoreWhitespace) {
            if (getFileDiff.canceler) {
                // if this request already exists, cancel the request;
                getFileDiff.canceler.resolve();
            }
            getFileDiff.canceler = $q.defer();
            return $http.get(
                ('/repo/' + repoName + '/getfilediff?' 
                + 'filename=' + encodeURIComponent(file)
                + '&tags=' + encodeURIComponent(tags.join(','))
                + '&ignorewhitespace=') + (ignoreWhitespace ? '1' : '0')
                , { timeout: getFileDiff.canceler.promise }).then(function (res) {
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

        function stageFiles(files, tags) {
            tags = tags.map(function(tagsList) {
                return tagsList.join(',');
            });

            tags = tags.join(':');
            return $http.get('/repo/' + repoName + '/stagefiles?filenames=' + encodeURIComponent(files.join(':')) + '&tags=' + encodeURIComponent(tags)).then(function (res) {
                if (!res.data.errorCode) {
                    return res.data.output.join('\n');
                }
                return res.data;
            });
        }

        function unstageFiles(files, tags) {
            tags = tags.map(function(tagsList) {
                return tagsList.join(',');
            });

            tags = tags.join(':');
            return $http.get('/repo/' + repoName + '/unstagefiles?filenames=' + encodeURIComponent(files.join(':')) + '&tags=' + encodeURIComponent(tags)).then(function (res) {
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