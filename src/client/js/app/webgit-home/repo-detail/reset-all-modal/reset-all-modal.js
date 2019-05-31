(function () {
    angular.module('RepoDetailModule').component('resetAllModal', {
        templateUrl: '/js/app/webgit-home/repo-detail/reset-all-modal/reset-all-modal.html',
        bindings: {
            modal: '=',
            onResetAll: '&'
        },
        controller: ['$element', '$responseModal', 'gitfunctions', 'staticSelectedFile', function($element, $responseModal, gitfunctions, staticSelectedFile) {
            var ctrl = this;

            ctrl.$onInit = function() {
                ctrl.modal = $element.find('.modal');
            };

            ctrl.resetAllDeleteUntracked = false;

            ctrl.resetAllChanges = resetAllChanges;

            return;

            function resetAllChanges() {
                var deleteUntrackedFiles = ctrl.resetAllDeleteUntracked;

                return gitfunctions.resetAllChanges(deleteUntrackedFiles).then(function (d) {
                    ctrl.modal.modal('hide');

                    ctrl.onResetAll();

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
