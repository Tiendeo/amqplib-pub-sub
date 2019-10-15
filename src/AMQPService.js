import amqplib from 'amqplib';
import { AMQPError } from './Error';
import logger from './Logger';

class AMQPService {
  constructor(options) {
    if (!options || !options.AMQP_URI) {
      throw new AMQPError('AMQPLIB-pub-sub - Fail Missing Rabbit URI');
    }

    logger.level = options.VERBOSE || 'info';
    logger.info('AMQPLIB-pub-sub constructor');

    this.consumers = [];
    this.uri = options.AMQP_URI;
  }

  async connect() {
    try {
      this.conn = await amqplib.connect(this.uri);
      
      logger.debug('AMQPLIB-pub-sub: Connect Success!');

      this.upPublisher();
      this.upConsumers();

      this.conn.on('error', () => {
        setTimeout(this.connect.bind(this), 10000);
        throw new AMQPError('AMQPLIB-pub-sub: Fail connect');
      });
      
      this.conn.on('close', () => {
        setTimeout(this.connect.bind(this), 10000);
        logger.error('AMQPLIB-pub-sub: connection closed!');
      });
    } catch (error) {
      setTimeout(this.connect.bind(this), 30000);
      logger.error('AMQPLIB-pub-sub: Fail connect', error);
      throw new AMQPError('AMQPLIB-pub-sub: Fail connect');
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
      
      await this.publishChannel.assertExchange(exchange, 'topic');
      await this.publishChannel.publish(exchange, routingKey, Buffer.from(payload), options);
      
      logger.debug(`AMQPLIB-pub-sub: Published on exchange ${exchange}`);

    } catch (error) {
      throw new AMQPError('AMQPLIB-pub-sub: Fail publish exchange');
    }
  }

  async upPublisher() {
    try {
      this.publishChannel = await this.createChannel();
    } catch (error) {
      throw new AMQPError('AMQPLIB-pub-sub: Fail upping publishers');
    }
  }

  upConsumers() {
    logger.debug('AMQPLIB-pub-sub: Upping Consumers');

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
        throw new AMQPError('AMQPLIB-pub-sub: Fail upConsumers');
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

export default AMQPService;
