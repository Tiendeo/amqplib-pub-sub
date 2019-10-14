import test from 'tape';
import proxyquire from 'proxyquire';
import { stub } from 'sinon';

const channel = { 
  assertExchange: stub(), 
  publish: stub() 
};

const connection = {
  createChannel: stub().resolves(channel),
  on: stub(),
};

const amqplib = {
  connect: stub().resolves(connection),
};

const logger = {
  debug: stub(),
}

const options = {
  RABBIT_URI: 'foo',
  VERBOSE: 'debug',
};

const RabbitMQService = proxyquire('../RabbitMQService', {
  amqplib: amqplib,
  './Logger': logger,
  '@noCallThru': true,
}).default;

/**
 * Test RabbitMQService
*/

test('RabbitMQService', t => {
  t.test('Constructor - Should throw missing URI error', ({ deepEqual, end }) => {
    try {
      new RabbitMQService({});
    } catch (error) {
      const errorMessage = error.message;
      deepEqual(errorMessage, 'RabbitMQService - Fail Missing Rabbit URI');
    }
    end();
  });

  t.test('Connect - Should call rabbit with connection string', async ({ ok, end }) => {
      const rabbitClient = new RabbitMQService(options);
      await rabbitClient.connect();
      ok(amqplib.connect.calledWith(options.RABBIT_URI));
    end();
  });

  t.test('publishExchange - Should return if empty message', async ({ ok, end }) => {
    const emptyMessage = '';
    const rabbitClient = new RabbitMQService(options);
    await rabbitClient.connect();
    await rabbitClient.publishExchange('exchange', 'routingKey', emptyMessage);

    ok(channel.publish.notCalled, 'Should not publish empty message');
    end();
  });

  t.test('publishExchange - Should publish message', async ({ ok, end }) => {
    const message = 'foo';
    const exchange = 'exchange';
    const routingKey = 'routingKey'
    const rabbitClient = new RabbitMQService(options);

    await rabbitClient.connect();
    await rabbitClient.publishExchange(exchange, routingKey, message);

    const args = [exchange, routingKey, Buffer.from(message), {}];

    ok(channel.publish.calledWith(...args), 'Should publish message to exchange');
    end();
  });
});
