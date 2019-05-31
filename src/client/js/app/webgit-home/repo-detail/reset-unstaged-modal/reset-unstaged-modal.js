(function () {
    angular.module('RepoDetailModule').component('resetUnstagedModal', {
        templateUrl: '/js/app/webgit-home/repo-detail/reset-unstaged-modal/reset-unstaged-modal.html',
        bindings: {
            modal: '=',
            onResetUnstaged: '&'
        },
        controller: ['$element', '$responseModal', 'gitfunctions', 'staticSelectedFile', function($element, $responseModal, gitfunctions, staticSelectedFile) {
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
                    
                    ctrl.onResetUnstaged();

                    // TODO: Handle error here?
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
