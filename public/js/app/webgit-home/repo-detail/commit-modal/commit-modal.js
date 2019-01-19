(function () {
    angular.module('RepoDetailModule').component('commitModal', {
        templateUrl: '/js/app/webgit-home/repo-detail/commit-modal/commit-modal.html',
        bindings: {
            modal: '=',
            refreshLocalChanges: '&',
            currentLocalBranch: '<',
            localStatus: '=',
            stagedFiles: '=',
            unstagedFiles: '=',
            refreshLog: '&',
            showPushDialog: '&'
        },
        controller: ['$element', 'gitfunctions', '$responseModal', '$confirmationModal', 'staticSelectedFile', '$filter', function commitModalController($element, gitfunctions, $responseModal, $confirmationModal, staticSelectedFile, $filter) {
            var ctrl = this;
            ctrl.gitfunctions = gitfunctions;
            ctrl.$onInit = function() {
                ctrl.modal = $element.find('.modal');

                ctrl.modal.on('shown.bs.modal', function () {
                    // select the first commit to show the diff.
                    showDefaultFileOnCommitModalDialog();
                });
                ctrl.modal.on('hide.bs.modal', function () {
                    // ctrl.diffOnCommitModal = null;
                });
            };

            ctrl.modals = {
                resetAll: null,
                resetUnstaged: null
            }

            // ctrl.diffOnCommitModal = {};
            ctrl.fileSelectedOnCommitModal = null;
            ctrl.onRefreshLocalChanges = onRefreshLocalChanges;
            ctrl.stageFiles = stageFiles;
            ctrl.unstageFiles = unstageFiles;
            ctrl.stageAllFiles = stageAllFiles;
            ctrl.unstageAllFiles = unstageAllFiles;
            ctrl.commit = commit;
            ctrl.commitAndPush = commitAndPush;
            ctrl.showResetAllFilesModal = showResetAllFilesModal;
            ctrl.showResetUnstagedFilesModal = showResetUnstagedFilesModal;
            ctrl.showDiffForFileOnCommitModal = showDiffForFileOnCommitModal;
            ctrl.getKeyboardShortcuts = getKeyboardShortcuts;
            ctrl.onResetUnstaged = onRefreshLocalChanges;
            ctrl.onResetAll = onRefreshLocalChanges;

            staticSelectedFile.onSelectedFileChange('commit-modal-diff', function(file, filesListId) {
                ctrl.selectedFile = file;
            });

            $element.find('.keyboard-shortcuts').popover();
            return;

            function getKeyboardShortcuts(type) {
                switch(type) {
                    case 'unstaged': {
                        return {
                            s: stageFiles,
                            r: resetFiles
                        };
                        break;
                    }
                    case 'staged': {
                        return {
                            u: unstageFiles
                        };
                        break;
                    }
                }
            }

            function resetFiles() {
                var selectedFiles = staticSelectedFile.get('commit-modal-diff');
                if(!selectedFiles || selectedFiles.length == 0) {
                    return;
                }

                var allTags = [];
                selectedFiles.forEach(function(f) {
                    Array.prototype.push.apply(allTags, f.tags);
                });

                if(allTags.indexOf('unstaged') == -1) {
                    // all of the selected files seem to be staged.
                    return;
                }

                var selectedFilesNames = selectedFiles.map(function(f) { return f.name; });
                
                $confirmationModal.title('Warning');
                $confirmationModal.bodyHtml('Your unstaged changes to the selected file/s will be lost.<br />Are you sure?<br />Selected file/s: <br /><span class="files-going-to-be-reset">' + selectedFilesNames.join('<br />') + '</span>');
                $confirmationModal.show().then(function() {
                    return gitfunctions.resetFiles(selectedFilesNames, selectedFiles.map(function(f) { return f.tags; })).then(function (res) {
                        // TODO: Handle errors here. Probably CRLF errors.
                        // res is an array of 1 or 2 objects.
                        // those are the o/p of the reset files and the reset untracked files respectively
                        onRefreshLocalChanges();
                    });
                });
            }

            function showResetUnstagedFilesModal() {
                ctrl.modals.resetUnstaged.modal('show');
            }

            function showResetAllFilesModal() {
                ctrl.modals.resetAll.modal('show');
            }

            function commitAndPush() {
                commit().then(function () {
                    ctrl.showPushDialog();
                });
            }

            function commit() {
                return gitfunctions.commit(ctrl.commitMessage).then(function (res) {
                    ctrl.commitMessage = '';      // reset the commit message.
                    // close the modal.
                    // TODO: An error must throw an exception and be handled in the catch statement.
                    ctrl.modal.modal('hide');

                    // refresh the log so that new commits now appear in it.
                    return ctrl.refreshLog().then(function () {
                        // refresh local to remove committed files from modified files' list.
                        return ctrl.refreshLocalChanges();
                    });
                }).catch(function (err) {
                    $responseModal.title('Response');
                    $responseModal.bodyHtml(err.join('<br />'));
                    $responseModal.show();
                });
            }

            function stageFiles() {
                var selectedFiles = staticSelectedFile.get('commit-modal-diff');
                if(!selectedFiles || selectedFiles.length == 0) {
                    // nothing selected
                    return;
                }

                var allTags = [];
                selectedFiles.forEach(function(f) {
                    Array.prototype.push.apply(allTags, f.tags);
                });

                if(allTags.indexOf('unstaged') == -1) {
                    // none of the selected files are unstaged.
                    // so nothing to stage.
                    return;
                }

                var selectedFilesNames = selectedFiles.map(function(f) { return f.name; });

                return gitfunctions.stageFiles(selectedFilesNames, selectedFiles.map(function(f) { return f.tags; })).then(function(res) {
                    // TODO: Handle errors here. Probably CRLF errors.
                    if (res === '' || (res.output && res.output.join('\n').trim().length == 0)) {
                        return ctrl.refreshLocalChanges().then(function(localStatus) {
                            // reselect the file because angular changes the reference of the file.
                            if(selectedFiles.length == 1) {
                                var selectedFile = localStatus.filter(function(f) { return f.name == selectedFiles[0].name; })[0];
                                ctrl.showDiffForFileOnCommitModal(selectedFile, 'commit-modal-diff');
                            }

                            setSelectedFile(localStatus.filter(function(f) {
                                return selectedFilesNames.indexOf(f.name) > -1;
                            }), 'commit-modal-diff', 'staged-files-list');
                        });
                    }
                });
            }

            function unstageFiles() {
                var selectedFiles = staticSelectedFile.get('commit-modal-diff');
                if(!selectedFiles || selectedFiles.length == 0) {
                    // nothing selected
                    return;
                }

                var allTags = [];
                selectedFiles.forEach(function(f) {
                    Array.prototype.push.apply(allTags, f.tags);
                });

                if(allTags.indexOf('staged') == -1) {
                    // none of the selected files are staged.
                    // so nothing to unstage.
                    return;
                }

                var selectedFilesNames = selectedFiles.map(function(f) { return f.name; });

                return gitfunctions.unstageFiles(selectedFilesNames, selectedFiles.map(function(f) { return f.tags; })).then(function(res) {
                    // TODO: Handle errors here. Probably CRLF errors.
                    if (res === '' || (res.output && res.output.join('\n').trim().length == 0)) {
                        return ctrl.refreshLocalChanges().then(function(localStatus) {
                            // reselect the file because angular changes the reference of the file.
                            if(selectedFiles.length == 1) {
                                var selectedFile = localStatus.filter(function(f) { return f.name == selectedFiles[0].name; })[0];
                                ctrl.showDiffForFileOnCommitModal(selectedFile, 'commit-modal-diff');
                            }

                            
                            setSelectedFile(localStatus.filter(function(f) {
                                return selectedFilesNames.indexOf(f.name) > -1;
                            }), 'commit-modal-diff', 'unstaged-files-list');
                        });
                    }
                });
            }

            function stageAllFiles() {
                setSelectedFile([], 'commit-modal-diff');
                gitfunctions.stageAllFiles().then(function (res) {
                    // TODO: Handle errors here. Probably CRLF errors.
                    if (res === '' || (res.output && res.output.join('\n').trim().length == 0)) {
                        ctrl.refreshLocalChanges();
                    }
                });
            }

            function unstageAllFiles() {
                setSelectedFile([], 'commit-modal-diff');
                gitfunctions.unstageAllFiles().then(function (res) {
                    // TODO: Handle errors here. Probably CRLF errors.
                    if (res === '' || (res.output && res.output.join('\n').trim().length == 0)) {
                        ctrl.refreshLocalChanges();
                    }
                });
            }

            // to be used when there is a change of file selection programmatically (not because of clicking on a file in the list)
            // e.g. when a file is staged, select the staged file.
            function setSelectedFile(file, diffViewId, filesListId) {
                staticSelectedFile.set(file, diffViewId, filesListId);
            }

            function onRefreshLocalChanges() {
                ctrl.refreshLocalChanges().then(function(localStatus) {
                    unselectFilesAfterLocalRefresh(localStatus);
                });
            };

            function showDiffForFileOnCommitModal(file, diffViewId) {
                if(!file || file instanceof Array) {
                    return;
                }
                
                // special case.
                if (file.tags.indexOf('bothmodified') > -1 && file.tags.indexOf('staged') > -1) {
                    // no diff for this.
                    // TODO: Should we show a conflict message here?
                    setSelectedFile([], diffViewId);
                    return;
                }

                ctrl.fileSelectedOnCommitModal = file;
            }

            // `localStatus` is optional. if sent, use instead of `ctrl.unstagedFiles` and `ctrl.stagedFiles`.
            function showDefaultFileOnCommitModalDialog(localStatus) {
                var stagedFiles = ctrl.stagedFiles;
                var unstagedFiles = ctrl.unstagedFiles;

                if(localStatus) {
                    stagedFiles = $filter('filter')(localStatus, { tags: 'staged' }, true);
                    unstagedFiles = $filter('filter')(localStatus, { tags: 'unstaged' }, true);
                }

                var fileToSelect = null,
                    filesListId = null;

                if(unstagedFiles.length > 0) {
                    fileToSelect = unstagedFiles[0];
                    filesListId = 'unstaged-files-list';
                }
                else if(stagedFiles.length > 0) {
                    fileToSelect = stagedFiles[0];
                    filesListId = 'staged-files-list';
                }

                setSelectedFile(fileToSelect ? [fileToSelect] : [], 'commit-modal-diff', filesListId);
            }

            function unselectFilesAfterLocalRefresh(localStatus) {
                showDefaultFileOnCommitModalDialog(localStatus);
            }
        }]
    });
})();