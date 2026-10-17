---
title: Introduction
order: 0
---

Tungsten is a local-first notes app: your vault is a plain folder of files on
your own disk, no account and no server in the loop.

Under the hood it's a [Tauri](https://tauri.app) shell around a Rust backend
and a React UI, so there's no bundled browser runtime and no telemetry — the
app talks directly to your filesystem.

## How it's organized

- **Environments** — top-level folders in your vault; think of each as a
  separate workspace (e.g. "Work", "Journal", "Recipes").
- **Categories** — subfolders inside an Environment, shown as an icon rail
  with a custom emoji/image and color per category.
- **Notes** — rich-text documents edited with a Markdown-backed editor, saved
  back to plain files automatically.

Everything you see in the app maps onto real files and folders, so the vault
stays readable and portable even without Tungsten.
