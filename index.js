const _ = require('lodash');
const Queue = require('./lib/queue');

module.exports = function (sails) {

  let self, config;
  let queues = {};

  return {
    defaults: {
      __configKey__: {
        verbose: true,
        defaultServer: {
          host: '127.0.0.1',
          port: 6379,
          options: {},
          ns: 'rsmq',
        },
        defaultOptions: {
          vt: 30,
          delay: 0,
          maxsize: 65536,
        },
      }
    },
    initialize: function () {
      self = this;
      config = sails.config[this.configKey];
      sails.log.info('Initializing hook (`sails-hook-custom-queues`)');
      _initQueues();
    },
    push: _push,
    pop: _pop,
    isEmpty: _isEmpty,
    isReady: _isReady,
  };

  function _initQueues() {
    let queuesCfg = _.omit(config, ['verbose', 'defaultServer', 'defaultOptions']);
    for (let qname of _.keys(queuesCfg)) {
      _initQueue(qname)
        .catch(sails.log.error);
    }
  }

  function _initQueue(qname) {
    let queueCfg = config[qname];
    let serverCfg = _.defaults(queueCfg.server, config.defaultServer);
    let queueSameServer = _.values(queues).find(q => {
      return q.client.redis.options.host === serverCfg.host
        && Number(q.client.redis.options.port) === Number(serverCfg.port);
    });
    if (queueSameServer) {
      serverCfg.client = queueSameServer.client.redis;
    }
    let queue = new Queue(serverCfg);
    return queue.connect()
      .then(() => {
        queues[qname] = queue;
        queues[qname].qname = qname;
        let options = _.defaults(queueCfg.options, config.defaultOptions);
        return _createQueue(qname, options);
      });
  }

  function _createQueue(qname, options) {
    options = options || {};
    let queue = queues[qname];
    if (!queue) {
      throw new Error(`Not registered queue '${qname}'`);
    }
    return queue.create({...options, qname,})
      .then((result) => {
        if (result) {
          if (config.verbose) {
            sails.log.info(`Queue '${qname}' has been created`);
          }
        } else {
          throw new Error(`Queue '${qname}' not created`);
        }
      })
      .catch(error => {
        if (error.name === 'queueExists') {
          if (config.verbose) {
            sails.log.info(`Queue '${qname}' already exists`);
          }
          return;
        }
        sails.log.error(error);
      });
  }

  function _push(qname, message, options) {
    options = options || {};
    let queue = queues[qname];
    if (!queue) {
      throw new Error(`Not registered queue '${qname}'`);
    }
    return queue.push(message, options)
      .then((id) => {
        if (id && config.verbose) {
          sails.log.info(`Message #${id} pushed to queue '${qname}'`);
        }
        return id;
      })
      .catch(error => {
        if (error.name === 'queueNotFound') {
          if (config.verbose) {
            sails.log.info(`Queue '${qname}' not found, trying create...`);
          }
          return _initQueue(qname).then(() => _push(qname, message, options));
        }
        sails.log.error(error);
      });
  }

  function _pop(qname, options) {
    options = options || {};
    let queue = queues[qname];
    if (!queue) {
      throw new Error(`Not registered queue '${qname}'`);
    }
    return queue.pop(options)
      .then((result) => {
        if (result && config.verbose) {
          sails.log.info(`Message #${result.id} popped from queue '${qname}'`);
        }
        return result;
      })
      .catch(error => {
        if (error.name === 'queueNotFound') {
          if (config.verbose) {
            sails.log.info(`Queue '${qname}' not found, trying create...`);
          }
          return _initQueue(qname).then(() => _pop(qname, options));
        }
        sails.log.error(error);
      });
  }

  function _isReady(qname) {
    return !!queues[qname];
  }

  function _isEmpty(qname) {
    let queue = queues[qname];
    if (!queue) {
      throw new Error(`Not registered queue '${qname}'`);
    }
    return queue.getAttributes()
      .then((attributes) => !attributes.msgs)
      .catch(error => {
        if (error.name === 'queueNotFound') {
          if (config.verbose) {
            sails.log.info(`Queue '${qname}' not found, trying create...`);
          }
          return _initQueue(qname).then(() => _isEmpty(qname));
        }
        sails.log.error(error);
      });
  }

};
