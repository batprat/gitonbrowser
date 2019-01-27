(function() {
    angular.module('RepoDetailModule').service('$fileHistoryModalService', ['$compile', '$q', '$rootScope', 'gitfunctions', function ($compile, $q, $rootScope, gitfunctions) {
        var fileHistoryModalTemplate = `
        <div class="modal fade" tabindex="-1" role="dialog" aria-hidden="true" id="file-history-modal">
            <div class="modal-dialog modal-lg" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">File History</h5>
                        <button class="close" type="button" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                    </div>
                    <div class="modal-body container-fluid">
                        <div class="row">
                            <div class="file-history-commits-container col">
                                <a-commit
                                    ng-repeat="hash in hashes"
                                    hash="hash"
                                    commit-map="commitMap"
                                    select-commit="selectCommit(commit)"
                                    selected-commit="selectedCommit"></a-commit>
                                <div class="file-history-loading-container">Loading next batch of commits...</div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" type="button" data-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>`;

        return {
            show: show
        };

        function show(options) {
            if(!options.file) {
                return;
            }

            var commits = [];

            var template = $(fileHistoryModalTemplate);
            var linkFn = $compile(template);
            var modalHistoryScope = (options.$scope || $rootScope).$new(true);

            var commitMap = {};

            modalHistoryScope.selectCommit = function(commitHash) {
                commitMap[commitHash];
                modalHistoryScope.selectedCommit = commitHash;
            }
            var content = linkFn(modalHistoryScope);

            $('body').append(content);
            bindLazyLoad(options.file, template.find('.file-history-commits-container'), template.find('.file-history-loading-container'), modalHistoryScope);

            template.modal('show').on('hidden.bs.modal', function (e) {
                modalHistoryScope.$destroy();
                $('#file-history-modal').remove();
            });

            return getFileHistory(options.file).then(function(d) {
                commits = d || [];
                modalHistoryScope.commits = commits;

                commitMap = parseCommits(commits);
                modalHistoryScope.commitMap = commitMap;
                
                modalHistoryScope.hashes = commits.map(function(c) { return c.hash; });
            });
        }

        function getFileHistory(file, page) {
            page = page || 1;
            return gitfunctions.getFileHistory(file, page);
        }

        function bindLazyLoad(file, $elem, $fileHistoryLoadingContainer, modalHistoryScope) {
            var lazyLoadingInProgress = false;
            var noMoreCommits = false;

            $elem.on('scroll', function() {
                if (lazyLoadingInProgress || noMoreCommits) {
                    return;
                }

                if ($elem.scrollTop() + $elem.innerHeight() + 50 >= $elem[0].scrollHeight) {   // start loading before 50px from the bottom.
                    lazyLoadingInProgress = true;
                    // load next batch of commits.
                    var page = +$elem.data('pageNum') || 1;
                    page++;
                    $elem.data('pageNum', page);
                    $fileHistoryLoadingContainer.show();
                    getFileHistory(file, page).then(function (commits) {
                        $fileHistoryLoadingContainer.hide();
                        lazyLoadingInProgress = false;

                        // no commits returned; reached the bottom.
                        if (commits.length == 0) {
                            noMoreCommits = true;
                            return;
                        }

                        modalHistoryScope.commits = Array.prototype.push.apply(modalHistoryScope.commits, commits);
                        modalHistoryScope.commitMap = parseCommits(modalHistoryScope.commits);
                        modalHistoryScope.hashes = modalHistoryScope.commits.map(function(c) { return c.hash; });
                    });
                }
            });
        }

        function parseCommits(commits) {
            var commitMap = {};
            commits = commits.map(function(c) {
                c.fromNow = moment(c.date).fromNow();

                commitMap[c.hash] = c;
                return c;
            });

            return commitMap;
        }
    }]);
})();