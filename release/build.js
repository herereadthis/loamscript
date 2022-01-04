// This turned out to be a dead end. Keeping for future reference.

const ncc = require('@vercel/ncc');
const fs = require('fs');

ncc('./index.js', {
    cache: false,
    sourceMap: true,
    sourceMapRegister: true,
    license: './dist/license.txt'
}).then(({code, map, assets}) => {
    console.log(map)
    fs.writeFile('./dist/index.js', code, function (err) {
        if (err) {
            console.error(err);
        } else {
            console.log('Compiled release script successfully');
        }
    });
});