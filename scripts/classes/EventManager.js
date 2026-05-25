export class EventManager {
    constructor() {
        this.listeners = {};
    }

    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    off(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }

    emit(event, ...args) {
        if (localStorage.getItem('eventTracing') === 'true') {
            console.trace('Event emitted:', event, args);
        } else {
            console.debug('Event emitted:', event);
        }

        if (!this.listeners[event]) return;

        this.listeners[event].forEach(cb => cb(...args));
    }
}
