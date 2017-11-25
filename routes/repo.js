let express = require('express');
let router = express.Router();

const utils = require('../modules/utils');
const git = require('../modules/git_functions');

/* GET repositories listing. */
router.get('/', function(req, res, next) {
    console.log('inside /');
    let allRepos = utils.getAllDirectories(utils.getCheckoutsDir());
    res.setHeader('Content-Type', 'application/json');
    res.write(JSON.stringify({
      allRepos: allRepos
    }));
    res.end();
});

router.get('/:id', function(req, res) {
    console.log('inside praty');
    let repo = req.params.id;
    res.render('repo', { title: repo });
});

router.get('/:id/getrepolog', function(req, res) {
    // get all commits in that repo.
    let repo = req.params.id;
    git.logRepo(repo, req, res);
});

router.get('/:id/getcommit/:commitHash', function(req, res) {
    let repo = req.params.id;
    let hash = req.params.commitHash;

    if(!hash) {
        return res.send('Error: commit hash required.');
    }
    git.getCommit({repo, hash, req, res});
});

router.get('/:id/refreshlocal', function(req, res) {
    let repo = req.params.id;

    git.getStatus({repo, req, res});
});

router.get('/:id/getfilediff', function(req, res) {
    let repo = req.params.id;

    git.getFileDiff({repo, req, res})
});

module.exports = router;
