const utils = require('./utils');
const { spawn } = require('child_process');

let showAllLogs = false;

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
    commit: commit,
    initRepo: initRepo,
    pull: pull,
    push: push,
    getStashList: getStashList,
    selectStash: selectStash,
    stashLocalChanges: stashLocalChanges,
    dropStash: dropStash,
    applyStash: applyStash,
    resetAllChanges: resetAllChanges,
    resetUnstagedChanges: resetUnstagedChanges,
    createNewBranch: createNewBranch,
    checkoutLocalBranch: checkoutLocalBranch,
    pushNewBranch: pushNewBranch,
    rebaseCurrentBranchOn,
    doResetHEADFile,
    abortRebase,
    continueRebase,
    skipRebase,
    removeFile,
    mergeIntoCurrent,
    abortMerge,
    testGit
};

function testGit({req, res}) {
    const child = spawnGitProcess();
    redirectIO(child, req, res);
}

function abortMerge({req, res, repo}) {
    // TODO: Handle for older git versions.. https://stackoverflow.com/questions/5741407/how-to-undo-a-git-merge-with-conflicts
    const child = spawnGitProcess(repo, ['merge', '--abort']);
    redirectIO(child, req, res);
}

function mergeIntoCurrent({req, res, repo}) {
    let obj = req.body.obj;

    const child = spawnGitProcess(repo, ['merge', obj]);
    redirectIO(child, req, res);
}

function removeFile({req, res, repo}) {
  let fileName = req.body.name;

  const child = spawnGitProcess(repo, ['rm', fileName]);
  redirectIO(child, req, res);
}

function skipRebase({req, res, repo}) {
  const child = spawnGitProcess(repo, ['rebase', '--skip']);
  redirectIO(child, req, res);
}

function continueRebase({req, res, repo}) {
  const child = spawnGitProcess(repo, ['rebase', '--continue']);
  redirectIO(child, req, res);
}

function abortRebase({req, res, repo}) {
  const child = spawnGitProcess(repo, ['rebase', '--abort']);
  redirectIO(child, req, res);
}

function doResetHEADFile({req, res, repo}) {
  let fileName = req.body.fileName;

  const child = spawnGitProcess(repo, ['reset', 'HEAD', fileName]);
  redirectIO(child, req, res);
}

function rebaseCurrentBranchOn({req, res, repo}) {
  let branchNameOrRevision = req.body.branchNameOrRevision;

  const child = spawnGitProcess(repo, ['rebase', branchNameOrRevision]);
  redirectIO(child, req, res);
}

function pushNewBranch({req, res, repo}) {
  let remoteName = req.body.remoteName;
  let newRemoteBranchName = req.body.newRemoteBranchName;

  const child = spawnGitProcess(repo, ['push', '-u', 'origin', newRemoteBranchName + ':' + newRemoteBranchName]);
  redirectIO(child, req, res);
}

function checkoutLocalBranch({req, res, repo}) {
  let branchName = req.body.branchName;

  const child = spawnGitProcess(repo, ['checkout', branchName]);
  redirectIO(child, req, res);
}

function createNewBranch({req, res, repo}) {
  let revision = req.body.revision;
  let checkoutAfterCreate = req.body.checkoutAfterCreate;
  let branchName = req.body.branchName;

  let options = null;

  if(checkoutAfterCreate) {
    options = ['checkout', '-b', branchName, revision];
  } 
  else {
    options = ['branch', branchName, revision];
  }
  const child = spawnGitProcess(repo, options);
  redirectIO(child, req, res);
}

function resetUnstagedChanges({req, res, repo}) {
  let deleteUntracked = req.body.deleteUntracked;

  if(!deleteUntracked) {
    const child = spawnGitProcess(repo, ['checkout', '.']);
    redirectIO(child, req, res);
    return;
  }
  else {
    const child = spawnGitProcess(repo, ['clean', '-fd']);
    let cleanPromise = redirectIO(child, null, null);

    cleanPromise.then(function(cleanInfo) {
      const child2 = spawnGitProcess(repo, ['checkout', '.']);
      redirectIO(child2, req, res, {cleanInfo: cleanInfo});
    });
  }
}

