const { lstatSync, readdirSync, existsSync, mkdirSync, access, constants } = require('fs');
const { join } = require('path');
let repos = require('../data/repos.json');

let utils = {
    getBaseDir,
    getCheckoutsDir,
    getAllDirectories,
    getRandomSeparator,
    getReposStorePath,
    encodePath,
    decodePath,
    getRepoNameFromEncodedPath,
    getAllClonedRepos,
    conflictFileExists,
    getRevertHeadPath,
    getMergeHeadPath,
    getRebaseHeadPath
};

function getRebaseHeadPath(repo) {
    return decodePath(repo) + '/.git/rebase-apply';
}

function getMergeHeadPath(repo) {
    return decodePath(repo) + '/.git/MERGE_HEAD';
}

function getRevertHeadPath(repo) {
    return decodePath(repo) + '/.git/REVERT_HEAD';
}


// This function will return a promise that will always resolve.
// in case the conflicting file does exist, it will resolve the path of the file.
function conflictFileExists(path) {
    return new Promise((resolve, reject) => {
        access(path, constants.F_OK, (err) => {
            let resolution;
            // if error, its good, the conflicting file is not present.
            // if not error, the conflicting file is present. send resolution as path.
            if(!err) {
                resolution = path;
            }
            resolve(resolution);
        });
    });
}

function getAllClonedRepos() {
  let allRepos = [];
  for(let repo in repos) {
    allRepos.push({name: repos[repo].name, path: repo});
  }

  return allRepos;
}

/** Replace : with >> and \ or / with >
    > is not allowed in file/folder names for windows. Unix users just have to take care that there folder names must not contain >.
*/
function encodePath(path) {
  return path.replace(/[\/\\]/g, '>').replace(':', '>>');
}

function decodePath(path) {
  return path.replace(/\>\>\>/g, ':\\').replace(/\>\>/g, ':').replace(/\>/g, '\\');
}

function getRepoNameFromEncodedPath(encodedPath) {
  let path = decodePath(encodedPath);
  path = path.split(/[\\\/]/g);
  return path[path.length - 1];
}

function getBaseDir() {
    var cwd = __dirname.split('\\');
    cwd.pop();
    return cwd.join('/');
}
  
function getCheckoutsDir() {
    let baseDir = getBaseDir();
    let checkoutsDir = baseDir + '/' + 'git-checkouts';
    
    if (!existsSync(checkoutsDir)){
        mkdirSync(checkoutsDir);
    }

    return checkoutsDir;
}

function getReposStorePath() {
   let baseDir = getBaseDir();
   return (baseDir + '/data/repos.json');
}

/**
 * Returns all directories inside a specific directory
*/
function getAllDirectories(sourceDir) {
    const isDirectory = source => lstatSync(source).isDirectory();
    const getDirectories = source => readdirSync(source).map(name => join(source, name)).filter(isDirectory);
    
    return getDirectories(sourceDir) || [];
}

function getRandomSeparator() {
    return Math.random().toString().replace('.', '');
}

module.exports = utils;