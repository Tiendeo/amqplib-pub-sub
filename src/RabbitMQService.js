import amqplib from 'amqplib';
import { RabbitError } from './Error';
import Logger from './Logger';

class RabbitMQService {
  constructor(options) {
    if (!options || !options.RABBIT_URI) {
      throw new RabbitError('RabbitMQService - Fail Missing Rabbit URI');
    }
    const { RABBIT_URI, VERBOSE } = options;
    this.consumers = [];
    this.uri = RABBIT_URI;
    const logger = new Logger(options)
    this.logger = logger;

    this.logger.debug('RabbitMQService - constructor');
  }

  async connect() {
    try {
      this.conn = await amqplib.connect(this.uri);
      this.logger.debug('RabbitMQService - Connect Success!');

      this.upPublisher();
      this.upConsumers();

      this.conn.on('error', err => {
        setTimeout(this.connect.bind(this), 10000);
        throw new RabbitError('RabbitMQService - Fail connect');
      });
      
      this.conn.on('close', () => {
        setTimeout(this.connect.bind(this), 10000);
        this.logger.error('connection to RabbitQM closed!');
      });
    } catch (error) {
        setTimeout(this.connect.bind(this), 30000);
        this.logger.error('RabbitMQService - Fail connect', error);
        throw new RabbitError('RabbitMQService - Fail connect');
    }
  }

  createChannel() {
    return this.conn.createChannel();
  }

  async publishExchange(exchange, routingKey, msg, options = {}) {
    if (!msg) return;
    
    if (!this.publishChannel) {
      await this.upPublisher();
    }

    const payload = this._stringify(msg);

    try {
      this.logger.debug('Publish on Exchange!');
      await this.publishChannel.assertExchange(exchange, 'topic');
      await this.publishChannel.publish(exchange, routingKey, Buffer.from(payload), options);

    } catch (error) {
      throw new RabbitError('RabbitMQService - Fail publish exchange');
    }
  }

  async upPublisher() {
    try {
      this.publishChannel = await this.createChannel();
    } catch (error) {
      throw new RabbitError('RabbitMQService - Fail upPublisher');
    }
  }

  upConsumers() {
    this.logger.debug('Upping Consumers');

    this.consumers.forEach(async consumer => {
      const ch = await this.createChannel();
      const { queue, exchange, routingKey = '#' } = consumer.config;
      const callback = consumer.onReceive(ch, queue);

      try {
        await ch.assertQueue(queue);

        if (exchange) {
          await ch.assertExchange(exchange, 'topic');
          await ch.bindQueue(queue, exchange, routingKey);
        }
        ch.prefetch(1);
        ch.consume(queue, callback);
      } catch (error) {
          throw new RabbitError('RabbitMQService - Fail upConsumers');
      }
    });
  }

  addConsumer(consumer) {
    this.consumers.push(consumer);
  }

  _stringify(msg) {
    if (msg === Object(msg)) {
      return JSON.stringify(msg);
    }

    return msg;
  }
}

export default RabbitMQService;
