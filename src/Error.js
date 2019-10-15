class AMQPError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.options = options;
  }
}

export { AMQPError };
