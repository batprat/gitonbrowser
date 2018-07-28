(function() {
    angular.module('RepoDetailModule').service('$responseModal', ['$http', '$routeParams', function ($http, $routeParams) {
        var $responseModalHtml = $(`
        <div class="modal fade" tabindex="-1" role="dialog" aria-hidden="true">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="response-title"></h5>
                        <button class="close" type="button" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                    </div>
                    <div class="modal-body"></div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" type="button" data-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>`);
        return {
            title: title,
            show: show,
            hide: hide,
            bodyHtml: bodyHtml,
            one: one
        };

        function one(eventName, handler) {
            return $responseModalHtml.one(eventName, handler);
        }

        function bodyHtml(html) {
            return $responseModalHtml.find('.modal-body').html(html);
        }

        function title(text) {
            return $responseModalHtml.find('.modal-title').text(text);
        }

        function show() {
            $('body').append($responseModalHtml);
            $responseModalHtml.modal('show');

            $responseModalHtml.one('hide.bs.modal', function() {
                // remove from DOM.
                title('');
                bodyHtml('');
                $responseModalHtml.remove();
            });

            return $responseModalHtml;
        }

        function hide() {
            $responseModalHtml.modal('hide');
        }
    }]);
})();