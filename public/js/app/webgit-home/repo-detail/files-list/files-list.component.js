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
            controller: ['$scope', '$timeout', function FilesListController($scope, $timeout) {
                $scope.select = function (file) {
                    $scope.onSelect({ file: file });
                };

                $scope.fileFilter = $scope.tagToFilter ? function (f) {
                    console.log(f);
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
            }]//,
            // link: function (scope, element, attr) {
            //     if (scope.$last) {
            //         $timeout(function () {
            //             element.find('[data-toggle="popover"]').popover();
            //         });
            //     }

            // }
        };
    });

    angular.module('RepoDetailModule').directive('onFinishRender', function ($timeout) {
        return {
            restrict: 'A',
            link: function (scope, element, attr) {
                if (scope.$last === true) {
                    $timeout(function () {
                        scope.$emit(attr.onFinishRender);
                    });
                }
            }
        }
    });
})();