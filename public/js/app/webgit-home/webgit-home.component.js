(function() {
  var webgitHomeModule = angular.module('WebgitHomeModule', ['ngRoute']);

  webgitHomeModule.component('webgitHome', {
    templateUrl: '/js/app/webgit-home/webgit-home.html',
    controllerAs: 'vm',
    controller: ['WebgitHomeService', function WebgitHomeController(WebgitHomeService) {
      console.log('inside webgit home controller');

      var vm = this;
      var $cloneModal = $('#clone-modal');

      var $responseModal = $('#response-modal');
      var $responseModalTitle = $responseModal.find('#response-title');
      var $responseModalBody = $responseModal.find('#response-body');

      vm.browsePath = '';
      vm.browse = browse;
      vm.openCloneModal = openCloneModal;
      vm.clone = clone;

      WebgitHomeService.getClonedRepos().then(function(data) {
        var allRepos = data.allRepos;
        vm.clonedRepos = allRepos;
      });

      return;

      function clone() {
        // open the response modal.
        $responseModalTitle.text('Cloning');
        $responseModal.modal('show');
        return WebgitHomeService.clone(vm.pathOfRepoToClone, vm.pathOfDestination, vm.cloneSubdirectoryName).then(function(data) {
          // close the modal.
          $responseModalBody.html(data.errors.join('<br />').replace(/\\n/g, '<br />'));

          // TODO: open the repository
        });
      }

      function openCloneModal() {
        $cloneModal.modal('show');
      }

      function browse() {
        return WebgitHomeService.browseRepo(vm.browsePath);
      }
    }]
  }).service('WebgitHomeService', ['$http', function($http) {
    this.getClonedRepos = getClonedRepos;
    this.browseRepo = browseRepo;
    this.clone = clone;

    return;

    function clone(pathOfRepo, pathOfDestination, subdirName) {
      return $http.post('/clonerepo', {
        url: pathOfRepo,
        dirName: subdirName,
        destination: pathOfDestination
      }).then(function(res) {
        return res.data;
      });
    }

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