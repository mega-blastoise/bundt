/**
 * Media type registry supporting HAL+JSON and Siren.
 * Handles parsing responses into normalized HypermediaResource and
 * serializing resources back to the appropriate format.
 */

import type {
  HypermediaResource,
  HypermediaLink,
  HypermediaAction,
  MediaTypeId,
  MediaTypeParser,
  HttpMethod,
  ActionField
} from '../types.ts';

// --- HAL+JSON (draft-kelly-json-hal-08) ---

type HalResource = {
  _links?: Record<
    string,
    | { href: string; templated?: boolean; type?: string; title?: string; hreflang?: string; deprecation?: string }
    | Array<{ href: string; templated?: boolean; type?: string; title?: string; hreflang?: string; deprecation?: string }>
  >;
  _embedded?: Record<string, HalResource | HalResource[]>;
  [key: string]: unknown;
};

function parseHal(body: unknown, uri: string): HypermediaResource {
  const hal = body as HalResource;
  const links: HypermediaLink[] = [];
  const embedded: Record<string, HypermediaResource[]> = {};

  if (hal._links) {
    for (const [rel, linkOrLinks] of Object.entries(hal._links)) {
      const items = Array.isArray(linkOrLinks) ? linkOrLinks : [linkOrLinks];
      for (const link of items) {
        links.push({
          href: link.href,
          rel,
          templated: link.templated,
          type: link.type,
          title: link.title,
          hreflang: link.hreflang,
          deprecation: link.deprecation
        });
      }
    }
  }

  if (hal._embedded) {
    for (const [rel, res] of Object.entries(hal._embedded)) {
      const items = Array.isArray(res) ? res : [res];
      embedded[rel] = items.map((item) => parseHal(item, findSelfHref(item) ?? uri));
    }
  }

  const properties: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(hal)) {
    if (key !== '_links' && key !== '_embedded') {
      properties[key] = value;
    }
  }

  const selfLink = links.find((l) => l.rel === 'self');

  return {
    uri: selfLink?.href ?? uri,
    properties,
    links,
    actions: [],
    embedded
  };
}

function findSelfHref(hal: HalResource): string | undefined {
  const selfLink = hal._links?.['self'];
  if (!selfLink) return undefined;
  return Array.isArray(selfLink) ? selfLink[0]?.href : selfLink.href;
}

function serializeHal(resource: HypermediaResource): unknown {
  const hal: HalResource = { ...resource.properties };

  if (resource.links.length > 0) {
    const linkMap: Record<string, Array<{ href: string; templated?: boolean; type?: string; title?: string }>> = {};
    for (const link of resource.links) {
      if (!linkMap[link.rel]) linkMap[link.rel] = [];
      linkMap[link.rel]!.push({
        href: link.href,
        ...(link.templated && { templated: true }),
        ...(link.type && { type: link.type }),
        ...(link.title && { title: link.title })
      });
    }
    hal._links = {};
    for (const [rel, items] of Object.entries(linkMap)) {
      hal._links[rel] = items.length === 1 ? items[0]! : items;
    }
  }

  if (Object.keys(resource.embedded).length > 0) {
    hal._embedded = {};
    for (const [rel, resources] of Object.entries(resource.embedded)) {
      hal._embedded[rel] = resources.map((r) => serializeHal(r) as HalResource);
    }
  }

  return hal;
}

// --- Siren (kevin-siren) ---

type SirenEntity = {
  class?: string[];
  properties?: Record<string, unknown>;
  entities?: SirenSubEntity[];
  links?: Array<{ rel: string[]; href: string; type?: string; title?: string }>;
  actions?: Array<{
    name: string;
    href: string;
    method?: string;
    type?: string;
    title?: string;
    fields?: Array<{ name: string; type?: string; value?: unknown; title?: string }>;
  }>;
  title?: string;
};

type SirenSubEntity = SirenEntity & {
  rel: string[];
};

