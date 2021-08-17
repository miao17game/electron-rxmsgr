import { IpcRenderer } from "electron";
import { IClientMainHost, IClientMessageTarget, WrappedClientMessenger } from "./typings";
import { createMessenger, IContext, MessengerToken, NgZonePatch, IMessenger } from "./base";

const ipcRenderer: IpcRenderer = window.require("electron").ipcRenderer;

export function createClientMessenger<T extends IContext, C extends Object, S extends Object>(
  msgs: T,
  options: { patch?: NgZonePatch; token?: () => string } = {},
) {
  const patch = (fn: () => void) => (options.patch ? options.patch(fn) : fn());
  const context = createMessenger<T>(msgs, options.patch);
  // @ts-ignore no type checking for [createServiceHost]
  const service = createServiceHost<S>(options.token);
  // @ts-ignore no type checking for [WrappedClientMessenger]
  return (options: WrappedClientMessenger<T, C>): IClientMessageTarget<T, S> => {
    // for send
    ipcRenderer.removeAllListeners(MessengerToken.ServiceResponse);
    ipcRenderer.on(MessengerToken.ServiceResponse, (_, { key, data }) =>
      patch(() => options[key]?.({ data, context: context["host"] })),
    );
    return {
      get context() {
        return context["host"];
      },
      get dispatcher() {
        return service;
      },
      dispose() {
        context.dispose();
      },
    };
  };
}

function createServiceHost<S extends IMessenger>(token?: () => string) {
  return new Proxy(<IClientMainHost<S>>{}, {
    get(_, propertyKey: string) {
      return {
        send(data: any) {
          ipcRenderer.send(MessengerToken.ClientEvent, { key: propertyKey, data, token: token?.() });
        },
        async invoke(data: any) {
          const result = (await ipcRenderer.invoke(`${MessengerToken.AppIpcInvoke}::${propertyKey}`, {
            key: propertyKey,
            data,
            token: token?.(),
          })) as any;
          if (result?.__error) {
            throw new Error(`InvokeError: ${result.message}`);
          }
          return result;
        },
      };
    },
  });
}
