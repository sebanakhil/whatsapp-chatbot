'use strict';

const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');
const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');

const env = process.env.NODE_ENV || 'development';
const logDir = 'logs';

// Create the log directory if it does not exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const dailyRotateFileTransport = new transports.DailyRotateFile({
  filename: `${logDir}/%DATE%.log`,
  datePattern: 'YYYY-MM-DD'
});

//https://medium.com/front-end-weekly/node-js-logs-in-local-timezone-on-morgan-and-winston-9e98b2b9ca45
const appendTimestamp = format((info, opts) => {
  if(opts.tz)
    info.timestamp = moment().tz(opts.tz).format('YYYY-MM-DD hh:mm:ss');
  return info;
});

const errorLog = createLogger({
  // change level if in dev environment versus production
  level: env === 'development' ? 'verbose' : 'info',
  format: format.combine(
    appendTimestamp({ tz: 'Asia/Calcutta' }), //'Asia/Kolkata'
    format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
  ),
  transports: [
    new transports.Console({
      level: 'info',
      format: format.combine(
        format.colorize(),
        format.printf(
          info => `${info.timestamp} ${info.level}: ${info.message}`
        )
      )
    }),
    dailyRotateFileTransport
  ]
});

module.exports = {
  errorLog: errorLog
};