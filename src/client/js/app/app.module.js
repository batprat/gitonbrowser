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

webgitApp.directive('compile', ['$compile', function($compile) {
    return function(scope, element, attrs) {
        scope.$watch(
            function(scope) {
                // watch the 'compile' expression for changes
                return scope.$eval(attrs.compile);
            },
            function(value) {
                // when the 'compile' expression changes
                // assign it into the current DOM
                element.html(value);

                // compile the new DOM and link it to the current
                // scope.
                // NOTE: we only compile .childNodes so that
                // we don't get into infinite loop compiling ourselves
                $compile(element.contents())(scope);
            }
        );
    };
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
            showLoader();
            return config;
        },
        response: function (response) {
            checkRequestCount();
            return response;
        },

        responseError: function (rejection) {
            checkRequestCount();
            return rejection;
        }
    };

    function checkRequestCount() {
        requestCount--;
        if (requestCount <= 0) {     // shouldn't go less than but still..
            requestCount = 0;
            hideLoader();
        }
    }
}]);

webgitApp.config(['$httpProvider', function ($httpProvider) {
    $httpProvider.interceptors.push('loaderInterceptor');
}]);