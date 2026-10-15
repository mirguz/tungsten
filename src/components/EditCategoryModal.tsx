import { useState } from "react";
import { IconColorPicker } from "./IconColorPicker";
import { Modal } from "./Modal";
import type { CategoryMeta } from "../lib/vault";

interface Props {
  vaultPath: string;
  envPath: string;
  initial: CategoryMeta;
  onCancel: () => void;
  onSave: (meta: CategoryMeta) => void;
}

export function EditCategoryModal({ vaultPath, envPath, initial, onCancel, onSave }: Props) {
  const [icon, setIcon] = useState(initial.icon);
  const [iconKind, setIconKind] = useState(initial.iconKind);
  const [color, setColor] = useState(initial.color);

  return (
    <Modal title="Edit Category Style" onClose={onCancel}>
      <div className="create-form">
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
        <div className="modal-actions">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="primary" onClick={() => onSave({ icon, iconKind, color })}>
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
