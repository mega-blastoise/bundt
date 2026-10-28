/**
 * Interactive page: proves hydration attached event handlers and that props
 * (including hostile strings) round-trip through the data island.
 */

import { useState } from 'react';

export type CounterProps = {
  label: string;
  initial: number;
};

export default function Counter({ label, initial }: CounterProps) {
  const [count, setCount] = useState(initial);
  return (
    <main>
      <p id="label">{label}</p>
      <button id="increment" type="button" onClick={() => setCount((value) => value + 1)}>
        Count: <span id="count">{count}</span>
      </button>
    </main>
  );
}
