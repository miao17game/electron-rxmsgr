import { BehaviorSubject, NextObserver, Observable, Subscription } from "rxjs";

export interface UseMessage<T> {
  mode: "message";
  payload: T;
}

export interface UseInvoke<T> {
  mode: "invoke";
  payload: T;
}

export type UseIpcPayload<T> = UseMessage<T> | UseInvoke<T>;
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IMessenger extends Record<string, UseIpcPayload<any>> {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IContext extends Record<string, any> {}
export type ObserverNext<T> = NextObserver<T>["next"];
export type FromIpcPayload<T> = T extends UseIpcPayload<infer IPC> ? IPC : never;

export type IMessengerWatchHost<T extends IContext> = {
  [key in keyof T]: {
    readonly value$: Observable<T[key]>;
    readonly value: T[key];
    watch(next: ObserverNext<T[key]>): symbol;
    update(data: T[key]): void;
  };
};

export type NgZonePatch = (func: () => void) => void;

export enum MessengerToken {
  ServiceResponse = "Messenger::Message::ServiceResponse",
  ClientEvent = "Messenger::Message::ClientEvent",
  AppIpcInvoke = "Messenger::Invoke::Ipc",
}

export class Messenger<T extends IContext = IContext> {
  protected readonly messengers: Map<keyof T, BehaviorSubject<any>> = new Map();
  protected readonly subscriptions: Map<symbol, Subscription> = new Map();
  protected readonly host!: IMessengerWatchHost<T>;

  private _tick = 0;

  constructor(msgs: T, private patch?: NgZonePatch) {
    this.host = <T>{};
    for (const [name, each] of Object.entries(msgs) as [keyof T, T[keyof T]][]) {
      const subject = new BehaviorSubject(each);
      this._createHost(name, subject);
      this.messengers.set(name, subject);
    }
  }

  private _patch(fn: () => void) {
    return this.patch ? this.patch(fn) : fn();
  }

  private _createHost<K extends keyof T>(name: K, subject: BehaviorSubject<T[K]>) {
    this.host[name] = {
      value$: subject.asObservable(),
      get value() {
        return subject.getValue();
      },
      watch: (next) => this.subscribe(name, next),
      update: (data) => this.update(name, data),
    };
  }

  public subscribe<K extends keyof T>(type: K, observer: ObserverNext<T[K]>): symbol {
    const messenger = this.messengers.get(type);
    if (!messenger) throw new Error(`no messenger with name [${type.toString()}] is found.`);
    const ticket = Symbol(`Messenger::${type.toString()}::${(this._tick += 1)}`);
    this._patch(() => this.subscriptions.set(ticket, messenger.subscribe(observer)));
    return ticket;
  }

  public update<K extends keyof T>(type: K, data: T[K]): void {
    this._patch(() => this.messengers.get(type)?.next(data));
  }

  public unsubscribe(ticket: symbol): void {
    const subscription = this.subscriptions.get(ticket);
    if (subscription) subscription.unsubscribe();
    this.subscriptions.delete(ticket);
  }

  public dispose(): void {
    const subscriptions = Array.from(this.subscriptions.entries());
    for (const [, subp] of subscriptions) {
      if (!subp.closed) subp.unsubscribe();
    }
  }
}

export function createMessenger<T extends IContext = IContext>(msgs: T, patch?: NgZonePatch): Messenger<T> {
  return new Messenger(msgs, patch);
}
