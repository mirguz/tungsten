import { useEffect, useRef, useState } from "react";
import { Tree } from "./components/Tree";
import {
  createFolder,
  createNote,
  readNote,
  readVaultTree,
  writeNote,
  type TreeNode,
} from "./lib/vault";

const SIDEBAR_WIDTH_KEY = "tungsten.sidebarWidth";
const MIN_SIDEBAR_WIDTH = 160;
const MAX_SIDEBAR_WIDTH = 480;

interface Props {
  vaultPath: string;
}

export function Workspace({ vaultPath }: Props) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(
    () => Number(localStorage.getItem(SIDEBAR_WIDTH_KEY)) || 240,
  );
  const resizing = useRef(false);

  const reloadTree = () => readVaultTree(vaultPath).then(setTree);

  useEffect(() => {
    reloadTree();
    // reloadTree is stable enough for this component's lifetime; vaultPath
    // is the only thing that should trigger a re-scan.
  }, [vaultPath]);

  useEffect(() => {
    if (!selectedPath) return;
    readNote(vaultPath, selectedPath).then((text) => {
      setContent(text);
      setDirty(false);
    });
  }, [vaultPath, selectedPath]);

  async function save() {
    if (!selectedPath) return;
    await writeNote(vaultPath, selectedPath, content);
    setDirty(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      save();
    }
  }

  async function onNewNote() {
    const name = prompt("New note name:");
    if (!name) return;
    const path = await createNote(vaultPath, "", name);
    await reloadTree();
    setSelectedPath(path);
  }

  async function onNewFolder() {
    const name = prompt("New Environment (folder) name:");
    if (!name) return;
    await createFolder(vaultPath, "", name);
    await reloadTree();
  }

  // Drag-to-resize the sidebar. Plain mouse events, no library needed for
  // something this small.
  function startResize(e: React.MouseEvent) {
    e.preventDefault();
    resizing.current = true;
    const onMove = (ev: MouseEvent) => {
      if (!resizing.current) return;
      const width = Math.min(
        MAX_SIDEBAR_WIDTH,
        Math.max(MIN_SIDEBAR_WIDTH, ev.clientX),
      );
      setSidebarWidth(width);
    };
    const onUp = () => {
      resizing.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <div className="workspace">
      {sidebarOpen && (
        <aside className="sidebar" style={{ width: sidebarWidth }}>
          <div className="sidebar-actions">
            <button onClick={onNewNote} title="New note">
              + Note
            </button>
            <button onClick={onNewFolder} title="New Environment">
              + Environment
            </button>
          </div>
          <Tree nodes={tree} selectedPath={selectedPath} onSelect={setSelectedPath} />
          <div className="resize-handle" onMouseDown={startResize} />
        </aside>
      )}
      <main className="editor-pane">
        <div className="toolbar">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          </button>
          {selectedPath && (
            <>
              <span className="note-title">{selectedPath}</span>
              <button onClick={save} disabled={!dirty}>
                {dirty ? "Save*" : "Saved"}
              </button>
            </>
          )}
        </div>
        {selectedPath ? (
          <textarea
            className="editor"
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setDirty(true);
            }}
            onKeyDown={onKeyDown}
            spellCheck={false}
          />
        ) : (
          <div className="empty-state">Select or create a note to start writing.</div>
        )}
      </main>
    </div>
  );
}
