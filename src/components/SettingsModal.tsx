import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { Modal } from "./Modal";
import type { FolderNode } from "../lib/tree";

interface Props {
  vaultPath: string;
  environments: FolderNode[];
  onChangeVault: () => void;
  onImport: () => void;
  onExport: (envPath: string) => void;
  onClose: () => void;
}

// The vault-management hub: where your notes live on disk, and the two
// ways whole Environments move in or out of that folder.
export function SettingsModal({ vaultPath, environments, onChangeVault, onImport, onExport, onClose }: Props) {
  return (
    <Modal title="Settings" onClose={onClose}>
      <div className="settings-form">
        <div className="settings-section">
          <h3>Vault</h3>
          <p className="settings-path">{vaultPath}</p>
          <div className="settings-row">
            <button onClick={() => revealItemInDir(vaultPath)}>Reveal in Explorer</button>
            <button onClick={onChangeVault}>Change Vault...</button>
          </div>
        </div>

        <div className="settings-section">
          <h3>Import / Export</h3>
          <p className="settings-hint">
            Both work a folder at a time - a plain folder of .md files in, one Environment out.
          </p>
          <button onClick={onImport}>Import Environment...</button>
          {environments.length === 0 ? (
            <p className="empty-hint">No Environments to export yet.</p>
          ) : (
            <ul className="env-list settings-env-list">
              {environments.map((env) => (
                <li key={env.path}>
                  <button className="env-item" onClick={() => onExport(env.path)}>
                    Export "{env.name}"...
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
