(function () {
    angular.module('RepoDetailModule').component('filesList', {
        templateUrl: '/js/app/webgit-home/repo-detail/files-list/files-list.html',
        bindings: {
            files: '=',
            onSelect: '&',
            selectedFile: '=',
            tagToFilter: '=',
            badgeType: '=',
            badgePopoverDetails: '&',
            badgeText: '&',
            keyboardShortcuts: '&'
        },
        controller: ['$scope', '$element', 'UtilsService', function FilesListController($scope, $element, UtilsService) {
            console.log('controller called for ', $element);
            var ctrl = this;
            ctrl.select = function (file) {
                ctrl.onSelect({ file: file });
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
    
                bindContextMenu();
            };
            

            return;
            function bindContextMenu() {
                $element.on('contextmenu', '.list-item-selector', function (e) {
                    // select this file.
                    var file = $(e.currentTarget).scope().file;

                    ctrl.select(file);
                });

                return;
                
                $.contextMenu({
                    selector: '.list-item-selector',
                    build: function($trigger, e) {
                        var file = $trigger.scope().file;
                        var options = {
                            items: {
                                copyPath: {
                                    name: 'Copy Path',
                                    callback: function(e) {
                                        var name = file.name;
                                        if(name.match(/^".+"$/)) {
                                            // name starts and ends with double quotes. strip em off.
                                            name = name.substring(1, name.length - 1);
                                        }
                                        // clipboard.copyText(name);
                                        console.log('copying', name);
                                        UtilsService.copyToClipboard(name);
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