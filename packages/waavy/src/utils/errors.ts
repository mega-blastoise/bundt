export function formatError(error: Error) {
  return `Error: ${error.message}\nStack: ${error.stack}`;
}
