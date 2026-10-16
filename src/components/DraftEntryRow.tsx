import { useRef, useState } from "react";
import { FileIcon, FolderIcon } from "./icons";

export interface DraftEntry {
	parentPath: string;
	kind: "note" | "folder";
}

interface Props {
	draft: DraftEntry;
	existingNames: Set<string>;
	onSubmit: (name: string) => void;
	onCancel: () => void;
}

// VSCode-style inline "new file/folder" row: an editable name sitting right
// in the tree at its final position, instead of a separate modal dialog.
// Losing focus behaves like VSCode too: commit if the name is usable,
// otherwise just discard the row - Escape always discards.
export function DraftEntryRow({ draft, existingNames, onSubmit, onCancel }: Props) {
	const [name, setName] = useState("");
	// Escape/Enter settle the draft directly; guards against the blur that
	// follows (focus leaving as the row unmounts) from double-handling it.
	const settled = useRef(false);

	const trimmed = name.trim();
	const candidate =
		draft.kind === "note" && trimmed && !trimmed.endsWith(".md") ? `${trimmed}.md` : trimmed;
	const isDuplicate = trimmed.length > 0 && existingNames.has(candidate);

	function commitOrCancel() {
		if (settled.current) return;
		settled.current = true;
		if (trimmed && !isDuplicate) onSubmit(trimmed);
		else onCancel();
	}

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Escape") {
			e.preventDefault();
			settled.current = true;
			onCancel();
		} else if (e.key === "Enter") {
			e.preventDefault();
			commitOrCancel();
		}
	}

	return (
		<>
			<div className="tree-item draft">
				<span className="tree-node-icon">
					{draft.kind === "folder" ? <FolderIcon variant="empty" /> : <FileIcon />}
				</span>
				<input
					autoFocus
					className={`tree-draft-input ${isDuplicate ? "invalid" : ""}`}
					value={name}
					placeholder={draft.kind === "folder" ? "Folder name" : "Note name"}
					onChange={(e) => setName(e.target.value)}
					onKeyDown={handleKeyDown}
					onBlur={commitOrCancel}
				/>
			</div>
			{isDuplicate && (
				<div className="tree-draft-error">
					A {draft.kind === "folder" ? "folder" : "file"} named "{candidate}" already
					exists here.
				</div>
			)}
		</>
	);
}
