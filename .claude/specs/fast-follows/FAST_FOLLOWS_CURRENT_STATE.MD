# FF Implementation Status

┌───────┬─────────┬───────────────────────────────────────────────────────────────────────────────┐
│  FF   │ Status  │                                    Detail                                     │
├───────┼─────────┼───────────────────────────────────────────────────────────────────────────────┤
│ FF-01 │ Done    │ internal/build-utils/ extracted, all 3 apps consuming it                      │
├───────┼─────────┼───────────────────────────────────────────────────────────────────────────────┤
│ FF-02 │ Done    │ internal/node-shim/shim.mjs shared across all bin entries                     │
├───────┼─────────┼───────────────────────────────────────────────────────────────────────────────┤
│ FF-03 │ ~Done   │ Root bump.ts, release.ts, prerelease-check.ts exist. Tag logic lives inside   │
│       │         │ release.ts rather than standalone tag.ts — functionally complete              │
├───────┼─────────┼───────────────────────────────────────────────────────────────────────────────┤
│       │         │ 4a (enums), 4c (commander→cac), 4f (Hydra process.exit), 4g (Server.ts        │
│ FF-04 │ Partial │ removed) — done. Still open: 4b (37+ default exports remain), 4d              │
│       │         │ (debug/printf still in deps+code), 4e (9 empty catch blocks), 4h (78 @/ path  │
│       │         │ aliases)                                                                      │
├───────┼─────────┼───────────────────────────────────────────────────────────────────────────────┤
│ FF-05 │ Done    │ apps/cleo/src/integrations/bcp.ts implemented, dep added, local override in   │
│       │         │ root package.json                                                             │
├───────┼─────────┼───────────────────────────────────────────────────────────────────────────────┤
│ FF-06 │ Not     │ Empty docs/ and website/ dirs, no dxdocs config, no content                   │
│       │ started │                                                                               │
├───────┼─────────┼───────────────────────────────────────────────────────────────────────────────┤
│ FF-07 │ Not     │ Still @bundt/loclaude, directory/bins unchanged                               │
│       │ started │                                                                               │
├───────┼─────────┼───────────────────────────────────────────────────────────────────────────────┤
│ FF-08 │ Minimal │ Basic ci.yml only. No ESLint config, no release workflow, no matrix, no       │
│       │         │ caching                                                                       │
├───────┼─────────┼───────────────────────────────────────────────────────────────────────────────┤
│ FF-09 │ Not     │ No create-package.ts, no .code-workspace                                      │
│       │ started │                                                                               │
├───────┼─────────┼───────────────────────────────────────────────────────────────────────────────┤
│ FF-10 │ Not     │ packages/signals/src/index.ts is still a placeholder comment                  │
│       │ started │                                                                               │
├───────┼─────────┼───────────────────────────────────────────────────────────────────────────────┤
│ FF-11 │ Partial │ Cleo is mostly publish-ready. Others missing repository/homepage/bugs.        │
│       │         │ Hateoas/signals still private: true                                           │
├───────┼─────────┼───────────────────────────────────────────────────────────────────────────────┤
│ FF-12 │ Not     │ Hateoas has no build pipeline, exports point to source                        │
│       │ started │                                                                               │
└───────┴─────────┴───────────────────────────────────────────────────────────────────────────────┘

Biggest remaining work by effort

1. FF-04b — Converting 37+ default exports to named exports across waavy (high touch, mechanical)
2. FF-04d — Replacing debug/printf with picocolors-based logging
3. FF-10 — Signals package from scratch
4. FF-06 — Full documentation site
5. FF-12 — Hateoas build pipeline
6. FF-08 — CI/CD hardening (ESLint, release workflow, matrix)

The "tangential" work you mentioned (TUI/BCP integration in cleo, the task files for FF-06/07) is
visible in the recent commits but didn't derail the core FF progress — FF-01 through FF-05 were landed
cleanly in e32cb89. The main gap is FF-04's remaining sub-items and then everything from FF-06 onward
is untouched.