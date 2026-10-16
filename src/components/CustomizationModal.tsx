import { useState } from "react";
import { Modal } from "./Modal";

interface Props {
  initial: string;
  onSave: (css: string) => void;
  onCancel: () => void;
}

// Every token Tungsten's own UI is built from - the same list driving the
// Light/Dark/System looks in View, just editable by hand here.
const VARIABLES: { name: string; description: string; swatch?: boolean }[] = [
  { name: "--bg", description: "App background, behind every panel", swatch: true },
  { name: "--surface", description: "Panels, toolbars, menus, modals", swatch: true },
  { name: "--border", description: "Hairlines between panels", swatch: true },
  { name: "--text", description: "Primary text", swatch: true },
  { name: "--text-muted", description: "Secondary text, icons, hints", swatch: true },
  { name: "--accent", description: "Primary buttons, selection, active tab/caret", swatch: true },
  { name: "--accent-soft", description: "Hover and selected background wash", swatch: true },
  { name: "--accent-foreground", description: "Text/icon on top of --accent", swatch: true },
  { name: "--ring", description: "Keyboard focus ring", swatch: true },
  { name: "--danger", description: "Delete actions, duplicate-name errors", swatch: true },
  { name: "--radius-sm", description: "Buttons, inputs, tree rows" },
  { name: "--radius-md", description: "Panels, dropdown menus" },
  { name: "--radius-lg", description: "Modals" },
];

function currentValue(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Freeform CSS the user writes themselves, applied live on top of
// Tungsten's own styles and saved as a plain file in the vault
// (.tungsten/custom.css) - styled to match the rest of the app rather than
// looking like a bare textarea bolted on the side.
export function CustomizationModal({ initial, onSave, onCancel }: Props) {
  const [css, setCss] = useState(initial);

  return (
    <Modal title="Customization" onClose={onCancel} wide>
      <p className="settings-hint">
        Write CSS below and it applies immediately, saved to <code>.tungsten/custom.css</code> in
        your vault - it travels with it, the same as everything else here. Target the variables
        below (set on <code>:root</code>) to restyle Tungsten without fighting its own rules:
      </p>
      <div className="var-reference">
        {VARIABLES.map((v) => (
          <div className="var-reference-row" key={v.name}>
            {v.swatch && (
              <span className="var-swatch" style={{ background: `var(${v.name})` }} />
            )}
            <code className="var-name">{v.name}</code>
            <span className="var-description">{v.description}</span>
            <code className="var-value">{currentValue(v.name)}</code>
          </div>
        ))}
      </div>
      <pre className="var-example">{":root {\n  --accent: #2563eb;\n  --radius-md: 4px;\n}"}</pre>
      <textarea
        autoFocus
        className="custom-css-input"
        value={css}
        onChange={(e) => setCss(e.target.value)}
        placeholder=":root { --accent: #2563eb; }"
        spellCheck={false}
      />
      <div className="modal-actions">
        <button onClick={onCancel}>Cancel</button>
        <button className="primary" onClick={() => onSave(css)}>
          Save
        </button>
      </div>
    </Modal>
  );
}
