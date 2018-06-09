
# gitonbrowser

**gitonbrowser** is a Git client on your web browser. Internally it is an express application that executes git commands behind the scenes and provides UI on any browser.
One big advantage of **gitonbrowser** is that since it uses node and runs in a browser, it is platform independent and will run on any platform that supports node and a modern web browser.

## Requirements
nodejs (https://nodejs.org)

## Installation
1. clone or download this repository anywhere on your computer.
2. `cd` into the folder where you have cloned/downloaded this repository. You should be inside the folder with the `package.json` file.
3. `npm install`
4. `npm start`
5. Open http://localhost:3000 in the browser of your choice.

To use another port (e.g. 4001), `npm start 4001`.

## Common Errors
One common error at this point might be that the node app **doesn't have write access** to your git files. In this case, **open an elevated command prompt / terminal app** and try the above steps.

## Features
This is the list of features in this git client. There might be some features I might have missed out in this list.
1. Clone
2. Open existing repository
3. Pull
4. Push
5. Stage individual/all files
6. Unstage individual/all files
7. Commit files
8. Reset individual/all files
9. View commit **graph**
10. View commits
11. View individual files' diff in a commit
12. Create branches
13. Commit and/or push to branches
14. View stash, delete or stash changes
15. Rebase commits
16. Merge branches
17. Handle Rebase conflicts (show conflicts, one click mark as resolved)
18. Handle Merge conflicts
19. Search for SHAs