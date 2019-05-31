(function() {
    angular.module('RepoDetailModule').service('staticSelectedFile', ['$q', function($q) {
        var selectedFileObj = {};

        var deferred = $q.defer();

        return {
            set: setSelectedFile,
            get: getSelectedFile,
            unset: unsetSelectedFile,
            getHandler: getHandler,
            onUpdate_deprecated: onUpdate,
            onSelectedFileChange: onSelectedFileChange
        };

        function setSelectedFile(file, diffViewId, filesListId) {
            selectedFileObj[diffViewId] = { file: file, filesListId: filesListId };
            deferred.notify(diffViewId);
        }

        function getSelectedFile(diffViewId, filesListId) {
            return selectedFileObj[diffViewId]['file'];
        }

        function unsetSelectedFile() {
            return setSelectedFile(null);
        }

        function getHandler() {
            return deferred.promise;
        }

        function onUpdate(callback) {
            deferred.promise.then(function() {}, function() {}, callback);
        }

        function onSelectedFileChange(diffViewId, callback) {
            deferred.promise.then(function() {}, function() {}, function(changedDiffViewId) {
                if(diffViewId === changedDiffViewId) {
                    callback(selectedFileObj[diffViewId]['file'], selectedFileObj[diffViewId]['filesListId']);
                }
            });
        }
    }]);
})();