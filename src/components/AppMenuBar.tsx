import { useRef, useState } from "react";
import { AppIcon } from "./icons";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";
import { WindowControls } from "./WindowControls";

export type MenuDef =
  | { label: string; items: ContextMenuItem[] }
  | { label: string; onClick: () => void };

interface Props {
  menus: MenuDef[];
}

// VSCode-style menu bar: a brand mark, then a row of top-level buttons.
// Most drop their own ContextMenu; one with `onClick` instead (Settings)
// just opens a modal directly, since a one-item dropdown would only add a
// click. Only one dropdown is open at a time, and hovering another button
// while one is open switches straight to it (or closes it, for a direct
// action button), like a native menu bar.
export function AppMenuBar({ menus }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const openMenu = openIndex !== null ? menus[openIndex] : null;
  const openButton = openIndex !== null ? btnRefs.current[openIndex] : null;

  return (
    <div className="app-menu-bar" data-tauri-drag-region>
      <span className="app-icon">
        <AppIcon />
      </span>
      {menus.map((menu, i) => (
        <button
          key={menu.label}
          ref={(el) => {
            btnRefs.current[i] = el;
          }}
          className={`app-menu-trigger ${openIndex === i ? "active" : ""}`}
          onClick={() => {
            if ("onClick" in menu) {
              menu.onClick();
              return;
            }
            setOpenIndex((cur) => (cur === i ? null : i));
          }}
          onMouseEnter={() => {
            if (openIndex === null || openIndex === i) return;
            setOpenIndex("items" in menu ? i : null);
          }}
        >
          {menu.label}
        </button>
      ))}
      <div className="app-menu-spacer" data-tauri-drag-region />
      <WindowControls />
      {openMenu && "items" in openMenu && openButton && (
        <ContextMenu
          x={openButton.getBoundingClientRect().left}
          y={openButton.getBoundingClientRect().bottom + 2}
          items={openMenu.items}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </div>
  );
}
