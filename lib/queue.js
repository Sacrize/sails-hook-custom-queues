const RedisSMQ = require('rsmq');

class Queue {
    constructor(config) {
        this.client = new RedisSMQ(config);
    }
    connect() {
        return new Promise((resolve, reject) => {
            let ttl = 10;
            let interval = setInterval(() => {
                if (this.client.connected) {
                    clearInterval(interval);
                    resolve();
                } else {
                    ttl--;
                    if (ttl <= 0) {
                        clearInterval(interval);
                        let serverCfg = this.client.redis.options;
                        reject(new Error(`Can't connect to redis server ${serverCfg.host}:${serverCfg.port}`));
                    }
                }
            }, 500);
        })
    }
    create(options) {
        this.qname = options.qname;
        return new Promise((resolve, reject) => {
            this.client.createQueue(options, (err, resp) => {
                if (err) {
                    return reject(err);
                }
                resolve(resp === 1);
            });
        });
    }
    push(message, options) {
        if (!_.isString(message)) {
            message = JSON.stringify(message);
        }
        return new Promise((resolve, reject) => {
            this.client.sendMessage({ ...options, message, qname: this.qname, }, (err, resp) => {
                if (err) {
                    return reject(err);
                }
                resolve(resp);
            });
        });
    }
    pop(options) {
        return new Promise((resolve, reject) => {
            this.client.popMessage({ ...options, qname: this.qname, }, (err, resp) => {
                if (err) {
                    return reject(err);
                }
                if (resp.id) {
                    let message = resp.message;
                    try {
                        message = JSON.parse(resp.message);
                    } catch (e) { }
                    return resolve({ ...resp, message, });
                }
                return resolve(null);
            });
        });
    }
    getAttributes() {
        return new Promise((resolve, reject) => {
            this.client.getQueueAttributes({ qname: this.qname, }, (err, resp) => {
                if (err) {
                    return reject(err);
                }
                return resolve(resp);
            });
        });
    }
}

module.exports = Queue;
