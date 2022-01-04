const ncc = require('@vercel/ncc');
const fs = require('fs');

ncc('./index.js', {
    cache: false,
    minify: true
}).then(({code, map, assets}) => {
    fs.writeFile('./dist/index.js', code, function (err) {
        if (err) {
            console.error(err);
        } else {
            console.log('Compiled release script successfully');
        }
    });
});