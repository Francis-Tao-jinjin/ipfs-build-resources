import path = require('path');

const argv = require('minimist')(process.argv.slice(2));

const defaultCfg = {
    assetsDir: path.join(process.cwd(), 'assets'),
    resourcesDir: '',
    outputDir: path.join(process.cwd(), 'src/assets'),
    contentHostURL: 'http://127.0.0.1:5001', // ipfs default url
    maxConcurrency: 5,
    pin: true,
};
for (const name in argv) {
    const val = argv[name];
    const tv = typeof val;
    if ((name === 'dir' || name === 'DIR') &&
        tv === 'string') {
        defaultCfg.assetsDir = path.join(process.cwd(), val);
    } else if ((name === 'resources' || name === 'RESOURCES') &&
        tv === 'string') {
        defaultCfg.resourcesDir = path.join(process.cwd(), val);
    } else if ((name === 'out' || name === 'OUT') &&
        tv === 'string') {
        defaultCfg.outputDir = path.join(process.cwd(), val);
    }
}

export const Config = defaultCfg;