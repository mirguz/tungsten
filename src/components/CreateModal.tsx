import { useState } from "react";
import { IconColorPicker } from "./IconColorPicker";
import { Modal } from "./Modal";
import type { IconKind } from "../lib/vault";

export type CreateKind = "environment" | "category";

export interface CreateData {
	name: string;
	icon?: string;
	iconKind?: IconKind;
	color?: string;
}

const TITLES: Record<CreateKind, string> = {
	environment: "New Environment",
	category: "New Category",
};

interface Props {
	kind: CreateKind;
	vaultPath: string;
	envPath: string | null;
	onCancel: () => void;
	onSubmit: (data: CreateData) => void;
}

export function CreateModal({ kind, vaultPath, envPath, onCancel, onSubmit }: Props) {
	const [name, setName] = useState("");
	const [icon, setIcon] = useState("📁");
	const [iconKind, setIconKind] = useState<IconKind>("emoji");
	const [color, setColor] = useState("#4f46e5");
	const needsStyle = kind === "category" && envPath;

	function submit(e: React.FormEvent) {
		e.preventDefault();
		const trimmed = name.trim();
		if (!trimmed) return;
		onSubmit(needsStyle ? { name: trimmed, icon, iconKind, color } : { name: trimmed });
	}

	return (
		<Modal title={TITLES[kind]} onClose={onCancel}>
			<form onSubmit={submit} className="create-form">
				<input
					autoFocus
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="Name"
				/>
				{needsStyle && (
					<IconColorPicker
						vaultPath={vaultPath}
						envPath={envPath}
						icon={icon}
						iconKind={iconKind}
						color={color}
						onIconChange={(i, k) => {
							setIcon(i);
							setIconKind(k);
						}}
						onColorChange={setColor}
					/>
				)}
				<div className="modal-actions">
					<button type="button" onClick={onCancel}>
						Cancel
					</button>
					<button type="submit" className="primary">
						Create
					</button>
				</div>
			</form>
		</Modal>
	);
}
