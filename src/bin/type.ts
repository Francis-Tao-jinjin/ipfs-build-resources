import { Tasks } from './task-index';

export interface BuildSystemAPI {
    build<T extends keyof Tasks>(taskName:T, ...params:any) : Promise<string>;
}

export interface BuildCacheAPI {
    retrieve(name:string, params:any[]) : Promise<string>;
    store(name:string, params:any[], result:() => Promise<string>) : Promise<string>;
}