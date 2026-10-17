---
title: Install
order: 1
---

There are no packaged builds yet — for now, Tungsten runs from source.

## Prerequisites

- [Node.js](https://nodejs.org) 22.22+ and [pnpm](https://pnpm.io)
- [Rust](https://www.rust-lang.org/tools/install) and the [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS

## Run it

```sh
git clone https://github.com/mirguz/tungsten.git
cd tungsten
pnpm install
pnpm tauri dev
```

This launches the app in development mode. To produce a native installer for
your platform:

```sh
pnpm tauri build
```

The installer lands in `src-tauri/target/release/bundle/`.
