/**
 * Build identifiers.
 *
 * A build ID ties the manifest, the server entry, and every client entry of
 * one release together. It sorts roughly by creation time (base-36
 * milliseconds) and carries 24 random bits to stay unique when builds
 * start in the same millisecond.
 */

/** Creates a new build ID such as `"mh9x3k2a-4f1c9e"`. */
export function createBuildId(now: Date = new Date()): string {
  const random = crypto.getRandomValues(new Uint8Array(3));
  const suffix = Array.from(random, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${now.getTime().toString(36)}-${suffix}`;
}
