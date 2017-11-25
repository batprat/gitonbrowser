const utils = require('./utils');
const { spawn } = require('child_process');

let showAllLogs = true;

let git = {
    clone: clone,
    logRepo: logRepo,
    getCommit: getCommit,
    getStatus: getStatus,
    getFileDiff: getFileDiff
};

function getFileDiff(options) {
    let req = options.req;
    let res = options.res;
    let repo = options.repo;

    var fileName = req.query.filename;
    var isUntracked = req.query.isUntracked === 'true';
    var isDeleted = req.query.isDeleted === 'true';

    var gitOptions = ['diff'];

    if(isUntracked) {
      gitOptions.push('--no-index', '/dev/null');
    }

    if(fileName.indexOf('"') > -1) {
      fileName = fileName.replace(/\"/g, '');
    }

    if(!isUntracked) {
      gitOptions.push('--');
    }

    gitOptions.push(fileName);

    if(showAllLogs) {
      console.log('gitOptions = ' + gitOptions.toString());
    }

    const child = spawnGitProcess(repo, gitOptions);
    redirectIO(child, req, res);
}

function getStatus(options) {
    let req = options.req;
    let res = options.res;
    let repo = options.repo;

    const child = spawnGitProcess(repo, ['status', '--porcelain']);
    redirectIO(child, req, res);
}

function getCommit(options) {
    let hash = options.hash;
    let req = options.req;
    let res = options.res;
    let repo = options.repo;

    const child = spawnGitProcess(repo, ['show', hash]);

    redirectIO(child, req, res);
}

function spawnGitProcess(repo, processOptions) {
    return spawn('git', processOptions, {
        cwd: utils.getCheckoutsDir() + '/' + repo,
        stdio: [0, 'pipe', 'pipe']
    });
}

function logRepo(repo, req, res) {
/*
C:\E\projects\webgit-server\git-checkouts\d3>git log --all --graph --decorate --pretty=oneline --abbrev-commit
*/

/* git log -50 --format:'
<commit>
    <hash>%H</hash>
    <author_name>%an</author_name>
    <author_email>%ae</author_email>
    <author_date>%%aD</author_date>
</commit>'

git log -n 50 --format=format:'<commit><hash>%H</hash><author_name>%an</author_name><author_email>%ae</author_email><author_date>%%aD</author_date></commit>'
log --graph --abbrev-commit --decorate --format=format:'%C(bold blue)%h%C(reset) - %C(bold green)(%ar)%C(reset) %C(white)%s%C(reset) %C(dim white)- %an%C(reset)%C(bold yellow)%d%C(reset)' --all

*/

    let randomSeperator = utils.getRandomSeparator();
    let logFormat = `--format=format:%H${randomSeperator}%an${randomSeperator}%ae${randomSeperator}%aD${randomSeperator}%s`;

    let logArgs = ['log', '-n 50', logFormat];

    const child = spawn('git', logArgs, {
        cwd: utils.getCheckoutsDir() + '/' + repo,
        stdio: [0, 'pipe', 'pipe']
    });

    redirectIOForLog(child, req, res, randomSeperator);
}

function clone(options) {
    let url = options.url;
    let cloneDir = options.dir;
    let res = options.res;
    let req = options.req;
  
    let cloneOptions = ['clone', '--progress', url];
    
    if(cloneDir) {
      cloneOptions.push(cloneDir);
    }
    
    const child = spawn('git', cloneOptions, {
      cwd: utils.getCheckoutsDir(),
      stdio: [0, 'pipe', 'pipe']
    });

    redirectIO(child, req, res);
}

function redirectIO(child, req, res) {
    child.stdout.on('data', function(data) {
        res.write(data.toString());
        if(showAllLogs) {
          console.log( `stdout: ${data}` );
        }
    });
  
      child.stderr.on('data', function(data) {
        res.write(data.toString());
        if(showAllLogs) {
          console.log( `stderr: ${data}` );
        }
      });
    
      child.on('error', function(err) {
        res.write(err.toString());
        if(showAllLogs) {
          console.log('error event output');
          console.log(err);
        }
      });
    
      if(showAllLogs) {
        child.on('exit', function(code, signal) {
          console.log('code = ' + code);
          console.log('signal = ' + signal);
        });
      }
    
      child.on('close', function(code, signal) {
        if(showAllLogs) {
          console.log('event -- close');
          console.log('code = ' + code);
          console.log('signal = ' + signal);
        }
        res.end();
      });
}

let logCommits = [];

function redirectIOForLog(child, req, res, splitter) {
    child.stdout.on('data', function(data) {
        console.log( `stdout===========================: ${data}` );
        let commits = data.toString().split('\n');

        Array.prototype.push.apply(logCommits, commits);
        console.log( `stdout: ${data}` );
    });
  
      child.stderr.on('data', function(data) {
        //res.write(data);
        console.log( `stderr: ${data}` );
      });
    
      child.on('error', function(err) {
        res.write(err);
        console.log('error event output');
        console.log(err);
      });
    
      child.on('exit', function(code, signal) {
        console.log('code = ' + code);
        console.log('signal = ' + signal);
      });
    
      child.on('close', function(code, signal) {
        console.log('event -- close');
        console.log('code = ' + code);
        console.log('signal = ' + signal);

        let commitData = {};
        let log = [];
        let aCommit = null;
        logCommits.forEach(function(commit, idx) {
            aCommit = commit.split(splitter);
            if(aCommit.length != 5) {
                return;
            }
            commitData = {
                hash: aCommit[0],
                name: aCommit[1],
                email: aCommit[2],
                date: aCommit[3],
                subject: aCommit[4]
            };
            log.push(commitData);
        });

        res.setHeader('Content-Type', 'application/json');
        res.write(JSON.stringify(log));
        logCommits = [];       // reset the log data.
        res.end();
      });
}

module.exports = git;