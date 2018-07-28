(function () {
    angular.module('RepoDetailModule').component('cherrypickModal', {
        templateUrl: '/js/app/webgit-home/repo-detail/cherrypick-modal/cherrypick-modal.html',
        bindings: {
            modal: '=',
            refreshLog: '&',
            cherrypickHash: '<',
            refreshLocalChanges: '&'
        },
        controller: ['$element', '$responseModal', 'gitfunctions', function($element, $responseModal, gitfunctions) {
            var ctrl = this;

            ctrl.$onInit = function() {
                ctrl.modal = $element.find('.modal');
            };

            ctrl.cherrypick = {
                doNotCommit: true,
                hash: ctrl.cherrypickHash
            };

            ctrl.cherrypickCommit = cherrypickCommit;

            return;

            function cherrypickCommit() {
                $responseModal.title('Cherry picking');
                $responseModal.show();
                console.log('cherrypicking ', ctrl.cherrypickHash);
                return gitfunctions.cherrypickCommit(ctrl.cherrypickHash, ctrl.cherrypick.doNotCommit).then(function(d) {
                    ctrl.modal.modal('hide');
                    if(d.errorCode) {
                        $responseModal.bodyHtml(d.errors.join('\n').trim().replace('\n', '<br />'));
                    }
                    else {
                        $responseModal.bodyHtml('Done!');
                    }
                    ctrl.refreshLocalChanges();
                    if(!ctrl.cherrypick.doNotCommit) {
                        ctrl.refreshLog();
                    }
                });
            }


        }]
    });
})();
