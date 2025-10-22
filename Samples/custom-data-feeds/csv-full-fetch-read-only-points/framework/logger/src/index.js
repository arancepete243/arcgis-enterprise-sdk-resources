const winston = require('winston');
const { format } = winston;
const stackLevels = ['error', 'debug', 'silly'];

/**
 * creates new custom winston logger
 *
 * @param {object} config - configuration object
 * @return {Logger} custom logger instance
 */
function createLogger(config = {}) {
  const { logLevel, colorize, printf } = config;
  const level = logLevel || 'info';

  const consoleTransport = new winston.transports.Console({
    colorize: true,
    level,
    stringify: true,
    json: true,
  });

  return winston.createLogger({
    transports: [consoleTransport],
    format: setFormats({ level, colorize, printf }),
    level,
  });
}

function setFormats({ level, colorize, printf }) {
  const combinedFormats = [
    format.errors({ stack: stackLevels.includes(level) }),
    format.timestamp(),
  ];

  if (colorize === undefined || colorize === true) {
    combinedFormats.push(format.colorize());
  }

  combinedFormats.push(format.printf(printfFactory(printf)));

  return format.combine(...combinedFormats);
}

function printfFactory(printf) {
  return printf || defaultPrintf;
}

function defaultPrintf({ level, message, timestamp, stack }) {
  if (stack) {
    // print log trace
    return `${timestamp} ${level}: ${message} - ${stack}`;
  }
  return `${timestamp} ${level}: ${message}`;
}

module.exports = createLogger;
