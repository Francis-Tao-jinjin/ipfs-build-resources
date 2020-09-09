import { Semaphore } from 'async-await-semaphore';
import FormData = require('form-data');
import * as url from 'url';
import * as http from 'http';
import * as https from 'https';

export class IPFSStore {

    public pin:boolean;
    public semaphore:Semaphore;
    public protocol:string;
    public hostname:string;
    public port:string;
    public apiPrefix:string;
    public server:typeof http|typeof https;
    public retryCount:number = 5;

    constructor(spec:{
        url?:string,
        pin?:boolean,
        maxConcurrency?:number,
    }) {
        this.pin = spec.pin || true;
        this.semaphore = new Semaphore(spec.maxConcurrency || 5);
        const info = url.parse(spec.url || '');
        this.protocol = info.protocol || 'http:';
        this.hostname = info.hostname || 'localhost';
        this.port = info.port || '5001';
        this.apiPrefix = (info.path && info.path !== '/') ? info.path : '/api/v0';
        this.server = this.protocol === 'http:' ? http : https;
    }

    public async init() {}

    public async store(content:Uint8Array) : Promise<string> {
        const form = new FormData();
        if (content instanceof Buffer) {
            form.append('data', content);
        } else {
            form.append('data', Buffer.from(content));
        }
        const options:http.RequestOptions = {
            protocol: this.protocol,
            hostname: this.hostname,
            port: this.port,
            method: 'POST',
            path: `${this.apiPrefix}/block/put/?pin=${this.pin}`,
            headers: form.getHeaders(),
        };
        await this.semaphore.p();
        try {
            for (let i = 0; i < this.retryCount; i++) {
                try {
                    return await new Promise<string>((resolve, reject) => {
                        const req = this.server.request(options, (res) => {
                            const text:string[] = [];
                            res.setEncoding('utf8');
                            res.on('data', (chunk) => {
                                if (typeof chunk !== 'string') {
                                    text.push(chunk.toString());
                                } else {
                                    text.push(chunk);
                                }
                            });
                            res.on('end', () => {
                                try {
                                    const info = JSON.parse(text.join(''));
                                    // https://docs.ipfs.io/reference/http/api/#api-v0-block-put
                                    // return value : { "Key": "<string>", "Size": "<int>" }
                                    console.log(`store ${info.Key}`);
                                    resolve(info.Key);
                                } catch (e) {
                                    reject(e);
                                }
                            });
                        });
                        req.on('error', reject);
                        form.pipe(req);
                    });
                } catch (e) {
                    console.error(e);
                }
            }
            throw new Error('failed to store conent');
        } finally {
            this.semaphore.v();
        }
    }

    public async retrieve(hash:String) : Promise<Uint8Array|undefined> {
        await this.semaphore.p();
        try {
            for (let i = 0; i < this.retryCount; ++i) {
                try {
                    return await new Promise<Uint8Array|undefined>((resolve, reject) => {
                        const options:http.RequestOptions = {
                            protocol: this.protocol,
                            hostname: this.hostname,
                            port: this.port,
                            method: 'GET',
                            path: `${this.apiPrefix}/block/get?arg=${hash}`,
                        };
                        const req = this.server.request(options, (res) => {
                            const buffers:Buffer[] = [];
                            res.on('data', (chunk) => {
                                if (chunk && typeof chunk !== 'string') {
                                    buffers.push(chunk);
                                } else {
                                    reject(new Error(`Got string instead of buffer`));
                                }
                            });
                            res.on('end', () => {
                                if (res.statusCode !== 200) {
                                    console.error(`failed retrieved: ${hash}`);
                                    reject(new Error(`hash: ${hash}. ${Buffer.concat(buffers).toString()}`));
                                } else {
                                    resolve(Buffer.concat(buffers));
                                }
                            });
                        });
                        req.on('error', reject);
                        req.end();
                    });
                } catch (e) {
                    console.error(e);
                }
            }
            return undefined;
        } finally {
            this.semaphore.v();
        }
    }
}