import { useRef } from "react";
import { Tree, type TreeDropPayload } from "./Tree";
import type { DraftEntry } from "./DraftEntryRow";
import type { FolderNode } from "../lib/tree";
import type { TreeNode } from "../lib/vault";

const MIN_WIDTH = 180;
const MAX_WIDTH = 420;

interface Props {
  category: FolderNode;
  order: Record<string, string[]>;
  width: number;
  onResize: (width: number) => void;
  selected: Set<string>;
  openPaths: Set<string>;
  draft: DraftEntry | null;
  contextMenuPath: string | null;
  onOpenFile: (path: string) => void;
  onOpenFolder: (path: string) => void;
  onToggleSelect: (path: string, additive: boolean) => void;
  onRangeSelect: (siblingPaths: string[], clickedPath: string) => void;
  onContextMenu: (e: React.MouseEvent, node: TreeNode | null, parentPath: string) => void;
  onDrop: (payload: TreeDropPayload) => void;
  onDraftSubmit: (name: string) => void;
  onDraftCancel: () => void;
}

// The resizable/toggleable panel that opens next to the icon rail once a
// category is selected - lists that category's own folders and notes.
export function CategoryPanel({
  category,
  order,
  width,
  onResize,
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
}: Props) {
  const resizing = useRef(false);

  function startResize(e: React.MouseEvent) {
    e.preventDefault();
    resizing.current = true;
    const startX = e.clientX;
    const startWidth = width;

    const onMove = (ev: MouseEvent) => {
      if (!resizing.current) return;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + (ev.clientX - startX)));
      onResize(next);
    };
    const onUp = () => {
      resizing.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <div
      className="category-panel"
      style={{ width }}
      onContextMenu={(e) => {
        // Only the empty background, not a bubbled click from a tree row.
        if (e.target === e.currentTarget) {
          e.preventDefault();
          onContextMenu(e, null, category.path);
        }
      }}
    >
      <div className="category-panel-header">
        <h3>{category.name}</h3>
        <button
          className="icon-button"
          title="New note or folder (or right-click anywhere here)"
          onClick={(e) => onContextMenu(e, null, category.path)}
        >
          +
        </button>
      </div>
      <Tree
        nodes={category.children}
        parentPath={category.path}
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
      <div className="resize-handle" onMouseDown={startResize} />
    </div>
  );
}
