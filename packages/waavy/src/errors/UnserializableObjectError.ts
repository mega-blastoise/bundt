import CustomError from "./CustomError";

export default class UnserializableObjectError extends CustomError {
  public obj: unknown;

  constructor(obj: unknown) {
    super("Object cannot be serialized.");
    this.obj = obj;
  }
}
