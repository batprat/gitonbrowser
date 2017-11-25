angular.module('webgitApp')
    .config(['$locationProvider', '$routeProvider',
    function config($locationProvider, $routeProvider) {
        $locationProvider.html5Mode(true);
        $routeProvider.
            when('/repo/:repoName', {
                template: '<repo-detail></repo-detail>'
            })
    }
  ]);