import CustomError from "./CustomError";

export default class MissingPeerDependencyError extends CustomError {
  constructor(public dependency: string) {
    super(`Missing required dependency: ${dependency}`);
  }
}
