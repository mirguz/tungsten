import { useEffect, useState } from "react";
import { getStoredVaultPath, pickVault } from "./lib/vault";
import { Workspace } from "./Workspace";
import "./App.css";

function App() {
  const [vaultPath, setVaultPath] = useState<string | null>(null);

  // Remember the last vault across restarts so re-opening the app doesn't
  // make the user pick their folder again every time.
  useEffect(() => {
    setVaultPath(getStoredVaultPath());
  }, []);

  async function onPickVault() {
    const path = await pickVault();
    if (path) setVaultPath(path);
  }

  if (!vaultPath) {
    return (
      <main className="vault-picker">
        <h1>Tungsten</h1>
        <p>Pick a folder on your disk to use as your vault.</p>
        <button onClick={onPickVault}>Open Vault</button>
      </main>
    );
  }

  return <Workspace vaultPath={vaultPath} />;
}

export default App;
