(function () {
    var util = angular.module('webgitApp').service('UtilsService', [function () {
        return {
            decodePath: decodePath,
            copyToClipboard: copyToClipboard,
            parseMultipleDiffs: parseMultipleDiffs
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

        function parseMultipleDiffs(diff) {
            var diffs = diff.split(/\n(?=diff)/);

            return diffs.map(function(d) {
                var lines = d.split('\n');
                var firstLine = lines[0];
                var isConflictedFile = firstLine.indexOf('diff --cc') == 0;

                // TODO: Handle case when file name contains b/
                var name = isConflictedFile ? firstLine.substring('diff --cc '.length) : firstLine.substring(firstLine.indexOf(' b/') + 3);
                var secondLine = lines[1];
                return {
                    diff: d,
                    name: name,
                    commitType: secondLine.indexOf('new') === 0 ? 'new' : (secondLine.indexOf('similarity') === 0 ? 'rename' : (secondLine.indexOf('deleted') === 0 ? 'deleted' : 'modified'))
                };
            });
        }
    }]);
})();