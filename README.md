# Sails Hook Custom Queues
Simple queue creation based on redis. Hook uses the [rsmq](https://github.com/smrchy/rsmq) library.

## Getting Started
Install it via npm:
```bash
npm install sails-hook-custom-queues --save
```
## Configuration
Configure `config/queues.js` in your project with [rsmq docs](https://github.com/smrchy/rsmq#constructor):
```javascript
module.exports.queues = {
    defaultServer: { // rsmq contructor
        host: '127.0.0.1',
        port: 6379,
        options: {},
        ns: 'rsmq',
    },
    defaultOptions: { // rsmq.createQueue options
        vt: 30,
        delay: 0,
        maxsize: 65536,
    },
    // ...
    // examples
    customQueue1: {
        server: { // override defaultServer
            host: '127.0.0.2',
            port: 6380,
        },
        options: { // override defaultOptions
            maxsize: 20000,
        }
    },
    emailQueue: {
        // empty means default server and options
    },
    MySuPerQueue: {
        server: {
            host: '127.0.0.3',
        },
    },
    // more
    // ...
};
```
## Available methods
- push(qname, message, options)
    - qname: name of queue from config
    - message: any value to store in queue
    - options: object with [rsmq.sendMessage](https://github.com/smrchy/rsmq#sendmessage) options
- pop(qname, options)
    - qname: name of queue from config
    - options: object with [rsmq.receiveMessage](https://github.com/smrchy/rsmq#receivemessageoptions-callback) options
- isEmpty(qname)
    - qname: name of queue from config
## License

[MIT](./LICENSE)
