export interface LayoutManager {
  init(): void;
  destroy(): void;
}

export function createLayoutManager(): LayoutManager {
  let resizeObserver: ResizeObserver | null = null;

  function init(): void {
    const workspace = document.getElementById('prev-workspace');
    if (!workspace) return;

    resizeObserver = new ResizeObserver(() => {
      // Phase 1: CSS Grid handles layout automatically
      // Phase 2+ will add fragment resize handles and dynamic grid updates
    });

    resizeObserver.observe(workspace);
  }

  function destroy(): void {
    resizeObserver?.disconnect();
    resizeObserver = null;
  }

  return { init, destroy };
}
