(function() {
  var util = angular.module('webgitApp').service('UtilsService', [function() {
    return {
      decodePath: decodePath
    };

    function decodePath(path) {
      return path.replace('>>>', ':/').replace('>>', ':').replace('>', '/');
    }
  }]);
})();