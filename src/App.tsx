import { useEffect, useState } from "react";
import { AppIcon } from "./components/icons";
import { type AccentId, applyAccent } from "./lib/accent";
import { getStoredVaultPath, pickVault } from "./lib/vault";
import { Workspace } from "./Workspace";
import { WindowControls } from "./components/WindowControls";
import "./App.css";

export type Theme = "light" | "dark" | "system";
const THEME_KEY = "tungsten.theme";
const ACCENT_KEY = "tungsten.accent";

function App() {
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem(THEME_KEY) as Theme) || "system");
  const [accent, setAccent] = useState<AccentId>(() => (localStorage.getItem(ACCENT_KEY) as AccentId) || "default");

  // Remember the last vault across restarts so re-opening the app doesn't
  // make the user pick their folder again every time.
  useEffect(() => {
    setVaultPath(getStoredVaultPath());
  }, []);

  // "system" just means "no override" - the existing prefers-color-scheme
  // media query in App.css keeps handling that case on its own.
  useEffect(() => {
    if (theme === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    applyAccent(accent);
    localStorage.setItem(ACCENT_KEY, accent);
  }, [accent]);

  async function onPickVault() {
    const path = await pickVault();
    if (path) setVaultPath(path);
  }

  if (!vaultPath) {
    return (
      <div className="app-shell">
        <div className="app-menu-bar" data-tauri-drag-region>
          <span className="app-icon">
            <AppIcon />
          </span>
          <div className="app-menu-spacer" data-tauri-drag-region />
          <WindowControls />
        </div>
        <main className="vault-picker">
          <h1>Tungsten</h1>
          <p>Pick a folder on your disk to use as your vault.</p>
          <button onClick={onPickVault}>Open Vault</button>
        </main>
      </div>
    );
  }

  // Keyed by vaultPath so switching vaults remounts Workspace from scratch
  // instead of carrying over open tabs/panes that point at the old vault.
  return (
    <Workspace
      key={vaultPath}
      vaultPath={vaultPath}
      theme={theme}
      onThemeChange={setTheme}
      accent={accent}
      onAccentChange={setAccent}
      onChangeVault={onPickVault}
      onForgetVault={() => setVaultPath(null)}
    />
  );
}

export default App;
