import { useState } from "react";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { Modal } from "./Modal";
import type { FolderNode } from "../lib/tree";

interface Props {
	vaultPath: string;
	environments: FolderNode[];
	onChangeVault: () => void;
	onImport: () => void;
	onExport: (envPath: string) => void;
	onReset: (resetSettings: boolean, deleteVaultData: boolean) => void;
	onClose: () => void;
}

type Page = "vault" | "data" | "security";

const PAGES: { id: Page; label: string }[] = [
	{ id: "vault", label: "Vault" },
	{ id: "data", label: "Data" },
	{ id: "security", label: "Security & Storage" },
];

export function SettingsModal({
	vaultPath,
	environments,
	onChangeVault,
	onImport,
	onExport,
	onReset,
	onClose,
}: Props) {
	const [page, setPage] = useState<Page>("vault");
	const [resetSettings, setResetSettings] = useState(false);
	const [resetVaultData, setResetVaultData] = useState(false);

	const sidebar = PAGES.map((p) => (
		<button
			key={p.id}
			className={`modal-nav-item ${page === p.id ? "active" : ""}`}
			onClick={() => setPage(p.id)}
		>
			{p.label}
		</button>
	));

	return (
		<Modal title="Settings" onClose={onClose} wide sidebar={sidebar}>
			{page === "vault" && (
				<div className="settings-section">
					<h3>Vault</h3>
					<p className="settings-path">
						<strong>{vaultPath}</strong>
					</p>
					<div className="settings-row">
						<button onClick={() => revealItemInDir(vaultPath)}>
							Reveal in Explorer
						</button>
						<button onClick={onChangeVault}>Change Vault...</button>
					</div>
				</div>
			)}

			{page === "data" && (
				<div className="settings-form">
					<div className="settings-section">
						<h3>Import / Export</h3>
						<p className="settings-hint">
							Both work a folder at a time - a plain folder of .md files in, one
							Environment out.
						</p>
						<button onClick={onImport}>Import Environment...</button>
						{environments.length === 0 ? (
							<p className="empty-hint">No Environments to export yet.</p>
						) : (
							<ul className="env-list settings-env-list">
								{environments.map((env) => (
									<li key={env.path}>
										<button
											className="env-item"
											onClick={() => onExport(env.path)}
										>
											Export "{env.name}"...
										</button>
									</li>
								))}
							</ul>
						)}
					</div>

					<div className="settings-section">
						<h3>Reset</h3>
						<p className="settings-hint">Choose what to reset. This can't be undone.</p>
						<label className="settings-checkbox">
							<input
								type="checkbox"
								checked={resetSettings}
								onChange={(e) => setResetSettings(e.target.checked)}
							/>
							Reset app settings (theme, accent, layout) and forget this vault
						</label>
						<label className="settings-checkbox">
							<input
								type="checkbox"
								checked={resetVaultData}
								onChange={(e) => setResetVaultData(e.target.checked)}
							/>
							Also delete everything in this vault
						</label>
						<button
							className="danger"
							disabled={!resetSettings && !resetVaultData}
							onClick={() => onReset(resetSettings, resetVaultData)}
						>
							Reset...
						</button>
					</div>
				</div>
			)}

			{page === "security" && (
				<div className="settings-section">
					<h3>Security & Storage</h3>
					<p className="settings-hint">
						Vault encryption, a master password/app lock, and storage usage aren't built
						yet - coming in a future update.
					</p>
					<ul className="coming-soon-list">
						<li>Encrypt vault at rest</li>
						<li>Master password / app lock</li>
						<li>Storage & cache usage</li>
					</ul>
				</div>
			)}
		</Modal>
	);
}
