// TODO: This file uses Bun APIs (ServeFunctionOptions, RouterTypes) that may
// require a newer @types/bun version or are from canary builds. The entire
// WaavyServer abstraction is WIP and needs a redesign pass.

type RequestContext = Partial<Request> & {};
type IWaavyServerConstructorOptions = {};
type IWaavyServerHttpServiceRegistry = Map<
  IWaavyServerHttpServiceRegistryKey,
  Set<IWaavyServerHttpServiceRegistryHandler>
>;
type IWaavyServerHttpServiceRegistryKey = "web" | "api" | "socket" | "middleware" | "rpc";
type IWaavyServerHttpServiceRegistryHandler = IWaavyServerHttpWebServiceHandler;
type IWaavyServerHttpWebServiceHandler = (request: Request) => Promise<Response>;
type IWaavyServerHttpAPIServiceHandler<A, R> = (context: RequestContext, args: A) => Promise<R>;
type IAddWaavyServiceKey = IWaavyServerHttpServiceRegistryKey;

interface IWaavyServer {
  stop(): Promise<boolean>;
  start(): IWaavyServer;
}

abstract class AbstractWaavyServer {
  protected __registry: IWaavyServerHttpServiceRegistry;
  // @ts-expect-error — Bun.Server generic arity differs across @types/bun versions
  protected __server: Bun.Server | null = null;

  constructor(_options: IWaavyServerConstructorOptions) {
    this.__registry = new Map([
      ["web", new Set()],
      ["api", new Set()],
      ["socket", new Set()],
      ["middleware", new Set()],
      ["rpc", new Set()],
    ]);
  }

  public add(_type: IAddWaavyServiceKey): IWaavyServer {
    return this as unknown as IWaavyServer;
  }

  abstract stop(): Promise<boolean>;
  abstract start(): IWaavyServer;

  abstract routes(): Record<string, unknown>;
  abstract fetch(request: Request): Response | Promise<Response>;

  protected get port() {
    return process.env.WAAVY_PORT || 8080;
  }

  protected get host() {
    return process.env.WAAVY_HOST || "localhost";
  }
}

class WaavyServer extends AbstractWaavyServer implements IWaavyServer {
  constructor(options: IWaavyServerConstructorOptions) {
    super(options);
  }
  start(): WaavyServer {
    this.__server = Bun.serve({
      port: this.port,
      hostname: this.host,
      routes: {},
    });

    return this;
  }

  async stop(): Promise<boolean> {
    if (this.__server) {
      await this.__server.stop();
      return true;
    }
    return false;
  }
  routes(): Record<string, unknown> {
    return {};
  }

  fetch(request: Request): Response | Promise<Response> {
    throw new Error("Method not implemented.");
  }
}

export default WaavyServer;
export {
  WaavyServer,
  AbstractWaavyServer,
  type RequestContext,
  type IWaavyServerConstructorOptions,
  type IWaavyServerHttpServiceRegistry,
  type IWaavyServerHttpServiceRegistryKey,
  type IWaavyServerHttpServiceRegistryHandler,
  type IWaavyServerHttpWebServiceHandler,
  type IWaavyServerHttpAPIServiceHandler,
  type IAddWaavyServiceKey,
  type IWaavyServer,
};