function resetAllChanges({req, res, repo}) {
  let deleteUntracked = req.body.deleteUntracked;

  if(!deleteUntracked) {
    const child = spawnGitProcess(repo, ['reset', 'HEAD']);
    let resetPromise = redirectIO(child, null, null);

    resetPromise.then(function(resetInfo) {
      const child2 = spawnGitProcess(repo, ['checkout', '.']);
      redirectIO(child2, req, res, {resetInfo: resetInfo});
    });
    return;
  }
  else {
    const child = spawnGitProcess(repo, ['reset', 'HEAD']);
    let resetPromise = redirectIO(child, null, null);

    resetPromise.then(function(resetInfo) {
      const child2 = spawnGitProcess(repo, ['clean', '-fd']);
      let cleanPromise = redirectIO(child2, null, null);

      cleanPromise.then(function(cleanInfo) {
        const child3 = spawnGitProcess(repo, ['checkout', '.']);
        redirectIO(child3, req, res, {cleanInfo: cleanInfo, resetInfo: resetInfo});
      });
    });
  }
}

function applyStash({req, res, repo}) {
  let name = req.body.name;
  let pop = req.body.pop;

  const child = spawnGitProcess(repo, ['stash', pop ? 'pop' : 'apply', name]);
  redirectIO(child, req, res);
}

function dropStash({req, res, repo}) {
  let name = req.params.stashName;
  const child = spawnGitProcess(repo, ['stash', 'drop', name]);
  redirectIO(child, req, res);
}

function stashLocalChanges({req, res, repo}) {
  let includeUntracked = req.body.includeUntracked;

  let options = ['stash', 'save'];
  if(includeUntracked) {
    options.push('-u');
  }
  const child = spawnGitProcess(repo, options);
  redirectIO(child, req, res);
}

function selectStash({req, res, repo}) {
  let name = req.query.name;

  const child = spawnGitProcess(repo, ['stash', 'show', '-p', name]);
  redirectIO(child, req, res);
}

function push({req, res, repo}) {
  let remoteBranch = req.query.remotebranch,
      remoteName = req.query.remotename;

  const child = spawnGitProcess(repo, ['push', remoteName, remoteBranch]);
  redirectIO(child, req, res);
}

function pull({req, res, repo}) {
  let remoteBranch = req.query.remotebranch,
      mergeOption = req.query.mergeoption;

  let pullOptions = [];

  if(mergeOption == 'fetch') {
    pullOptions.push('fetch', '--all');
  }
  else {
    pullOptions.push('pull', 'origin', remoteBranch);
  }

  if(mergeOption == 'rebase') {
    pullOptions.splice(1, 0, '--rebase');
  }

  const child = spawnGitProcess(repo, pullOptions);
  redirectIO(child, req, res);
}

function getStashList({repo, req, res}) {
  const child = spawnGitProcess(repo, ['stash', 'list']);

  let stashesListPromise = redirectIO(child, req, res);
}

function initRepo({req, res, repo}) {
  // do multiple things.
  // get remote name      // git remote
  // get remoteBranches   // git branch -r
  // get local branches   // git branch
  // get current branch
  // get stashes

  let remotePromise = getRemote(repo);
  let remoteBranchesPromise = getRemoteBranches(repo);
  let localBranchesInfoPromise = getLocalBranches(repo);
  let localProgressPromise = getLocalProgressStatus(repo);

  Promise.all([remotePromise, remoteBranchesPromise, localBranchesInfoPromise, localProgressPromise]).then(function(op) {
    let remote = op[0];
    let remoteBranches = op[1];
    let localBranchesInfo = op[2];
    let localProgress = op[3];

    sendResponse(res, {
      output: {
        remote,
        remoteBranches,
        localBranches: localBranchesInfo.locals,
        currentBranch: localBranchesInfo.current,
        localProgress: localProgress
      },
      errorCode: 0
    });
  }).catch(function(ex) {
    sendResponse(res, {
      errorCode: 1,
      errors: ex
    });
  });
}

