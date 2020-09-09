import * as buildResource from './task/build-resource';
import * as buildUtils from './task/build-utils';
import { BuildSystem } from './build-system';


export const tasks = {
    ...buildUtils,
    ...buildResource,
};

export type Task = (buildSystem:BuildSystem, ...args:any[]) => Promise<string>;
export type Tasks = typeof tasks;
export type TaskParams<T extends Task> = T extends (bs:BuildSystem, ...args:infer R) => any ? R : any[];