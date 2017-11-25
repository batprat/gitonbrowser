var webgitApp = angular.module('webgitApp', ['ngRoute', 'RepositoriesModule', 'RepoDetailModule', 'yaru22.angular-timeago']);

webgitApp.controller('AppController', ['$scope', '$window', '$rootScope', function($scope, $window, $rootScope) {
    var onFocus = function() {
        $rootScope.$broadcast('windowfocus');
        $scope.$apply();
    };

    var onBlur = function() {
        $scope.$apply();
    };

    $window.onfocus = onFocus;
    $window.onblur = onBlur;
}]);