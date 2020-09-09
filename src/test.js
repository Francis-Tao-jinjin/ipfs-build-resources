const fs = require('fs');
const path = require('path');

//The actual hash function in nodeJs:
const { encode } = require('bs58');
const { createHash } = require('crypto');

function ipfsHash (data) {
    const digest = createHash('sha256').update(data).digest();
    const digestSize = Buffer.from(digest.byteLength.toString(16), 'hex');
    const hashFunction = Buffer.from('12', 'hex');
    const combined = Buffer.concat([hashFunction, digestSize, digest]);
    const multihash = encode(combined);
    return multihash.toString();
};

async function store(data) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(ipfsHash(data));
        }, 10);
    });
}

function uploadDirectory (root) {
    async function uploadRecursive(dir) {
        const ls = await fs.promises.readdir(dir, {withFileTypes: true});
        const result = {};
        await Promise.all(ls.map(async (file) => {
            const fullPath = path.join(dir, file.name);
            if (file.isDirectory()) {
                result[file.name] = await uploadRecursive(fullPath);
            } else if (file.isFile()) {
                if (file.name !== '.DS_Store') {
                    result[file.name] = await store(await fs.promises.readFile(fullPath));
                }
            }
        }));
        return result;
    }
    return uploadRecursive(root);
}

uploadDirectory('./assets')
.then((data) => {
    console.log(data);
});