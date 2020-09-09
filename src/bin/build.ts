import fsext = require('fs-extra');
import { CachingContentServer } from '../content-solver/caching-content-server';
import { IPFSStore } from '../content-solver/ipfsStore';
import { BuildCache } from './build-cache';
import { BuildSystem } from './build-system';
import { Config } from './config';
import { buildResources } from './resource';

const contentServer = new CachingContentServer(
    new IPFSStore({
        url: Config.contentHostURL,
        pin: Config.pin,
        maxConcurrency: Config.maxConcurrency,
    })
);

const buildCache = new BuildCache();
const buildSystem = new BuildSystem(
    buildCache,
    contentServer,
);

async function start() {
    await Promise.all([fsext.remove(Config.outputDir)]);
    await Promise.all([fsext.mkdir(Config.outputDir)]);

    await buildResources(buildSystem, contentServer);
}

start().catch((err) => {
    console.error(err);
    process.exit(1);
})