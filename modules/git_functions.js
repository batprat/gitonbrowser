const utils = require('./utils');
const { spawn } = require('child_process');

let showAllLogs = true;

let git = {
    clone: clone,
    logRepo: logRepo,
    getCommit: getCommit,
    getStatus: getStatus,
    getFileDiff: getFileDiff,
    stageFile: stageFile,
    unstageFile: unstageFile,
    stageAllFiles: stageAllFiles,
    unstageAllFiles: unstageAllFiles,
    getDiffBetweenCommits: getDiffBetweenCommits,
    commit: commit
};

function commit({req, res, repo}) {
  const child = spawnGitProcess(repo, ['commit', '-m', req.query.message]);
  redirectIO(child, req, res);
}

function getDiffBetweenCommits({req, res, repo}) {
  const child = spawnGitProcess(repo, ['diff', req.query.commit1, req.query.commit2]);
  redirectIO(child, req, res);
}

function unstageAllFiles({req, res, repo}) {
  const child = spawnGitProcess(repo, ['reset', '--quiet']);
  redirectIO(child, req, res);
}

function stageAllFiles({req, res, repo}) {
  const child = spawnGitProcess(repo, ['add', '-A']);
  redirectIO(child, req, res);
}

function unstageFile({req, res, repo}) {
  let gitOptions = ['reset', '--quiet'];
  let tags = req.query.tags.split(',');
  let fileName = req.query.filename;

  if(tags.indexOf('deletedstaged') > -1) {
    gitOptions.push('--');
  }

  if(fileName.indexOf('"') > -1) {
    fileName = fileName.replace(/\"/g, '');
  }

  gitOptions.push(fileName);

  console.log(gitOptions);

  const child = spawnGitProcess(repo, gitOptions);
  redirectIO(child, req, res);
}

function stageFile({req, res, repo}) {
  let gitOptions = ['add'];
  let tags = req.query.tags.split(',');
  let fileName = req.query.filename;

  if(tags.indexOf('deletedunstaged') > -1) {
    gitOptions.push('-u');
  }

  if(fileName.indexOf('"') > -1) {
    fileName = fileName.replace(/\"/g, '');
  }

  gitOptions.push(fileName);

  console.log(gitOptions);

  const child = spawnGitProcess(repo, gitOptions);
  redirectIO(child, req, res);
}

function getFileDiff(options) {
    let req = options.req;
    let res = options.res;
    let repo = options.repo;

    let fileName = req.query.filename;
    let tags = req.query.tags.split(',');

    let isUntracked = tags.indexOf('untracked') > -1;
    let isDeleted = tags.indexOf('deletedunstaged') > -1;

    let isStaged = tags.indexOf('staged') > -1;

    var gitOptions = ['diff'];

    if(isStaged) {
      gitOptions.push('--cached');
    }

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

    const child = spawnGitProcess(repo, ['status', '-uall', '--porcelain']);
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

function logRepoNew(repo, req, res) {
  
    //string formatString =
    ///* <COMMIT>       */ CommitBegin + "%n" +
    ///* Hash           */ "%H%n" +
    ///* Parents        */ "%P%n";
    // if (!ShaOnly)
    // {
    //     formatString +=
    //         /* Tree                    */ "%T%n" +
    //         /* Author Name             */ "%aN%n" +
    //         /* Author Email            */ "%aE%n" +
    //         /* Author Date             */ "%at%n" +
    //         /* Committer Name          */ "%cN%n" +
    //         /* Committer Email         */ "%cE%n" +
    //         /* Committer Date          */ "%ct%n" +
    //         /* Commit message encoding */ "%e%x00" + //there is a bug: git does not recode commit message when format is given
    //         /* Commit Subject          */ "%s%x00" +
    //         /* Commit Body             */ "%B%x00";
    // }
  

    // log -z --pretty=format:\"{formatString}\" --branches --date-order --all --
}

function logRepo3({repo, req, res}) {
  let logFormat = `--format=format:%H%n%an%n%ae%n%aD%n%s%n%P`;
  let logArgs = ['log', '-n 100', logFormat, '--branches'];

  const child = spawn('git', logArgs, {
      cwd: utils.getCheckoutsDir() + '/' + repo,
      stdio: [0, 'pipe', 'pipe']
  });

  redirectIO(child, req, res);
}

function logRepo(repo, req, res) {
/*
C:\E\projects\webgit-server\git-checkouts\d3>git log --all --graph --decorate --pretty=oneline --abbrev-commit
*/

/* git log -50 --format:'
<commit>
    <ref_names>%d</ref_names>
    <hash>%H</hash>
    <author_name>%an</author_name>
    <author_email>%ae</author_email>
    <author_date>%%aD</author_date>
    <parent_hashes>%P</parent_hashes>
    <subject>%s</subject>    
</commit>'

git log -n 100 --format=format:'<commit><hash>%H</hash><author_name>%an</author_name><author_email>%ae</author_email><author_date>%%aD</author_date></commit>'
log --graph --abbrev-commit --decorate --format=format:'%C(bold blue)%h%C(reset) - %C(bold green)(%ar)%C(reset) %C(white)%s%C(reset) %C(dim white)- %an%C(reset)%C(bold yellow)%d%C(reset)' --all

*/

    let randomSeperator = utils.getRandomSeparator();
    // let logFormat = `--format=format:%H${randomSeperator}%an${randomSeperator}%ae${randomSeperator}%aD${randomSeperator}%s${randomSeperator}%P`;

    let logFormat = `--format=format:%d%n%H%n%an%n%ae%n%aD%n%P%n%s%n${randomSeperator}`;

    let logArgs = ['log', '-n 100', logFormat, '--branches'];

    let page = req.query.page || 1;

    if(page > 1) {
      logArgs.push('--skip=' + ((page - 1) * 100));
    }

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
    var errors = [];
    var output = [];
    child.stdout.on('data', function(data) {
        //res.write(data.toString());
        output.push(data.toString());
        if(showAllLogs) {
          console.log( `stdout: ${data}` );
        }
    });
  
    child.stderr.on('data', function(data) {
      //res.write(data.toString());
      errors.push(data.toString());
      if(showAllLogs) {
        console.log( `stderr: ${data}` );
      }
    });
  
    child.on('error', function(err) {
      //res.write(err.toString());
      errors.push(err.toString());
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

      res.setHeader('Content-Type', 'application/json');
      res.write(JSON.stringify({
        errorCode: errors.length > 0 ? 1 : 0,
        errors,
        output
      }));
      res.end();
    });
}

let logCommits = [];

function redirectIOForLog(child, req, res, splitter) {
    child.stdout.on('data', function(data) {
        if(showAllLogs)
        console.log( `stdout===========================: ${data}` );
        // let commits = data.toString().split('\n');

        let commits = data.toString();

        // Array.prototype.push.apply(logCommits, commits);
        logCommits.push(commits);
        if(showAllLogs)
        console.log( `stdout: ${data}` );
    });
  
      child.stderr.on('data', function(data) {
        //res.write(data);
        if(showAllLogs)
        console.log( `stderr: ${data}` );
      });
    
      child.on('error', function(err) {
        res.write(err);
        if(showAllLogs) {
        console.log('error event output');
        console.log(err);
        }
      });
    
      child.on('exit', function(code, signal) {
        if(showAllLogs) {
        console.log('code = ' + code);
        console.log('signal = ' + signal);
        }
      });
    
      child.on('close', function(code, signal) {
        if(showAllLogs) {
        console.log('event -- close');
        console.log('code = ' + code);
        console.log('signal = ' + signal);
        }

        let commitData = {};
        let log = [];
        let aCommit = null;
        logCommits = logCommits.join('');

        logCommits = logCommits.split(splitter);

        logCommits.forEach(function(commit, idx) {
            // aCommit = commit.split(splitter);
            aCommit = commit.trim().split('\n');

            if(aCommit.length < 6) {
              return;
            }
            
            var i = aCommit[0].indexOf('(') == 0 ? 1 : 0;

            var refs = '';
            var hasRefs = false;
            if(i == 1) {
              hasRefs = true;
            }
            commitData = {
                hash: aCommit[i++],
                name: aCommit[i++],
                email: aCommit[i++],
                date: aCommit[i++],
                parentHashes: aCommit[i++]
            };

            if(hasRefs) {
              let match = aCommit[0].match(/^\((.+)\)$/);
              // var match = aCommit[0].match(/\(([A-Za-z0-9\/]+)\s\-\>\s([A-Za-z0-9\/]+)\)/);
              let refs = match[1];    // brackets removed.
              
              refs = refs.split(', ');
              let localHead = refs.filter(function(s) {
                return s.indexOf('HEAD -> ') === 0;
              });
              console.log(refs);
              if(localHead && localHead.length > 0) {
                commitData.localHead = localHead[0].substring('HEAD -> '.length);
                refs.splice(refs.indexOf(localHead[0]), 1);
              }
              console.log(refs);
              

              

              let localBranches = refs.filter(function(s) {
                return s.indexOf('/') === -1;
              });

              if(localBranches && localBranches.length > 0) {
                commitData.localBranches = localBranches;
              }

              let remoteBranches = refs.filter(function(s) {
                return s.indexOf('/') > -1 && s !== 'origin/HEAD';
              });

              if(remoteBranches && remoteBranches.length > 0) {
                commitData.remoteBranches = remoteBranches;
              }
            }

            commitData.subject = aCommit.slice(i).join('\n');
            log.push(commitData);
        });

        res.setHeader('Content-Type', 'application/json');
        res.write(JSON.stringify(log));
        logCommits = [];       // reset the log data.
        res.end();
      });
}

module.exports = git;