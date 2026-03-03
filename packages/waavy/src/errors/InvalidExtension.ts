import CustomError from "./CustomError";

export default class InvalidExtensionError extends CustomError {
  constructor(message: string) {
    super(message);
  }
}
