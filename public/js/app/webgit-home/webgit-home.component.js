(function() {
  var webgitHomeModule = angular.module('WebgitHomeModule', ['ngRoute']);

  webgitHomeModule.component('webgitHome', {
    templateUrl: '/js/app/webgit-home/webgit-home.html',
    controllerAs: 'vm',
    controller: ['WebgitHomeService', '$location', 'UtilsService', function WebgitHomeController(WebgitHomeService, $location, utils) {
      console.log('inside webgit home controller');

      var vm = this;
      var $cloneModal = $('#clone-modal');

      var $responseModal = $('#response-modal');
      var $responseModalTitle = $responseModal.find('#response-title');
      var $responseModalBody = $responseModal.find('#response-body');

      $responseModal.on('hide.bs.modal', function(e) {
        $responseModalBody.html('');
        $responseModalTitle.html('');
      });

      vm.browsePath = '';
      vm.browse = browse;
      vm.openCloneModal = openCloneModal;
      vm.clone = clone;
      vm.openAfterCheckingOut = true;

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

          if(vm.openAfterCheckingOut === true) {
          // close both modals
            $responseModal.one('hide.bs.modal', function() {
              $cloneModal.one('hide.bs.modal', function() {
                // if we redirect without settimeout, the overlay does not get dismissed.
                window.setTimeout(function() {
                  WebgitHomeService.browseRepo(utils.decodePath(data.extraInfo.repoPath));
                }, 500);
              });
              $cloneModal.modal('hide');
            });
            $responseModal.modal('hide');
          }
        });
      }

      function openCloneModal() {
        $cloneModal.modal('show');
      }

      function browse() {
        return WebgitHomeService.browseRepo(vm.browsePath);
      }
    }]
  }).service('WebgitHomeService', ['$http', '$location', function($http, $location) {
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
        $location.path(res.data.path);
      });
    }
  }]);
})();