(function () {
    angular.module('RepoDetailModule').component('filesList', {
        templateUrl: '/js/app/webgit-home/repo-detail/files-list/files-list.html',
        bindings: {
            files: '=',
            onSelect: '&',
            multiSelect: '<',
            tagToFilter: '=',
            badgeType: '=',
            badgePopoverDetails: '&',
            badgeText: '&',
            keyboardShortcuts: '&',
            diffViewId: '<',
            filesListId: '<'
        },
        controller: ['$scope', '$element', 'UtilsService', 'staticSelectedFile', function FilesListController($scope, $element, UtilsService, staticSelectedFile) {
            var ctrl = this;
            ctrl.selectedFileInThisList = true;     // true by default. will be unset only in cases where more than 1 files-lists share a diff-view (e.g. commit modal)
            if(ctrl.multiSelect) {
                ctrl.selectedFile = [];
            }
            else {
                ctrl.selectedFile = null;
            }

            var selectedFiles = null;
            ctrl.select = function (file, $event) {
                // in case of multi select,
                // if ctrl is pressed,
                // add the selected file to a list.
                // if it is not pressed,
                // clear the list.
                
                // half of the selection is done here and the other half is done below inside `staticSelectedFile.onSelectedFileChange`
                // this is to handle the case when a file is selected from outside of the fileslist.
                // e.g. setting the default selected file in a list.

                if(ctrl.multiSelect) {
                    if($event && $event.ctrlKey) {
                        selectedFiles = selectedFiles || ctrl.selectedFile.slice(0) || [];      // slice `ctrl.selectedFile` because we need a new reference.

                        var idx = selectedFiles.map(function(f) { return f.name; }).indexOf(file.name);
                        if(idx > -1) {
                            // file is already selected, unselect this file.
                            selectedFiles.splice(idx, 1);
                        }
                        else {
                            selectedFiles.push(file);
                        }
                    }
                    else {
                        selectedFiles = [file];
                    }
                }
                else {
                    selectedFiles = file;
                }

                staticSelectedFile.set(selectedFiles, ctrl.diffViewId, ctrl.filesListId);
                ctrl.onSelect({ file: selectedFiles, diffViewId: ctrl.diffViewId });
            };

            ctrl.$onInit = function() {
                ctrl.fileFilter = ctrl.tagToFilter ? function (f) {
                    return f.tags.indexOf(ctrl.tagToFilter) > -1;
                } : function () {
                    // #noFilter ;)
                    return true;
                };
    
                ctrl.badgePopoverContent = function (file, type) {
                    if (ctrl.badgePopoverDetails) {
                        var details = ctrl.badgePopoverDetails({ file: file });
                        if (details) {
                            return details[type];
                        }
                    }
                    return '';
                };
    
                $scope.$on('ngRepeatFinished', function (ngRepeatFinishedEvent) {
                    //you also get the actual event object
                    //do stuff, execute functions -- whatever...
                    $('[data-toggle="popover"]').popover();
                });


                var keyupCallbackArray = [];
    
                ctrl.keyup = function(file, $idx, e) {
                    switch(e.keyCode) {
                        case 40: {
                            // down arrow
                            if(ctrl.filteredFiles.length > $idx + 1) {
                                ctrl.select(ctrl.filteredFiles[$idx + 1]);
                                $(e.currentTarget).next().focus();
                            }
                            break;
                        }
                        case 38: {
                            // up arrow
                            if($idx > 0) {
                                ctrl.select(ctrl.filteredFiles[$idx - 1]);
                                $(e.currentTarget).prev().focus();
                            }
                            break;
                        }
                    }

                    for(var i = 0; i < keyupCallbackArray.length; i++) {
                        keyupCallbackArray[i](e.keyCode, $idx);
                    }
                };

                if(ctrl.keyboardShortcuts && ctrl.tagToFilter) {
                    var keyboardShortcuts = ctrl.keyboardShortcuts({tag: ctrl.tagToFilter});

                    if(keyboardShortcuts) {
                        for(var key in keyboardShortcuts) {
                            keyupCallback = (function() {
                                var innerKey = key;
                                return function(keyCode, $idx) {
                                    if(keyCode == innerKey.toUpperCase().charCodeAt(0)) {
                                        keyboardShortcuts[innerKey](ctrl.filteredFiles[$idx]);
                                    }
                                }
                            })();
                            keyupCallbackArray.push(keyupCallback);
                        }
                    }
                }

                staticSelectedFile.onSelectedFileChange(ctrl.diffViewId, function(file, filesListId) {
                    if(filesListId) {
                        ctrl.selectedFileInThisList = filesListId == ctrl.filesListId;
                    }

                    // remember `ctrl.selectedFileInThisList` is true by default.
                    if(ctrl.selectedFileInThisList) {
                        ctrl.selectedFile = file;
                    }
                });
    
                bindContextMenu();
            };

            ctrl.isFileSelected = isFileSelected;

            return;

            function isFileSelected(file) {
                if(!ctrl.selectedFile) {
                    return false;
                }
                return ctrl.selectedFileInThisList && (ctrl.multiSelect && ctrl.selectedFile instanceof Array ? ctrl.selectedFile.map(function(f) { return f.name }).indexOf(file.name) > -1 : ctrl.selectedFile.name === file.name);
            }

            function bindContextMenu() {
                $element.on('contextmenu', '.list-item-selector', function (e) {
                    // select this file.
                    var file = $(e.currentTarget).scope().file;

                    ctrl.select(file);
                });
                
                $.contextMenu({
                    selector: '.list-item-selector',
                    build: function($trigger, e) {
                        var options = {
                            items: {
                                copyPath: {
                                    name: 'Copy Path',
                                    callback: function(e) {
                                        UtilsService.copyToClipboard($trigger.find('.file-name')[0]);
                                    },
                                    className: 'copy-text'
                                }
                            }
                        };

                        return options;
                    }
                });
            }
        }]
    })
})();