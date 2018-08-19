(function () {
    angular.module('RepoDetailModule').component('deleteLocalBranchModal', {
        templateUrl: '/js/app/webgit-home/repo-detail/delete-local-branch-modal/delete-local-branch-modal.html',
        bindings: {
            modal: '=',
            refreshLog: '&',
            localBranchToDelete: '<'
        },
        controller: ['$element', '$responseModal', 'gitfunctions', function($element, $responseModal, gitfunctions) {
            var ctrl = this;

            ctrl.$onInit = function() {
                ctrl.modal = $element.find('.modal');

                ctrl.modal.on('show.bs.modal', function () {
                    ctrl.deleteLocalBranchOptions = {
                        force: false
                    };
                });
            };

            ctrl.deleteLocalBranch = deleteLocalBranch;

            return;

            function deleteLocalBranch() {
                var force = ctrl.deleteLocalBranchOptions.force,
                    branchName = ctrl.localBranchToDelete;

                $responseModal.title('Deleting Local Branch');
                $responseModal.show();
                gitfunctions.deleteLocalBranch(branchName, force).then(function(d) {
                    $responseModal.bodyHtml(d.output.join('\n').trim().replace('\n', '<br />'));
                    ctrl.modal.modal('hide');
                }).catch(function(d) {
                    $responseModal.bodyHtml(d.errors.join('\n').trim().replace('\n', '<br />'));
                });
            }

        }]
    });
})();
