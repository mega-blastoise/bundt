import CustomError from "./CustomError";

export default class DuplicateRouteDefinitionsError extends CustomError {
  constructor(filename: string) {
    const errorMessage = `Filename ${filename} exports both a "route" and a "routes" module. Waavy prohibits supplying both. This is considered a fatal error.`;
    super(errorMessage);
  }
}
