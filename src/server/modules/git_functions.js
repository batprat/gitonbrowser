const utils = require('./utils');
const { spawn } = require('child_process');
const commandExists = require('command-exists');
const { stat } = require('fs');
const moment = require('moment');

let showAllLogs = true;
// let logCommits = [];
let gitExecutablePath = 'git';

let git = {
    clone: clone,
    logRepo: logRepo,
    getCommit: getCommit,
    getStatus: getStatus,
    getFileDiff: getFileDiff,
    stageFiles: stageFiles,
    unstageFiles: unstageFiles,
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
    testGit,
    searchForHash,
    searchForCommitMessage,
    getSettings,
    searchForText,
    cherrypick,
    getMergeMsg,
    checkoutRemoteBranch,
    resetFiles,
    deleteLocalBranch,
    revertCommit,
    getFileHistory,
    getUnpushedCommits,
    stageSelectedLines,
    unstageSelectedLines
};

module.exports = git;

return;

function unstageSelectedLines({req, res, repo}) {
    handleStagingOrUnstagingPatches(true, req, res, repo);
}

function stageSelectedLines({req, res, repo}) {
    handleStagingOrUnstagingPatches(false, req, res, repo);
}

function handleStagingOrUnstagingPatches(isStaged, req, res, repo) {
    let diff = req.body.diff,
        selectedLineNumbers = req.body.lineNumbers;

    let [selectedChunks, header] = getSelectedChunks(diff, selectedLineNumbers);
    
    if(selectedChunks.length == 0) {
        // nothing selected, do nothing.
        return res.sendStatus(200);
    }

    let patch = getPatchFromSelectedChunks(selectedChunks, header, isStaged);

    const buffer = Buffer.alloc(patch.length, patch);

    let options = ['apply', '--cached', '--whitespace=nowarn'];

    if(isStaged) {
        options.push('--reverse');
    }

    const child = spawnGitProcessWithInput(repo, options);
    child.stdin.write(buffer);
    child.stdin.end();
    redirectIO(child, req, res);
}

function getPatchFromSelectedChunks(selectedChunks, header, isStaged) {
    // Some motivation from https://github.com/gitextensions/gitextensions
    let patch = [];

    let currSelectedChunk = null;
    let currSubchunk = null;
    let chunkPatch = null;
    let addPart = null,
        removePart = null,
        prePart = null,
        postPart = null,
        inPostPart = false,
        selectedLastRemovedLine = false,
        selectedLastAddedLine = false;

    for(let i = 0; i < selectedChunks.length; i++) {
        // all maal masala is in the subchunks!
        currSelectedChunk = selectedChunks[i];
        chunkPatch = [];

        for(let j = 0; j < currSelectedChunk.subchunks.length; j++) {
            addPart = [];
            removePart = [];
            prePart = [];
            postPart = [];
            inPostPart = false;
            selectedLastRemovedLine = false;
            selectedLastAddedLine = false;
    
            currSubchunk = currSelectedChunk.subchunks[j];

            // join all precontext;
            if(currSubchunk.preContext.length) {
                Array.prototype.push.apply(chunkPatch, currSubchunk.preContext.map((l) => { return l.text; }));
            }

            currSubchunk.removedLines.forEach((removedLine, idx) => {
                selectedLastAddedLine = removedLine.selected;
                if(removedLine.selected) {
                    inPostPart = true;
                    removePart.push(removedLine.text);
                }
                else if(!isStaged) {
                    if(inPostPart) {
                        removePart.push(' ' + removedLine.text.substring(1));
                    }
                    else {
                        prePart.push(' ' + removedLine.text.substring(1));
                    }
                }
            });

            currSubchunk.addedLines.forEach((addedLine, idx) => {
                selectedLastRemovedLine = addedLine.selected;
                if(addedLine.selected) {
                    inPostPart = true;
                    addPart.push(addedLine.text);
                }
                else if(isStaged) {
                    if(inPostPart) {
                        postPart.push(' ' + addedLine.text.substring(1));
                    }
                    else {
                        prePart.push(' ' + addedLine.text.substring(1));
                    }
                }
            });

            Array.prototype.push.apply(chunkPatch, prePart);
            Array.prototype.push.apply(chunkPatch, removePart);

            if(currSubchunk.olderNoNewLineAtEnd && currSubchunk.postContext.length == 0 && (selectedLastRemovedLine || !isStaged)) {
                chunkPatch.push(currSubchunk.olderNoNewLineAtEnd.text);
            }
            
            Array.prototype.push.apply(chunkPatch, addPart);
            Array.prototype.push.apply(chunkPatch, postPart);

            // join all postcontext;
            if(currSubchunk.postContext.length) {
                Array.prototype.push.apply(chunkPatch, currSubchunk.postContext.map((l) => { return l.text; }));
            }

            if(currSubchunk.newerNoNewLineAtEnd && currSubchunk.postContext.length == 0 && (selectedLastAddedLine || isStaged)) {
                chunkPatch.push(currSubchunk.newerNoNewLineAtEnd.text);
            }

            if(currSubchunk.olderNoNewLineAtEnd && currSubchunk.postContext.length) {
                chunkPatch.push(currSubchunk.olderNoNewLineAtEnd.text);
            }
        }

        let removedLinesCount = chunkPatch.filter((l) => { return l[0] == '-' || l[0] == ' '; }).length;
        let addedLinesCount = chunkPatch.filter((l) => { return l[0] == '+' || l[0] == ' '; }).length;

        // add the header back.
        chunkPatch.splice(0, 0, currSelectedChunk.header.replace(/(@@\s\-\d+)(,?\d*)(\s\+\d+)(,?\d*)(\s@@)/g, '$1,'+ removedLinesCount +'$3,' + addedLinesCount + '$5'));
        Array.prototype.push.apply(patch, chunkPatch);
    }

    patch.splice(0, 0, header);
    return (patch.join('\n') + '\n');
}

