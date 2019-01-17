(function () {
    var util = angular.module('webgitApp').service('UtilsService', [function () {
        return {
            decodePath: decodePath,
            copyToClipboard: copyToClipboard
        };

        function decodePath(path) {
            // return path.replace('>>>', ':/').replace('>>', ':').replace('>', '/');
            return decodeURIComponent(path);
        };

        function copyToClipboard(elem) {
            if (document.selection) {
                var range = document.body.createTextRange();
                range.moveToElementText(elem);
                range.select();
            } else if (window.getSelection) {
                var range = document.createRange();
                range.selectNode(elem);
                window.getSelection().removeAllRanges();
                window.getSelection().addRange(range);
            }
          
            try {
              document.execCommand('copy');
            } catch (err) {
              console.error('Copy to clipboard failed', err);
            }
        }
    }]);
})();