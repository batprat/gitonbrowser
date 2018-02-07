(function() {
  var webgitHomeModule = angular.module('WebgitHomeModule', ['ngRoute']);

  webgitHomeModule.component('webgitHome', {
    templateUrl: '/js/app/webgit-home/webgit-home.html',
    controllerAs: 'vm',
    controller: ['WebgitHomeService', function WebgitHomeController(WebgitHomeService) {
      console.log('inside webgit home controller');

      var vm = this;

      vm.browsePath = '';
      vm.browse = browse;

      WebgitHomeService.getClonedRepos().then(function(data) {
        var allRepos = data.allRepos;
        vm.clonedRepos = allRepos;
      });

      return;

      function browse() {
        return WebgitHomeService.browseRepo(vm.browsePath);
      }
    }]
  }).service('WebgitHomeService', ['$http', function($http) {
    this.getClonedRepos = getClonedRepos;
    this.browseRepo = browseRepo;

    return;

    function getClonedRepos() {
      return $http.get('/getclonedrepos').then(function(res) {
        return res.data;
      });
    }

    function browseRepo(repoPath) {
      return $http.get('/browserepo?path=' + window.encodeURIComponent(repoPath)).then(function(res) {
        window.location = res.data.path;
      });
    }
  }]);
})();