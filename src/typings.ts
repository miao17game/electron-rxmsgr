import { FromIpcPayload, IMessenger, UseMessage, UseInvoke, IMessengerWatchHost, IContext } from "./base";

//#region typing helpers
export interface IServiceDelegate<D, T extends IContext, C extends IMessenger> {
  data: FromIpcPayload<D>;
  context: IMessengerWatchHost<T>;
  send: <K extends keyof C>(key: K, data: FromIpcPayload<C[K]>, sender?: any) => void;
  token?: string;
}

export interface IServiceDelegateNoSend<D, T extends IContext, C extends IMessenger> {
  data: D extends UseInvoke<[infer P1, any]> ? P1 : never;
  context: IMessengerWatchHost<T>;
  send: <K extends keyof C>(key: K, data: FromIpcPayload<C[K]>, sender?: any) => void;
  token?: string;
}

export interface IClientDelegate<D, T extends IContext> {
  data: FromIpcPayload<D>;
  context: IMessengerWatchHost<T>;
}

export type IInvokeReturn<T> = T extends UseInvoke<[any, infer R]> ? R | Error : never;
export type IMessageReturn<T> = T extends UseMessage<infer R> ? R : never;

export type WrappedServiceMessenger<T extends IContext, S extends IMessenger, C extends IMessenger> = {
  [key in keyof S]: S[key] extends UseMessage<any>
    ? (delegate: IServiceDelegate<S[key], T, C>) => void
    : (delegate: IServiceDelegateNoSend<S[key], T, C>) => Promise<IInvokeReturn<S[key]>>;
};

export type WrappedClientMessenger<T extends IMessenger, C extends IMessenger> = {
  [key in keyof C]?: (delegate: IClientDelegate<C[key], T>) => void;
};

export interface IClientMainSendDelegate<T> {
  /** 发送异步消息 */
  send(data: FromIpcPayload<T>): void;
}

export interface IClientMainInvokeDelegate<T> {
  /** 发送执行操作，并等待回应 */
  invoke(
    data: T extends UseInvoke<[infer P1, any]> ? P1 : never,
  ): T extends UseInvoke<[any, infer P2]> ? Promise<P2> : never;
}

export type IClientMainHost<S extends IMessenger> = {
  [key in keyof S]: S[key] extends UseMessage<any>
    ? IClientMainSendDelegate<S[key]>
    : IClientMainInvokeDelegate<S[key]>;
};

export interface IClientMessageTarget<T extends IContext, S extends IMessenger> {
  readonly context: IMessengerWatchHost<T>;
  /** 主进程调度 */
  readonly dispatcher: IClientMainHost<S>;
  dispose(): void;
}

//#endregion
