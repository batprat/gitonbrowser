(function () {
    angular.module('RepoDetailModule').component('pullModal', {
        templateUrl: '/js/app/webgit-home/repo-detail/pull-modal/pull-modal.html',
        bindings: {
            modal: '=',
            currentLocalBranch: '<',
            remoteBranches: '<',
            currentRemoteBranch: '<'
        },
        controller: ['$element', '$responseModal', 'gitfunctions', function($element, $responseModal, gitfunctions) {
            var ctrl = this;

            ctrl.$onInit = function() {
                ctrl.modal = $element.find('.modal');
            };

            ctrl.pullOptions = {
                mergeOption: 'merge'
            };

            ctrl.pull = pull;

            return;

            function pull() {
                $responseModal.title('Pulling');
                $responseModal.show();
                return gitfunctions.pull({
                    remoteBranch: ctrl.currentRemoteBranch,
                    mergeOption: ctrl.pullOptions.mergeOption
                }).then(function (response) {
                    $responseModal.bodyHtml(response.errors.join('').replace(/\n/g, '<br />') + response.output.join('').replace(/\n/g, '<br />'));
                    // TODO: refresh the main log.
                });
            }
        }]
    });
})();
