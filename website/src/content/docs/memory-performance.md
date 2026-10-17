---
title: Memory & Performance
order: 5
---

Tungsten is built on [Tauri](https://tauri.app) rather than Electron: the UI
renders in your OS's native webview instead of a bundled Chromium, and the
backend is Rust. In practice that means:

- **No bundled browser runtime.** The app ships as a small native binary
  instead of packaging an entire browser with every release.
- **Low idle footprint.** With no note open there's little more running than
  the native window and the vault watcher — no background services, no
  telemetry pings.
- **Direct filesystem access.** Reading and writing notes goes straight
  through Rust to disk, with no network hop or sync layer in the way.
- **Instant startup.** There's no runtime to boot beyond the OS webview, so
  launching the app is close to instant.

We don't have hard numbers published yet — once we do, they'll replace this
page with real benchmarks across platforms.
