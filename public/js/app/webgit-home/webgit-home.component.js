(function(window, angular, $, localStorage) {
  var webgitHomeModule = angular.module('WebgitHomeModule', ['ngRoute']);

  webgitHomeModule.component('webgitHome', {
    templateUrl: '/js/app/webgit-home/webgit-home.html',
    controllerAs: 'vm',
    controller: ['WebgitHomeService', '$location', 'UtilsService', '$timeout', function WebgitHomeController(WebgitHomeService, $location, utils, $timeout) {
      var vm = this;
      var $cloneModal = $('#clone-modal');

      var $responseModal = $('#response-modal');
      var $responseModalTitle = $responseModal.find('#response-title');
      var $responseModalBody = $responseModal.find('#response-body');
      var $settingsModal = $('#settings-modal');

      $responseModal.on('hide.bs.modal', function(e) {
        $responseModalBody.html('');
        $responseModalTitle.html('');
      });

      vm.browsePath = '';
      vm.browse = browse;
      vm.openCloneModal = openCloneModal;
      vm.clone = clone;
      vm.openAfterCheckingOut = true;
      vm.testGit = testGit;
      vm.getRepoTitle = getRepoTitle;
      vm.viewSettingsModal = viewSettingsModal;
      
      vm.saveGitExecutablePath = saveGitExecutablePath;

      WebgitHomeService.getClonedRepos().then(function(data) {
        var allRepos = data.allRepos;
        vm.clonedRepos = allRepos;
      });

      resetSettings();
      bindEvents();

      return;

      function resetSettings() {
        vm.settings = {
            gitExists: {}
        };
      }

      function saveGitExecutablePath() {
        // save vm.settings.gitExists to local storage. rescan for settings.
        localStorage.setItem('gitonbrowser.gitPath', vm.settings.gitExists.path);
        validateSettings();
      }

      function bindEvents() {
          $('.settings-obj').on('click', '.fix-this-error', function(e) {
              var $settingsObj = $(e.delegateTarget);
              $settingsObj.find('.settings-obj-fix').toggleClass('hidden');
          });
      }

      function viewSettingsModal() {
        $settingsModal.modal('show');
        return validateSettings();
      }

      function validateSettings() {
        resetSettings();
          var options = {};
          var gitExecutablePath = localStorage.getItem('gitonbrowser.gitPath');
          if(gitExecutablePath) {
              options.gitExecutablePath = gitExecutablePath;
          }
        return WebgitHomeService.getSettings(options).then(function(d) {
            if(d.errorCode) {
                switch(d.errorCode) {
                    case 1: {
                        // git not found.
                        vm.settings.gitExists.err = 1;
                        vm.settings.gitExists.msg = d.msg;
                        vm.settings.gitExists.description = d.description;
                        break;
                    }
                }
            }
        });
      }

      function getRepoTitle(path) {
        return utils.decodePath(path);
      }

      function testGit() {
        return WebgitHomeService.testGit();
      }

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
                // if we redirect without $timeout, the overlay does not get dismissed.
                $timeout(function() {
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
    this.testGit = testGit;
    this.getSettings = getSettings;

    return;

    function getSettings(options) {
        return $http.post('/settings', options).then(function(res) {
            return res.data;
        });
    }

    function clone(pathOfRepo, pathOfDestination, subdirName) {
      return $http.post('/clonerepo', {
        url: window.encodeURIComponent(pathOfRepo),
        dirName: subdirName ? window.encodeURIComponent(subdirName) : '',
        destination: window.encodeURIComponent(pathOfDestination)
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

    function testGit() {
      return $http.post('/testgit').then(function(res) {
        return res.data;
      });
    }
  }]);
})(window, window.angular, window.jQuery, window.localStorage);