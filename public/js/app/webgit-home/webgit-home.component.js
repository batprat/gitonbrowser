(function() {
  var webgitHomeModule = angular.module('WebgitHomeModule', ['ngRoute']);

  webgitHomeModule.component('webgitHome', {
    templateUrl: '/js/app/webgit-home/webgit-home.html',
    controller: [function WebgitHomeController() {
      console.log('inside webgit home controller');
    }]
  });
})();