/**
 * Checks if rebase, interactive rebase, merge or revert are in progress.
*/
function getLocalProgressStatus(repo) {
  let rebaseHeadPromise = utils.progressFileExists(utils.getRebaseHeadPath(repo));
  let interactiveRebaseHeadPromise = utils.progressFileExists(utils.interactiveRebaseHeadPath(repo));
  let mergeHeadPromise = utils.progressFileExists(utils.getMergeHeadPath(repo));
  let revertHeadPromise = utils.progressFileExists(utils.getRevertHeadPath(repo));

  // no way yet to see stash in progress.
  // we'll detect these by checking UU on file status.
  return Promise.all([rebaseHeadPromise, mergeHeadPromise, revertHeadPromise, interactiveRebaseHeadPromise]).then((heads)=> {
    console.log('heads = ' + heads);
    if(heads[0] || heads[1] || heads[2]) {
      // there is something in progress!
      if(heads[0]) {
        return 'rebase-progress';
      }
      if(heads[1]) {
        return 'merge-progress';
      }
      if(heads[2]) {
        return 'revert-progress';
      }
      if(heads[3]) {
        return 'interactive-rebase-progress';
      }
    }
    return;
  }).catch((err) => {
    console.log(err);
  });
}

/**
  Gets a list of local branches and the current branch.
  NOTE: seperate functions for local and remote branches to handle branches named like `remotes/origin/test-branch-4` (that start with `remotes/origin`)
*/
function getLocalBranches(repo) {
  const child = spawnGitProcess(repo, ['branch']);
  let localBranchesPromise = redirectIO(child, null, null);
  return localBranchesPromise.then(function(res) {
    if(!res.errorCode) {
      let localBranches = res.output.join('\n').trim().split('\n');
      let branchInfo = {
        locals: [],
        current: ''
      };

      localBranches.forEach((b) => {
        if(b.indexOf('* ') == 0) {
          branchInfo.current = b.substring('* '.length);
          b = branchInfo.current;
        }
        branchInfo.locals.push(b.trim());
      });

      return branchInfo;
    }
    // TODO: handle error here.
  });
}

function getRemote(repo) {
  const child = spawnGitProcess(repo, ['remote']);
  let remotePromise = redirectIO(child, null, null);
  return remotePromise.then(function(res) {
    if(!res.errorCode) {
      return res.output[0].trim();
    }
    // TODO: handle error here.
  });
}

