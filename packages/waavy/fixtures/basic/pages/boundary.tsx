/**
 * A Suspense boundary whose child throws during the server render. React
 * emits the fallback, reports a recoverable error, and retries on the client.
 */

import { Suspense } from 'react';

function Explodes(): never {
  throw new Error('boundary child failed on the server');
}

export default function Boundary() {
  return (
    <main>
      <h1>Boundary</h1>
      <Suspense fallback={<p id="fallback">Loading…</p>}>
        <Explodes />
      </Suspense>
    </main>
  );
}
