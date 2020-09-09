import fs = require('fs');
import path = require('path');
import { CachingContentServer } from '../content-solver/caching-content-server';

export type UploadDirType = {
    [name:string]:string|UploadDirType;
};

export function uploadDirectory (root:string, content:CachingContentServer) : Promise<UploadDirType> {
    async function uploadRecursive(dir:string) {
        const ls = await fs.promises.readdir(dir, {withFileTypes: true});
        const result = {};
        await Promise.all(ls.map(async (file) => {
            const fullPath = path.join(dir, file.name);
            if (file.isDirectory()) {
                result[file.name] = await uploadRecursive(fullPath);
            } else if (file.isFile()) {
                if (file.name !== '.DS_Store') {
                    result[file.name] = await content.store(await fs.promises.readFile(fullPath));
                }
            }
        }));
        return result;
    }
    return uploadRecursive(root);
}

