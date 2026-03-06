import { Suspense, type ReactNode } from 'react';
import { renderToReadableStream } from 'react-dom/server';

import type { FragmentRegistry } from '../registry/fragment-registry';
import type { Frame, FragmentInstance, LayoutDefinition, LayoutPosition } from '../types';

function generateGridCSS(layout: LayoutDefinition): string {
  const colTemplate = `repeat(${layout.columns}, 1fr)`;
  const rowTemplate = `repeat(${layout.rows}, 1fr)`;

  return `
    #prev-workspace {
      display: grid;
      grid-template-columns: ${colTemplate};
      grid-template-rows: ${rowTemplate};
      gap: ${layout.gap};
      padding: ${layout.padding};
      width: 100%;
      height: 100vh;
      box-sizing: border-box;
    }
  `;
}

function positionToGridArea(position: LayoutPosition): string {
  return `${position.row} / ${position.col} / ${position.row + position.rowSpan} / ${position.col + position.colSpan}`;
}

function FragmentSkeleton(): ReactNode {
  return (
    <div style={{ padding: '16px', opacity: 0.5, color: '#888' }}>
      Loading...
    </div>
  );
}

function FragmentRenderer({
  instance,
  data,
  render
}: {
  instance: FragmentInstance;
  data: Record<string, unknown>;
  render: (context: { props: Record<string, unknown>; data: Record<string, unknown>; emit: (...args: unknown[]) => void }) => ReactNode;
}): ReactNode {
  const noop = () => {};
  return <>{render({ props: instance.props, data, emit: noop })}</>;
}

function WorkspaceLayout({
  frame,
  fragmentRegistry,
  resolvedData
}: {
  frame: Frame;
  fragmentRegistry: FragmentRegistry;
  resolvedData: Map<string, Record<string, unknown>>;
}): ReactNode {
  return (
    <div id="prev-workspace">
      {frame.fragments.map((instance) => {
        const def = fragmentRegistry.get(instance.fragmentId);
        const data = resolvedData.get(instance.instanceId) ?? {};
        const position = instance.position;
        const gridArea = position ? positionToGridArea(position) : undefined;

        return (
          <div
            key={instance.instanceId}
            data-prev-fragment={instance.instanceId}
            data-prev-fragment-id={instance.fragmentId}
            style={gridArea ? { gridArea } : undefined}
          >
            <Suspense fallback={<FragmentSkeleton />}>
              <FragmentRenderer instance={instance} data={data} render={def.render} />
            </Suspense>
          </div>
        );
      })}
    </div>
  );
}

export async function renderFrame(
  frame: Frame,
  fragmentRegistry: FragmentRegistry,
  resolvedData: Map<string, Record<string, unknown>>
): Promise<ReadableStream> {
  const gridCSS = generateGridCSS(frame.layout);

  const document = (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>prev workspace</title>
        <style dangerouslySetInnerHTML={{ __html: gridCSS }} />
        <style dangerouslySetInnerHTML={{ __html: `
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: system-ui, -apple-system, sans-serif; }
        `}} />
      </head>
      <body>
        <div id="prev-root">
          <WorkspaceLayout
            frame={frame}
            fragmentRegistry={fragmentRegistry}
            resolvedData={resolvedData}
          />
        </div>
        <script type="module" src="/prev/client.js" />
        <script type="module" src={`/prev/frame/${frame.id}/glue.js`} />
      </body>
    </html>
  );

  return renderToReadableStream(document, {
    bootstrapScriptContent: `window.__PREV_FRAME_ID__="${frame.id}";`
  });
}

export { WorkspaceLayout, FragmentRenderer, FragmentSkeleton };
