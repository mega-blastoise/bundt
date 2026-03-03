import CustomError from "./CustomError";

export default class ComponentNotFoundError extends CustomError {
  constructor(componentPath: string, componentName: string) {
    const errorMessage = `Unable to import "${componentName}" from path: ${componentPath}`;
    super(errorMessage);
  }
}
