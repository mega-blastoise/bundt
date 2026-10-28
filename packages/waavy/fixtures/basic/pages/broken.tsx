/**
 * Throws outside any Suspense boundary: the shell cannot render.
 */

export default function Broken(): never {
  throw new Error('broken page always fails');
}
