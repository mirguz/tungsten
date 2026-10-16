import { useState } from "react";
import type { Theme } from "../App";
import { ACCENT_PRESETS, type AccentId } from "../lib/accent";
import { Modal } from "./Modal";

interface Props {
	theme: Theme;
	onThemeChange: (theme: Theme) => void;
	accent: AccentId;
	onAccentChange: (accent: AccentId) => void;
	initial: string;
	onSave: (css: string) => void;
	onCancel: () => void;
}

const THEME_OPTIONS: { value: Theme; label: string }[] = [
	{ value: "light", label: "Light" },
	{ value: "dark", label: "Dark" },
	{ value: "system", label: "System" },
];

// Every token Tungsten's own UI is built from - the same list driving the
// Light/Dark/System looks above, just editable by hand here.
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

export function CustomizationModal({
	theme,
	onThemeChange,
	accent,
	onAccentChange,
	initial,
	onSave,
	onCancel,
}: Props) {
	const [css, setCss] = useState(initial);

	return (
		<Modal title="View customization" onClose={onCancel} wide>
			<div className="settings-section">
				<h3>Appearance</h3>
				<div className="theme-grid">
					{THEME_OPTIONS.map((opt) => (
						<button
							key={opt.value}
							className={`theme-card ${theme === opt.value ? "selected" : ""}`}
							onClick={() => onThemeChange(opt.value)}
						>
							<span className={`theme-preview theme-preview-${opt.value}`}>
								<span className="theme-preview-bar" />
								<span className="theme-preview-line" />
								<span className="theme-preview-line short" />
							</span>
							<span className="theme-card-label">{opt.label}</span>
						</button>
					))}
				</div>
			</div>

			<div className="settings-section">
				<h3 className="accent-title">Accent color</h3>
				<div className="accent-row">
					{ACCENT_PRESETS.map((p) => (
						<button
							key={p.id}
							className={`accent-swatch ${!p.hex ? "accent-swatch-default" : ""} ${
								accent === p.id ? "selected" : ""
							}`}
							style={p.hex ? { background: p.hex } : undefined}
							onClick={() => onAccentChange(p.id)}
							title={p.label}
							aria-label={p.label}
						/>
					))}
				</div>
			</div>

			<details className="settings-advanced">
				<summary className="settings-advanced-title">Advanced: Custom CSS</summary>
				<p className="settings-hint">
					Write CSS below and it applies immediately, saved to{" "}
					<code>.tungsten/custom.css</code> in your vault - it travels with it, the same
					as everything else here. Target the variables below (set on <code>:root</code>)
					to restyle Tungsten without fighting its own rules:
				</p>
				<div className="var-reference">
					{VARIABLES.map((v) => (
						<div className="var-reference-row" key={v.name}>
							{v.swatch && (
								<span
									className="var-swatch"
									style={{ background: `var(${v.name})` }}
								/>
							)}
							<code className="var-name">{v.name}</code>
							<span className="var-description">{v.description}</span>
							<code className="var-value">{currentValue(v.name)}</code>
						</div>
					))}
				</div>
				<pre className="var-example">
					{":root {\n  --accent: #2563eb;\n  --radius-md: 4px;\n}"}
				</pre>
				<textarea
					id="custom-css-input"
					className="custom-css-input"
					value={css}
					onChange={(e) => setCss(e.target.value)}
					placeholder=":root { --accent: #2563eb; }"
					spellCheck={false}
				/>
			</details>

			<div className="modal-actions">
				<button onClick={onCancel}>Cancel</button>
				<button className="primary" onClick={() => onSave(css)}>
					Save
				</button>
			</div>
		</Modal>
	);
}
