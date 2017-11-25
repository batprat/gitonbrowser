var express = require('express');
var router = express.Router();
const git = require('../modules/git_functions');
const utils = require('../modules/utils');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Welcome' });
});

router.get('/getclonedrepos', function(req, res) {
  var allRepos = utils.getAllDirectories(utils.getCheckoutsDir());
  res.setHeader('Content-Type', 'application/json');
  res.write(JSON.stringify({
    allRepos: allRepos
  }));
  res.end();
});

router.post('/clonerepo', function(req, res, next) {
  // TODO: validate URL
  // TODO: validate dir name

  git.clone({
    dir: req.body.dirName,
    url: req.body.url,
    req: req,
    res: res
  });
});

router.post('/test', function(req, res, next) {

});

module.exports = router;
