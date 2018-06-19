var webgitApp = angular.module('webgitApp', ['ngRoute', 'WebgitHomeModule', 'RepositoriesModule', 'RepoDetailModule']);

webgitApp.controller('AppController', ['$scope', '$window', '$rootScope', function ($scope, $window, $rootScope) {
    var onFocus = function () {
        $rootScope.$broadcast('windowfocus');
        $scope.$apply();
    };

    var onBlur = function () {
        $scope.$apply();
    };

    $window.onfocus = onFocus;
    $window.onblur = onBlur;
}]);

webgitApp.factory('loaderInterceptor', [function () {
    var requestCount = 0;
    var $loader = null;
    var showLoader = function () {
        $loader = $loader || $('#loader-modal');
        if (!$loader || $loader.length == 0) {
            return;
        }
        $loader.removeClass('loader-hidden');
    };

    var hideLoader = function () {
        $loader = $loader || $('#loader-modal');
        if (!$loader || $loader.length == 0) {
            return;
        }
        $loader.addClass('loader-hidden');
    };
    return {
        request: function (config) {
            requestCount++;
            console.log('a request is made.');
            showLoader();
            return config;
        },
        response: function (response) {
            requestCount--;
            if (requestCount <= 0) {     // shouldn't go less than but still..
                requestCount = 0;
                hideLoader();
            }
            console.log('a response has arrived.');
            return response;
        },

        responseError: function (rejection) {
            console.log('an error has arrived as response');
            return rejection;
        }
    };
}]);

webgitApp.config(['$httpProvider', function ($httpProvider) {
    $httpProvider.interceptors.push('loaderInterceptor');
}]);