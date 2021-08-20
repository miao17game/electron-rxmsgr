import { ipcMain, WebContents } from "electron";
import { WrappedServiceMessenger } from "./src/typings";
import {
  createMessenger,
  IContext,
  IMessengerWatchHost,
  MessengerToken,
} from "./src/base";

export interface IServiceMessageTarget<T extends IContext> {
  readonly context: IMessengerWatchHost<T>;
  dispose(): void;
}

export function createServiceMessenger<
  T extends IContext,
  S extends Object,
  C extends Object
>(msgs: T) {
  const context = createMessenger<T>(msgs);
  const invoker = (sender: WebContents, type: string, state: any) =>
    sender.send(MessengerToken.ServiceResponse, { key: type, data: state });
  return (
    // @ts-ignore no type checking for [WrappedServiceMessenger]
    options: WrappedServiceMessenger<T, S, C>
  ): IServiceMessageTarget<T> => {
    // for send
    // console.log(`Add IPC Send Handler: [${MessengerToken.ClientEvent}]`);
    ipcMain.removeAllListeners(MessengerToken.ClientEvent);
    ipcMain.on(MessengerToken.ClientEvent, (event, { key, data, token }) => {
      const handler = options[key];
      handler({
        data,
        context: context["host"],
        token,
        send: invoker.bind(this, event.sender),
      });
    });
    // for invoke
    for (const [key, handler] of Object.entries(options)) {
      const HANDLER_KEY = MessengerToken.AppIpcInvoke + `::${key}`;
      // console.log(`Add IPC Invoke Handler: [${HANDLER_KEY}]`);
      ipcMain.removeHandler(HANDLER_KEY);
      ipcMain.handle(HANDLER_KEY, async (event, { data, token }) => {
        try {
          return await handler({
            data,
            context: context["host"],
            token,
            send: invoker.bind(this, event.sender),
          });
        } catch (error) {
          return {
            __error: true,
            message: error?.message,
            stack: error?.stack,
          };
        }
      });
    }
    return {
      get context() {
        return context["host"];
      },
      dispose() {
        context.dispose();
      },
    };
  };
}
