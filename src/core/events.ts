/**
 * Typed Event Emitter.
 *
 * @module core/events
 */

import { getLogger } from './logger.js';

export type EventListener<T> = (event: T) => void;

export class EventEmitter<EventMap extends Record<string, unknown>> {
  private listeners: { [K in keyof EventMap]?: Set<EventListener<EventMap[K]>> } = {};

  on<K extends keyof EventMap>(event: K, listener: EventListener<EventMap[K]>): void {
    let set = this.listeners[event];
    if (!set) {
      set = new Set();
      this.listeners[event] = set;
    }
    set.add(listener);
  }

  off<K extends keyof EventMap>(event: K, listener: EventListener<EventMap[K]>): void {
    this.listeners[event]?.delete(listener);
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    this.listeners[event]?.forEach((listener) => {
      try {
        listener(data);
      } catch (error) {
        getLogger().error(`Error in event listener for ${String(event)}:`, error);
      }
    });
  }
}
