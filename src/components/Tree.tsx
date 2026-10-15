import { useState } from "react";
import type { TreeNode } from "../lib/vault";

interface Props {
  nodes: TreeNode[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

interface ItemProps {
  node: TreeNode;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

// Renders folders (Environments) and markdown files recursively.
// Folders start open since vaults are expected to be small/shallow at first.
export function Tree({ nodes, selectedPath, onSelect }: Props) {
  return (
    <ul className="tree">
      {nodes.map((node) => (
        <TreeItem
          key={node.path}
          node={node}
          selectedPath={selectedPath}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
}

function TreeItem({ node, selectedPath, onSelect }: ItemProps) {
  const [open, setOpen] = useState(true);

  if (node.type === "file") {
    return (
      <li>
        <button
          className={`tree-item file ${node.path === selectedPath ? "selected" : ""}`}
          onClick={() => onSelect(node.path)}
        >
          {node.name}
        </button>
      </li>
    );
  }

  return (
    <li>
      <button className="tree-item folder" onClick={() => setOpen(!open)}>
        {open ? "▾" : "▸"} {node.name}
      </button>
      {open && (
        <ul className="tree">
          {node.children.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
