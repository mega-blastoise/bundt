import { MissingPeerDependencyError } from "@/errors";

export default class PeerDependencyManager {
  static async useReact() {
    const React = (await import("react")).default;
    if (React) return React;
    else throw new MissingPeerDependencyError("react");
  }

  static async useReactDOMServer() {
    const ReactDOMServer = (await import("react-dom/server")).default;
    if (ReactDOMServer) return ReactDOMServer;
    else throw new MissingPeerDependencyError("react-dom/server");
  }

  static async useReactDOMBrowser() {
    const ReactDOMClient = (await import("react-dom/client")).default;
    if (ReactDOMClient) return ReactDOMClient;
    else throw new MissingPeerDependencyError("react-dom/client");
  }
}
