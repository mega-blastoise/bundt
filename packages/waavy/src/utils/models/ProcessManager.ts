// @no-test
import { ComponentNotFoundError, ErrorCodes, InvalidExtensionError, PropDataLoaderException } from "@/errors";

class ProcessManager {
  private isShuttingDown = false;
  private readonly shutdownTimeout = 10000;

  setupHandlers() {
    process.on("uncaughtException", (error: Error) => {
      if (error instanceof ComponentNotFoundError) {
        this.forceExit(ErrorCodes.ComponentNotFoundError);
      }

      if (error instanceof InvalidExtensionError) {
        this.forceExit(ErrorCodes.InvalidComponentFileExtensionError);
      }

      if (error instanceof PropDataLoaderException) {
        this.forceExit(ErrorCodes.PropDataLoaderThrewAnException);
      }

      this.forceExit(1);
    });

    process.on("unhandledRejection", (reason: unknown) => {
      this.forceExit(9);
    });

    // Graceful shutdown signals
    process.on("SIGTERM", () => this.gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => this.gracefulShutdown("SIGINT"));

    // Handle broken pipes, etc.
    // TODO determine what we want to do here
    process.on("SIGPIPE", () => {});
  }

  private async gracefulShutdown(signal: string, cleanupFn?: () => Promise<void>) {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    // Set a timeout to force exit if graceful shutdown takes too long
    const forceExitTimer = setTimeout(() => {
      this.forceExit(1);
    }, this.shutdownTimeout);

    try {
      await this.cleanup(cleanupFn);
      clearTimeout(forceExitTimer);
      process.exit(0);
    } catch (error) {
      clearTimeout(forceExitTimer);
      this.forceExit(1);
    }
  }

  private async cleanup(cleanupFn?: () => Promise<void>) {
    try {
      cleanupFn && (await cleanupFn());
    } catch (e) {}
  }

  private forceExit(code: number) {
    process.exit(code);
  }
}

export default new ProcessManager();
