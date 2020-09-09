import path from 'path';
import fs from 'fs';
import { BuildSystem } from './build-system';
import { CachingContentServer } from '../content-solver/caching-content-server';
import { Config } from './config';
import { uploadDirectory, UploadDirType } from './upload';

function inferType(json:any) {
    switch (typeof json) {
        case 'string':
        case 'number':
        case 'boolean':
            return typeof json;
        case 'object':
            if (Array.isArray(json)) {
                return inferType(json) + '[]';
            } else {
                const result:string[] = [];
                Object.keys(json).forEach((prop, i) => {
                    result.push(`'${prop}':${inferType(json[prop])}`);
                });
                return `{${result.join('; ')}}`;
            }
    }
    return 'never';
}

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

async function rebuildResources (buildSystem:BuildSystem, assetJSON:UploadDirType, resourceJSON:UploadDirType) {
    const assetHash = await buildSystem.storeJSON(assetJSON);
    let error:any = null;
    await Promise.all(Object.keys(resourceJSON).map(async (resourceName) => {
        const resourceHash = resourceJSON[resourceName];
        if (typeof resourceHash === 'string') {
            try {
                let valueExpr:string = `{};`;
                let typeExpr:string = 'any';
                try {
                    const hash = await buildSystem.build('buildResource', assetHash, resourceHash);
                    const json = await buildSystem.retrieveJSON(hash);
                    const resourceSpec = await buildSystem.retrieveJSON(resourceHash);
                    if (resourceSpec.type) {
                        typeExpr = resourceSpec.type;
                    } else {
                        typeExpr = inferType(json);
                    }
                    valueExpr = `<any>JSON.parse('${JSON.stringify(json).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')`
                } catch (e) {
                    console.error(`error building resource ${resourceName}:  ${e.stack}`);
                    valueExpr += `throw new Error("error building ${resourceName}: ${e.message}");`;
                    error = e;
                }
                const baseName = path.basename(resourceName).replace('.json', '');
                const typeName = baseName.toUpperCase() + '_RES';
                const src = `export const ${typeName}:${typeExpr} = ${valueExpr}`;
                const filePath = path.join(Config.outputDir, baseName + '.ts');
                try {
                    const prevSrc = await fs.promises.readFile(filePath);
                    if (prevSrc.toString() === src) {
                        return;
                    }
                } catch (e) {}
                await fs.promises.writeFile(filePath, src);
            } catch (e) {
                console.error(e);
                error = e;
            }
        } 
    }));
    if (error) {
        throw error;
    }
}

export async function buildResources(buildSystem:BuildSystem, contentServer:CachingContentServer) {
    const beginTime = Date.now();
    console.log('building resources...');
    if (Config.resourcesDir == '') {
        const assetJSON = rec(await uploadDirectory(Config.assetsDir, contentServer));
        let valueExpr:string = `{};`
        let typeExpr:string = inferType(assetJSON);
        valueExpr = `<any>JSON.parse('${JSON.stringify(assetJSON).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')`
        const baseName = (Config.assetsDir.split('/').pop()) || 'index';
        const typeName = 'ASSETS_RES';
        const src = `export const ${typeName}:${typeExpr} = ${valueExpr}`;
        const filePath = path.join(Config.outputDir, baseName + '.ts');
        try {
            const prevSrc = await fs.promises.readFile(filePath);
            if (prevSrc.toString() === src) {
                return;
            }
        }  catch (e) {}
        await fs.promises.writeFile(filePath, src);
    } else {
        const [
            assetJSON,
            resourceJSON,
        ] = await Promise.all([
            uploadDirectory(Config.assetsDir, contentServer),
            uploadDirectory(Config.resourcesDir, contentServer),
        ]);
        await rebuildResources(buildSystem, assetJSON, resourceJSON);
    }
    console.log(`resource build total time = ${((Date.now() - beginTime) / 1000).toFixed(4)} seconds`);
}