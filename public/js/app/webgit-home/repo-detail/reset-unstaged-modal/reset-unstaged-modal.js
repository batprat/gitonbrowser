(function () {
    angular.module('RepoDetailModule').component('resetUnstagedModal', {
        templateUrl: '/js/app/webgit-home/repo-detail/reset-unstaged-modal/reset-unstaged-modal.html',
        bindings: {
            modal: '=',
            refreshLocalChanges: '&',
            diffOnCommitModal: '='
        },
        controller: ['$element', '$responseModal', 'gitfunctions', function($element, $responseModal, gitfunctions) {
            var ctrl = this;

            ctrl.$onInit = function() {
                ctrl.modal = $element.find('.modal');
            };

            ctrl.resetUnstagedDeleteUntracked = false;

            ctrl.resetUnstagedChanges = resetUnstagedChanges;

            return;

            function resetUnstagedChanges() {
                var deleteUntrackedFiles = ctrl.resetUnstagedDeleteUntracked;

                return gitfunctions.resetUnstagedChanges(deleteUntrackedFiles).then(function (d) {
                    ctrl.modal.modal('hide');
                    ctrl.refreshLocalChanges();
                    ctrl.diffOnCommitModal.safeDiff = '';     // reset the text on the commit modal.

                    if (!d.errorCode) {
                        return;
                    }

                    $responseModal.title('Reset output');
                    $responseModal.bodyHtml(d.errors.join('\n').trim().replace('\n', '<br />'));
                    $responseModal.show();
                });
            }
        }]
    });
})();
