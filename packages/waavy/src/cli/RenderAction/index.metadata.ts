export const command = "render" as const;
export const description = "Render a React component into a stdout stream or to a provided pipe" as const;

export const args = [
  {
    name: "<path-to-component>",
    description: "The path to the file containing the component to render",
  },
];

export const options = [
  {
    flags: "-p, --props <props>",
    description:
      "The props to pass to the component. If used in conjunction with a loader, it provides the initial props object and the result of the loader fn is merged in after.",
    default: "{}",
  },
  {
    flags: "-n, --name <name>",
    description: "The name of the component, if left blank, it assumes a default export",
    default: "default",
  },
  {
    flags: "-b, --bootstrap [files-to-bootstrap...]",
    description:
      "Any files you want to bootstrap on the client. This is typically used for client side hydration of the React app.",
    default: [],
  },
  {
    flags: "--cache",
    description:
      "If this flag is set to true, Waavy renderer will spawn a secondary non-blocking Worker thread to write the result of the render operation to a local file cache. This is recommended for production when it's very likely your components aren't changing if props are the same, and we can use a cached result of the render operation in such a case.",
    default: false,
  },
  {
    flags: "--cache-type <bunfs,bunsqlite3>",
    description: "Determines which approach to caching is used. Options: bun-fs, sqlite3",
  },
  {
    flags: "--cache-key <password>",
    description: "A string representing a password to be used for encrypting cached files",
  },
  {
    flags: "--pipe <path-to-pipe>",
    description:
      "Instead of piping the rendered component to stdout, it will pipe the component to a supplied named pipe. Pretty experimental currently.",
  },
  {
    flags: "--request <request>",
    description: "The request object to pass to the loader function.",
    default: "{}",
  },
  {
    flags: "--await",
    description:
      "If true, the result of the render operation will be collected as streamed, and then passed in a final state to stdout, equivocal to an all or none op.",
    default: false,
  },
  {
    flags: "--serialize <format>",
    description: "Write to stdout in a serialized structured format Currently supports JSON",
    default: false,
  },
  {
    flags: "--error-page-path <path-to-error-file>",
    description:
      "A fallback page to render in the event that an error is thrown during server side rendering.",
  },
  {
    flags: "--error-page-component-name <name>",
    description: "The name of the Error page component to import. Used in conjunction with --error-page-path",
    default: "default",
  },
  {
    flags: "--selector",
    description:
      'The selector that you will mount your React component node to within the browser.\n        If your application uses client side hydration, this is the selector for the element that you pass to ReactDOM.hydrateRoot\n        If you are using the "waavy" client side function, this property is used for client side hydration.      \n        If this property is left blank, it is assumed you are following the <Html /> React Page pattern,\n        and we will attempt to use "document" as the selector in this case.',
  },
  {
    flags: "--pcache-key",
    description:
      "A string indicating what field you want Waavy to assign props to on the window object.\n      if left default, Waavy will put the props in window._p",
  },
  {
    flags: "-v, --verbose",
    description: "Enables verbose log output",
    default: false,
  },
  {
    flags: "--max-timeout <number>",
    description:
      "Number of seconds to wait before aborting server-rendering, flushing the remaining markup to the client, and defaulting to client side rendering",
  },
  {
    flags: "--chunk",
    description:
      "Progressive chunk size, see <https://github.com/facebook/react/blob/14c2be8dac2d5482fda8a0906a31d239df8551fc/packages/react-server/src/ReactFizzServer.js#L210-L225>",
  },
  {
    flags: "--fail-silently",
    description:
      "Whether or not to render an Error page to the provided OutputStrategy if an Error occurs, or to fail silently",
    default: false,
  },
];
