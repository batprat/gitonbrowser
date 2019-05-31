(function() {
    angular.module('RepoDetailModule').service('$confirmationModal', ['$http', '$routeParams', '$q', function ($http, $routeParams, $q) {
        var $confirmationModalHtml = $(`
        <div class="modal fade" tabindex="-1" role="dialog" aria-hidden="true">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="response-title"></h5>
                        <button class="close" type="button" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                    </div>
                    <div class="modal-body"></div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" type="button" data-dismiss="modal">Cancel</button>
                        <button class="btn btn-danger" type="button" data-confirm="true">Confirm</button>
                    </div>
                </div>
            </div>
        </div>`);

        $('body').append($confirmationModalHtml);

        return {
            title: title,
            show: show,
            hide: hide,
            bodyHtml: bodyHtml,
            one: one
        };

        function one(eventName, handler) {
            return $confirmationModalHtml.one(eventName, handler);
        }

        function bodyHtml(html) {
            return $confirmationModalHtml.find('.modal-body').html(html);
        }

        function title(text) {
            return $confirmationModalHtml.find('.modal-title').text(text);
        }

        function show() {
            $confirmationModalHtml.modal('show');

            var defer = $q.defer();

            $confirmationModalHtml.find('[data-dismiss="modal"]').one('click', function() {
                defer.reject();
            });

            $confirmationModalHtml.find('[data-confirm="true"]').one('click', function() {
                hide();
                defer.resolve();
            });

            $confirmationModalHtml.one('hide.bs.modal', function() {
                // remove from DOM.
                title('');
                bodyHtml('');
            });

            return defer.promise;
        }

        function hide() {
            $confirmationModalHtml.modal('hide');
        }
    }]);
})();