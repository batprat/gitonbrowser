(function() {
    $(function() {
        getClonedRepos();
    
        var $cloneBtn = $('#btn-clone');
        var $cloneUrl = $('#inp-clone');
        var $cloneDirName = $('#inp-dirname');
    
        var $responseModal = $('#response-modal');
        var $responseModalTitle = $responseModal.find('#response-title');
        var $responseModalBody = $responseModal.find('#response-body');
        var $clonedRepos = $('#cloned-repos');
    
        $cloneBtn.on('click', function() {
            cloneRepo($cloneUrl.val(), $cloneDirName.val())
        });
    
        function getClonedRepos() {
            $.ajax({
                url: '/getclonedrepos',
                method: 'GET',
                success: function(data) {
                    var allRepos = data.allRepos;
                    if(!allRepos || !(allRepos instanceof Array)) {
                        return;
                    }
                    var html = '';
                    allRepos.forEach(function(repo) {
                        var folderName = repo.split('\\').slice(-1).pop();
                        html += '<li class="cloned-repo" data-repo-dir="'+ repo +'" title="'+ repo +'"><a href="/repo/' + folderName + '" target="_self">' + folderName + '</a></li>'
                    });
    
                    $clonedRepos.html(html);
                }
            });
        }
    
        function cloneRepo(url, dir) {
            // TODO: show loader
            $.ajax({
                url: '/clonerepo',
                method: 'POST',
                data: {
                    url: url,
                    dirName: dir
                },
                success: function(data) {
                    $responseModalTitle.text('Cloning');
                    $responseModalBody.html(data.replace(/\n/g, '<br />'));
                    $responseModal.modal('show');
    
                    getClonedRepos();
                }
            });
        }
    
        $('.btn-test').on('click', function() {
            getClonedRepos();
            return;
            $.ajax({
                url: '/test',
                method: 'POST',
                data: {
                    praty: 'Rocks'
                }
            });
        });
    });
})();