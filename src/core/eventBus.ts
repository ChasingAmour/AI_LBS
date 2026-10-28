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

  off(event: string, cb: EventHandler): void {
    const list = this.handlers.get(event);
    if (!list) return;
    const index = list.indexOf(cb);
    if (index >= 0) list.splice(index, 1);
  }
}