function parseSiren(body: unknown, uri: string): HypermediaResource {
  const siren = body as SirenEntity;
  const links: HypermediaLink[] = [];
  const actions: HypermediaAction[] = [];
  const embedded: Record<string, HypermediaResource[]> = {};

  if (siren.links) {
    for (const link of siren.links) {
      for (const rel of link.rel) {
        links.push({
          href: link.href,
          rel,
          type: link.type,
          title: link.title
        });
      }
    }
  }

  if (siren.actions) {
    for (const action of siren.actions) {
      actions.push({
        name: action.name,
        href: action.href,
        method: (action.method as HttpMethod) ?? 'GET',
        type: action.type,
        title: action.title,
        fields: action.fields?.map(
          (f): ActionField => ({
            name: f.name,
            type: f.type as ActionField['type'],
            value: f.value,
            title: f.title
          })
        )
      });
    }
  }

  if (siren.entities) {
    for (const entity of siren.entities) {
      for (const rel of entity.rel) {
        if (!embedded[rel]) embedded[rel] = [];
        const selfLink = entity.links?.find((l) => l.rel.includes('self'));
        embedded[rel].push(parseSiren(entity, selfLink?.href ?? uri));
      }
    }
  }

  const selfLink = links.find((l) => l.rel === 'self');

  return {
    uri: selfLink?.href ?? uri,
    properties: siren.properties ?? {},
    links,
    actions,
    embedded
  };
}

function serializeSiren(resource: HypermediaResource): unknown {
  const siren: SirenEntity = {};

  if (Object.keys(resource.properties).length > 0) {
    siren.properties = resource.properties;
  }

  if (resource.links.length > 0) {
    const linkGroups = new Map<string, { rels: string[]; href: string; type?: string; title?: string }>();
    for (const link of resource.links) {
      const existing = linkGroups.get(link.href);
      if (existing) {
        existing.rels.push(link.rel);
      } else {
        linkGroups.set(link.href, {
          rels: [link.rel],
          href: link.href,
          type: link.type,
          title: link.title
        });
      }
    }
    siren.links = [...linkGroups.values()].map((g) => ({
      rel: g.rels,
      href: g.href,
      ...(g.type && { type: g.type }),
      ...(g.title && { title: g.title })
    }));
  }

  if (resource.actions.length > 0) {
    siren.actions = resource.actions.map((a) => ({
      name: a.name,
      href: a.href,
      method: a.method,
      ...(a.type && { type: a.type }),
      ...(a.title && { title: a.title }),
      ...(a.fields && { fields: a.fields })
    }));
  }

  if (Object.keys(resource.embedded).length > 0) {
    siren.entities = [];
    for (const [rel, resources] of Object.entries(resource.embedded)) {
      for (const r of resources) {
        const sub = serializeSiren(r) as SirenSubEntity;
        sub.rel = [rel];
        siren.entities.push(sub);
      }
    }
  }

  return siren;
}

// --- Registry ---

const PARSERS: Record<MediaTypeId, MediaTypeParser> = {
  'application/hal+json': {
    id: 'application/hal+json',
    parse: parseHal,
    serialize: serializeHal
  },
  'application/vnd.siren+json': {
    id: 'application/vnd.siren+json',
    parse: parseSiren,
    serialize: serializeSiren
  },
  'application/json': {
    id: 'application/json',
    parse: parseHal, // Default to HAL-like structure
    serialize: serializeHal
  }
};

export function getParser(mediaType: MediaTypeId): MediaTypeParser {
  return PARSERS[mediaType];
}

export function negotiateMediaType(acceptHeader: string): MediaTypeId {
  const types = acceptHeader
    .split(',')
    .map((t) => {
      const [type, ...params] = t.trim().split(';');
      const qParam = params.find((p) => p.trim().startsWith('q='));
      const q = qParam ? parseFloat(qParam.split('=')[1] ?? '1') : 1;
      return { type: type!.trim(), q };
    })
    .sort((a, b) => b.q - a.q);

  for (const { type } of types) {
    if (type in PARSERS) return type as MediaTypeId;
  }

  return 'application/hal+json';
}
