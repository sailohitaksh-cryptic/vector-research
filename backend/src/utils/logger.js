/**
 * Logger Utility
 * Winston-based logging with file and console transports
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('../config');

// Ensure log directory exists
if (!fs.existsSync(config.logging.directory)) {
  fs.mkdirSync(config.logging.directory, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Create logger
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    }),
    // Write all logs to file
    new winston.transports.File({
      filename: path.join(config.logging.directory, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    // Write errors to separate file
    new winston.transports.File({
      filename: path.join(config.logging.directory, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5
    })
  ]
});

module.exports = logger;
