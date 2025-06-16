export default class EventEmitter {
  constructor() {
    this.events = {};
  }

  /**
   * Listen for an event.
   * @param {string} eventName The name of the event.
   * @param {function} listener The callback function.
   */
  on(eventName, listener) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(listener);
  }

  /**
   * Stop listening for an event.
   * @param {string} eventName The name of the event.
   * @param {function} listener The callback function to remove.
   */
  off(eventName, listener) {
    if (!this.events[eventName]) {
      return;
    }
    this.events[eventName] = this.events[eventName].filter(
      (l) => l !== listener
    );
  }

  /**
   * Emit an event to all listeners.
   * @param {string} eventName The name of the event to emit.
   * @param  {...any} args Arguments to pass to the listeners.
   */
  emit(eventName, ...args) {
    if (!this.events[eventName]) {
      return;
    }
    this.events[eventName].forEach((listener) => {
      listener(...args);
    });
  }
}
