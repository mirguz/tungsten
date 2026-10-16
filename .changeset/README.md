# Changesets

This directory holds changesets used to version and publish packages.

- Run `pnpm changeset` after changing a package to describe the change and bump type (patch/minor/major).
- Commit the generated file in `.changeset/` alongside your change.
- On merge to `development`, CI opens a "Version Packages" PR; merging that PR publishes the updated packages to npm.

See https://github.com/changesets/changesets for details.
