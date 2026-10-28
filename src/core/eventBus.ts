export type EventHandler = (payload: any) => void;

export class EventBus {
  private handlers = new Map<string, EventHandler[]>();

  on(event: string, cb: EventHandler): void {
    const list = this.handlers.get(event) ?? [];
    list.push(cb);
    this.handlers.set(event, list);
  }

  emit(event: string, payload?: any): void {
    for (const cb of this.handlers.get(event) ?? []) {
      cb(payload);
    }
  }
}
