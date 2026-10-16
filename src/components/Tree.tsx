import { useEffect, useState } from "react";
import { applyOrder } from "../lib/tree";
import type { TreeNode } from "../lib/vault";
import { FileIcon, FolderIcon } from "./icons";
import { DraftEntryRow, type DraftEntry } from "./DraftEntryRow";

export interface TreeDropPayload {
	draggedPath: string;
	draggedParentPath: string;
	targetPath: string;
	targetParentPath: string;
	position: "before" | "after" | "inside";
}

interface ItemProps {
	parentPath: string;
	order: Record<string, string[]>;
	selected: Set<string>;
	openPaths: Set<string>;
	draft: DraftEntry | null;
	contextMenuPath: string | null;
	onOpenFile: (path: string) => void;
	onOpenFolder: (path: string) => void;
	onToggleSelect: (path: string, additive: boolean) => void;
	onRangeSelect: (siblingPaths: string[], clickedPath: string) => void;
	onContextMenu: (e: React.MouseEvent, node: TreeNode, parentPath: string) => void;
	onDrop: (payload: TreeDropPayload) => void;
	onDraftSubmit: (name: string) => void;
	onDraftCancel: () => void;
}

interface Props extends ItemProps {
	nodes: TreeNode[];
}

// Renders folders (Environments' categories, and whatever the user nests
// inside them) and markdown files recursively, in their saved drag order.
// Folders start open since vaults are expected to be small/shallow at first.
export function Tree({
	nodes,
	parentPath,
	order,
	draft,
	onDraftSubmit,
	onDraftCancel,
	...rest
}: Props) {
	const ordered = applyOrder(nodes, order, parentPath);
	const siblingPaths = ordered.map((n) => n.path);
	const draftHere = draft && draft.parentPath === parentPath ? draft : null;
	return (
		<ul className="tree">
			{draftHere && (
				<li>
					<DraftEntryRow
						draft={draftHere}
						existingNames={new Set(nodes.map((n) => n.name))}
						onSubmit={onDraftSubmit}
						onCancel={onDraftCancel}
					/>
				</li>
			)}
			{ordered.map((node) => (
				<TreeItem
					key={node.path}
					node={node}
					parentPath={parentPath}
					order={order}
					siblingPaths={siblingPaths}
					draft={draft}
					onDraftSubmit={onDraftSubmit}
					onDraftCancel={onDraftCancel}
					{...rest}
				/>
			))}
		</ul>
	);
}

function TreeItem({
	node,
	parentPath,
	order,
	siblingPaths,
	selected,
	openPaths,
	draft,
	contextMenuPath,
	onOpenFile,
	onOpenFolder,
	onToggleSelect,
	onRangeSelect,
	onContextMenu,
	onDrop,
	onDraftSubmit,
	onDraftCancel,
}: ItemProps & { node: TreeNode; siblingPaths: string[] }) {
	const [open, setOpen] = useState(true);
	const [dropPos, setDropPos] = useState<"before" | "after" | "inside" | null>(null);

	// A draft targeting this folder needs it expanded, even if the user had
	// collapsed it, so the inline new-file/new-folder row has somewhere to show.
	useEffect(() => {
		if (draft && draft.parentPath === node.path) setOpen(true);
	}, [draft, node.path]);

	function handleClick(e: React.MouseEvent) {
		if (e.shiftKey) {
			onRangeSelect(siblingPaths, node.path);
			return;
		}
		if (e.ctrlKey || e.metaKey) {
			onToggleSelect(node.path, true);
			return;
		}
		onToggleSelect(node.path, false);
		if (node.type === "folder") {
			setOpen((o) => !o);
		} else {
			onOpenFile(node.path);
		}
	}

	function handleDragOver(e: React.DragEvent) {
		e.preventDefault();
		const rect = e.currentTarget.getBoundingClientRect();
		const ratio = (e.clientY - rect.top) / rect.height;
		if (node.type === "folder" && ratio > 0.25 && ratio < 0.75) {
			setDropPos("inside");
		} else {
			setDropPos(ratio <= 0.5 ? "before" : "after");
		}
	}

	function handleDrop(e: React.DragEvent) {
		e.preventDefault();
		const draggedPath = e.dataTransfer.getData("text/plain");
		const position = dropPos;
		setDropPos(null);
		if (!draggedPath || !position) return;
		if (draggedPath === node.path) return;
		if (node.path === draggedPath || node.path.startsWith(`${draggedPath}/`)) return; // can't drop a folder into its own descendant
		const draggedParentPath = draggedPath.includes("/")
			? draggedPath.slice(0, draggedPath.lastIndexOf("/"))
			: "";
		onDrop({
			draggedPath,
			draggedParentPath,
			targetPath: node.path,
			targetParentPath: parentPath,
			position,
		});
	}

	const classes = [
		"tree-item",
		node.type,
		openPaths.has(node.path) ? "open" : "",
		selected.has(node.path) ? "selected" : "",
		dropPos ? `drop-${dropPos}` : "",
	]
		.filter(Boolean)
		.join(" ");

	// "Open" covers more than expansion: a folder also reads as open while
	// it's the live drag target, or while its own context menu is up.
	const showsOpen = open || dropPos === "inside" || contextMenuPath === node.path;
	const icon =
		node.type === "folder" ? (
			<FolderIcon
				variant={showsOpen ? "open" : node.children.length > 0 ? "full" : "empty"}
			/>
		) : (
			<FileIcon />
		);

	return (
		<li>
			<div
				className={classes}
				draggable
				onDragStart={(e) => {
					e.dataTransfer.setData("text/plain", node.path);
					e.dataTransfer.effectAllowed = "move";
				}}
				onDragOver={handleDragOver}
				onDragLeave={() => setDropPos(null)}
				onDrop={handleDrop}
				onClick={handleClick}
				onDoubleClick={() => node.type === "folder" && onOpenFolder(node.path)}
				onContextMenu={(e) => {
					e.preventDefault();
					onContextMenu(e, node, parentPath);
				}}
			>
				{node.type === "folder" && (
					<span className={`tree-caret ${open ? "open" : ""}`}>▸</span>
				)}
				<span className="tree-node-icon">{icon}</span>
				<span className="tree-label">{node.name}</span>
			</div>
			{node.type === "folder" && open && (
				<Tree
					nodes={node.children}
					parentPath={node.path}
					order={order}
					selected={selected}
					openPaths={openPaths}
					draft={draft}
					contextMenuPath={contextMenuPath}
					onOpenFile={onOpenFile}
					onOpenFolder={onOpenFolder}
					onToggleSelect={onToggleSelect}
					onRangeSelect={onRangeSelect}
					onContextMenu={onContextMenu}
					onDrop={onDrop}
					onDraftSubmit={onDraftSubmit}
					onDraftCancel={onDraftCancel}
				/>
			)}
		</li>
	);
}
