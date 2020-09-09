import { BuildSystem } from '../build-system';
import { Tasks } from '../task-index';

export type RetType = 'hash'|'json';

export type FileResource = {
    file:string;
    ret?:RetType;
};

export type DirectoryResource = {
    dir:string;
    filter?:string;
    ret?:RetType;
};

export type FuncResource = {
    func:keyof Tasks;
    args:ResourceSpec[];
    ret?:RetType;
};

export type TableResource = {
    table:{ [prop:string]:ResourceSpec; }
    ret?:RetType;
}

export type JSONResource = {
    json:any;
    ret?:RetType;
}

export type ResourceSpec = FileResource|DirectoryResource|FuncResource|TableResource|JSONResource;

function isFileResource (spec:ResourceSpec) : spec is FileResource {
    return 'file' in spec;
}

function isDirectoryResource (spec:ResourceSpec) : spec is DirectoryResource {
    return 'dir' in spec;
}

function isFuncResource (spec:ResourceSpec) : spec is FuncResource {
    return 'func' in spec;
}

function isTableResource (spec:ResourceSpec) : spec is TableResource {
    return 'table' in spec;
}

function isJSONResource(spec:ResourceSpec) : spec is JSONResource {
    return 'json' in spec;
}

export async function buildResource(bs:BuildSystem, dirHash:string, resourceHash:string) {
    const [
        files,
        resource,
    ] = await Promise.all([
        bs.retrieveJSON(dirHash),
        bs.retrieveJSON(resourceHash),
    ]);

    async function processFile (spec:FileResource) {
        const parts = spec.file.split('/');
        let dir = files;
        for (let i = 0; i < parts.length; ++i) {
            if (parts[i].length > 0) {
                if (!(parts[i] in dir)) {
                    throw new Error('missing file ' + spec.file);
                }
                dir = dir[parts[i]];
            }
        }
        if (!dir || typeof dir !== 'string') {
            throw new Error('invalid file name: ' + spec.file);
        }
        if (spec.ret === 'json') {
            return await bs.retrieveJSON(dir);
        }
        return dir;
    }

    async function processDirectory (spec:DirectoryResource) {
        const parts = spec.dir.split('/');
        let dir = files;
        for (let i = 0; i < parts.length; ++i) {
            if (parts[i].length > 0) {
                if (!(parts[i] in dir)) {
                    throw new Error('missing directory ' + spec.dir);
                }
                dir = dir[parts[i]];
            }
        }
        if (!dir || typeof dir === 'string') {
            throw new Error('invalid directory name: ' + spec.dir);
        }
        if (spec.filter) {
            const keys = Object.keys(dir);
            const result = {};
            const regexp = new RegExp(spec.filter);
            for (let i = 0; i < keys.length; i++) {
                if (keys[i].match(regexp)) {
                    result[keys[i]] = dir[keys[i]];
                }
            }
            dir = result;
        }
        if (spec.ret === 'json') {
            return dir;
        }
        return await bs.storeJSON(dir);
    }

    async function processFunc (spec:FuncResource) {
        const args:any[] = await Promise.all(spec.args.map(processResource));
        args.unshift(spec.func);
        const hash = await (<any>bs).build.apply(bs, args);
        if (spec.ret === 'json') {
            return await bs.retrieveJSON(hash);
        }
        return hash;
    }
    
    async function processResource(spec:ResourceSpec) {
        if (isFileResource(spec)) {
            return await processFile(spec);
        } else if (isDirectoryResource(spec)) {
            return await processDirectory(spec);
        } else if (isFuncResource(spec)) {
            return await processFunc(spec);
        } else if (isTableResource(spec)) {
            
        } else if (isJSONResource(spec)) {
            // return await 
        } else {
            throw new Error('unrecognized resource: ' + JSON.stringify(spec));
        }
    }
    return await bs.storeJSON(await processResource(resource));
}