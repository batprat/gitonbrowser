(function () {
    angular.module('RepoDetailModule').component('pushModal', {
        templateUrl: '/js/app/webgit-home/repo-detail/push-modal/push-modal.html',
        bindings: {
            modal: '=',
            currentLocalBranch: '<',
            currentRemoteBranch: '<',
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
            ctrl.onPushBranchChange = onPushBranchChange;

            return;

            function onPushBranchChange() {
                
            }

            function push() {
                $responseModal.one('hide.bs.modal', function () {
                    ctrl.refreshLog();
                    ctrl.modal.modal('hide');
                });
                $responseModal.title('Pushing ' + ctrl.currentLocalBranch + ' to ' + ctrl.remote + '/' + ctrl.currentRemoteBranch);
                $responseModal.show();
                return gitfunctions.push(ctrl.remote, ctrl.currentRemoteBranch, ctrl.pushOptions.newRemoteBranchName).then(function (data) {
                    $responseModal.bodyHtml(data.errors.join('<br />').replace('\n', '<br />'));
                    ctrl.onPush();
                });
            }
        }]
    });
})();
