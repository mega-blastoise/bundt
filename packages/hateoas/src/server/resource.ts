/**
 * Server-side resource builder.
 * Constructs HypermediaResource instances with fluent API for links and actions.
 */

import type {
  HypermediaResource,
  HypermediaLink,
  HypermediaAction,
  HttpMethod,
  ActionField
} from '../types.ts';

export type ResourceBuilder<T = Record<string, unknown>> = {
  self: (href: string) => ResourceBuilder<T>;
  link: (rel: string, href: string, options?: Partial<HypermediaLink>) => ResourceBuilder<T>;
  action: (
    name: string,
    href: string,
    method: HttpMethod,
    options?: { title?: string; type?: string; fields?: ActionField[] }
  ) => ResourceBuilder<T>;
  embed: (rel: string, resources: HypermediaResource[]) => ResourceBuilder<T>;
  build: () => HypermediaResource<T>;
};

export function resource<T extends Record<string, unknown>>(
  properties: T
): ResourceBuilder<T> {
  let uri = '';
  const links: HypermediaLink[] = [];
  const actions: HypermediaAction[] = [];
  const embedded: Record<string, HypermediaResource[]> = {};

  const builder: ResourceBuilder<T> = {
    self(href) {
      uri = href;
      links.push({ href, rel: 'self' });
      return builder;
    },

    link(rel, href, options = {}) {
      links.push({ href, rel, ...options });
      return builder;
    },

    action(name, href, method, options = {}) {
      actions.push({ name, href, method, ...options });
      return builder;
    },

    embed(rel, resources) {
      embedded[rel] = resources;
      return builder;
    },

    build() {
      return { uri, properties, links, actions, embedded };
    }
  };

  return builder;
}

export function collection<T extends Record<string, unknown>>(
  selfHref: string,
  items: HypermediaResource<T>[],
  options: {
    total?: number;
    page?: number;
    pageSize?: number;
    baseHref?: string;
  } = {}
): HypermediaResource<{ total: number; page: number; pageSize: number }> {
  const { total = items.length, page = 1, pageSize = items.length } = options;
  const baseHref = options.baseHref ?? selfHref;
  const totalPages = Math.ceil(total / pageSize);

  const builder = resource({ total, page, pageSize }).self(selfHref);

  if (page > 1) {
    builder.link('first', `${baseHref}?page=1&pageSize=${pageSize}`);
    builder.link('prev', `${baseHref}?page=${page - 1}&pageSize=${pageSize}`);
  }

  if (page < totalPages) {
    builder.link('next', `${baseHref}?page=${page + 1}&pageSize=${pageSize}`);
    builder.link('last', `${baseHref}?page=${totalPages}&pageSize=${pageSize}`);
  }

  builder.embed('items', items);

  return builder.build();
}
