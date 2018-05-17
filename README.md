# gitonbrowser

**gitonbrowser** is a Git client on your web browser. Internally it is an express application that executes git commands behind the scenes and provides UI on any browser.
One big advantage of **gitonbrowser** is that since it runs in a browser, it will provide (almost) the same experience on different OSs when used in the same browser.

## Requirements
nodejs (https://nodejs.org)

## Installation
1. clone or download the repository anywhere on your computer.
2. `cd` into the folder where you have cloned/downloaded the repository.  You should be inside the folder with the `package.json` file.
3. `npm install`
4. `npm start`
5. Open http://localhost:3000 in the browser of your choice.

To use another port (e.g. 4001), `npm start 4001`.

## Common Errors
One common error at this point might be that the node app **doesn't have write access** to your git files. In this case, **open an elevated command prompt / terminal app** and try the above steps.