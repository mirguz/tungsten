---
title: Vault Format
order: 4
---

A vault is just a folder. Tungsten keeps its own metadata in hidden
`.tungsten/` subfolders alongside your notes, and leaves everything else as
plain files so the vault stays readable without the app.

```
my-vault/
├── .tungsten/
│   └── custom.css          # vault-wide custom CSS
└── Work/                    # an Environment (top-level folder)
    ├── .tungsten/
    │   ├── meta.json        # this Environment's category icons, colors, order
    │   └── icons/           # uploaded category icon images
    ├── Projects/             # a Category (subfolder of an Environment)
    │   └── roadmap.md
    └── Journal/
        └── 2026-10-17.md
```

- **Environments** are the top-level folders of the vault. Each gets its own
  `.tungsten/meta.json` describing its categories' icons, colors, and sort
  order.
- **Categories** are ordinary subfolders one level inside an Environment —
  nothing on disk marks them as categories beyond being listed in the
  Environment's `meta.json`.
- **Notes** are plain Markdown files, read and written directly; nothing is
  rewritten or wrapped on save.
- Importing or exporting an Environment just copies its folder (including its
  `.tungsten/` subfolder) elsewhere, so Environments move between vaults —
  or into version control — without Tungsten involved.
