(function () {
    angular.module('RepoDetailModule').component('commitDetails', {
        templateUrl: '/js/app/webgit-home/repo-detail/commit-details/commit-details.html',
        bindings: {
            commitDetails: "<",
            selectCommit: '&'
        },
        controller: ['staticSelectedFile', function(staticSelectedFile) {
            var ctrl = this;

            ctrl.select = function(hash) {
                ctrl.selectCommit({ hash: hash });
                // staticSelectedFile.set(ctrl.commitDetails.diffDetails[0], ctrl.randomDiffViewId);
            };

            ctrl.$onInit = function() {
                // if(!ctrl.commitDetails){
                //     return;
                // }
                // staticSelectedFile.set(ctrl.commitDetails.diffDetails[0], ctrl.randomDiffViewId);
            };

            ctrl.$onChanges = function(changes) {
                if(changes
                    && changes.commitDetails
                    && changes.commitDetails.currentValue
                    && changes.commitDetails.currentValue.diffDetails) {
                    staticSelectedFile.set(ctrl.commitDetails.diffDetails[0], ctrl.randomDiffViewId);
                }
            };

            var randomId = Math.random().toString().replace('.', '');
            ctrl.randomId = randomId;
            ctrl.randomDiffViewId = 'commit-details-diff-' + randomId;
        }]
    });
})();
