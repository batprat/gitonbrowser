let express = require('express');
let router = express.Router();
const git = require('../modules/git_functions');
const utils = require('../modules/utils');
let repos = require('../data/repos.json');
const fs = require('fs');

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', { title: 'gitonbrowser' });
});

router.get('/getclonedrepos', function (req, res) {
    // let allRepos = utils.getAllDirectories(utils.getCheckoutsDir());
    let allRepos = utils.getAllClonedRepos();
    res.setHeader('Content-Type', 'application/json');
    res.write(JSON.stringify({
        allRepos: allRepos
    }));
    res.end();
});

router.post('/clonerepo', function (req, res, next) {
    // TODO: validate URL
    // TODO: validate dir name

    git.clone({ req, res });
});

router.post('/testgit', function (req, res, next) {
    git.testGit({ req, res });
});

router.post('/settings', function (req, res, next) {
    // version of git running
    // git is in PATH?
    // path to installed git
    // username is configured for GIT
    // email is configured for GIT

    git.getSettings({ req, res });
});

router.get('/browserepo', function (req, res) {
    let path = req.query.path,
        encodedPath = utils.encodePath(path);
    // check if this path exists in repos.json.
    // if not exists, create it.
    // open the path as a repository.
    res.setHeader('Content-Type', 'application/json');
    if (repos[encodedPath]) {
        // if repository exists..
        // open it.
        res.write(JSON.stringify({
            path: '/repo/' + encodedPath
        }));
        res.end();
        return;
    }
    // add repository to repos.json
    repos[encodedPath] = {
        name: utils.getRepoNameFromEncodedPath(encodedPath)
    };
    // open it.
    fs.writeFile(utils.getReposStorePath(), JSON.stringify(repos), 'utf8', () => {
        repos = require('../data/repos.json');

        res.write(JSON.stringify({
            path: '/repo/' + encodedPath
        }));
        res.end();
    });
    return;
});

module.exports = router;
