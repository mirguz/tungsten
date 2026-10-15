import { useEffect, useState } from "react";
import { getAssetDataUrl } from "../lib/assetCache";
import { pickIconImage, saveCategoryIcon, type IconKind } from "../lib/vault";

// A curated "quick pick" set, not an attempt at full emoji coverage - the
// free-text field below it already gives unlimited choice (type or paste
// any emoji, including via the OS's own emoji picker), so there's no need
// to build a searchable grid of thousands of them.
const QUICK_ICONS = [
  "📁", "📌", "🗒️", "📚", "💡", "🎯", "🔧", "🗂️", "⭐", "🎨", "🧪", "📅",
  "✅", "💬", "🔒", "🚀", "🏠", "💼", "🎓", "🧠", "🔥", "🌱", "🗺️", "📷",
  "🎵", "🏆", "⚙️", "🧩", "📈", "🛠️", "🌐", "📦", "🧾", "🗃️", "🔬", "🖌️",
  "🧵", "🎮", "🏋️", "✈️", "🍳", "🧳", "💰", "⏰", "📣", "🔑", "🧭", "🪴",
];

const QUICK_COLORS = [
  "#4f46e5", "#0891b2", "#059669", "#d97706", "#dc2626", "#7c3aed", "#db2777", "#64748b",
];

interface Props {
  vaultPath: string;
  envPath: string;
  icon: string;
  iconKind: IconKind;
  color: string;
  onIconChange: (icon: string, kind: IconKind) => void;
  onColorChange: (color: string) => void;
}

export function IconColorPicker({
  vaultPath,
  envPath,
  icon,
  iconKind,
  color,
  onIconChange,
  onColorChange,
}: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (iconKind !== "image" || !icon) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    getAssetDataUrl(vaultPath, icon).then((url) => {
      if (!cancelled) setPreview(url);
    });
    return () => {
      cancelled = true;
    };
  }, [vaultPath, iconKind, icon]);

  async function uploadImage() {
    const source = await pickIconImage();
    if (!source) return;
    setUploading(true);
    try {
      const relPath = await saveCategoryIcon(vaultPath, envPath, source);
      onIconChange(relPath, "image");
    } catch (err) {
      alert(String(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="style-picker">
      <div className="style-picker-preview" style={{ background: color }}>
        {iconKind === "image" ? (
          preview && <img src={preview} alt="" />
        ) : (
          <span>{icon || "📁"}</span>
        )}
      </div>

      <div className="picker-row">
        {QUICK_ICONS.map((i) => (
          <button
            type="button"
            key={i}
            className={`swatch ${iconKind === "emoji" && icon === i ? "selected" : ""}`}
            onClick={() => onIconChange(i, "emoji")}
          >
            {i}
          </button>
        ))}
      </div>

      <div className="style-picker-row">
        <input
          type="text"
          placeholder="Or type/paste any emoji"
          value={iconKind === "emoji" ? icon : ""}
          onChange={(e) => onIconChange(e.target.value, "emoji")}
          maxLength={8}
        />
        <button type="button" onClick={uploadImage} disabled={uploading}>
          {uploading ? "Uploading…" : "Upload image…"}
        </button>
      </div>

      <div className="picker-row">
        {QUICK_COLORS.map((c) => (
          <button
            type="button"
            key={c}
            className={`swatch color ${color === c ? "selected" : ""}`}
            style={{ background: c }}
            onClick={() => onColorChange(c)}
            aria-label={c}
          />
        ))}
        <input
          type="color"
          className="color-input"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          aria-label="Custom color"
          title="Pick any color"
        />
      </div>
    </div>
  );
}
