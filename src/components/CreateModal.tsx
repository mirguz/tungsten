import { useState } from "react";
import { Modal } from "./Modal";

// A curated, fixed set rather than a full picker library/upload flow -
// enough to make categories feel personal without building a theming system.
const ICONS = ["📁", "📌", "🗒️", "📚", "💡", "🎯", "🔧", "🗂️", "⭐", "🎨", "🧪", "📅", "✅", "💬", "🔒"];
const COLORS = ["#4f46e5", "#0891b2", "#059669", "#d97706", "#dc2626", "#7c3aed", "#db2777", "#64748b"];

export type CreateKind = "environment" | "category" | "note" | "folder";

export interface CreateData {
  name: string;
  icon?: string;
  color?: string;
}

const TITLES: Record<CreateKind, string> = {
  environment: "New Environment",
  category: "New Category",
  note: "New Note",
  folder: "New Folder",
};

interface Props {
  kind: CreateKind;
  onCancel: () => void;
  onSubmit: (data: CreateData) => void;
}

export function CreateModal({ kind, onCancel, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(ICONS[0]);
  const [color, setColor] = useState(COLORS[0]);
  const needsStyle = kind === "category";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(needsStyle ? { name: trimmed, icon, color } : { name: trimmed });
  }

  return (
    <Modal title={TITLES[kind]} onClose={onCancel}>
      <form onSubmit={submit} className="create-form">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
        />
        {needsStyle && (
          <>
            <div className="picker-row">
              {ICONS.map((i) => (
                <button
                  type="button"
                  key={i}
                  className={`swatch ${icon === i ? "selected" : ""}`}
                  onClick={() => setIcon(i)}
                >
                  {i}
                </button>
              ))}
            </div>
            <div className="picker-row">
              {COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={`swatch color ${color === c ? "selected" : ""}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  aria-label={c}
                />
              ))}
            </div>
          </>
        )}
        <div className="modal-actions">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="primary">
            Create
          </button>
        </div>
      </form>
    </Modal>
  );
}
