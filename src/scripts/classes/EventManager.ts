type EventCallback = (...args: any[]) => void;

export class EventManager {
    private listeners: Record<string, EventCallback[]>;

    constructor() {
        this.listeners = {};
    }

    on(event: string, callback: EventCallback): void {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    off(event: string, callback: EventCallback): void {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }

    emit(event: string, ...args: any[]): void {
        if (localStorage.getItem('eventTracing') === 'true') {
            console.trace('Event emitted:', event, args);
        } else {
            console.debug('Event emitted:', event);
        }

        if (!this.listeners[event]) return;

        this.listeners[event].forEach(cb => cb(...args));
    }
}
