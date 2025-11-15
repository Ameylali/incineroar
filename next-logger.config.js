// eslint-disable-next-line @typescript-eslint/no-require-imports
const pino = require('pino');

const logger = (defaultConfig) =>
  pino({
    ...defaultConfig,
    messageKey: 'message',
    transport: {
      target: 'pino-pretty',
      options: {
        messageKey: 'message',
        ignore: 'pid,hostname',
      },
    },
  });

module.exports = {
  logger,
};
