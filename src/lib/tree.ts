import type { TreeNode } from "./vault";

export type FolderNode = TreeNode & { type: "folder" };

/** Finds a folder anywhere in the tree by its vault-relative path. */
export function findFolder(nodes: TreeNode[], path: string): FolderNode | null {
	for (const node of nodes) {
		if (node.type !== "folder") continue;
		if (node.path === path) return node;
		const found = findFolder(node.children, path);
		if (found) return found;
	}
	return null;
}

/** Environments are the vault's top-level folders; loose top-level files are ignored. */
export function environments(tree: TreeNode[]): FolderNode[] {
	return tree.filter((n): n is FolderNode => n.type === "folder");
}

/** Categories are an environment's direct subfolders. */
export function categories(env: FolderNode): FolderNode[] {
	return env.children.filter((n): n is FolderNode => n.type === "folder");
}

/** The category (one of `cats`) that contains `path`, or null if it's none of them. */
export function ancestorCategory(cats: FolderNode[], path: string): string | null {
	for (const cat of cats) {
		if (path === cat.path || path.startsWith(`${cat.path}/`)) return cat.path;
	}
	return null;
}

/**
 * Per-pane back/forward history, browser-tab style: visiting a new path
 * truncates anything ahead of the current position (so going back then
 * opening something new discards the old "forward" branch).
 */
export interface NavState {
	stack: string[];
	index: number;
}

export const EMPTY_NAV: NavState = { stack: [], index: -1 };

export function navPush(nav: NavState, path: string): NavState {
	if (nav.stack[nav.index] === path) return nav;
	const stack = [...nav.stack.slice(0, nav.index + 1), path];
	return { stack, index: stack.length - 1 };
}

export function navBack(nav: NavState): NavState {
	return nav.index > 0 ? { ...nav, index: nav.index - 1 } : nav;
}

export function navForward(nav: NavState): NavState {
	return nav.index < nav.stack.length - 1 ? { ...nav, index: nav.index + 1 } : nav;
}

export function navCurrent(nav: NavState): string | null {
	return nav.stack[nav.index] ?? null;
}

/**
 * The full display order for a folder's children: the names saved in
 * `order[parentPath]` first (dropping any that no longer exist), then any
 * other children alphabetically. A folder nobody has reordered yet - or a
 * new file created since the last reorder - just falls back to alphabetical.
 */
export function fullOrder(
	nodes: TreeNode[],
	order: Record<string, string[]>,
	parentPath: string,
): string[] {
	const names = nodes.map((n) => n.name);
	const nameSet = new Set(names);
	const listed = (order[parentPath] ?? []).filter((n) => nameSet.has(n));
	const listedSet = new Set(listed);
	const unlisted = names.filter((n) => !listedSet.has(n)).sort((a, b) => a.localeCompare(b));
	return [...listed, ...unlisted];
}

/** Sorts `nodes` according to fullOrder(), for rendering. */
export function applyOrder(
	nodes: TreeNode[],
	order: Record<string, string[]>,
	parentPath: string,
): TreeNode[] {
	const byName = new Map(nodes.map((n) => [n.name, n]));
	return fullOrder(nodes, order, parentPath)
		.map((name) => byName.get(name))
		.filter((n): n is TreeNode => n !== undefined);
}

/**
 * Moves `name` to sit just before/after `targetName` within `sequence`
 * (which should already be a fullOrder() result). `targetName: null` means
 * "append at the end" (used when dropping a file/folder into another one).
 */
export function reorder(
	sequence: string[],
	name: string,
	targetName: string | null,
	position: "before" | "after",
): string[] {
	const without = sequence.filter((n) => n !== name);
	if (targetName === null) return [...without, name];
	const idx = without.indexOf(targetName);
	if (idx === -1) return [...without, name];
	const insertAt = position === "before" ? idx : idx + 1;
	return [...without.slice(0, insertAt), name, ...without.slice(insertAt)];
}
