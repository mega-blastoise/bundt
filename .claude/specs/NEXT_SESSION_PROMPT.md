# Next Session Prompt

Copy everything below the line and paste it as your first message in the new Claude Code session.

---

Read the session context document at `/home/nicks-dgx/dev/bundt/.claude/specs/SESSION_CONTEXT_2026_03_07.md` — it contains the full state from the previous session.

We are continuing an SDLC release session across two monorepos:
- **BCP**: `/home/nicks-dgx/dev/.RFCs/bit-context-protocol/`
- **Bundt**: `/home/nicks-dgx/dev/bundt/`

## Completed
- All packages released to crates.io and npm
- BCP landing page (bitcontextprotocol.com) and docs (docs.bitcontextprotocol.com) are LIVE on S3/CloudFront
- AWS CLI configured at `~/.local/bin/aws`

## Resume From Here

### 1. Deploy bundt-dev.io (DNS just propagated)
The Route53 nameservers are live for bundt-dev.io. We need to:
1. Request ACM cert for `bundt-dev.io` + `*.bundt-dev.io` (us-east-1, DNS validation)
2. Create validation records in Route53
3. Once issued, attach CNAME + SSL cert to the bundt CloudFront distributions
4. Create Route53 A alias records pointing to CloudFront
5. `~/.local/bin/aws s3 sync` the landing page and docs site
6. Invalidate CloudFront caches

The built assets are ready:
- Landing: `/home/nicks-dgx/dev/bundt/websites/landing/dist/`
- Docs: `/home/nicks-dgx/dev/bundt/websites/docs/dist/`

### 2. Migrate bundt docs to npm dxdocs
Update `websites/docs/package.json` to depend on `@bundt/dxdocs@^0.1.0` from npm instead of the local `../../apps/dxdocs/src/cli.ts` path.

### 3. Git commits
Nothing from the previous session was committed. I handle all commits (GPG signing). Summarize the changes for each repo so I can commit them.

### 4. Clean up unused CloudFront distributions
There are several distributions without custom domains. Identify which ones map to bundt S3 buckets and which are orphans.

Key constraints:
- I use `bun` exclusively (never npm/yarn)
- I handle all git commits (GPG key signing issues in Claude TUI)
- Walk me through any AWS console steps rather than running commands I'd need to do in the browser
