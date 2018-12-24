(function () {
    angular.module('RepoDetailModule').component('pushModal', {
        templateUrl: '/js/app/webgit-home/repo-detail/push-modal/push-modal.html',
        bindings: {
            modal: '=',
            currentLocalBranch: '<',
            remote: '<',
            remoteBranches: '<',
            refreshLog: '&',
            onPush: '&'
        },
        controller: ['$element', '$responseModal', 'gitfunctions', function($element, $responseModal, gitfunctions) {
            var ctrl = this;

            ctrl.$onInit = function() {
                ctrl.modal = $element.find('.modal');
            };

            ctrl.pushOptions = {};
            ctrl.push = push;

            return;

            function push() {
                $responseModal.one('hide.bs.modal', function () {
                    ctrl.refreshLog();
                    ctrl.modal.modal('hide');
                });
                $responseModal.title('Pushing ' + ctrl.currentLocalBranch + ' to ' + ctrl.remote + '/' + ctrl.pushOptions.remoteBranch);
                $responseModal.show();
                return gitfunctions.push(ctrl.remote, ctrl.pushOptions.remoteBranch, ctrl.pushOptions.newRemoteBranchName).then(function (data) {
                    $responseModal.bodyHtml(data.errors.join('<br />').replace('\n', '<br />'));
                    ctrl.onPush();
                });
            }
        }]
    });
})();
