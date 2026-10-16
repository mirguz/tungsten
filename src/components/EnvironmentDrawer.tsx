import type { FolderNode } from "../lib/tree";

interface Props {
	open: boolean;
	environments: FolderNode[];
	activeEnvPath: string | null;
	onSelect: (path: string) => void;
	onClose: () => void;
	onCreate: () => void;
	onContextMenu: (e: React.MouseEvent, path: string) => void;
}

// Stage 1 of the sidebar flow: an overlay drawer, closed by default, that
// only ever lists Environments (the vault's top-level folders). Picking one
// closes the drawer and hands control to the icon-rail stage.
export function EnvironmentDrawer({
	open,
	environments,
	activeEnvPath,
	onSelect,
	onClose,
	onCreate,
	onContextMenu,
}: Props) {
	if (!open) return null;

	return (
		<div className="drawer-backdrop" onClick={onClose}>
			<div className="drawer" onClick={(e) => e.stopPropagation()}>
				<div className="drawer-header">
					<h2>Environments</h2>
					<button className="primary" onClick={onCreate}>
						+ New
					</button>
				</div>
				<ul className="env-list">
					{environments.map((env) => (
						<li key={env.path}>
							<button
								className={`env-item ${env.path === activeEnvPath ? "selected" : ""}`}
								onClick={() => onSelect(env.path)}
								onContextMenu={(e) => {
									e.preventDefault();
									onContextMenu(e, env.path);
								}}
							>
								{env.name}
							</button>
						</li>
					))}
					{environments.length === 0 && (
						<li className="empty-hint">
							No Environments yet — create one to get started.
						</li>
					)}
				</ul>
			</div>
		</div>
	);
}
