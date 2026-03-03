/**
 * Declarative React components for hypermedia-driven UIs.
 * These components render based on the available links and actions
 * in a resource — the server controls what the client can do.
 */

import {
  type ReactNode,
  type FormEvent,
  useCallback,
  useState,
  memo
} from 'react';
import { useHypermediaClient } from './context.tsx';
import { useAction } from './hooks.ts';
import type { HypermediaResource, HypermediaAction, HypermediaLink } from '../types.ts';

// --- HypermediaLink Component ---

type HypermediaLinkProps = {
  resource: HypermediaResource;
  rel: string;
  variables?: Record<string, unknown>;
  onNavigate?: (resource: HypermediaResource) => void;
  className?: string;
  children: ReactNode;
};

export const HypermediaNav = memo(function HypermediaNav({
  resource,
  rel,
  variables,
  onNavigate,
  className,
  children
}: HypermediaLinkProps) {
  const client = useHypermediaClient();
  const link = client.findLink(resource, rel);

  if (!link) return null;

  const href = client.resolveHref(link, variables);

  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      const target = await client.follow(resource, rel, variables);
      onNavigate?.(target);
    },
    [client, resource, rel, variables, onNavigate]
  );

  return (
    <a href={href} onClick={handleClick} className={className} rel={rel}>
      {children}
    </a>
  );
});

// --- ResourceView Component ---

type ResourceViewProps<T = Record<string, unknown>> = {
  resource: HypermediaResource<T>;
  render: (props: {
    properties: T;
    links: HypermediaLink[];
    actions: HypermediaAction[];
    embedded: Record<string, HypermediaResource[]>;
  }) => ReactNode;
};

export function ResourceView<T = Record<string, unknown>>({
  resource,
  render
}: ResourceViewProps<T>) {
  return (
    <>
      {render({
        properties: resource.properties,
        links: resource.links,
        actions: resource.actions,
        embedded: resource.embedded
      })}
    </>
  );
}

// --- ActionForm Component ---

type ActionFormProps = {
  resource: HypermediaResource;
  actionName: string;
  onSuccess?: (result: HypermediaResource) => void;
  onError?: (error: Error) => void;
  className?: string;
  children?: ReactNode | ((ctx: {
    action: HypermediaAction | undefined;
    loading: boolean;
    error: Error | null;
  }) => ReactNode);
};

export const ActionForm = memo(function ActionForm({
  resource,
  actionName,
  onSuccess,
  onError,
  className,
  children
}: ActionFormProps) {
  const { execute, loading, error, available, action } = useAction(resource, actionName);

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const data: Record<string, unknown> = {};
      for (const [key, value] of formData.entries()) {
        data[key] = value;
      }
      try {
        const result = await execute(data);
        onSuccess?.(result);
      } catch (err) {
        onError?.(err as Error);
      }
    },
    [execute, onSuccess, onError]
  );

  if (!available) return null;

  return (
    <form
      onSubmit={handleSubmit}
      method={action?.method}
      action={action?.href}
      className={className}
    >
      {typeof children === 'function'
        ? children({ action, loading, error })
        : children ?? <DefaultActionFields action={action!} loading={loading} />}
    </form>
  );
});

// --- Default form field renderer ---

function DefaultActionFields({
  action,
  loading
}: {
  action: HypermediaAction;
  loading: boolean;
}) {
  return (
    <>
      {action.fields?.map((field) => (
        <div key={field.name}>
          {field.title && <label htmlFor={field.name}>{field.title}</label>}
          <input
            id={field.name}
            name={field.name}
            type={field.type ?? 'text'}
            defaultValue={field.value != null ? String(field.value) : undefined}
            required={field.required}
            pattern={field.pattern}
          />
        </div>
      ))}
      <button type="submit" disabled={loading}>
        {loading ? 'Submitting...' : action.title ?? action.name}
      </button>
    </>
  );
}

// --- IfLink / IfAction - Conditional rendering ---

type IfLinkProps = {
  resource: HypermediaResource | undefined;
  rel: string;
  children: ReactNode;
  fallback?: ReactNode;
};

export function IfLink({ resource, rel, children, fallback }: IfLinkProps) {
  if (!resource) return fallback ?? null;
  const hasLink = resource.links.some((l) => l.rel === rel);
  return hasLink ? <>{children}</> : <>{fallback ?? null}</>;
}

type IfActionProps = {
  resource: HypermediaResource | undefined;
  name: string;
  children: ReactNode;
  fallback?: ReactNode;
};

export function IfAction({ resource, name, children, fallback }: IfActionProps) {
  if (!resource) return fallback ?? null;
  const hasAction = resource.actions.some((a) => a.name === name);
  return hasAction ? <>{children}</> : <>{fallback ?? null}</>;
}

// --- EmbeddedList - Render embedded collections ---

type EmbeddedListProps<T = Record<string, unknown>> = {
  resource: HypermediaResource;
  rel: string;
  renderItem: (item: HypermediaResource<T>, index: number) => ReactNode;
  empty?: ReactNode;
};

export function EmbeddedList<T = Record<string, unknown>>({
  resource,
  rel,
  renderItem,
  empty
}: EmbeddedListProps<T>) {
  const items = (resource.embedded[rel] ?? []) as HypermediaResource<T>[];
  if (items.length === 0) return <>{empty ?? null}</>;
  return <>{items.map((item, i) => renderItem(item, i))}</>;
}
