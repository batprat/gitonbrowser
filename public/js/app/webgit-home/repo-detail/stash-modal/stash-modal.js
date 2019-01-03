(function () {
    angular.module('RepoDetailModule').component('stashModal', {
        templateUrl: '/js/app/webgit-home/repo-detail/stash-modal/stash-modal.html',
        bindings: {
            modal: '=',
            parseMultipleDiffs: '&',
            refreshLocalChanges: '&',
            localStatus: '='
        },
        controller: ['$element', '$responseModal', 'gitfunctions', 'staticSelectedFile', function($element, $responseModal, gitfunctions, staticSelectedFile) {
            var ctrl = this;

            ctrl.$onInit = function() {
                ctrl.modal = $element.find('.modal');

                ctrl.modal.on('shown.bs.modal', function () {
                    updateStashes();
                    // do we need a scope.apply here?
                });
            };

            ctrl.selectedStash = null;
            ctrl.diffSelectedStashFile = null;
            ctrl.stashLocalIncludeUntracked = true;
            ctrl.popStash = false;

            ctrl.selectStash = selectStash;
            ctrl.selectFileInStash = selectFileInStash;
            ctrl.stashLocalChanges = stashLocalChanges;
            ctrl.dropSelectedStash = dropSelectedStash;
            ctrl.applyStash = applyStash;

            return;

            function applyStash() {
                $responseModal.title('Applying Stash ' + ctrl.selectedStash.name);
                $responseModal.show();
                return gitfunctions.applyStash(ctrl.selectedStash.name, ctrl.popStash).then(function (d) {
                    if (d.errorCode) {
                        $responseModal.bodyHtml(d.errors.join('<br />').replace(/\n/g, '<br />'));
                    }
                    else {
                        $responseModal.bodyHtml(d.output.join('<br />').replace(/\n/g, '<br />'));
                    }

                    if (!d.errorCode) {
                        if (ctrl.popStash) {
                            updateStashes();
                        }
                        ctrl.refreshLocalChanges();
                    }
                });
            }

            function dropSelectedStash() {
                $responseModal.title('Dropping Stash ' + ctrl.selectedStash.name);
                $responseModal.show();
                return gitfunctions.dropSelectedStash(ctrl.selectedStash.name).then(function (d) {
                    $responseModal.bodyHtml(d.output.join('<br />'));
                    updateStashes();
                });
            }

            function updateStashes() {
                return gitfunctions.getStashList().then(function (stashList) {
                    stashList = stashList.output.join('').trim().split('\n');

                    ctrl.stashes = stashList.map(function (s) {
                        s = s.split(/:(.+)/);

                        return {
                            name: s[0],
                            description: s[1]
                        };
                    });

                    // TODO: if no local changes, show no local changes in description.
                    var local = { name: 'Local Changes', description: 'Local changes.' };
                    ctrl.selectedStash = ctrl.stashes.length > 0 ? ctrl.stashes[0] : local;

                    ctrl.stashes.splice(0, 0, local);

                    ctrl.selectStash();
                });
            }

            function stashLocalChanges() {
                $responseModal.title('Saving Local Changes...');
                $responseModal.show();
                return gitfunctions.stashLocalChanges(ctrl.stashLocalIncludeUntracked).then(function (d) {
                    $responseModal.bodyHtml(d.output.join('<br />'));
                    ctrl.refreshLocalChanges();
                    updateStashes();
                });
            }

            /*
                Select a stash from list of stashes. And select the first file in the list.
            */
            function selectStash() {
                var stash = ctrl.selectedStash;

                if (!stash.name) {
                    return;
                }

                // reset selected file because it takes time to select stashes.
                setSelectedFile(null);

                if (stash.name === 'Local Changes') {
                    // show local changes.
                    if (gitfunctions.selectStash.canceler) {
                        gitfunctions.selectStash.canceler.resolve();
                    }
                    if (ctrl.localStatus) {
                        ctrl.selectedStash.diffDetails = ctrl.localStatus.map(function (f) {
                            return {
                                // fileName: f.name,
                                name: f.name,
                                commitType: f.tags.indexOf('added') > -1 ? 'new' : (f.tags.indexOf('deleted') > -1 ? 'deleted' : 'modified'),
                                tags: f.tags
                            };
                        });
                        setSelectedFile(ctrl.selectedStash.diffDetails[0]);
                    }

                    return;
                }

                return gitfunctions.selectStash(stash).then(function (op) {
                    if(!op) {
                        return;
                    }
                    ctrl.selectedStash.diffDetails = ctrl.parseMultipleDiffs({diff: op.output.join('')});
                    setSelectedFile(ctrl.selectedStash.diffDetails[0]);
                });
            }

            function selectFileInStash(file, diffViewId) {
                // do nothing actually.. everything is handled in files-list and diff-view.
                if(!file) {
                    // unselect everything.
                    return;
                }
            }

            function setSelectedFile(file) {
                staticSelectedFile.set(file, 'stash-modal-diff');
            }
        }]
    });
})();
