import { BuildSystem } from '../build-system';

export async function concat(bs:BuildSystem, ...hashes:string[]) {
    const blocks = await Promise.all(hashes.map((hash) => bs.retrieveContent(hash)));
    return await bs.storeContent(Buffer.concat(blocks));
}

export async function removeExtensions (bs:BuildSystem, hash:string) {
    function rec (dir:object) {
        const result:object = {};
        Object.keys(dir).forEach((key) => {
            const value = dir[key];
            if (typeof value === 'object') {
                result[key] = rec(value);
            } else {
                result[key.replace(/\.[^.]*$/, '')] = value;
            }
        });
        return result;
    }
    return await bs.storeJSON(rec(await bs.retrieveJSON(hash)));
}

export async function swapExtensions (bs:BuildSystem, hash:string) {
    function rec (dir:object) {
        const result:object = {};
        Object.keys(dir).forEach((key) => {
            const value = dir[key];
            if (typeof value === 'object') {
                result[key] = rec(value);
            } else {
                const ext = key.match(/\.[^.]*$/);
                if (ext) {
                    result[key.replace(/\.[^.]*$/, '')] = value + (ext ? ext[0] : '');
                }
            }
        });
        return result;
    }
    const result = rec(await bs.retrieveJSON(hash));
    return await bs.storeJSON(result);
}

export async function copyExtensions (bs:BuildSystem, hash:string) {
    function rec (dir:object) {
        const result:object = {};
        Object.keys(dir).forEach((key) => {
            const val = dir[key];
            if (typeof val === 'object') {
                result[key] = rec(val);
            } else {
                const ext = key.match(/\.[^.]*$/);
                result[key] = val + (ext ? ext[0] : '');
            }
        });
        return result;
    }
    return await bs.storeJSON(rec(await bs.retrieveJSON(hash)));
}

export async function mergeJSON (bs:BuildSystem, ...hashes:string[]) {
    const blocks = await Promise.all(hashes.map((hash) => bs.retrieveJSON(hash)));
    return await bs.storeJSON(Object.assign({}, ...blocks));
}