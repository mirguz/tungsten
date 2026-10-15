// Thin bindings over the Rust vault commands (src-tauri/src/vault.rs).
// Kept framework-free so the tree/editor logic can stay dumb React.
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export type TreeNode =
  | { type: "folder"; name: string; path: string; children: TreeNode[] }
  | { type: "file"; name: string; path: string };

const VAULT_KEY = "tungsten.vaultPath";

export function getStoredVaultPath(): string | null {
  return localStorage.getItem(VAULT_KEY);
}

/** Opens the native folder picker and remembers the choice for next launch. */
export async function pickVault(): Promise<string | null> {
  const selected = await open({ directory: true, multiple: false });
  if (typeof selected !== "string") return null;
  localStorage.setItem(VAULT_KEY, selected);
  return selected;
}

export function readVaultTree(vaultRoot: string): Promise<TreeNode[]> {
  return invoke("read_vault_tree", { vaultRoot });
}

export function readNote(vaultRoot: string, path: string): Promise<string> {
  return invoke("read_note", { vaultRoot, path });
}

export function writeNote(
  vaultRoot: string,
  path: string,
  content: string,
): Promise<void> {
  return invoke("write_note", { vaultRoot, path, content });
}

export function createNote(
  vaultRoot: string,
  parent: string,
  name: string,
): Promise<string> {
  return invoke("create_note", { vaultRoot, parent, name });
}

export function createFolder(
  vaultRoot: string,
  parent: string,
  name: string,
): Promise<string> {
  return invoke("create_folder", { vaultRoot, parent, name });
}
