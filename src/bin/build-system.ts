import { BuildSystemAPI, BuildCacheAPI } from './type';
import { tasks, Tasks } from './task-index';
import { CachingContentServer } from '../content-solver/caching-content-server';
import stringify from 'mudb/util/stringify'; 

export class BuildSystem implements BuildSystemAPI {
    private tasks:Tasks;
    constructor(
        private cache:BuildCacheAPI,
        private contentServer:CachingContentServer,
        ) {
        this.tasks = tasks;
    }

    public async retrieveJSON(hash:string) {
        const json = Buffer.from(await this.retrieveContent(hash)).toString();
        try {
            return JSON.parse(json);
        } catch (e) {
            throw new Error(`could not parse json for hash: ${hash}. ${e.message}`);
        }
    }

    public async retrieveContent(hash:string) {
        const pureHash = hash.match(/^(.*?)(\..*?)?$/)![1];
        const data = await this.contentServer.retrieve(pureHash);
        if (!data) {
            throw new Error(`error retrieving hash ${hash}`);
        }
        return data;
    }

    public async storeJSON(data:any) {
        console.log('data', data);
        const str = stringify(data);
        if (!str) {
            throw new Error('invalid json');
        }
        return this.storeContent(Buffer.from(str, 'utf8'));
    }

    public async storeContent(data:Uint8Array) {
        const hash = await this.contentServer.store(data);
        if (!hash) {
            throw new Error('error saving data');
        }
        return hash;
    }

    public async build<T extends keyof Tasks>(name:T, ...params:any) : Promise<string> {
        const cached = await this.cache.retrieve(name, params);
        if (cached) {
            return cached;
        }
        const task = this.tasks[name as string];
        if (!task) {
            throw new Error(`no such build task: ${name}`);
        }
        return await this.cache.store(name, params, () => task(this, ...params));
    }
}