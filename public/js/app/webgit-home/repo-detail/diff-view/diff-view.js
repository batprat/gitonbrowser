(function() {
    var repoDetailModule = angular.module('RepoDetailModule');
    
    repoDetailModule.component('diffView', {
        templateUrl: '/js/app/webgit-home/repo-detail/diff-view/diff-view.html',
        bindings: {
            diffViewId: '<'
        },
        controller: ['staticSelectedFile', 'diffViewService', 'gitfunctions', function(staticSelectedFile, diffViewService, gitfunctions) {
            var ctrl = this;

            ctrl.$onInit = function() {
                var setSafeDiff = function(file) {
                    if(!file.safeDiff) {
                        file.safeDiff = diffViewService.parseSingleDiff(file.diff);
                    }
                    ctrl.safeDiff = file.safeDiff;
                };

                staticSelectedFile.onSelectedFileChange(ctrl.diffViewId, function(file) {
                    // notification.
                    if(!file || (file instanceof Array && (file.length > 1 || file.length == 0))) {
                        // selection cleared.
                        // even if multiple files are selected
                        ctrl.safeDiff = '';
                        return;
                    }

                    if(file instanceof Array) {
                        file = file[0];
                    }

                    if(!file.diff) {
                        gitfunctions.getFileDiff(file.name, file.tags).then(function (diff) {
                            if (typeof diff == 'object') {
                                diff = diff.output.join('\n').trim();
                                // TODO: Handle errors here.. probably CRLF errors.
                            }
                            file.diff = diff;
                            setSafeDiff(file);
                        });
                    } else {
                        setSafeDiff(file);
                    }
                });
            };
        }]
    });

    repoDetailModule.service('diffViewService', ['$sce', function($sce) {
        this.parseDiff = parseDiff;
        this.parseSingleDiff = parseSingleDiff;

        return;

        function parseSingleDiff(diff) {
            if(!diff) {
                return;
            }
            diff = diff.split('\n');

            var isConflictedFile = diff[0].indexOf('diff --cc') == 0;

            var formattedStr = null,
                formattedLines = [];

            for (var i = 1; i < diff.length; i++) {
                formattedStr = diff[i];
                // strip tags off formattedStr.
                formattedStr = formattedStr.replace(/\</g, '&lt;').replace(/\>/g, '&gt;');
                if (formattedStr.indexOf('+') === 0 || (isConflictedFile && formattedStr.indexOf('+') === 1)) {
                    formattedStr = '<span class="line-added">' + formattedStr + '</span>'
                }
                else if (formattedStr.indexOf('-') === 0 || (isConflictedFile && formattedStr.indexOf('-') === 1)) {
                    formattedStr = '<span class="line-removed">' + formattedStr + '</span>';
                }
                else if (formattedStr.indexOf('@') === 0 || formattedStr.indexOf('\\') === 0) {
                    formattedStr = '<span class="line-special">' + formattedStr + '</span>';
                }

                formattedLines.push(formattedStr);
            }

            return $sce.trustAsHtml(diff[0] + '\n' + formattedLines.join('\n'));

        }
        
        function parseDiff(diff) {
            var diffDetails = [];
            diff = diff.split('\n');
    
            var line = null,
                currDiff = null;
            for (var i = 0; i < diff.length; i++) {
                line = diff[i];
    
                if (line.indexOf('diff') === 0) {
                    currDiff = {
                        name: line.substring(line.indexOf('b/') + 2),
                        commitType: diff[i + 1].indexOf('new') === 0 ? 'new' : (diff[i + 1].indexOf('similarity') === 0 ? 'rename' : (diff[i + 1].indexOf('deleted') === 0 ? 'deleted' : 'modified'))
                    };
    
                    currDiff.diff = line;
    
                    for (i = i + 1; i < diff.length; i++) {
                        if (diff[i].indexOf('diff') === 0) {
                            i--;
                            diffDetails.push(currDiff);
                            break;
                        }
                        else {
                            var formattedStr = diff[i];
                            // strip tags off formattedStr.
                            formattedStr = formattedStr.replace(/\</g, '&lt;').replace(/\>/g, '&gt;');
                            if (formattedStr.indexOf('+') === 0) {
                                formattedStr = '<span class="line-added">' + formattedStr + '</span>'
                            }
                            else if (formattedStr.indexOf('-') === 0) {
                                formattedStr = '<span class="line-removed">' + formattedStr + '</span>';
                            }
                            else if (formattedStr.indexOf('@') === 0 || formattedStr.indexOf('\\') === 0) {
                                formattedStr = '<span class="line-special">' + formattedStr + '</span>';
                            }
    
                            currDiff.diff = currDiff.diff + '\n' + formattedStr;
                            currDiff.safeDiff = $sce.trustAsHtml(currDiff.diff);
                        }
                    }
                }
            }
    
            if (currDiff) {
                diffDetails.push(currDiff);
            }
    
            return diffDetails;
        }
    }]);
})();