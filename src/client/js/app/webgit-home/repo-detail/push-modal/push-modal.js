(function () {
    angular.module('RepoDetailModule').component('pushModal', {
        templateUrl: '/js/app/webgit-home/repo-detail/push-modal/push-modal.html',
        bindings: {
            modal: '=',
            currentLocalBranch: '<',
            currentRemoteBranch: '<',
            remote: '<',
            remoteBranches: '<',
            refreshLog: '&',
            onPush: '&'
        },
        controller: ['$element', '$responseModal', 'gitfunctions', 'UtilsService', function($element, $responseModal, gitfunctions, UtilsService) {
            var ctrl = this;

            ctrl.$onInit = function() {
                ctrl.modal = $element.find('.modal');

                ctrl.modal.on('show.bs.modal', function() {
                    // get commits that will be pushed.

                    gitfunctions.getUnpushedCommits().then(function(d) {
                        if(!d) {
                            return;
                        }
                        ctrl.unpushedCommitsHashes = d.map(function(commit) {
                            return commit.hash;
                        });

                        ctrl.unpushedCommitsMap = {};

                        UtilsService.parseCommits(d, ctrl.unpushedCommitsMap);
                    });
                });
            };

            ctrl.pushOptions = {};
            ctrl.push = push;

            return;

            function push() {
                $responseModal.one('hide.bs.modal', function () {
                    ctrl.refreshLog();
                    ctrl.modal.modal('hide');
                });
                $responseModal.title('Pushing ' + ctrl.currentLocalBranch + ' to ' + ctrl.remote + '/' + ctrl.currentRemoteBranch);
                $responseModal.show();
                return gitfunctions.push(ctrl.remote, ctrl.currentRemoteBranch, ctrl.pushOptions.newRemoteBranchName).then(function (data) {
                    $responseModal.bodyHtml(data.errors.join('<br />').replace('\n', '<br />'));
                    ctrl.onPush();
                });
            }
        }]
    });
})();
