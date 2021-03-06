let express = require('express');
let router = express.Router();

const utils = require('../modules/utils');
const git = require('../modules/git_functions');

/* GET repositories listing. */
router.get('/', function (req, res, next) {
    console.log('inside /');
    let allRepos = utils.getAllDirectories(utils.getCheckoutsDir());
    res.setHeader('Content-Type', 'application/json');
    res.write(JSON.stringify({
        allRepos: allRepos
    }));
    res.end();
});

router.get('/:id', function (req, res) {
    let repo = req.params.id;
    res.render('repo', { title: decodeURIComponent(repo) });
});

router.get('/:id/getrepolog', function (req, res) {
    // get all commits in that repo.
    let repo = req.params.id;
    git.logRepo({ req, res, repo });
});

router.get('/:id/getcommit/:commitHash', function (req, res) {
    let repo = req.params.id;
    let hash = req.params.commitHash;

    if (!hash) {
        return res.send('Error: commit hash required.');
    }
    git.getCommit({ repo, hash, req, res });
});

router.get('/:id/refreshlocal', function (req, res) {
    let repo = req.params.id;

    git.getStatus({ repo, req, res });
});

router.get('/:id/getfilediff', function (req, res) {
    let repo = req.params.id;

    git.getFileDiff({ repo, req, res });
});

router.get('/:id/stagefiles', function (req, res) {
    let repo = req.params.id;

    git.stageFiles({ repo, req, res });
});

router.get('/:id/unstagefiles', function (req, res) {
    let repo = req.params.id;

    git.unstageFiles({ repo, req, res });
});

router.get('/:id/stageallfiles', function (req, res) {
    let repo = req.params.id;

    git.stageAllFiles({ repo, req, res });
});

router.get('/:id/unstageallfiles', function (req, res) {
    let repo = req.params.id;

    git.unstageAllFiles({ repo, req, res });
});

router.get('/:id/diffbetweencommits', function (req, res) {
    let repo = req.params.id;

    git.getDiffBetweenCommits({ repo, req, res });
});

router.get('/:id/commit', function (req, res) {
    let repo = req.params.id;

    git.commit({ repo, req, res });
});


router.get('/:id/initrepo', function (req, res) {
    let repo = req.params.id;

    git.initRepo({ repo, req, res });
});

router.get('/:id/pull', function (req, res) {
    let repo = req.params.id;

    git.pull({ repo, req, res });
});

router.get('/:id/push', function (req, res) {
    let repo = req.params.id;

    git.push({ repo, req, res });
});

router.get('/:id/getstashlist', (req, res) => {
    let repo = req.params.id;

    git.getStashList({ repo, req, res });
});

router.get('/:id/selectstash', (req, res) => {
    let repo = req.params.id;

    git.selectStash({ repo, req, res });
});

router.post('/:id/stashlocal', (req, res) => {
    let repo = req.params.id;

    git.stashLocalChanges({ repo, req, res });
});

router.delete('/:id/dropstash/:stashName', (req, res) => {
    let repo = req.params.id;

    git.dropStash({ repo, req, res });
});

router.post('/:id/applystash', (req, res) => {
    let repo = req.params.id;

    git.applyStash({ repo, req, res });
});

router.post('/:id/resetall', (req, res) => {
    let repo = req.params.id;

    git.resetAllChanges({ repo, req, res });
});

router.post('/:id/resetunstaged', (req, res) => {
    let repo = req.params.id;

    git.resetUnstagedChanges({ repo, req, res });
});

router.post('/:id/createnewbranch', (req, res) => {
    let repo = req.params.id;

    git.createNewBranch({ repo, req, res });
});

router.post('/:id/checkoutlocalbranch', (req, res) => {
    let repo = req.params.id;

    git.checkoutLocalBranch({ repo, req, res });
});

router.post('/:id/pushnewbranch', (req, res) => {
    let repo = req.params.id;

    git.pushNewBranch({ repo, req, res });
});

router.post('/:id/rebasecurrentbranchon', (req, res) => {
    let repo = req.params.id;

    git.rebaseCurrentBranchOn({ repo, req, res });
});

router.post('/:id/resetheadfile', (req, res) => {
    let repo = req.params.id;

    git.doResetHEADFile({ repo, req, res });
});

router.post('/:id/abortrebase', (req, res) => {
    let repo = req.params.id;

    git.abortRebase({ repo, req, res });
});

router.post('/:id/continuerebase', (req, res) => {
    let repo = req.params.id;

    git.continueRebase({ repo, req, res });
});

router.post('/:id/removefile', (req, res) => {
    let repo = req.params.id;

    git.removeFile({ repo, req, res });
});

router.post('/:id/skiprebase', (req, res) => {
    let repo = req.params.id;

    git.skipRebase({ repo, req, res });
});

router.post('/:id/merge', (req, res) => {
    let repo = req.params.id;

    git.mergeIntoCurrent({ repo, req, res });
});

router.post('/:id/abortmerge', (req, res) => {
    let repo = req.params.id;

    git.abortMerge({ repo, req, res });
});

router.post('/:id/searchfortext', (req, res) => {
    let repo = req.params.id;

    git.searchForText({ repo, req, res });
});

router.post('/:id/cherrypick', (req, res) => {
    let repo = req.params.id;

    git.cherrypick({ repo, req, res });
});


router.post('/:id/getmergemsg', (req, res) => {
    let repo = req.params.id;

    git.getMergeMsg({ repo, req, res });
});

router.post('/:id/checkoutremotebranch', (req, res) => {
    let repo = req.params.id;

    git.checkoutRemoteBranch({ repo, req, res });
});

router.post('/:id/resetfiles', (req, res) => {
    let repo = req.params.id;

    git.resetFiles({ repo, req, res });
});

router.post('/:id/deletelocalbranch', (req, res) => {
    let repo = req.params.id;

    git.deleteLocalBranch({ repo, req, res });
});

router.post('/:id/revertcommit', (req, res) => {
    let repo = req.params.id;

    git.revertCommit({ repo, req, res });
});

router.post('/:id/getfilehistory', (req, res) => {
    let repo = req.params.id;

    git.getFileHistory({ repo, req, res });
});

router.get('/:id/getunpushedcommits', (req, res) => {
    let repo = req.params.id;

    git.getUnpushedCommits({ repo, req, res });
});

router.post('/:id/stageselectedlines', (req, res) => {
    let repo = req.params.id;

    git.stageSelectedLines({ repo, req, res });
});

router.post('/:id/unstageselectedlines', (req, res) => {
    let repo = req.params.id;

    git.unstageSelectedLines({ repo, req, res });
});

router.post('/:id/resetselectedlines', (req, res) => {
    let repo = req.params.id;

    git.resetSelectedLines({ repo, req, res });
});

module.exports = router;
