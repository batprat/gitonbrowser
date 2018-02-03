const { lstatSync, readdirSync, existsSync, mkdirSync } = require('fs');
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
    getAllClonedRepos
};

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