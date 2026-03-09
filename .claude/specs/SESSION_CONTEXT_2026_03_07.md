# Session Context — March 7, 2026

## What Was Accomplished

### Phase 1-3: Package Releases (COMPLETE)
- All 6 BCP Rust crates published to crates.io (bcp-wire, bcp-types, bcp-encoder, bcp-decoder, bcp-driver, bcp-cli)
- `@bit-context-protocol/driver@0.1.0` and `@bit-context-protocol/mcp@0.1.0` published to npm
- `@bundt/cleo@0.1.0`, `@bundt/dxdocs@0.1.0`, `@bundt/prev@0.1.0`, `@bundt/signals@0.1.0` published to npm
- All packages have comprehensive READMEs
- Cleo depends on `@bit-context-protocol/driver@^0.1.0` (public npm, not local override)

### Phase 4: Marketing Websites (COMPLETE)
- **bitcontextprotocol.com** — Vite + React + Three.js + Tailwind v4, mint/teal theme, blockchain chain animation
  - Location: `/home/nicks-dgx/dev/.RFCs/bit-context-protocol/websites/website-landing/`
  - Sections: Nav, Hero, Features (11 block types), CodeExample (TS + CLI), Specification (links to RFC.txt), Ecosystem (6 crates + 2 npm), Footer
  - RFC.txt served as static asset at `/bcp-rfc-v0.1.0.txt`
  - **DEPLOYED & LIVE** on S3/CloudFront

- **bundt-dev.io** — Vite + React + Three.js + Tailwind v4, violet/purple theme, icosahedron animation
  - Location: `/home/nicks-dgx/dev/bundt/websites/landing/`
  - Sections: Nav, Hero, Packages (cleo, dxdocs, prev, signals), Footer
  - Built and verified but **NOT YET DEPLOYED** (was waiting on DNS propagation)

### Phase 5: Documentation Sites (COMPLETE)
- **docs.bitcontextprotocol.com** — 32 pages built with `@bundt/dxdocs` (from npm), mint accent
  - Location: `/home/nicks-dgx/dev/.RFCs/bit-context-protocol/websites/website-dxdocs/`
  - Uses `@bundt/dxdocs@^0.1.0` as npm dependency (migrated from local path)
  - Added npm package docs (driver, mcp), landing page with card navigation
  - **DEPLOYED & LIVE** on S3/CloudFront

- **docs.bundt-dev.io** — 19 pages built with dxdocs (local), violet accent
  - Location: `/home/nicks-dgx/dev/bundt/websites/docs/`
  - Covers: getting-started, cleo (4 pages), dxdocs (5 pages), prev (5 pages), signals (2 pages)
  - Built and verified but **NOT YET DEPLOYED**

### Phase 6: CI/CD & Infrastructure (COMPLETE)
- GitHub Actions workflows created for both repos (deploy-websites, release-npm, release-crates)
- AWS infrastructure provisioned via console:
  - 4 S3 buckets (bitcontextprotocol-com-landing, bitcontextprotocol-com-docs, bundt-dev-io-landing, bundt-dev-io-docs)
  - 4 CloudFront distributions (2 with custom domains attached, 2 pending)
  - Route53 hosted zones for both domains, nameservers migrated from Hostinger
  - ACM cert for `*.bitcontextprotocol.com` issued and attached
  - ACM cert for `*.bundt-dev.io` — **PENDING** (DNS just propagated, needs cert request + validation)
  - IAM OIDC provider + `github-actions-deploy` role with S3/CloudFront permissions
  - GitHub secrets configured on both repos
- AWS CLI v2 installed locally at `~/.local/bin/aws` (aarch64), configured with IAM access key

## What Remains

### Immediate (bundt-dev.io deployment)
1. Request ACM cert for `bundt-dev.io` + `*.bundt-dev.io` in us-east-1
2. Create DNS validation records in Route53 (click "Create records in Route53" in ACM)
3. Wait for cert to issue (~2-5 min)
4. Attach CNAME + cert to the 2 bundt CloudFront distributions (landing + docs)
5. Create Route53 A alias records: `bundt-dev.io` → landing dist, `docs.bundt-dev.io` → docs dist
6. Deploy: `~/.local/bin/aws s3 sync` for both landing and docs
7. Invalidate CloudFront caches

### CloudFront Distribution IDs (bundt)
Need to identify which of the unconfigured distributions map to bundt. Run:
```bash
~/.local/bin/aws cloudfront list-distributions --query 'DistributionList.Items[*].[Id,Origins.Items[0].DomainName]' --output table
```
Match by S3 origin domain to find the bundt-dev-io-landing and bundt-dev-io-docs distribution IDs.

### Remaining BCP CloudFront distributions without custom domains
There are several distributions (`E1HD5BPWX6MDHZ`, `E1BOBXADQHFGTM`, `ELJ7TJQRX3O15`, `E471W3K24R3U8`, `E2XMJ01WL82C3P`, `EGW2NN1HKC9PX`) that don't have CNAMEs. These are likely the bundt ones + extras. Clean up any that aren't needed.

### Git Commits
Nothing from this session has been committed. The user handles all commits (GPG signing). Files changed:

**BCP repo** (`/home/nicks-dgx/dev/.RFCs/bit-context-protocol/`):
- `websites/website-landing/` — full landing page (mint theme, blockchain animation, RFC section)
- `websites/website-dxdocs/` — migrated to npm dxdocs, new landing page, npm package docs, mint accent
- `.github/workflows/deploy-websites.yml` — new
- `.github/workflows/release-npm.yml` — new
- `.github/workflows/release-crates.yml` — new

**Bundt repo** (`/home/nicks-dgx/dev/bundt/`):
- `websites/landing/` — full landing page (violet theme, Three.js)
- `websites/docs/` — full docs site (19 pages)
- `.github/workflows/deploy-websites.yml` — new
- Various package.json updates from earlier phases (already published)

### Future Work
- Migrate `bundt/websites/docs/` to use `@bundt/dxdocs` from npm (like BCP docs) instead of local path
- Test GitHub Actions deploy workflows end-to-end
- Consider OG image generation for social sharing
- Mobile hamburger menu for landing page navs (currently `hidden md:flex`)
