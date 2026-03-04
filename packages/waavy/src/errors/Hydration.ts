import CustomError from "./CustomError";

export const HydrationErrorEnum = {
  BundleFailed: "BUNDLE_FAILED",
  InputDoesNotExist: "INPUT_DOES_NOT_EXIST",
  Unknown: "UNKNOWN",
} as const;

export type HydrationErrorEnum = (typeof HydrationErrorEnum)[keyof typeof HydrationErrorEnum];

const HydrationErrorMessaging: Record<HydrationErrorEnum, string> = {
  [HydrationErrorEnum.BundleFailed]: "Failed to bundle hydration code",
  [HydrationErrorEnum.InputDoesNotExist]: "Input does not exist",
  [HydrationErrorEnum.Unknown]: "Unknown error",
};

export default class HydrationError extends CustomError {
  constructor(type: HydrationErrorEnum) {
    super(HydrationErrorMessaging[type]);
    this.name = "HydrationError";
  }
}
