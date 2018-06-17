angular.module('WebgitHomeModule').component('checkSettings', {
    templateUrl: '/js/app/webgit-home/check-settings/check-settings.html',
    controllerAs: 'vm',
    bindings: {
        showOnErrorOnly: '<'
    },
    controller: ['CheckSettingsService', '$element', '$compile', '$scope', '$attrs', function (CheckSettingsService, $element, $compile, $scope, $attrs) {
        // debugger;
        var vm = this;

        if($attrs.showOnErrorOnly) {
            $element.find('.home-settings-icon').addClass('show-on-error-only');
        }

        vm.saveGitExecutablePath = saveGitExecutablePath;
        vm.viewSettingsModal = viewSettingsModal;

        moveModalToBody();
        resetSettings();
        validateSettings();

        bindEvents();

        var $settingsModal = $('#settings-modal');

        return;

        function moveModalToBody() {
            var $settingsModal = $element.find('#settings-modal');
            //$settingsModal.appendTo('body');
            //$compile($settingsModal)($scope);
        }

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
            $('.settings-obj').on('click', '.fix-this-error', function (e) {
                var $settingsObj = $(e.delegateTarget);
                $settingsObj.find('.settings-obj-fix').toggleClass('hidden');
            });
        }

        function viewSettingsModal() {
            $settingsModal.modal('show');
            // return validateSettings();
        }

        function validateSettings() {
            resetSettings();
            var options = {};
            var gitExecutablePath = localStorage.getItem('gitonbrowser.gitPath') || '';
            if (gitExecutablePath) {
                options.gitExecutablePath = gitExecutablePath;
            }
            return CheckSettingsService.getSettings(options).then(function (d) {
                if (d.errorCode) {
                    switch (d.errorCode) {
                        case 1: {
                            // git not found.
                            vm.settings.gitExists.err = 1;
                            vm.settings.gitExists.msg = d.msg;
                            vm.settings.gitExists.description = d.description;
                            break;
                        }
                    }
                    vm.settings.hasError = true;
                }
            });
        }
    }]
}).service('CheckSettingsService', ['$http', function ($http) {
    this.getSettings = getSettings;

    return;

    function getSettings(options) {
        return $http.post('/settings', options).then(function (res) {
            return res.data;
        });
    }
}]);