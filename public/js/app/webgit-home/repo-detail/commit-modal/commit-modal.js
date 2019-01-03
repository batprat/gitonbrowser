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
                    ctrl.diffOnCommitModal = null;
                });
            };

            ctrl.modals = {
                resetAll: null,
                resetUnstaged: null
            }

            ctrl.diffOnCommitModal = {};
            ctrl.fileSelectedOnCommitModal = null;
            ctrl.onRefreshLocalChanges = onRefreshLocalChanges;
            ctrl.stageFile = stageFile;
            ctrl.unstageFile = unstageFile;
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

            $element.find('.keyboard-shortcuts').popover();
            return;

            function getKeyboardShortcuts(type) {
                switch(type) {
                    case 'unstaged': {
                        return {
                            s: stageFile,
                            r: resetFile
                        };
                        break;
                    }
                    case 'staged': {
                        return {
                            u: unstageFile
                        };
                        break;
                    }
                }
            }

            function resetFile() {
                var selectedFile = staticSelectedFile.get('commit-modal-diff');
                if(!selectedFile) {
                    return;
                }
                $confirmationModal.title('Warning');
                $confirmationModal.bodyHtml('Your unstaged changes to the selected file will be lost.<br />Are you sure?<br />Selected file: ' + selectedFile.name);
                $confirmationModal.show().then(function() {
                    return gitfunctions.resetFile(selectedFile.name, selectedFile.tags).then(function (res) {
                        // TODO: Handle errors here. Probably CRLF errors.
                        if (res === '' || (res.output && res.output.join('\n').trim().length == 0)) {
                            // return ctrl.refreshLocalChanges().then(function(localStatus) {
                            //     showDiffForFileOnCommitModal(localStatus[0], 'commit-modal-diff');
                            // });
                            onRefreshLocalChanges();
                        }
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

            function stageFile() {
                var selectedFile = staticSelectedFile.get('commit-modal-diff');
                if(!selectedFile) {
                    return;
                }
                return gitfunctions.stageFile(selectedFile.name, selectedFile.tags).then(function (res) {
                    // TODO: Handle errors here. Probably CRLF errors.
                    if (res === '' || (res.output && res.output.join('\n').trim().length == 0)) {
                        return ctrl.refreshLocalChanges().then(function(localStatus) {
                            // reselect the file because angular changes the reference of the file.
                            selectedFile = localStatus.filter(function(f) { return f.name == selectedFile.name; })[0];
                            ctrl.showDiffForFileOnCommitModal(selectedFile, 'commit-modal-diff');
                            setSelectedFile(selectedFile, 'commit-modal-diff', 'staged-files-list');
                        });
                    }
                });
            };

            function unstageFile() {
                var selectedFile = staticSelectedFile.get('commit-modal-diff');
                if(!selectedFile) {
                    return;
                }
                gitfunctions.unstageFile(selectedFile.name, selectedFile.tags).then(function (res) {
                    // TODO: Handle errors here. Probably CRLF errors.
                    if (res === '' || (res.output && res.output.join('\n').trim().length == 0)) {
                        return ctrl.refreshLocalChanges().then(function(localStatus) {
                            // reselect the file because angular changes the reference of the file.
                            selectedFile = localStatus.filter(function(f) { return f.name == selectedFile.name; })[0];
                            ctrl.showDiffForFileOnCommitModal(selectedFile, 'commit-modal-diff');
                            setSelectedFile(selectedFile, 'commit-modal-diff', 'unstaged-files-list');
                        });
                    }
                });
            }

            function stageAllFiles() {
                gitfunctions.stageAllFiles().then(function (res) {
                    // TODO: Handle errors here. Probably CRLF errors.
                    if (res === '' || (res.output && res.output.join('\n').trim().length == 0)) {
                        ctrl.refreshLocalChanges();
                    }
                });
            }

            function unstageAllFiles() {
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
                if(!file) {
                    ctrl.diffOnCommitModal.file = null;
                    return;
                }
                
                // special case.
                if (file.tags.indexOf('bothmodified') > -1 && file.tags.indexOf('staged') > -1) {
                    // no diff for this.
                    // TODO: Should we show a conflict message here?
                    ctrl.diffOnCommitModal.file = file;
                    setSelectedFile(null, diffViewId);
                    return;
                }

                ctrl.diffOnCommitModal = {
                    file: file
                };

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

                setSelectedFile(fileToSelect, 'commit-modal-diff', filesListId);
            }

            function unselectFilesAfterLocalRefresh(localStatus) {
                ctrl.diffOnCommitModal = null;
                showDefaultFileOnCommitModalDialog(localStatus);
            }
        }]
    });
})();