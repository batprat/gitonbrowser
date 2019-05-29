(function () {
    angular.module('RepoDetailModule').component('newBranchModal', {
        templateUrl: '/js/app/webgit-home/repo-detail/new-branch-modal/new-branch-modal.html',
        bindings: {
            modal: '=',
            newBranchAtRevision: '<',
            refreshLog: '&'
        },
        controller: ['$element', '$responseModal', 'gitfunctions', function ($element, $responseModal, gitfunctions) {
            var ctrl = this;

            ctrl.$onInit = function () {
                ctrl.modal = $element.find('.modal');

                ctrl.modal.on('shown.bs.modal', function() {
                    $element.find('.new-branch-name').focus();
                });
            };

            
            ctrl.newBranch = {
                name: '',
                checkout: true
            };

            ctrl.createNewBranch = createNewBranch;

            return;

            

            function createNewBranch() {
                var revision = ctrl.newBranchAtRevision;
                var checkoutAfterCreate = ctrl.newBranch.checkout;
                var branchName = ctrl.newBranch.name;
                return gitfunctions.createNewBranch(revision, branchName, checkoutAfterCreate).then(function (d) {
                    ctrl.modal.modal('hide');
                    var text = d.errors.join('\n').trim();
                    if (text.length) {
                        $responseModal.title('Create New Branch');
                        $responseModal.bodyHtml(text.replace('\n', '<br />'));
                        $responseModal.show();
                    }
                    ctrl.refreshLog();
                });
            }
        }]
    });
})();
