/**
 * React context for the HATEOAS engine.
 * Provides the hypermedia client to the component tree and manages
 * the root resource discovery (Fielding's "start from a single entry point").
 */

import {
  createContext,
  useContext,
  useRef,
  useMemo,
  type ReactNode
} from 'react';
import { createClient, type HypermediaClient } from '../client/hypermedia-client.ts';
import type { MediaTypeId } from '../types.ts';

type HypermediaContextValue = {
  client: HypermediaClient;
  entryPoint: string;
};

const HypermediaContext = createContext<HypermediaContextValue | null>(null);

type HypermediaProviderProps = {
  entryPoint: string;
  mediaType?: MediaTypeId;
  headers?: Record<string, string>;
  cache?: boolean;
  children: ReactNode;
};

export function HypermediaProvider({
  entryPoint,
  mediaType,
  headers,
  cache,
  children
}: HypermediaProviderProps) {
  const clientRef = useRef<HypermediaClient | null>(null);

  if (!clientRef.current) {
    clientRef.current = createClient({
      entryPoint,
      mediaType,
      headers,
      cache
    });
  }

  const value = useMemo(
    () => ({ client: clientRef.current!, entryPoint }),
    [entryPoint]
  );

  return (
    <HypermediaContext value={value}>
      {children}
    </HypermediaContext>
  );
}

export function useHypermediaClient(): HypermediaClient {
  const ctx = useContext(HypermediaContext);
  if (!ctx) {
    throw new Error('useHypermediaClient must be used within a <HypermediaProvider>');
  }
  return ctx.client;
}

export function useEntryPoint(): string {
  const ctx = useContext(HypermediaContext);
  if (!ctx) {
    throw new Error('useEntryPoint must be used within a <HypermediaProvider>');
  }
  return ctx.entryPoint;
}
