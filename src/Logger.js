import winston from 'winston';

winston.emitErrs = true;

class Logger extends winston.Logger {
  constructor(options) {
    const transports = [
      new winston.transports.Console({
        level: options.VERBOSE || 'debug',
        handleExceptions: true,
        json: false,
        colorize: true,
      }),
    ];

    super({
      transports,
      exitOnError: false,
    });
  }
}

export default Logger;
