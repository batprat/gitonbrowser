(function () {
    angular.module('RepoDetailModule').directive('aCommit', function () {
        return {
            templateUrl: '/js/app/webgit-home/repo-detail/a-commit/a-commit.html',
            restrict: 'E',
            scope: {
                hash: '=',
                selectCommit: '&',
                selectedCommit: '='
            },
            controller: ['$scope', '$element', 'UtilsService', function ACommitController($scope) {
                $scope.select = function (commit) {
                    $scope.selectCommit({ commit: commit });
                };

                $scope.commit = $scope.$parent.vm.commitMap[$scope.hash];
            }],
            link: function (scope, element, attr) {
                
            }
        };
    });
})();