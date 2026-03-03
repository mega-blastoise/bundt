import CustomError from "./CustomError";

export enum HydrationErrorEnum {
  BundleFailed = "BUNDLE_FAILED",
  InputDOesNotExist = "INPUT_DOES_NOT_EXIST",
  Unknown = "UNKNOWN",
}

const HydrationErrorMessaging: Record<HydrationErrorEnum, string> = {
  [HydrationErrorEnum.BundleFailed]: "Failed to bundle hydration code",
  [HydrationErrorEnum.InputDOesNotExist]: "Input does not exist",
  [HydrationErrorEnum.Unknown]: "Unknown error",
};

export default class HydrationError extends CustomError {
  constructor(type: HydrationErrorEnum) {
    super(HydrationErrorMessaging[type]);
    this.name = "HydrationError";
  }
}
