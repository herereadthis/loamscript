# Release

The script must have `github`, `core`, and `context` parameters from `actions/github-script`. Click [here](https://github.com/actions/github-script) for documentation.

## Build

Compile the code into one file, located at `dist/index.js`

```
npm install -g @vercel/ncc
ncc build index.js -o dist --source-map --license licenses.txt
```