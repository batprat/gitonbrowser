(function () {
    angular.module('RepoDetailModule').component('revertCommitModal', {
        templateUrl: '/js/app/webgit-home/repo-detail/revert-commit-modal/revert-commit-modal.html',
        bindings: {
            modal: '=',
            refreshLog: '&',
            commitToRevert: '<',
            refreshLocalChanges: '&'
        },
        controller: ['$element', '$responseModal', 'gitfunctions', function ($element, $responseModal, gitfunctions) {
            var ctrl = this;

            ctrl.$onInit = function () {
                ctrl.modal = $element.find('.modal');

                ctrl.modal.on('show.bs.modal', function () {
                    ctrl.revertCommitOptions = {
                        doNotCommit: false
                    };
                });
            };

            ctrl.revertCommit = revertCommit;

            return;

            function revertCommit() {
                $responseModal.title('Reverting commit');
                $responseModal.show();
                gitfunctions.revertCommit(ctrl.commitToRevert.hash, ctrl.revertCommitOptions.doNotCommit).then(function(d) {
                    ctrl.modal.modal('hide');
                    if(d.errorCode) {
                        $responseModal.bodyHtml(d.errors.join('\n').trim().replace('\n', '<br />'));
                    }
                    else {
                        if(d.output && d.output.length == 0) {
                            $responseModal.bodyHtml('Done!');
                        }
                        else {
                            $responseModal.bodyHtml(d.output.join('\n').trim().replace('\n', '<br />'));
                        }
                    }
                    ctrl.refreshLocalChanges();
                    if(!ctrl.revertCommitOptions.doNotCommit) {
                        ctrl.refreshLog();
                    }
                });
            }
        }]
    });
})();
