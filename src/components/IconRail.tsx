import { useState } from "react";
import type { CategoryMeta } from "../lib/vault";
import type { FolderNode } from "../lib/tree";

export interface RailDropPayload {
  draggedPath: string;
  targetPath: string;
  position: "before" | "after";
}

interface Props {
  categories: FolderNode[];
  meta: Record<string, CategoryMeta>;
  activePath: string | null;
  onSelect: (path: string) => void;
  onCreate: () => void;
  onReorder: (payload: RailDropPayload) => void;
  onContextMenu: (e: React.MouseEvent, path: string) => void;
}

// Stage 2 of the sidebar flow: a slim, always-visible icon rail of the
// active Environment's categories, in their saved drag order. Pressing one
// opens the resizable category panel next to it (CategoryPanel).
export function IconRail({ categories, meta, activePath, onSelect, onCreate, onReorder, onContextMenu }: Props) {
  return (
    <nav className="icon-rail">
      {categories.map((category) => (
        <RailItem
          key={category.path}
          category={category}
          style={meta[category.path]}
          active={category.path === activePath}
          onSelect={onSelect}
          onReorder={onReorder}
          onContextMenu={onContextMenu}
        />
      ))}
      <button className="rail-item rail-add" title="New category" onClick={onCreate}>
        +
      </button>
    </nav>
  );
}

interface RailItemProps {
  category: FolderNode;
  style?: CategoryMeta;
  active: boolean;
  onSelect: (path: string) => void;
  onReorder: (payload: RailDropPayload) => void;
  onContextMenu: (e: React.MouseEvent, path: string) => void;
}

function RailItem({ category, style, active, onSelect, onReorder, onContextMenu }: RailItemProps) {
  const [dropPos, setDropPos] = useState<"before" | "after" | null>(null);

  return (
    <button
      className={`rail-item ${active ? "active" : ""} ${dropPos ? `drop-${dropPos}` : ""}`}
      style={style ? ({ "--rail-color": style.color } as React.CSSProperties) : undefined}
      title={category.name}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", category.path);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(e) => {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        setDropPos(e.clientY - rect.top < rect.height / 2 ? "before" : "after");
      }}
      onDragLeave={() => setDropPos(null)}
      onDrop={(e) => {
        e.preventDefault();
        const draggedPath = e.dataTransfer.getData("text/plain");
        const position = dropPos;
        setDropPos(null);
        if (!draggedPath || !position || draggedPath === category.path) return;
        onReorder({ draggedPath, targetPath: category.path, position });
      }}
      onClick={() => onSelect(category.path)}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(e, category.path);
      }}
    >
      <span className="rail-icon">{style?.icon ?? "📁"}</span>
    </button>
  );
}
