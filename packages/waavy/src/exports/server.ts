// Runtime-agnostic server rendering (works with any JS runtime)
export {
  writeStaticComponentToFile,
  transformComponentToString,
  transformComponentToReadableStream,
  pipeComponent,
  pipeComponentToWritableCallbacks,
  pipeComponentToWritableCallback,
  pipeComponentToCollectedString,
  pipeComponentToStdout,
  pipeComponentToNodeStream,
} from "@/server";

// Bun-specific: hydration bundling (requires Bun.build API)
export { default as Hydra, bundleInlineCode, getNodeModulesWaavyCache, getTempFileInNodeModulesCache } from "@/server/models/Hydra";
