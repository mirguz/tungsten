import { useEffect, useState } from "react";
import { getAssetDataUrl } from "../lib/assetCache";
import type { CategoryMeta } from "../lib/vault";
import type { FolderNode } from "../lib/tree";

export interface RailDropPayload {
  draggedPath: string;
  targetPath: string;
  position: "before" | "after";
}

interface Props {
  vaultPath: string;
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
export function IconRail({
  vaultPath,
  categories,
  meta,
  activePath,
  onSelect,
  onCreate,
  onReorder,
  onContextMenu,
}: Props) {
  return (
    <nav className="icon-rail">
      {categories.map((category) => (
        <RailItem
          key={category.path}
          vaultPath={vaultPath}
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
  vaultPath: string;
  category: FolderNode;
  style?: CategoryMeta;
  active: boolean;
  onSelect: (path: string) => void;
  onReorder: (payload: RailDropPayload) => void;
  onContextMenu: (e: React.MouseEvent, path: string) => void;
}

function RailItem({ vaultPath, category, style, active, onSelect, onReorder, onContextMenu }: RailItemProps) {
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
      <RailIcon vaultPath={vaultPath} style={style} />
    </button>
  );
}

function RailIcon({ vaultPath, style }: { vaultPath: string; style?: CategoryMeta }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (style?.iconKind !== "image") {
      setImageUrl(null);
      return;
    }
    let cancelled = false;
    getAssetDataUrl(vaultPath, style.icon).then((url) => {
      if (!cancelled) setImageUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [vaultPath, style?.iconKind, style?.icon]);

  if (style?.iconKind === "image") {
    return imageUrl ? <img className="rail-icon-image" src={imageUrl} alt="" /> : null;
  }
  return <span className="rail-icon">{style?.icon ?? "📁"}</span>;
}
