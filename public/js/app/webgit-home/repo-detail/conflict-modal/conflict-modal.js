(function () {
    angular.module('RepoDetailModule').component('conflictModal', {
        templateUrl: '/js/app/webgit-home/repo-detail/conflict-modal/conflict-modal.html',
        bindings: {
            modal: '=',
            progress: '=',
            parseDiff: '&',
            localStatus: '=',
            refreshLocalChanges: '&',
            refreshLog: '&',
            parseLocalStatus: '&'
        },
        controller: ['$element', '$responseModal', 'gitfunctions', '$sce', function($element, $responseModal, gitfunctions, $sce) {
            var ctrl = this;

            ctrl.$onInit = function() {
                ctrl.modal = $element.find('.modal');

                ctrl.modal.on('shown.bs.modal', function() {
                    showDiffOnConflictModal(ctrl.localStatus.filter(function(f) { return f.tags.indexOf('conflictedunstaged') > -1; })[0]);

                    if(ctrl.progress && ctrl.progress.type == 'merge') {
                        gitfunctions.getMergeMsg().then(function(d) {
                            if(!d.errorCode) {
                                ctrl.mergeConflictCommitMessage = d.output;
                            }
                        });
                    }
                });
            };

            ctrl.diffOnConflictModal = null;
            ctrl.mergeConflictCommitMessage = '';

            ctrl.showDiffOnConflictModal = showDiffOnConflictModal;
            ctrl.getMetaOfConflictedFile = getMetaOfConflictedFile;
            ctrl.markFileAsResolvedDuringConflict = markFileAsResolvedDuringConflict;
            ctrl.showRemoveFileBtnOnConflictModal = showRemoveFileBtnOnConflictModal;
            ctrl.continueRebase = continueRebase;
            ctrl.abortRebase = abortRebase;
            ctrl.continueMerge = continueMerge;
            ctrl.abortMerge = abortMerge;

            return;

            function _refreshLogAndHideModal() {
                ctrl.refreshLocalChanges();
                ctrl.refreshLog();
                ctrl.modal.modal('hide');
            }

            function abortMerge() {
                return gitfunctions.abortMerge().then(function (d) {
                    if (!d.errorCode) {
                        _refreshLogAndHideModal();
                    }
                });
            }

            function continueMerge() {
                // continue merge means commit.
                return gitfunctions.commit(ctrl.mergeConflictCommitMessage).then(function (d) {
                    if (typeof d == 'string') {
                        // the commit was successful.
                        // close the conflict modal.
                        _refreshLogAndHideModal();
                    }
                });
            }

            function abortRebase() {
                gitfunctions.abortRebase().then(function (d) {
                    if (d.errorCode) {
                        // TODO: handle error here.
                    }
                    _refreshLogAndHideModal();
                });
            }

            function continueRebase() {
                gitfunctions.refreshLocalChanges().then(function (d) {
                    var localStatus = ctrl.parseLocalStatus({ data: d.localStatus });
                    if (localStatus.length == 0) {
                        // there is nothing to apply here.
                        // run git rebase --skip
                        gitfunctions.skipRebase().then(function (d) {
                            if (!d.errorCode) {
                                _refreshLogAndHideModal();
                            }
                        });
                    }
                    else {
                        gitfunctions.continueRebase().then(function (d) {
                            if (!d.errorCode) {
                                ctrl.modal.modal('hide');
                            }
                            ctrl.refreshLocalChanges();
                            ctrl.refreshLog();
                            // TODO: handle error here.
                        });
                    }
                });
            }

            function showRemoveFileBtnOnConflictModal() {
                if (ctrl.diffOnConflictModal && ctrl.diffOnConflictModal.file) {
                    return ctrl.diffOnConflictModal.file.tags.indexOf('deletedbyus') > -1 || ctrl.diffOnConflictModal.file.tags.indexOf('deletedbythem') > -1;
                }
                return false;
            }

            function markFileAsResolvedDuringConflict(add) {
                if (add) {
                    return gitfunctions.stageFile(ctrl.diffOnConflictModal.file.name, ctrl.diffOnConflictModal.file.tags).then(function (res) {
                        // TODO: Handle errors here. Probably CRLF errors.
                        if (res === '' || (res.output && res.output.join('\n').trim().length == 0)) {
                            ctrl.diffOnConflictModal = null;
                            ctrl.refreshLocalChanges();
                        }
                    });
                }
                else {
                    return gitfunctions.removeFile(ctrl.diffOnConflictModal.file.name, ctrl.diffOnConflictModal.file.tags).then(function (res) {
                        // TODO: Handle errors here. Probably CRLF errors.
                        if (!res.errorCode) {
                            ctrl.diffOnConflictModal = null;
                            ctrl.refreshLocalChanges();
                        }
                    });
                }
            }

            function getMetaOfConflictedFile(conflictedFile) {
                if (!conflictedFile) {
                    return;
                }
                var tags = conflictedFile.tags;
                var name = '';
                var description = '';
                switch (true) {
                    case tags.indexOf('deletedbyus') > -1: {
                        name = 'DU';
                        description = '"They" have deleted this file and "We" have modified it.';
                        break;
                    }
                    case tags.indexOf('bothmodified') > -1: {
                        name = 'UU';
                        description = 'This file is modified by "Us" as well as "Them".';
                        break;
                    }
                    case tags.indexOf('deletedbythem') > -1: {
                        name = 'UD';
                        description = '"We" have deleted this file and "They" have modified it.';
                        break;
                    }
                }
                return {
                    name: name,
                    description: description
                };
            }

            function showDiffOnConflictModal(conflictedFile) {
                ctrl.diffOnConflictModal = {
                    file: conflictedFile
                };

                if (conflictedFile.tags.indexOf('deletedbyus') > -1 || conflictedFile.tags.indexOf('deletedbythem') > -1) {
                    // no diff for this file. Pick an option to keep or delete this file.
                    return;
                }

                return gitfunctions.getFileDiff(conflictedFile.name, conflictedFile.tags).then(function (diff) {
                    if (typeof diff == 'object') {
                        diff = diff.output.join('\n').trim();
                        // TODO: Handle errors here.. probably CRLF errors.
                    }
                    var conflictDetails = ctrl.parseDiff({ diff: diff });
                    ctrl.diffOnConflictModal.safeDiff = $sce.trustAsHtml(conflictDetails[0].diff);
                    ctrl.diffOnConflictModal.file.diff = conflictDetails[0].diff;
                });
            }
        }]
    });
})();
