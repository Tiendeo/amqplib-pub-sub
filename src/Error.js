class RabbitError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.options = options;
  }
}

export { RabbitError };
