/**
 * The shell renders immediately, but a Suspense child never resolves. Used to
 * exercise deadlines after the shell is ready.
 */

import { Suspense, use } from 'react';

const never = new Promise<string>(() => undefined);

function Forever() {
  return <p>{use(never)}</p>;
}

export default function Slow() {
  return (
    <main>
      <h1 id="slow">Slow</h1>
      <Suspense fallback={<p id="pending">Pending…</p>}>
        <Forever />
      </Suspense>
    </main>
  );
}
