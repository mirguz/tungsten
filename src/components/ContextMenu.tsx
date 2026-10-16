import { useEffect, useRef } from "react";

export type ContextMenuItem =
  | { divider: true }
  | { label: string; onSelect: () => void; danger?: boolean; checked?: boolean };

interface Props {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

// A minimal floating menu for right-click actions (new note/folder, delete).
// Closes on an outside click or Escape - no positioning/overflow logic
// beyond that, since menus here only ever have a handful of short items.
export function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div ref={ref} className="context-menu" style={{ left: x, top: y }}>
      {items.map((item, i) =>
        "divider" in item ? (
          <div key={i} className="context-menu-divider" />
        ) : (
          <button
            key={item.label}
            className={`context-menu-item ${item.danger ? "danger" : ""}`}
            onClick={() => {
              item.onSelect();
              onClose();
            }}
          >
            <span className="context-menu-check">{item.checked ? "✓" : ""}</span>
            {item.label}
          </button>
        ),
      )}
    </div>
  );
}