function getSelectedChunks(diff, selectedLineNumbers) {
    let header = null;
    let allChunks = null;

    // divide the entire diff into header and chunks.
    let headerAndChunks = diff.split(/\n\r?(?=@@)/g);

    header = headerAndChunks[0];
    allChunks = headerAndChunks.slice(1);

    // go through each chunk.

    // divide each chunk into chunklets.

    let currentLineNumber = header.split(/\n/g).length,
        currentChunk = null,
        chunkLines = null;

    let selectedChunks = [];

    let chunkContainsSelectedLine = false;

    for(let chunkNumber = 0; chunkNumber < allChunks.length; chunkNumber++) {
        currentChunk = allChunks[chunkNumber];
        chunkLines = currentChunk.split(/\n\r?/g);

        // if no line in selectedLineNumbers is present in this chunk, skip it.
        // starts with currentLineNumber and ends at currentLineNumber + chunkLines.length

        chunkContainsSelectedLine = false;

        for(let i = currentLineNumber; i < currentLineNumber + chunkLines.length; i++) {
            if(selectedLineNumbers.indexOf(i) > -1) {
                chunkContainsSelectedLine = true;
                break;
            }
        }

        // you don't wanna stage anything from this chunk, lets skip it.
        if(!chunkContainsSelectedLine) {
            currentLineNumber += chunkLines.length;
            continue;
        }

        let lineText = null;

        let chunk = {
            subchunks: [], // each subchunk is an add and/or remove section (modified red/green lines) separated by context (non modified, white) lines
            header: null
        };

        let subchunk = {
            preContext: [],
            postContext: [],
            removedLines: [],
            addedLines: [],
            newerNoNewLineAtEnd: null,
            olderNoNewLineAtEnd: null
        };

        // chunkPointer can be 1, 2 or 3. 1 means above the added/removed part; 2 means in the added/removed part; 3 means below the added/removed part
        // if chunkPointer == 1, the current line is a precontext line.
        // if we come across an add/remove, check chunkPointer. if it is 1, make it 2; if it is 2, keep it 2; if it is 3, start a new subchunk and change it to 2;
        let chunkPointer = 1;
        let currChunkLine = null;

        for(let chunkLineNumber = 0; chunkLineNumber < chunkLines.length; chunkLineNumber++, currentLineNumber++) {
            // go through each chunkLine.
            lineText = chunkLines[chunkLineNumber];
            currChunkLine = {
                text: lineText,
                selected: selectedLineNumbers.indexOf(currentLineNumber) > -1
            }

            switch(lineText[0]) {
                case '@': {
                    // the first line of the chunk - the header of the chunk.
                    chunk.header = lineText;
                    break;
                }
                case ' ': {
                    if(chunkPointer == 1) {
                        subchunk.preContext.push(currChunkLine);
                    }
                    else if(chunkPointer == 2) {
                        chunkPointer = 3;
                        subchunk.postContext.push(currChunkLine);
                    }
                    else if(chunkPointer == 3) {
                        subchunk.postContext.push(currChunkLine);
                    }
                    break;
                }
                case '+': {
                    if(chunkPointer == 3) {
                        // start new subchunk.
                        if(subchunk.addedLines.filter((l) => { return l.selected }).length || subchunk.removedLines.filter((l) => { return l.selected }).length) {
                            chunk.subchunks.push(subchunk);
                        }
                        subchunk = {
                            preContext: [],
                            postContext: [],
                            removedLines: [],
                            addedLines: [],
                            newerNoNewLineAtEnd: null,
                            olderNoNewLineAtEnd: null
                        };
                    }
                    chunkPointer = 2;
                    subchunk.addedLines.push(currChunkLine);
                    break;
                }
                case '-': {
                    if(chunkPointer == 3) {
                        // start new subchunk.
                        if(subchunk.addedLines.filter((l) => { return l.selected }).length || subchunk.removedLines.filter((l) => { return l.selected }).length) {
                            chunk.subchunks.push(subchunk);
                        }
                        subchunk = {
                            preContext: [],
                            postContext: [],
                            removedLines: [],
                            addedLines: [],
                            newerNoNewLineAtEnd: null,
                            olderNoNewLineAtEnd: null
                        };
                    }
                    chunkPointer = 2;
                    subchunk.removedLines.push(currChunkLine);
                    break;
                }
                case '\\': {
                    // whenever something near the end of a file is changed, there's a couple of lines `\ No newline at the end of file`
                    // one is the old one near the removed lines and another is the new one near the added lines.
                    // if only one copy exists, its the older one.
                    if(subchunk.addedLines.length > 0 && subchunk.postContext.length == 0) {
                        subchunk.newerNoNewLineAtEnd = currChunkLine;
                    }
                    else {
                        subchunk.olderNoNewLineAtEnd = currChunkLine;
                    }
                    break;
                }
            }
        }
        // this is a real subchunk only if it has added/remove lines.
        if(subchunk.addedLines.filter((l) => { return l.selected }).length || subchunk.removedLines.filter((l) => { return l.selected }).length) {
            chunk.subchunks.push(subchunk);
        }

        // this is a real chunk only if it has subchunks.
        if(chunk.subchunks.length) {
            selectedChunks.push(chunk);
        }
    }

    return [selectedChunks, header];
}

