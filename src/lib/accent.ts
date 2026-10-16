// Accent color presets layered on top of the theme's own (monochrome by
// default) --accent/--accent-soft/--accent-foreground/--ring. Applied as
// inline overrides on :root, which beats any stylesheet rule (including
// custom.css) for that property - picking "Default" just clears them so the
// theme's own values, or a hand-written custom.css override, take over again.
export type AccentId = "default" | "blue" | "purple" | "pink" | "red" | "orange" | "green" | "teal";

interface AccentPreset {
  id: AccentId;
  label: string;
  hex: string | null; // null = default/monochrome
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { id: "default", label: "Default", hex: null },
  { id: "blue", label: "Blue", hex: "#2563eb" },
  { id: "purple", label: "Purple", hex: "#7c3aed" },
  { id: "pink", label: "Pink", hex: "#db2777" },
  { id: "red", label: "Red", hex: "#dc2626" },
  { id: "orange", label: "Orange", hex: "#ea580c" },
  { id: "green", label: "Green", hex: "#16a34a" },
  { id: "teal", label: "Teal", hex: "#0d9488" },
];

// Translucent rgba (rather than a fixed light/dark pair) blends with
// whatever --bg/--surface is behind it, so one value works in both themes.
function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function applyAccent(id: AccentId) {
  const preset = ACCENT_PRESETS.find((p) => p.id === id) ?? ACCENT_PRESETS[0];
  const root = document.documentElement.style;
  if (!preset.hex) {
    root.removeProperty("--accent");
    root.removeProperty("--accent-soft");
    root.removeProperty("--accent-foreground");
    root.removeProperty("--ring");
    return;
  }
  root.setProperty("--accent", preset.hex);
  root.setProperty("--accent-soft", hexToRgba(preset.hex, 0.14));
  root.setProperty("--accent-foreground", "#ffffff");
  root.setProperty("--ring", hexToRgba(preset.hex, 0.35));
}
