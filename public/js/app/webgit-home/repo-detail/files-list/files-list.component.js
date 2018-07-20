(function () {
    angular.module('RepoDetailModule').directive('filesList', function () {
        return {
            templateUrl: '/js/app/webgit-home/repo-detail/files-list/files-list.html',
            restrict: 'E',
            scope: {
                files: '=',
                onSelect: '&',
                selectedFile: '=',
                tagToFilter: '=',
                badgeType: '=',
                badgePopoverDetails: '&',
                badgeText: '&'
            },
            controller: ['$scope', '$element', 'UtilsService', function FilesListController($scope, $element, UtilsService) {
                $scope.select = function (file) {
                    $scope.onSelect({ file: file });
                };

                $scope.fileFilter = $scope.tagToFilter ? function (f) {
                    return f.tags.indexOf($scope.tagToFilter) > -1;
                } : function () {
                    // #noFilter ;)
                    return true;
                };

                $scope.badgePopoverContent = function (file, type) {
                    if ($scope.badgePopoverDetails) {
                        var details = $scope.badgePopoverDetails({ file: file });
                        if (details) {
                            return details[type];
                        }
                    }
                    return '';
                };

                // if($scope.badgePopoverDetails) {
                //     $timeout(function() {
                //         $('[data-toggle="popover"]').popover();
                //     });
                // }

                $scope.$on('ngRepeatFinished', function (ngRepeatFinishedEvent) {
                    //you also get the actual event object
                    //do stuff, execute functions -- whatever...
                    $('[data-toggle="popover"]').popover();
                });

                bindContextMenu();

                return;
                function bindContextMenu() {
                    $element.on('contextmenu', '.list-item-selector', function (e) {
                        // select this file.
                        var file = $(e.currentTarget).scope().file;

                        $scope.select(file);
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
                                        className: 'copy-text',
                                        'data-praty': 'Rocks'
                                    }
                                }
                            };
    
                            return options;
                        }
                    });
                }
            }],
            link: function (scope, element, attr) {
                // debugger;
                // element.on('contextmenu', '.list-item-selector', function() {
                //     console.log('context menu');
                // });

                // $.contextMenu({
                //     selector: element.find('.list-item-selector'),
                //     build: function($trigger, e) {
                        
                //     }
                // });
            }
        };
    });
})();