function getUnpushedCommits({ req, res, repo }) {
    return logRepo({
        req, res, repo, options: {
            specialArg: '@{u}..'
        }
    });
}

function revertCommit({ req, res, repo }) {
    let hash = req.body.hash;
    let doNotCommit = req.body.doNotCommit;

    let options = ['revert'];

    if(doNotCommit) {
        options.push('--no-commit');
    }
    else {
        options.push('--no-edit');
    }

    options.push(hash);

    const child = spawnGitProcess(repo, options);
    redirectIO(child, req, res);
}

function deleteLocalBranch({ req, res, repo }) {
    let branchName = req.body.branchName;
    let force = req.body.force;

    let options = ['branch'];

    if(force) {
        options.push('-D');
    }
    else {
        options.push('-d');
    }
    options.push(branchName);

    const child = spawnGitProcess(repo, options);
    redirectIO(child, req, res);
}

function resetFiles({ req, res, repo }) {
    let fileNames = decodeURIComponent(req.body.fileNames);

    fileNames = fileNames.split(':');
    
    fileNames = fileNames.map((f) => {
        if (f.indexOf('"') > -1) {
            f = f.replace(/\"/g, '');
        }

        return f;
    });

    let tags = req.body.tags.split(':');

    var untrackedFiles = [];

    tags.forEach(function(tagsList, i) {
        if(tagsList.indexOf('untracked') > -1) {
            untrackedFiles.push(fileNames[i]);
        }
    });

    let promises = [];

    if(untrackedFiles.length > 0) {
        let resetUntrackedGitOptions = ['clean', '-f', '--'];

        // remove untracked files from regular files that I will reset.
        untrackedFiles.forEach((f) => {
            fileNames.splice(fileNames.indexOf(f), 1);

            resetUntrackedGitOptions.push(f);
        });

        let resetUntrackedChild = spawnGitProcess(repo, resetUntrackedGitOptions);

        promises.push(redirectIO(resetUntrackedChild));
    }

    if(fileNames.length > 0) {
        // reset these files.
        let gitOptions = ['checkout', '--'];

        Array.prototype.push.apply(gitOptions, fileNames);

        const child = spawnGitProcess(repo, gitOptions);

        promises.push(redirectIO(child));
    }

    Promise.all(promises).then((promiseResponses) => {
        sendResponse(res, promiseResponses);
    });
}

function checkoutRemoteBranch({ req, res, repo }) {
    let branchName = req.body.branchName;

    const child = spawnGitProcess(repo, ['checkout', '-B', branchName.substring('origin/'.length), branchName]);
    redirectIO(child, req, res);
}

function getMergeMsg({ req, res, repo }) {
    let readFilePromise = utils.readMergeMsg(repo);

    readFilePromise.then((data) => {
        let op = {
            errorCode: 0,
            output: data
        };

        if (res) {
            sendResponse(res, op);
        }
    }).catch((err) => {
        let op = {
            errorCode: 1,
            errors: err
        }
        if (res) {
            sendResponse(res, op);
        }
    });
}

function cherrypick({ req, res, repo }) {
    let hash = req.body.hash,
        noCommit = req.body.noCommit;

    let options = ['cherry-pick'];

    if(noCommit) {
        options.push('--no-commit');
    }

    options.push(hash);

    const child = spawnGitProcess(repo, options);
    redirectIO(child, req, res);
}

function searchForText({ req, res, repo }) {
    let text = req.body.text;

    // TODO: search for branch name

    var shaRegex = /\b[0-9a-f]{5,40}\b/;

    var promises = [];
    var promise = null;

    if (shaRegex.test(text)) {
        promise = searchForHash({ repo, hash: text });
        promises.push(promise);
    }

    promise = searchForCommitMessage({ repo, text });
    promises.push(promise);

    promise = searchForAuthor({ repo, author: text });
    promises.push(promise);

    promise = searchInDiff({ repo, code: text });
    promises.push(promise);

    promise = searchFileName({ repo, name: text });
    promises.push(promise);

    Promise.all(promises).then((promiseResponses) => {
        let responseCommits = [];

        promiseResponses.forEach((commits) => {
            Array.prototype.push.apply(responseCommits, commits);
        });

        var uniqueHashes = [];
        responseCommits = responseCommits.filter(function(c) {
            if(uniqueHashes.indexOf(c.hash) == -1) {
                uniqueHashes.push(c.hash);
                return true;
            }
            return false;
        });

        // sort commits by date.
        responseCommits.sort((a, b) => {
            return moment(b.date) - moment(a.date);
        });

        sendResponse(res, responseCommits);
    }).catch((err) => {
        console.log(err);
    });
}

function searchFileName({ req, res, repo, name }) {
    return logRepo({
        req, res, repo, options: {
            searchFor: 'filename',
            searchTerm: name || req.body.name
        }
    });
}

function searchInDiff({ req, res, repo, code }) {
    return logRepo({
        req, res, repo, options: {
            searchFor: 'diff',
            searchTerm: code || req.body.code
        }
    });
}

function searchForAuthor({ req, res, repo, author }) {
    return logRepo({
        req, res, repo, options: {
            searchFor: 'author',
            searchTerm: author || req.body.author
        }
    });
}

function getSettings({ req, res }) {
    // 1. get git path from local storage.
    // 2a. if git path, check if the command exists.
    // 2b. if not git path, check if git exists in the PATH
    // 3. Either local storage git path OR git in PATH must exist.

    let reqBody = req.body;
    let gitFnName = reqBody && reqBody.gitExecutablePath ? reqBody.gitExecutablePath + '/git.exe' : 'git';

    gitFnName = gitFnName.replace(/\\/g, '/');      // replace back slashes with forward slashes


    if (gitFnName === 'git') {
        commandExists(gitFnName, callback);
    }
    else {
        stat(gitFnName, callback)
    }

    return;

    function callback(err, exists) {
        if (!exists) {
            sendResponse(res, {
                errorCode: 1,
                msg: 'I could not find GIT',
                description: 'You have two options here.. Add your git installation directory OR Add git to your PATH.'
            });
            return;
        }

        setGitFn(gitFnName);
        sendResponse(res, {
            msg: 'Everything is fine'
        });
    };
}

function setGitFn(gitFnName) {
    gitExecutablePath = gitFnName;
}

function getGitFn() {
    return gitExecutablePath;
}

function searchForCommitMessage({ req, res, repo, text }) {
    return logRepo({
        req, res, repo, options: {
            searchFor: 'commitmessage',
            searchTerm: text || req.body.text
        }
    });
}

function searchForHash({ req, res, repo, hash }) {
    return logRepo({
        req, res, repo, options: {
            searchFor: 'hash',
            searchTerm: hash || req.body.hash
        }
    });
}

function testGit({ req, res }) {
    const child = spawnGitProcess();
    redirectIO(child, req, res);
}

function abortMerge({ req, res, repo }) {
    // TODO: Handle for older git versions.. https://stackoverflow.com/questions/5741407/how-to-undo-a-git-merge-with-conflicts
    const child = spawnGitProcess(repo, ['merge', '--abort']);
    redirectIO(child, req, res);
}

function mergeIntoCurrent({ req, res, repo }) {
    let obj = req.body.obj;

    const child = spawnGitProcess(repo, ['merge', obj]);
    redirectIO(child, req, res);
}

function removeFile({ req, res, repo }) {
    let fileName = req.body.name;

    const child = spawnGitProcess(repo, ['rm', fileName]);
    redirectIO(child, req, res);
}

function skipRebase({ req, res, repo }) {
    const child = spawnGitProcess(repo, ['rebase', '--skip']);
    redirectIO(child, req, res);
}

function continueRebase({ req, res, repo }) {
    const child = spawnGitProcess(repo, ['rebase', '--continue']);
    redirectIO(child, req, res);
}

function abortRebase({ req, res, repo }) {
    const child = spawnGitProcess(repo, ['rebase', '--abort']);
    redirectIO(child, req, res);
}

function doResetHEADFile({ req, res, repo }) {
    let fileName = req.body.fileName;

    const child = spawnGitProcess(repo, ['reset', 'HEAD', fileName]);
    redirectIO(child, req, res);
}

function rebaseCurrentBranchOn({ req, res, repo }) {
    let branchNameOrRevision = req.body.branchNameOrRevision;

    const child = spawnGitProcess(repo, ['rebase', branchNameOrRevision]);
    redirectIO(child, req, res);
}

function pushNewBranch({ req, res, repo }) {
    let remoteName = req.body.remoteName;
    let newRemoteBranchName = req.body.newRemoteBranchName;

    const child = spawnGitProcess(repo, ['push', '-u', 'origin', newRemoteBranchName + ':' + newRemoteBranchName]);
    redirectIO(child, req, res);
}

function checkoutLocalBranch({ req, res, repo }) {
    let branchName = req.body.branchName;

    const child = spawnGitProcess(repo, ['checkout', branchName]);
    redirectIO(child, req, res);
}

function createNewBranch({ req, res, repo }) {
    let revision = req.body.revision;
    let checkoutAfterCreate = req.body.checkoutAfterCreate;
    let branchName = req.body.branchName;

    let options = null;

    if (checkoutAfterCreate) {
        options = ['checkout', '-b', branchName, revision];
    }
    else {
        options = ['branch', branchName, revision];
    }
    const child = spawnGitProcess(repo, options);
    redirectIO(child, req, res);
}

function resetUnstagedChanges({ req, res, repo }) {
    let deleteUntracked = req.body.deleteUntracked;

    if (!deleteUntracked) {
        const child = spawnGitProcess(repo, ['checkout', '.']);
        redirectIO(child, req, res);
        return;
    }
    else {
        const child = spawnGitProcess(repo, ['clean', '-fd']);
        let cleanPromise = redirectIO(child, null, null);

        cleanPromise.then(function (cleanInfo) {
            const child2 = spawnGitProcess(repo, ['checkout', '.']);
            redirectIO(child2, req, res, { cleanInfo: cleanInfo });
        });
    }
}

function resetAllChanges({ req, res, repo }) {
    let deleteUntracked = req.body.deleteUntracked;

    if (!deleteUntracked) {
        const child = spawnGitProcess(repo, ['reset', 'HEAD']);
        let resetPromise = redirectIO(child, null, null);

        resetPromise.then(function (resetInfo) {
            const child2 = spawnGitProcess(repo, ['checkout', '.']);
            redirectIO(child2, req, res, { resetInfo: resetInfo });
        });
        return;
    }
    else {
        const child = spawnGitProcess(repo, ['reset', 'HEAD']);
        let resetPromise = redirectIO(child, null, null);

        resetPromise.then(function (resetInfo) {
            const child2 = spawnGitProcess(repo, ['clean', '-fd']);
            let cleanPromise = redirectIO(child2, null, null);

            cleanPromise.then(function (cleanInfo) {
                const child3 = spawnGitProcess(repo, ['checkout', '.']);
                redirectIO(child3, req, res, { cleanInfo: cleanInfo, resetInfo: resetInfo });
            });
        });
    }
}

function applyStash({ req, res, repo }) {
    let name = req.body.name;
    let pop = req.body.pop;

    const child = spawnGitProcess(repo, ['stash', pop ? 'pop' : 'apply', name]);
    redirectIO(child, req, res);
}

function dropStash({ req, res, repo }) {
    let name = req.params.stashName;
    const child = spawnGitProcess(repo, ['stash', 'drop', name]);
    redirectIO(child, req, res);
}

function stashLocalChanges({ req, res, repo }) {
    let includeUntracked = req.body.includeUntracked;

    let options = ['stash', 'save'];
    if (includeUntracked) {
        options.push('-u');
    }
    const child = spawnGitProcess(repo, options);
    redirectIO(child, req, res);
}

function selectStash({ req, res, repo }) {
    let name = req.query.name;

    const child = spawnGitProcess(repo, ['stash', 'show', '-p', name]);
    redirectIO(child, req, res);
}

function push({ req, res, repo }) {
    let remoteBranch = req.query.remotebranch,
        remoteName = req.query.remotename;

    const child = spawnGitProcess(repo, ['push', remoteName, remoteBranch]);
    redirectIO(child, req, res);
}

function pull({ req, res, repo }) {
    let remoteBranch = req.query.remotebranch,
        mergeOption = req.query.mergeoption;

    let pullOptions = [];

    if (mergeOption == 'fetch') {
        pullOptions.push('fetch', '--all');
    }
    else {
        pullOptions.push('pull', 'origin', remoteBranch);
    }

    if (mergeOption == 'rebase') {
        pullOptions.splice(1, 0, '--rebase');
    }

    const child = spawnGitProcess(repo, pullOptions);
    redirectIO(child, req, res);
}

function getStashList({ repo, req, res }) {
    const child = spawnGitProcess(repo, ['stash', 'list']);

    return redirectIO(child, req, res);
}

function initRepo({ req, res, repo }) {
    // do multiple things.
    // get remote name      // git remote
    // get stashes

    let remotePromise = getRemote(repo);
    let localProgressPromise = getLocalProgressStatus(repo);
    let localAndRemoteBranchesPromise = getLocalAndRemoteBranches(repo);

    Promise.all([remotePromise, localProgressPromise, localAndRemoteBranchesPromise]).then(function (op) {
        let remote = op[0];
        let localProgress = op[1];
        let localAndRemoteBranches = op[2];

        sendResponse(res, {
            output: {
                remote,
                localProgress: localProgress,
                allBranches: localAndRemoteBranches
            },
            errorCode: 0
        });
    }).catch(function (ex) {
        sendResponse(res, {
            errorCode: 1,
            errors: ex
        });
    });
}


/*
    git for-each-ref --format="%(if)%(upstream)%(then)%(refname:short)=====%(upstream:short)%(else)%(refname:short)%(end)" refs/heads
    Output:
        branch-a
        conflict-branch=====origin/conflict-branch
        master=====origin/master
        orange-branch-1=====origin/orange-branch-1
        origin/test-branch-3=====origin/origin/test-branch-3
        test-1=====origin/test-1
        test-2=====origin/test-2
        test-3
        test-7
        test-branch-2=====origin/test-branch-2
*/
function getLocalAndRemoteBranches(repo) {
    const child = spawnGitProcess(repo, ['for-each-ref', '--format="%(refname:short)===XXX===%(if)%(upstream)%(then)%(upstream:short)%(end)===XXX===%(if)%(HEAD)%(then)HEAD%(end)"', 'refs/heads']);
    return redirectIO(child, null, null).then(function (res) {
        if (!res.errorCode) {
            let localAndRemoteBranches = res.output.join('\n').trim().split('\n');
            let allBranches = [];

            localAndRemoteBranches.forEach((b) => {
                b = b.substring(1, b.length - 1);       // because they are enclosed in double quotes
                // console.log(b);
                let branchSplit = b.split(/===XXX===/g);
                let branchInfo = {};
                if(branchSplit[0]) {
                    branchInfo.local = branchSplit[0];
                }
                if(branchSplit[1]) {
                    branchInfo.remote = branchSplit[1];
                }
                if(branchSplit[2]) {
                    branchInfo.isCurrent = true;
                }
                allBranches.push(branchInfo);
            });

            return allBranches;
        }
        // TODO: handle error here.
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
    return Promise.all([rebaseHeadPromise, mergeHeadPromise, revertHeadPromise, interactiveRebaseHeadPromise]).then((heads) => {
        if (heads[0] || heads[1] || heads[2]) {
            // there is something in progress!
            if (heads[0]) {
                return 'rebase-progress';
            }
            if (heads[1]) {
                return 'merge-progress';
            }
            if (heads[2]) {
                return 'revert-progress';
            }
            if (heads[3]) {
                return 'interactive-rebase-progress';
            }
        }
        return;
    }).catch((err) => {
        console.log(err);
    });
}

function getRemote(repo) {
    const child = spawnGitProcess(repo, ['remote']);
    let remotePromise = redirectIO(child, null, null);
    return remotePromise.then(function (res) {
        if (!res.errorCode) {
            return res.output[0].trim();
        }
        // TODO: handle error here.
    });
}

function commit({ req, res, repo }) {
    const child = spawnGitProcess(repo, ['commit', '-m', req.query.message]);
    redirectIO(child, req, res);
}

function getDiffBetweenCommits({ req, res, repo }) {
    const child = spawnGitProcess(repo, ['diff', req.query.commit1, req.query.commit2]);
    redirectIO(child, req, res);
}

function unstageAllFiles({ req, res, repo }) {
    const child = spawnGitProcess(repo, ['reset', '--quiet']);
    redirectIO(child, req, res);
}

function stageAllFiles({ req, res, repo }) {
    const child = spawnGitProcess(repo, ['add', '-A']);
    redirectIO(child, req, res);
}

function unstageFiles({ req, res, repo }) {
    let gitOptions = ['reset', '--quiet'];
    let tags = req.query.tags;
    let fileNames = req.query.filenames.split(':');

    fileNames = fileNames.map((f) => {
        if (f.indexOf('"') > -1) {
            f = f.replace(/\"/g, '');
        }

        return f;
    });

    gitOptions.push('--');

    Array.prototype.push.apply(gitOptions, fileNames);

    const child = spawnGitProcess(repo, gitOptions);
    redirectIO(child, req, res);
}

function stageFiles({ req, res, repo }) {
    let gitOptions = ['add'];
    let tags = req.query.tags;
    // tags = tags.map((t) => { return t.split(',') });
    let fileNames = req.query.filenames.split(':');

    if (tags.indexOf('deletedunstaged') > -1) {
        gitOptions.push('-u');
    }

    fileNames = fileNames.map((f) => {
        if (f.indexOf('"') > -1) {
            f = f.replace(/\"/g, '');
        }

        return f;
    });

    gitOptions.push('--');

    Array.prototype.push.apply(gitOptions, fileNames);

    const child = spawnGitProcess(repo, gitOptions);
    redirectIO(child, req, res);
}

function getFileDiff(options) {
    let req = options.req;
    let res = options.res;
    let repo = options.repo;

    let fileName = req.query.filename;
    let tags = req.query.tags.split(',');
    let ignoreWhitespace = req.query.ignorewhitespace || 0;

    let isUntracked = tags.indexOf('untracked') > -1;
    let isDeleted = tags.indexOf('deletedunstaged') > -1;

    let isStaged = tags.indexOf('staged') > -1;

    var gitOptions = ['diff'];

    if (isStaged) {
        gitOptions.push('--cached');
    }

    if (isUntracked) {
        gitOptions.push('--no-index', '/dev/null');
    }

    if(+ignoreWhitespace == 1) {
        gitOptions.push('-w');
    }

    if (fileName.indexOf('"') > -1) {
        fileName = fileName.replace(/\"/g, '');
    }

    if (!isUntracked) {
        gitOptions.push('--');
    }

    gitOptions.push(fileName);

    if (showAllLogs) {
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

    const branchInfoChild = spawnGitProcess(repo, ['branch', '--all', '--contains', hash]);
    const commitShowChild = spawnGitProcess(repo, ['show', hash]);
    const tagsInfoChild = spawnGitProcess(repo, ['tag', '--contains', hash]);

    let branchInfoPromise = redirectIO(branchInfoChild);
    let commitShowPromise = redirectIO(commitShowChild);
    let tagInfoPromise = redirectIO(tagsInfoChild);

    Promise.all([commitShowPromise, branchInfoPromise, tagInfoPromise]).then((arrayOfInfo) => {
        let commitShowOp = arrayOfInfo[0];
        let branchInfoOp = arrayOfInfo[1];
        let tagInfoOp = arrayOfInfo[2];

        sendResponse(res, { commitDetails: commitShowOp, commitBranchDetails: branchInfoOp, tagDetails: tagInfoOp });
    }).catch((e) => {
        console.log(e);
    });
}

function spawnGitProcess(repo, processOptions) {
    if (showAllLogs) {
        console.log('git arguments', processOptions);
    }
    return spawn(gitExecutablePath, processOptions, {
        cwd: _getCwd(repo),
        stdio: [0, 'pipe', 'pipe']
    });
}

function spawnGitProcessWithInput(repo, processOptions) {
    if (showAllLogs) {
        console.log('git arguments', processOptions);
    }
    return spawn(gitExecutablePath, processOptions, {
        cwd: _getCwd(repo),
        stdio: ['pipe', 'pipe', 'pipe']
    });
}

function getFileHistory({ req, res, repo }) {
    let randomSeperator = utils.getRandomSeparator();
    let randomSeperator2 = utils.getRandomSeparator();

    let logFormat = `--format=format:${randomSeperator}%d%n%H%n%an%n%ae%n%aD%n%s${randomSeperator2}%b`;

    let fileName = decodeURIComponent(req.body.fileName);

    fileName = fileName.replace(/\"/g, '');

    let historyInOnePageCount = 100;
    let logArgs = ['log', '-p', '-n ' + historyInOnePageCount, logFormat];

    let page = req && req.body && +req.body.page ? req.body.page : 1;

    if (page > 1) {
        logArgs.push('--skip=' + ((page - 1) * historyInOnePageCount));
    }

    logArgs.push('--', fileName);

    console.log('gonna run');
    console.log(logArgs);

    const child = spawnGitProcess(repo, logArgs);

    return redirectIOForFileHistory(child, req, res, randomSeperator, randomSeperator2);
}

function logRepo({ req, res, repo, options }) {
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

    let commitsInOnePageCount = 100;

    let logArgs = ['log'];

    if (options) {
        if(options.searchFor) {
            switch(options.searchFor) {
                case 'hash': {
                    logArgs.push('-1', options.searchTerm);
                    break;
                }
                case 'commitmessage': {
                    logArgs.push('--grep=' + decodeURIComponent(options.searchTerm) + '', '-i', '-n ' + commitsInOnePageCount);
                    break;
                }
                case 'author': {
                    logArgs.push('--author='+ decodeURIComponent(options.searchTerm) +'');
                    break;
                }
                case 'diff': {
                    logArgs.push('-S'+ decodeURIComponent(options.searchTerm) +'');
                    break;
                }
                case 'filename': {
                    logArgs.push('--', decodeURIComponent(options.searchTerm));
                    break;
                }
            }
        }
        if(options.specialArg) {
            logArgs.push(options.specialArg);
        }
    }
    else {
        logArgs.push('-n ' + commitsInOnePageCount, '--branches', '--tags');
    }

    logArgs.push(logFormat);

    // console.log(logArgs);

    let page = req && req.query && req.query.page ? req.query.page : 1;

    if (page > 1) {
        logArgs.push('--skip=' + ((page - 1) * commitsInOnePageCount));
    }

    const child = spawnGitProcess(repo, logArgs);

    return redirectIOForLog(child, req, res, randomSeperator);
}

function clone({ req, res }) {
    let url = decodeURIComponent(req.body.url);
    let cloneSubdirectoryName = decodeURIComponent(req.body.dirName);
    let destinationDir = decodeURIComponent(req.body.destination);

    let cloneOptions = ['clone', '--progress', url];

    if (cloneSubdirectoryName) {
        cloneOptions.push(cloneSubdirectoryName);
    }

    const child = spawn(gitExecutablePath, cloneOptions, {
        cwd: destinationDir,
        stdio: [0, 'pipe', 'pipe']
    });

    let logs = [];
    child.stderr.on('data', function (data) {
        logs.push(data.toString());
    });

    child.on('error', function (err) {
        logs.push(err.toString);
    });

    let extraInfo = {
        repoPath: ''
    };

    child.on('exit', function (code, signal) {
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
        child.stdout.on('data', function (data) {
            output.push(data.toString());
            if (showAllLogs) {
                console.log(`stdout: ${data}`);
            }
        });

        child.stderr.on('data', function (data) {
            errors.push(data.toString());
            if (showAllLogs) {
                console.log(`stderr: ${data}`);
            }
        });

        child.on('error', function (err) {
            errors.push(err.toString());
            if (showAllLogs) {
                console.log('error event output');
                console.log(err);
            }
        });

        if (showAllLogs) {
            child.on('exit', function (code, signal) {
                console.log('code = ' + code);
                console.log('signal = ' + signal);
            });
        }

        child.on('close', function (code, signal) {
            if (showAllLogs) {
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

            if (res) {
                sendResponse(res, op);
            }

            if (op.errorCode) {
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

function redirectIOForLog(child, req, res, splitter) {
    return redirectIO(child).then((op) => {
        return new Promise((resolve, reject) => {
            if (op.errorCode) {

                if (res) {
                    sendResponse(res, op);
                }

                return reject(op);
            }

            // parse the output.

            let commitData = {};
            let log = [];
            let aCommit = null;
            let logCommits = op.output.join('');

            logCommits = logCommits.split(splitter);

            logCommits.forEach(function (commit, idx) {
                aCommit = commit.trim().split('\n');

                if (aCommit.length < 6) {
                    return;
                }

                var i = aCommit[0].indexOf('(') == 0 ? 1 : 0;

                var refs = '';
                var hasRefs = false;
                if (i == 1) {
                    hasRefs = true;
                }
                commitData = {
                    hash: aCommit[i++],
                    name: aCommit[i++],
                    email: aCommit[i++],
                    date: aCommit[i++],
                    parentHashes: aCommit[i++]
                };

                if (hasRefs) {
                    let match = aCommit[0].match(/^\((.+)\)$/);   // has brackets
                    // var match = aCommit[0].match(/\(([A-Za-z0-9\/]+)\s\-\>\s([A-Za-z0-9\/]+)\)/);
                    let refs = match[1];    // brackets removed.

                    refs = refs.split(', ');
                    let localHead = refs.filter(function (s) {
                        return s.indexOf('HEAD -> ') === 0;
                    });

                    if (localHead && localHead.length > 0) {
                        commitData.localHead = localHead[0].substring('HEAD -> '.length);
                        refs.splice(refs.indexOf(localHead[0]), 1);   // remove local head from the refs.
                    }

                    let localBranches = refs.filter(function (s) {
                        return s.indexOf('origin/') !== 0;      // remote branches' names in tags/refs start with `origin/`. This will fail for those who name their local branches `origin/mybranch` :|
                    });

                    if (localBranches && localBranches.length > 0) {
                        commitData.localBranches = localBranches;
                    }

                    let remoteBranches = refs.filter(function (s) {
                        return s.indexOf('origin/') == 0 && s !== 'origin/HEAD';
                    });

                    if (remoteBranches && remoteBranches.length > 0) {
                        commitData.remoteBranches = remoteBranches;
                    }
                }

                commitData.subject = aCommit.slice(i).join('\n');
                log.push(commitData);
            });

            if (res) {
                sendResponse(res, log);
            }

            return resolve(log);
        });
    });
}


function redirectIOForFileHistory(child, req, res, splitter, splitter2) {
    return redirectIO(child).then((op) => {
        return new Promise((resolve, reject) => {
            if (op.errorCode) {

                if (res) {
                    sendResponse(res, op);
                }

                return reject(op);
            }

            // parse the output.

            let commitData = {};
            let log = [];
            let aCommit = null;
            let logCommits = op.output.join('');


            console.log(logCommits);
            logCommits = logCommits.split(splitter);

            logCommits.forEach(function (commit, idx) {
                aCommit = commit.trim().split('\n');

                if (aCommit.length < 6) {
                    return;
                }

                var i = aCommit[0].indexOf('(') == 0 ? 1 : 0;

                var refs = '';
                var hasRefs = false;
                if (i == 1) {
                    hasRefs = true;
                }
                commitData = {
                    hash: aCommit[i++],
                    name: aCommit[i++],
                    email: aCommit[i++],
                    date: aCommit[i++]
                };

                if (hasRefs) {
                    let match = aCommit[0].match(/^\((.+)\)$/);   // has brackets
                    // var match = aCommit[0].match(/\(([A-Za-z0-9\/]+)\s\-\>\s([A-Za-z0-9\/]+)\)/);
                    let refs = match[1];    // brackets removed.

                    refs = refs.split(', ');
                    let localHead = refs.filter(function (s) {
                        return s.indexOf('HEAD -> ') === 0;
                    });

                    if (localHead && localHead.length > 0) {
                        commitData.localHead = localHead[0].substring('HEAD -> '.length);
                        refs.splice(refs.indexOf(localHead[0]), 1);   // remove local head from the refs.
                    }

                    let localBranches = refs.filter(function (s) {
                        return s.indexOf('origin/') !== 0;      // remote branches' names in tags/refs start with `origin/`. This will fail for those who name their local branches `origin/mybranch` :|
                    });

                    if (localBranches && localBranches.length > 0) {
                        commitData.localBranches = localBranches;
                    }

                    let remoteBranches = refs.filter(function (s) {
                        return s.indexOf('origin/') == 0 && s !== 'origin/HEAD';
                    });

                    if (remoteBranches && remoteBranches.length > 0) {
                        commitData.remoteBranches = remoteBranches;
                    }
                }

                let subjectAndDiff = aCommit.slice(i).join('\n').split(splitter2);
                commitData.subject = subjectAndDiff[0];
                commitData.diff = subjectAndDiff[1];
                log.push(commitData);
            });

            if (res) {
                sendResponse(res, log);
            }

            return resolve(log);
        });
    });
}

function _getCwd(repo) {
    return utils.decodePath(repo);
}