(function () {
    angular.module('RepoDetailModule').component('commitModal', {
        templateUrl: '/js/app/webgit-home/repo-detail/commit-modal/commit-modal.html',
        bindings: {
            modal: '=',
            refreshLocalChanges: '&',
            currentLocalBranch: '<',
            localStatus: '=',
            parseDiff: '&',
            stagedFiles: '=',
            unstagedFiles: '=',
            refreshLog: '&',
            showPushDialog: '&'
        },
        controller: ['$element', '$sce', 'gitfunctions', '$responseModal', '$confirmationModal', function commitModalController($element, $sce, gitfunctions, $responseModal, $confirmationModal) {
            var ctrl = this;
            ctrl.gitfunctions = gitfunctions;
            ctrl.$onInit = function() {
                ctrl.modal = $element.find('.modal');

                ctrl.modal.one('shown.bs.modal', function () {
                    // select the first commit to show the diff.
                    showDefaultFileOnCommitModalDialog();
                });
                ctrl.modal.one('hide.bs.modal', function () {
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


            // TODO: remove the following line
            window.commitModal = ctrl;

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
                $confirmationModal.title('Warning');
                $confirmationModal.bodyHtml('Your unstaged changes to the selected file will be lost.<br />Are you sure?');
                $confirmationModal.show().then(function() {
                    return gitfunctions.resetFile(ctrl.fileSelectedOnCommitModal.name, ctrl.fileSelectedOnCommitModal.tags).then(function (res) {
                        // TODO: Handle errors here. Probably CRLF errors.
                        if (res === '' || (res.output && res.output.join('\n').trim().length == 0)) {
                            return ctrl.refreshLocalChanges().then(function(localStatus) {
                                showDiffForFileOnCommitModal(localStatus[0]);
                            });
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
                    $responseModal.title('Error!');
                    $responseModal.bodyHtml(err.join('<br />'));
                    $responseModal.show();
                });
            }

            function stageFile() {
                return gitfunctions.stageFile(ctrl.fileSelectedOnCommitModal.name, ctrl.fileSelectedOnCommitModal.tags).then(function (res) {
                    // TODO: Handle errors here. Probably CRLF errors.
                    if (res === '' || (res.output && res.output.join('\n').trim().length == 0)) {
                        return ctrl.refreshLocalChanges().then(function(localStatus) {
                            // reselect the file because angular changes the reference of the file.
                            ctrl.fileSelectedOnCommitModal = localStatus.filter(function(f) { return f.name == ctrl.fileSelectedOnCommitModal.name; })[0];
                            ctrl.showDiffForFileOnCommitModal(ctrl.fileSelectedOnCommitModal);
                        });
                    }
                });
            };

            function unstageFile() {
                gitfunctions.unstageFile(ctrl.fileSelectedOnCommitModal.name, ctrl.fileSelectedOnCommitModal.tags).then(function (res) {
                    // TODO: Handle errors here. Probably CRLF errors.
                    if (res === '' || (res.output && res.output.join('\n').trim().length == 0)) {
                        return ctrl.refreshLocalChanges().then(function(localStatus) {
                            // reselect the file because angular changes the reference of the file.
                            ctrl.fileSelectedOnCommitModal = localStatus.filter(function(f) { return f.name == ctrl.fileSelectedOnCommitModal.name; })[0];
                            ctrl.showDiffForFileOnCommitModal(ctrl.fileSelectedOnCommitModal);
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

            function onRefreshLocalChanges() {
                ctrl.refreshLocalChanges();
                unselectFilesAfterLocalRefresh();
            };

            function showDiffForFileOnCommitModal(file) {
                if(!file) {
                    ctrl.diffOnCommitModal.safeDiff = '';
                    ctrl.diffOnCommitModal.file = null;
                    return;
                }
                if (file.tags.indexOf('bothmodified') > -1 && file.tags.indexOf('staged') > -1) {
                    // no diff for this.
                    // TODO: Should we show a conflict message here?
                    ctrl.diffOnCommitModal.safeDiff = '';
                    ctrl.diffOnCommitModal.file = file;
                    return;
                }
                if (!file) {
                    ctrl.diffOnCommitModal.safeDiff = '';
                    return;
                }
                ctrl.diffOnCommitModal = {
                    file: file
                };

                ctrl.fileSelectedOnCommitModal = file;
                gitfunctions.getFileDiff(file.name, file.tags).then(function (diff) {
                    if (typeof diff == 'object') {
                        diff = diff.output.join('\n').trim();
                        // TODO: Handle errors here.. probably CRLF errors.
                    }
                    file.diff = diff;
                    var commitDetails = ctrl.parseDiff({diff: diff});
                    ctrl.diffOnCommitModal.safeDiff = $sce.trustAsHtml(commitDetails[0].diff);
                });
            }

            function showDefaultFileOnCommitModalDialog() {
                var fileToSelect = ctrl.unstagedFiles.length > 0 ? ctrl.unstagedFiles[0] : ctrl.stagedFiles[0];
                showDiffForFileOnCommitModal(fileToSelect);
            }

            function unselectFilesAfterLocalRefresh() {
                ctrl.diffOnConflictModal = null;
                showDefaultFileOnCommitModalDialog();
            }
        }]
    });
})();