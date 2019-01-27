(function () {
    angular.module('RepoDetailModule').component('commitDetails', {
        templateUrl: '/js/app/webgit-home/repo-detail/commit-details/commit-details.html',
        bindings: {
            commitDetails: "=",
            selectCommit: '&'
        },
        controller: ['$element', function($element) {
            var ctrl = this;

            ctrl.select = function(hash) {
                ctrl.selectCommit({ hash: hash });
            };

            ctrl.$onInit = function() {
                
            };
        }]
    });
})();
