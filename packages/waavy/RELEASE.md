# Checklist for Releases

> This is under the assumption that you have stress tested your changes vigorously.

- [ ] Run `bun run test`
- [ ] Run `bun run build`
- [ ] Run `bun run check-types`
- [ ] Run `bun run lint`
- [ ] Run `bun run format`
- [ ] Manually check executables for any runtime errors
- [ ] Update package.json version + CHANGELOG.md
- [ ] Git Add + Commit
- [ ] Git Tag (vX.X.X)
- [ ] Git Push (--all, --tags, --follow-tags)
