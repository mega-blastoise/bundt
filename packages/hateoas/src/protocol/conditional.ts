/**
 * HTTP Conditional Requests (RFC 7232)
 * Supports ETag and Last-Modified based caching.
 */

export type ConditionalHeaders = {
  etag?: string;
  lastModified?: string;
};

export function generateETag(body: string): string {
  const hash = Bun.hash(body);
  return `"${hash.toString(16)}"`;
}

export function checkConditional(
  request: Request,
  headers: ConditionalHeaders
): Response | null {
  const ifNoneMatch = request.headers.get('if-none-match');
  if (ifNoneMatch && headers.etag) {
    const tags = ifNoneMatch.split(',').map((t) => t.trim());
    if (tags.includes(headers.etag) || tags.includes('*')) {
      return new Response(null, {
        status: 304,
        headers: { ETag: headers.etag }
      });
    }
  }

  const ifModifiedSince = request.headers.get('if-modified-since');
  if (ifModifiedSince && headers.lastModified) {
    const clientDate = new Date(ifModifiedSince).getTime();
    const serverDate = new Date(headers.lastModified).getTime();
    if (serverDate <= clientDate) {
      return new Response(null, {
        status: 304,
        headers: { 'Last-Modified': headers.lastModified }
      });
    }
  }

  const ifMatch = request.headers.get('if-match');
  if (ifMatch && headers.etag) {
    const tags = ifMatch.split(',').map((t) => t.trim());
    if (!tags.includes(headers.etag) && !tags.includes('*')) {
      return new Response(null, { status: 412 });
    }
  }

  const ifUnmodifiedSince = request.headers.get('if-unmodified-since');
  if (ifUnmodifiedSince && headers.lastModified) {
    const clientDate = new Date(ifUnmodifiedSince).getTime();
    const serverDate = new Date(headers.lastModified).getTime();
    if (serverDate > clientDate) {
      return new Response(null, { status: 412 });
    }
  }

  return null;
}

export function parseCacheControl(header: string | null): {
  maxAge?: number;
  noCache: boolean;
  noStore: boolean;
  mustRevalidate: boolean;
} {
  if (!header) return { noCache: false, noStore: false, mustRevalidate: false };

  const directives = header.split(',').map((d) => d.trim().toLowerCase());

  return {
    maxAge: (() => {
      const ma = directives.find((d) => d.startsWith('max-age='));
      return ma ? parseInt(ma.split('=')[1] ?? '0', 10) : undefined;
    })(),
    noCache: directives.includes('no-cache'),
    noStore: directives.includes('no-store'),
    mustRevalidate: directives.includes('must-revalidate')
  };
}
