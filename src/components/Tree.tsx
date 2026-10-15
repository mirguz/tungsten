import { useState } from "react";
import { applyOrder } from "../lib/tree";
import type { TreeNode } from "../lib/vault";

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
  onOpenFile: (path: string) => void;
  onOpenFolder: (path: string) => void;
  onToggleSelect: (path: string, additive: boolean) => void;
  onRangeSelect: (siblingPaths: string[], clickedPath: string) => void;
  onContextMenu: (e: React.MouseEvent, node: TreeNode, parentPath: string) => void;
  onDrop: (payload: TreeDropPayload) => void;
}

interface Props extends ItemProps {
  nodes: TreeNode[];
}

// Renders folders (Environments' categories, and whatever the user nests
// inside them) and markdown files recursively, in their saved drag order.
// Folders start open since vaults are expected to be small/shallow at first.
export function Tree({ nodes, parentPath, order, ...rest }: Props) {
  const ordered = applyOrder(nodes, order, parentPath);
  const siblingPaths = ordered.map((n) => n.path);
  return (
    <ul className="tree">
      {ordered.map((node) => (
        <TreeItem
          key={node.path}
          node={node}
          parentPath={parentPath}
          order={order}
          siblingPaths={siblingPaths}
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
  onOpenFile,
  onOpenFolder,
  onToggleSelect,
  onRangeSelect,
  onContextMenu,
  onDrop,
}: ItemProps & { node: TreeNode; siblingPaths: string[] }) {
  const [open, setOpen] = useState(true);
  const [dropPos, setDropPos] = useState<"before" | "after" | "inside" | null>(null);

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
    onDrop({ draggedPath, draggedParentPath, targetPath: node.path, targetParentPath: parentPath, position });
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

  const icon = node.type === "folder" ? (open ? "📂" : "📁") : "📄";

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
          onOpenFile={onOpenFile}
          onOpenFolder={onOpenFolder}
          onToggleSelect={onToggleSelect}
          onRangeSelect={onRangeSelect}
          onContextMenu={onContextMenu}
          onDrop={onDrop}
        />
      )}
    </li>
  );
}
