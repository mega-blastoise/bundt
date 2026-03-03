import debug from "debug";
import printf from "printf";

const logger = debug("waavy");

async function write(...args: any[]) {
  const _namespace = logger.namespace;
  const diff = logger.diff;

  let message = args[0];

  if (args.length > 1) {
    message = printf(message, ...args.slice(1));
  }

  const formatted = `[${_namespace}] ${message} +${diff}ms`;
  /**
   * When we start to enter the Workers branch of work, implement file streaming logging.
   * Can't pollute stdout due to architecture choices we've made to use stdout as a medium for inter-process data transfer.
   */
}

/**
 * @see https://www.npmjs.com/package/debug#output-streams
 */
logger.log = write;

const extend = logger.extend.bind(logger);

logger.extend = function (_namespace: string, delimiter?: string) {
  const child = extend(_namespace);
  child.log = write;
  return child;
};

export { logger };
export default logger;
