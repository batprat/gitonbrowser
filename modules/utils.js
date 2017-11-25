const { lstatSync, readdirSync, existsSync, mkdirSync } = require('fs')
const { join } = require('path')

var utils = {
    getBaseDir,
    getCheckoutsDir,
    getAllDirectories,
    getRandomSeparator
};

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