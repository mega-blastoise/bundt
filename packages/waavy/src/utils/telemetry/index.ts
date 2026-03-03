export function telemetryIsEnabled() {
  return process.env.WAAVY_ENABLE_TELEMETRY === "true" || process.env.WAAVY_ENABLE_TELEMETRY === "1";
}
