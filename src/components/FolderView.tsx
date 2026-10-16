import type { FolderNode } from "../lib/tree";
import { FileIcon, FolderIcon } from "./icons";

interface Props {
	folder: FolderNode;
	onOpenFolder: (path: string) => void;
	onOpenFile: (path: string) => void;
}

// The "main view" shown when a folder is double-clicked in the sidebar: a
// simple browsable listing of that folder's own children, Finder-style.
export function FolderView({ folder, onOpenFolder, onOpenFile }: Props) {
	return (
		<div className="folder-view">
			{folder.children.length === 0 && <p className="empty-state">This folder is empty.</p>}
			<div className="folder-grid">
				{folder.children.map((node) => (
					<button
						key={node.path}
						className="folder-grid-item"
						onDoubleClick={() =>
							node.type === "folder" ? onOpenFolder(node.path) : onOpenFile(node.path)
						}
					>
						<span className="folder-grid-icon">
							{node.type === "folder" ? (
								<FolderIcon
									variant={node.children.length > 0 ? "full" : "empty"}
									size={28}
								/>
							) : (
								<FileIcon size={28} />
							)}
						</span>
						<span className="folder-grid-name">{node.name}</span>
					</button>
				))}
			</div>
		</div>
	);
}
