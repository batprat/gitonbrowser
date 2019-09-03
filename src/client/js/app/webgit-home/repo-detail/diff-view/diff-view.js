(function() {
    var repoDetailModule = angular.module('RepoDetailModule');
    
    repoDetailModule.component('diffView', {
        templateUrl: '/js/app/webgit-home/repo-detail/diff-view/diff-view.html',
        bindings: {
            diffViewId: '<',
            linesSelectable: '<'
        },
        controller: ['staticSelectedFile', 'diffViewService', 'gitfunctions', function(staticSelectedFile, diffViewService, gitfunctions) {
            var ctrl = this;
            var lastLineClicked = null;

            ctrl.linesSelectable = ctrl.linesSelectable || false;
            ctrl.selectedDiffLines = [];

            ctrl.$onInit = function() {
                var diffViewLinesSelectable = ctrl.linesSelectable || false;        // lets keep a backup of this for future use.
                var setSafeDiff = function(file) {
                    if(!file.safeDiff) {
                        var diffData = diffViewService.parseSingleDiff(file.diff);
                        file.safeDiff = diffData;
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

                    ctrl.linesSelectable = diffViewLinesSelectable && file.commitType != "new";

                    if(!file.diff) {
                        gitfunctions.getFileDiff(file.name, file.tags).then(function (diff) {
                            if (typeof diff == 'object') {
                                diff = diff.output.join('').trim();
                                // TODO: Handle errors here.. probably CRLF errors.
                            }
                            file.diff = diff;
                            setSafeDiff(file);
                        });
                    } else {
                        setSafeDiff(file);
                    }

                    var selectedDiffLines = [];

                    ctrl.selectedDiffLines = selectedDiffLines;
                    file.selectedDiffLines = selectedDiffLines;
                    lastLineClicked = null;
                });
            };

            ctrl.onCheckboxClick = function(e, idx) {
                if(e.shiftKey && lastLineClicked !== null) {
                    // case 1: if last line was selected and current line is not selected (so we are selecting it with this click), select all lines in between.
                    if(ctrl.selectedDiffLines[lastLineClicked] && !ctrl.selectedDiffLines[idx]) {       // ng-click happens before the change.
                        for(var i = Math.min(idx, lastLineClicked); i < Math.max(idx, lastLineClicked); i++) {
                            ctrl.selectedDiffLines[i] = true;
                        }
                    }

                    // case 2: if last line was unselected and current line is already selected (so we are unselecting it with this click), deselect all lines in between
                    if(!ctrl.selectedDiffLines[lastLineClicked] && ctrl.selectedDiffLines[idx]) {
                        for(var i = Math.min(idx, lastLineClicked); i < Math.max(idx, lastLineClicked); i++) {
                            ctrl.selectedDiffLines[i] = false;
                        }
                    }
                }
                lastLineClicked = idx;
            }
        }]
    });

    repoDetailModule.service('diffViewService', ['$sce', function($sce) {
        this.parseSingleDiff = parseSingleDiff;

        return;

        function parseSingleDiff(diff) {
            if(!diff) {
                return;
            }
            var diffArr = diff.split('\n');

            var isConflictedFile = diffArr[0].indexOf('diff --cc') == 0;

            return diffArr.map(function(line, idx) {
                if(idx < 4) {
                    return {
                        line: line,
                        type: 'header'
                    };
                }

                switch(true) {
                    case (line.indexOf('+') === 0 || (isConflictedFile && line.indexOf('+') === 1)): {
                        return {
                            line: line,
                            type: 'added'
                        };
                    }
                    case (line.indexOf('-') === 0 || (isConflictedFile && line.indexOf('-') === 1)): {
                        return {
                            line: line,
                            type: 'removed'
                        };
                    }
                    case (line.indexOf('@') === 0 || line.indexOf('\\') === 0): {
                        return {
                            line: line,
                            type: 'special'
                        };
                    }
                    case (line.indexOf(' ') === 0): {
                        return {
                            line: line,
                            type: 'nochange'
                        };
                    }
                }                
            });
        }
    }]);
})();