/**
  Gets a list of remote branches
  NOTE: seperate functions for local and remote branches to handle branches named like `remotes/origin/test-branch-4` (that start with `remotes/origin`)
*/
function getRemoteBranches(repo) {
  const child = spawnGitProcess(repo, ['branch', '-r']);
  let remoteBranchesPromise = redirectIO(child, null, null);
  return remoteBranchesPromise.then(function(res) {
    if(!res.errorCode) {
      return res.output[0].trim().split('\n').map(branch => branch.trim());
    }
    // TODO: handle error here.
  });
}



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

    getLocalProgressStatus(repo).then((progress) => {
      const child = spawnGitProcess(repo, ['status', '-uall', '--porcelain']);
      redirectIO(child, req, res, {
        progress: progress
      });
    });
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
    // console.log('path = ' + utils.decodePath(repo));
    return spawn('git', processOptions, {
        cwd: _getCwd(repo),
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

    let logArgs = ['log', '-n 100', logFormat, '--branches', '--remotes', '--tags'];

    let page = req.query.page || 1;

    if(page > 1) {
      logArgs.push('--skip=' + ((page - 1) * 100));
    }

    const child = spawn('git', logArgs, {
        cwd: _getCwd(repo),
        stdio: [0, 'pipe', 'pipe']
    });

    redirectIOForLog(child, req, res, randomSeperator);
}

function clone({req, res}) {
    let url = decodeURIComponent(req.body.url);
    let cloneSubdirectoryName = decodeURIComponent(req.body.dirName);
    let destinationDir = decodeURIComponent(req.body.destination);
  
    let cloneOptions = ['clone', '--progress', url];
    
    if(cloneSubdirectoryName) {
      cloneOptions.push(cloneSubdirectoryName);
    }
    
    const child = spawn('git', cloneOptions, {
      cwd: destinationDir,
      stdio: [0, 'pipe', 'pipe']
    });

    let logs = [];
    child.stderr.on('data', function(data) {
      logs.push(data.toString());
    });

    child.on('error', function(err) {
        logs.push(err.toString);
    });

    let extraInfo = {
      repoPath: ''
    };

    child.on('exit', function(code, signal) {
      let repoName = logs[0].match(/^Cloning into \'(.+)\'...\n$/);
      repoName = repoName[1];
      extraInfo.repoPath = utils.encodePath(destinationDir + '/' + repoName);
    });

    redirectIO(child, req, res, extraInfo);
}

function redirectIO(child, req, res, extraInfo = null) {
    return new Promise((resolve, reject) => {
      let errors = [];
      let output = [];
      child.stdout.on('data', function(data) {
          output.push(data.toString());
          if(showAllLogs) {
            console.log( `stdout: ${data}` );
          }
      });
  
      child.stderr.on('data', function(data) {
        errors.push(data.toString());
        if(showAllLogs) {
          console.log( `stderr: ${data}` );
        }
      });
  
      child.on('error', function(err) {
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

        let op = {
          errorCode: errors.length > 0 ? 1 : 0,
          errors,
          output,
          extraInfo
        };

        if(res) {
          sendResponse(res, op);
        }

        if(op.errorCode) {
          reject(op);
        }
        else {
          resolve(op);
        }
      });
    });
    
}

function sendResponse(res, op) {
  res.setHeader('Content-Type', 'application/json');
  res.write(JSON.stringify(op));
  res.end();
}

let logCommits = [];

function redirectIOForLog(child, req, res, splitter) {
    let errors = [];
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
        if(showAllLogs) {
          console.log( `stderr: ${data}` );
        }
      });
    
      child.on('error', function(err) {
        if(showAllLogs) {
          console.log('error event output');
          console.log(err);
        }
        // res.write(JSON.stringify(err));
        errors.push(JSON.stringify(err));
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

        if(errors.length) {
            return sendResponse(res, {errors});
        }

        let commitData = {};
        let log = [];
        let aCommit = null;
        logCommits = logCommits.join('');

        logCommits = logCommits.split(splitter);

        logCommits.forEach(function(commit, idx) {
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
              let match = aCommit[0].match(/^\((.+)\)$/);   // has brackets
              // var match = aCommit[0].match(/\(([A-Za-z0-9\/]+)\s\-\>\s([A-Za-z0-9\/]+)\)/);
              let refs = match[1];    // brackets removed.
              
              refs = refs.split(', ');
              let localHead = refs.filter(function(s) {
                return s.indexOf('HEAD -> ') === 0;
              });
              
              if(localHead && localHead.length > 0) {
                commitData.localHead = localHead[0].substring('HEAD -> '.length);
                refs.splice(refs.indexOf(localHead[0]), 1);   // remove local head from the refs.
              }
              
              let localBranches = refs.filter(function(s) {
                return s.indexOf('origin/') !== 0;      // remote branches' names in tags/refs start with `origin/`. This will fail for those who name their local branches `origin/mybranch` :|
              });

              if(localBranches && localBranches.length > 0) {
                commitData.localBranches = localBranches;
              }

              let remoteBranches = refs.filter(function(s) {
                return s.indexOf('origin/') == 0 && s !== 'origin/HEAD';
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

function _getCwd(repo) {
  return utils.decodePath(repo);
}

module.exports = git;