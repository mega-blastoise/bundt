/**
 * React hooks for hypermedia-driven state management.
 * These hooks enforce HATEOAS by only allowing navigation through
 * link relations — never hardcoded URLs (except the entry point).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useHypermediaClient } from './context.tsx';
import type { HypermediaResource, HypermediaAction, ResourceState } from '../types.ts';

/**
 * Fetch and subscribe to the API root resource.
 * This is the only hook that uses a hardcoded URL (the entry point).
 * All subsequent navigation should use useLink/useAction.
 */
export function useRoot<T = Record<string, unknown>>(): ResourceState<T> & {
  refresh: () => void;
} {
  const client = useHypermediaClient();
  const [state, setState] = useState<ResourceState<T>>({ status: 'loading' });
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const resource = await client.root();
      if (mountedRef.current) {
        setState({ status: 'success', resource: resource as HypermediaResource<T>, stale: false });
      }
    } catch (error) {
      if (mountedRef.current) {
        setState({ status: 'error', error: error as Error });
      }
    }
  }, [client]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; };
  }, [load]);

  return { ...state, refresh: load };
}

/**
 * Fetch a resource by following a link relation from a parent resource.
 * Returns idle state if the parent resource or link doesn't exist yet.
 */
export function useLink<T = Record<string, unknown>>(
  parentResource: HypermediaResource | undefined,
  rel: string,
  variables?: Record<string, unknown>
): ResourceState<T> & { refresh: () => void } {
  const client = useHypermediaClient();
  const [state, setState] = useState<ResourceState<T>>({ status: 'idle' });
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    if (!parentResource) return;

    const link = client.findLink(parentResource, rel);
    if (!link) {
      setState({
        status: 'error',
        error: new Error(`No link with rel="${rel}" in resource ${parentResource.uri}`)
      });
      return;
    }

    setState({ status: 'loading' });
    try {
      const resource = await client.follow(parentResource, rel, variables);
      if (mountedRef.current) {
        setState({ status: 'success', resource: resource as HypermediaResource<T>, stale: false });
      }
    } catch (error) {
      if (mountedRef.current) {
        setState({ status: 'error', error: error as Error });
      }
    }
  }, [client, parentResource, rel, variables]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; };
  }, [load]);

  return { ...state, refresh: load };
}

/**
 * Fetch a resource by URI. Use sparingly — prefer useLink for HATEOAS compliance.
 * Primarily for bookmarked/shared URIs where the user enters mid-navigation.
 */
export function useResource<T = Record<string, unknown>>(
  uri: string | undefined
): ResourceState<T> & { refresh: () => void } {
  const client = useHypermediaClient();
  const [state, setState] = useState<ResourceState<T>>(
    uri ? { status: 'loading' } : { status: 'idle' }
  );
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    if (!uri) return;
    setState({ status: 'loading' });
    try {
      const resource = await client.fetch(uri);
      if (mountedRef.current) {
        setState({ status: 'success', resource: resource as HypermediaResource<T>, stale: false });
      }
    } catch (error) {
      if (mountedRef.current) {
        setState({ status: 'error', error: error as Error });
      }
    }
  }, [client, uri]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; };
  }, [load]);

  return { ...state, refresh: load };
}

/**
 * Execute a hypermedia action (form/operation).
 * Automatically invalidates the source resource's cache after mutation.
 */
export function useAction(
  resource: HypermediaResource | undefined,
  actionName: string
) {
  const client = useHypermediaClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<HypermediaResource | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const action = resource ? client.findAction(resource, actionName) : undefined;
  const available = !!action;

  const execute = useCallback(
    async (data?: Record<string, unknown>) => {
      if (!action) {
        throw new Error(
          `Action "${actionName}" not available on resource ${resource?.uri ?? 'undefined'}`
        );
      }

      setLoading(true);
      setError(null);

      try {
        const response = await client.execute(action, data);
        if (mountedRef.current) {
          setResult(response);
          setLoading(false);
          // Invalidate the parent resource to force refetch
          if (resource) client.invalidate(resource.uri);
        }
        return response;
      } catch (err) {
        if (mountedRef.current) {
          setError(err as Error);
          setLoading(false);
        }
        throw err;
      }
    },
    [client, action, actionName, resource]
  );

  return { execute, loading, error, result, available, action };
}

/**
 * Access embedded resources from a parent resource.
 * Embedded resources are pre-fetched sub-resources included in the response.
 */
export function useEmbedded<T = Record<string, unknown>>(
  resource: HypermediaResource | undefined,
  rel: string
): HypermediaResource<T>[] {
  if (!resource) return [];
  return (resource.embedded[rel] ?? []) as HypermediaResource<T>[];
}

/**
 * Check if a link relation exists on a resource.
 * Useful for conditional rendering based on available transitions.
 */
export function useHasLink(
  resource: HypermediaResource | undefined,
  rel: string
): boolean {
  if (!resource) return false;
  return resource.links.some((l) => l.rel === rel);
}

/**
 * Check if an action is available on a resource.
 */
export function useHasAction(
  resource: HypermediaResource | undefined,
  actionName: string
): boolean {
  if (!resource) return false;
  return resource.actions.some((a) => a.name === actionName);
}
