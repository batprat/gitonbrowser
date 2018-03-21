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

    git.getFileDiff({repo, req, res});
});

router.get('/:id/stagefile', function(req, res) {
    let repo = req.params.id;
    
    git.stageFile({repo, req, res});
});

router.get('/:id/unstagefile', function(req, res) {
    let repo = req.params.id;
    
    git.unstageFile({repo, req, res});
});

router.get('/:id/stageallfiles', function(req, res) {
    let repo = req.params.id;
    
    git.stageAllFiles({repo, req, res});
});

router.get('/:id/unstageallfiles', function(req, res) {
    let repo = req.params.id;
    
    git.unstageAllFiles({repo, req, res});
});

router.get('/:id/diffbetweencommits', function(req, res) {
    let repo = req.params.id;

    git.getDiffBetweenCommits({repo, req, res});
});

router.get('/:id/commit', function(req, res) {
    let repo = req.params.id;

    git.commit({repo, req, res});
});


router.get('/:id/initrepo', function(req, res) {
  let repo = req.params.id;

  git.initRepo({repo, req, res});
});

router.get('/:id/pull', function(req, res) {
  let repo = req.params.id;

  git.pull({repo, req, res});
});

router.get('/:id/push', function(req, res) {
  let repo = req.params.id;

  git.push({repo, req, res});
});

router.get('/:id/getstashlist', (req, res) => {
    let repo = req.params.id;

    git.getStashList({repo, req, res});
});

router.get('/:id/selectstash', (req, res) => {
    let repo = req.params.id;

    git.selectStash({repo, req, res});
});

module.exports = router;
