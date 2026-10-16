import { useEffect, useRef, useState } from "react";
import type { Theme } from "./App";
import type { AccentId } from "./lib/accent";
import { AppMenuBar, type MenuDef } from "./components/AppMenuBar";
import { CategoryPanel } from "./components/CategoryPanel";
import { ContextMenu, type ContextMenuItem } from "./components/ContextMenu";
import { CreateModal, type CreateData, type CreateKind } from "./components/CreateModal";
import { CustomizationModal } from "./components/CustomizationModal";
import { EditCategoryModal } from "./components/EditCategoryModal";
import { EditorGroup, type NoteBuffer, type Pane } from "./components/EditorGroup";
import { EnvironmentDrawer } from "./components/EnvironmentDrawer";
import { IconRail, type RailDropPayload } from "./components/IconRail";
import { SettingsModal } from "./components/SettingsModal";
import type { TreeDropPayload } from "./components/Tree";
import type { DraftEntry } from "./components/DraftEntryRow";
import {
  EMPTY_NAV,
  ancestorCategory,
  categories,
  environments,
  findFolder,
  fullOrder,
  navBack,
  navCurrent,
  navForward,
  navPush,
  reorder,
} from "./lib/tree";
import {
  createFolder,
  createNote,
  deleteEntry,
  exportEnvironment,
  importEnvironment,
  moveEntry,
  pickFolder,
  readCustomCss,
  readEnvironmentMeta,
  readNote,
  readVaultTree,
  writeCustomCss,
  writeEnvironmentMeta,
  writeNote,
  type CategoryMeta,
  type EnvironmentMeta,
  type TreeNode,
} from "./lib/vault";

const ACTIVE_ENV_KEY = "tungsten.activeEnvPath";
const PANEL_WIDTH_KEY = "tungsten.categoryPanelWidth";
const TOOLBAR_KEY = "tungsten.toolbarVisible";
const RAIL_WIDTH = 60;
const MIN_EDITOR_WIDTH = 280;
const AUTOSAVE_DELAY_MS = 500;

const EMPTY_META: EnvironmentMeta = { categories: {}, order: {} };

function newPane(): Pane {
  return { tabs: [], active: null, nav: EMPTY_NAV };
}

interface Props {
  vaultPath: string;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  accent: AccentId;
  onAccentChange: (accent: AccentId) => void;
  onChangeVault: () => void;
  onForgetVault: () => void;
}

interface PendingContextMenu {
  x: number;
  y: number;
  node: TreeNode | null; // null = the panel's empty background
  parentPath: string;
}

export function Workspace({
  vaultPath,
  theme,
  onThemeChange,
  accent,
  onAccentChange,
  onChangeVault,
  onForgetVault,
}: Props) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [activeEnvPath, setActiveEnvPath] = useState<string | null>(() =>
    localStorage.getItem(ACTIVE_ENV_KEY),
  );
  const [drawerOpen, setDrawerOpen] = useState(() => !localStorage.getItem(ACTIVE_ENV_KEY));
  const [activeCategoryPath, setActiveCategoryPath] = useState<string | null>(null);
  const [categoryPanelOpen, setCategoryPanelOpen] = useState(false);
  const [categoryPanelWidth, setCategoryPanelWidth] = useState(
    () => Number(localStorage.getItem(PANEL_WIDTH_KEY)) || 260,
  );
  const [environmentMeta, setEnvironmentMeta] = useState<EnvironmentMeta>(EMPTY_META);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [panes, setPanes] = useState<Pane[]>([newPane()]);
  const [focusedPane, setFocusedPane] = useState(0);
  const [buffers, setBuffers] = useState<Record<string, NoteBuffer>>({});
  const [toolbarVisible, setToolbarVisible] = useState(
    () => localStorage.getItem(TOOLBAR_KEY) !== "0",
  );
  const [modal, setModal] = useState<CreateKind | null>(null);
  const [draft, setDraft] = useState<DraftEntry | null>(null);
  const [contextMenu, setContextMenu] = useState<PendingContextMenu | null>(null);
  const [simpleContextMenu, setSimpleContextMenu] = useState<
    { x: number; y: number; path: string; label: string } | null
  >(null);
  const [categoryContextMenu, setCategoryContextMenu] = useState<{ x: number; y: number; path: string } | null>(
    null,
  );
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  const [customizationOpen, setCustomizationOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [customCss, setCustomCss] = useState("");

  const buffersRef = useRef(buffers);
  buffersRef.current = buffers;
  const rangeAnchor = useRef<string | null>(null);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  async function reloadTree() {
    const next = await readVaultTree(vaultPath);
    setTree(next);
    return next;
  }

  useEffect(() => {
    reloadTree();
    // vaultPath is the only thing that should trigger a full re-scan.
  }, [vaultPath]);

  useEffect(() => {
    readCustomCss(vaultPath).then(setCustomCss);
  }, [vaultPath]);

  // If the remembered Environment got deleted/renamed outside the app, fall
  // back to the drawer instead of showing an empty workspace.
  useEffect(() => {
    if (tree.length === 0) return;
    if (activeEnvPath && !findFolder(tree, activeEnvPath)) {
      setActiveEnvPath(null);
      setDrawerOpen(true);
    }
    // Only re-check when the tree reloads, not on every activeEnvPath change
    // (selectEnvironment already keeps the two in sync).
  }, [tree]);

  useEffect(() => {
    if (!activeEnvPath) {
      setEnvironmentMeta(EMPTY_META);
      return;
    }
    readEnvironmentMeta(vaultPath, activeEnvPath).then(setEnvironmentMeta);
  }, [vaultPath, activeEnvPath]);

  // Keeps the sidebar/editor split from ever pushing the window wider than
  // the viewport - resize preference is kept, just clamped for display.
  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Mouse buttons 4/5 (back/forward, e.g. a thumb button) navigate the
  // focused pane's history, browser-style. Re-subscribed every render so
  // the closures below always see the current pane/tree state.
  useEffect(() => {
    function onMouseUp(e: MouseEvent) {
      if (e.button === 3) {
        e.preventDefault();
        goBack(focusedPane);
      } else if (e.button === 4) {
        e.preventDefault();
        goForward(focusedPane);
      }
    }
    window.addEventListener("mouseup", onMouseUp);
    return () => window.removeEventListener("mouseup", onMouseUp);
  });

  // Delete key removes the current multi-selection, unless focus is in a
  // text field (Delete is also a normal editing key there). Re-subscribed
  // every render so deleteSelected always closes over current state.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Delete" || selected.size === 0) return;
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      deleteSelected([...selected]);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const envNode = activeEnvPath ? findFolder(tree, activeEnvPath) : null;
  const categoryList = envNode ? applyCategoryOrder(categories(envNode), environmentMeta.order, activeEnvPath!) : [];
  const activeCategoryNode = activeCategoryPath ? findFolder(tree, activeCategoryPath) : null;
  const openPaths = new Set(panes.map((p) => p.active).filter((p): p is string => p !== null));
  const effectivePanelWidth = Math.min(
    categoryPanelWidth,
    Math.max(160, (viewportWidth - RAIL_WIDTH - MIN_EDITOR_WIDTH) / (panes.length === 2 ? 1.3 : 1)),
  );

  function selectEnvironment(path: string) {
    localStorage.setItem(ACTIVE_ENV_KEY, path);
    setActiveEnvPath(path);
    setActiveCategoryPath(null);
    setCategoryPanelOpen(false);
    setSelected(new Set());
    setPanes([newPane()]);
    setFocusedPane(0);
    setDrawerOpen(false);
  }

  function selectCategory(path: string) {
    if (path === activeCategoryPath) {
      setCategoryPanelOpen((open) => !open);
    } else {
      setActiveCategoryPath(path);
      setCategoryPanelOpen(true);
      setSelected(new Set());
    }
  }

  function resizeCategoryPanel(width: number) {
    setCategoryPanelWidth(width);
    localStorage.setItem(PANEL_WIDTH_KEY, String(width));
  }

  function toggleToolbar() {
    setToolbarVisible((visible) => {
      localStorage.setItem(TOOLBAR_KEY, visible ? "0" : "1");
      return !visible;
    });
  }

  // The one way anything (sidebar, breadcrumb, folder view, tabs) navigates
  // within a pane: loads the note if needed, opens/focuses its tab, shows a
  // folder listing instead if the path is a folder, and records history.
  async function openInPane(paneIndex: number, path: string) {
    const folderNode = findFolder(tree, path);
    if (!folderNode && !buffersRef.current[path]) {
      const text = await readNote(vaultPath, path);
      setBuffers((b) => ({ ...b, [path]: { content: text, dirty: false } }));
    }
    if (envNode) {
      const category = ancestorCategory(categories(envNode), path);
      if (category) {
        setActiveCategoryPath(category);
        setCategoryPanelOpen(true);
      }
    }
    setPanes((prev) =>
      prev.map((p, i) => {
        if (i !== paneIndex) return p;
        const tabs = p.tabs.includes(path) ? p.tabs : [...p.tabs, path];
        return { ...p, tabs, active: path, nav: navPush(p.nav, path) };
      }),
    );
    setFocusedPane(paneIndex);
  }

  function closeTab(paneIndex: number, path: string) {
    setPanes((prev) =>
      prev.map((p, i) => {
        if (i !== paneIndex) return p;
        const tabs = p.tabs.filter((t) => t !== path);
        const active = p.active === path ? (tabs[tabs.length - 1] ?? null) : p.active;
        return { ...p, tabs, active };
      }),
    );
  }

  function applyPaneNav(paneIndex: number, nav: Pane["nav"]) {
    const path = navCurrent(nav);
    if (!path) return;
    setPanes((prev) => prev.map((p, i) => (i === paneIndex ? { ...p, active: path, nav } : p)));
    if (envNode) {
      const category = ancestorCategory(categories(envNode), path);
      if (category) {
        setActiveCategoryPath(category);
        setCategoryPanelOpen(true);
      }
    }
    setFocusedPane(paneIndex);
  }

  function goBack(paneIndex: number) {
    applyPaneNav(paneIndex, navBack(panes[paneIndex].nav));
  }

  function goForward(paneIndex: number) {
    applyPaneNav(paneIndex, navForward(panes[paneIndex].nav));
  }

  function splitPane() {
    setPanes((prev) => {
      if (prev.length === 2) return prev;
      const current = prev[0];
      const dup: Pane = current.active
        ? { tabs: [current.active], active: current.active, nav: navPush(EMPTY_NAV, current.active) }
        : newPane();
      return [...prev, dup];
    });
    setFocusedPane(1);
  }

  function closePane(paneIndex: number) {
    setPanes((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== paneIndex)));
    setFocusedPane(0);
  }

  // Debounced autosave: writes 500ms after the last keystroke in a given
  // note, independent of which pane/tab is currently focused.
  function updateContent(path: string, text: string) {
    setBuffers((b) => ({ ...b, [path]: { content: text, dirty: true } }));
    clearTimeout(saveTimers.current[path]);
    saveTimers.current[path] = setTimeout(() => void saveNote(path), AUTOSAVE_DELAY_MS);
  }

  async function saveNote(path: string) {
    const buffer = buffersRef.current[path];
    if (!buffer) return;
    await writeNote(vaultPath, path, buffer.content);
    setBuffers((b) => (b[path] ? { ...b, [path]: { ...b[path], dirty: false } } : b));
  }

  function saveNow(path: string) {
    clearTimeout(saveTimers.current[path]);
    void saveNote(path);
  }

  async function handleCreate(data: CreateData) {
    if (modal === "environment") {
      const path = await createFolder(vaultPath, "", data.name);
      await reloadTree();
      selectEnvironment(path);
    } else if (modal === "category" && activeEnvPath) {
      const path = await createFolder(vaultPath, activeEnvPath, data.name);
      const nextMeta: EnvironmentMeta = {
        ...environmentMeta,
        categories: {
          ...environmentMeta.categories,
          [path]: { icon: data.icon!, iconKind: data.iconKind!, color: data.color! },
        },
      };
      await writeEnvironmentMeta(vaultPath, activeEnvPath, nextMeta);
      setEnvironmentMeta(nextMeta);
      await reloadTree();
      setActiveCategoryPath(path);
      setCategoryPanelOpen(true);
    }
    setModal(null);
  }

  function openDraft(kind: "note" | "folder", parentPath: string) {
    setDraft({ kind, parentPath });
  }

  async function submitDraft(name: string) {
    if (!draft) return;
    if (draft.kind === "note") {
      const path = await createNote(vaultPath, draft.parentPath, name);
      await reloadTree();
      setDraft(null);
      await openInPane(focusedPane, path);
    } else {
      await createFolder(vaultPath, draft.parentPath, name);
      await reloadTree();
      setDraft(null);
    }
  }

  async function handleImportEnvironment() {
    const source = await pickFolder();
    if (!source) return;
    try {
      await importEnvironment(vaultPath, source);
      await reloadTree();
    } catch (err) {
      window.alert(String(err));
    }
  }

  async function handleExportEnvironment(envPath: string) {
    const dest = await pickFolder();
    if (!dest) return;
    try {
      await exportEnvironment(vaultPath, envPath, dest);
    } catch (err) {
      window.alert(String(err));
    }
  }

  async function saveCustomCss(css: string) {
    await writeCustomCss(vaultPath, css);
    setCustomCss(css);
    setCustomizationOpen(false);
  }

  // "Reset settings" forgets localStorage (theme/accent/layout/vault) and
  // drops back to the vault picker; "delete vault data" removes every
  // top-level entry the tree already has loaded, reusing the same
  // deleteEntry the Delete key uses - no new backend command needed.
  async function handleReset(doResetSettings: boolean, doDeleteVaultData: boolean) {
    if (!doResetSettings && !doDeleteVaultData) return;
    const actions = [
      doDeleteVaultData && "permanently delete everything in this vault",
      doResetSettings && "reset all app settings and forget this vault",
    ].filter(Boolean);
    if (!confirm(`This will ${actions.join(" and ")}. This can't be undone. Continue?`)) return;

    if (doDeleteVaultData) {
      for (const node of tree) await deleteEntry(vaultPath, node.path);
    }
    if (doResetSettings) {
      localStorage.clear();
      setSettingsOpen(false);
      onForgetVault();
    } else {
      setSettingsOpen(false);
      await reloadTree();
    }
  }

  async function updateOrder(parentPath: string, newSeq: string[]) {
    if (!activeEnvPath) return;
    const nextMeta: EnvironmentMeta = {
      ...environmentMeta,
      order: { ...environmentMeta.order, [parentPath]: newSeq },
    };
    setEnvironmentMeta(nextMeta);
    await writeEnvironmentMeta(vaultPath, activeEnvPath, nextMeta);
    await reloadTree();
  }

  async function saveCategoryStyle(path: string, meta: CategoryMeta) {
    if (!activeEnvPath) return;
    const nextMeta: EnvironmentMeta = {
      ...environmentMeta,
      categories: { ...environmentMeta.categories, [path]: meta },
    };
    setEnvironmentMeta(nextMeta);
    await writeEnvironmentMeta(vaultPath, activeEnvPath, nextMeta);
    setEditingCategory(null);
  }

  function handleRailReorder({ draggedPath, targetPath, position }: RailDropPayload) {
    if (!envNode || !activeEnvPath) return;
    const seq = fullOrder(categories(envNode), environmentMeta.order, activeEnvPath);
    const name = draggedPath.split("/").pop()!;
    const targetName = targetPath.split("/").pop()!;
    void updateOrder(activeEnvPath, reorder(seq, name, targetName, position));
  }

  async function handleTreeDrop({
    draggedPath,
    draggedParentPath,
    targetPath,
    targetParentPath,
    position,
  }: TreeDropPayload) {
    if (draggedPath === targetPath) return;
    const name = draggedPath.split("/").pop()!;

    if (position === "inside") {
      try {
        await moveEntry(vaultPath, draggedPath, `${targetPath}/${name}`);
        await reloadTree();
      } catch (err) {
        alert(String(err));
      }
      return;
    }

    if (draggedParentPath === targetParentPath) {
      const parentNode = findFolder(tree, targetParentPath);
      if (!parentNode) return;
      const seq = fullOrder(parentNode.children, environmentMeta.order, targetParentPath);
      const targetName = targetPath.split("/").pop()!;
      await updateOrder(targetParentPath, reorder(seq, name, targetName, position));
      return;
    }

    const newPath = targetParentPath ? `${targetParentPath}/${name}` : name;
    try {
      await moveEntry(vaultPath, draggedPath, newPath);
    } catch (err) {
      alert(String(err));
      return;
    }
    const parentNode = findFolder(tree, targetParentPath);
    const baseSeq = parentNode ? fullOrder(parentNode.children, environmentMeta.order, targetParentPath) : [];
    const targetName = targetPath.split("/").pop()!;
    await updateOrder(targetParentPath, reorder([...baseSeq, name], name, targetName, position));
  }

  function toggleSelect(path: string, additive: boolean) {
    rangeAnchor.current = path;
    setSelected((prev) => {
      if (!additive) return new Set([path]);
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  // Shift-click range select is scoped to siblings under the same parent -
  // matching the common case (select several files in one folder) without
  // needing to track every folder's expanded/collapsed state to flatten a
  // whole-tree visible order.
  function rangeSelect(siblingPaths: string[], clickedPath: string) {
    const anchor = rangeAnchor.current;
    if (!anchor || !siblingPaths.includes(anchor)) {
      toggleSelect(clickedPath, false);
      return;
    }
    const a = siblingPaths.indexOf(anchor);
    const b = siblingPaths.indexOf(clickedPath);
    const [lo, hi] = a < b ? [a, b] : [b, a];
    setSelected(new Set(siblingPaths.slice(lo, hi + 1)));
  }

  async function deleteSelected(paths: string[]) {
    if (paths.length === 0) return;
    const label = paths.length === 1 ? paths[0].split("/").pop() : `${paths.length} items`;
    if (!confirm(`Delete ${label}? This can't be undone.`)) return;
    for (const path of paths) {
      await deleteEntry(vaultPath, path);
    }
    const isDeleted = (p: string | null) => p !== null && paths.some((d) => p === d || p.startsWith(`${d}/`));
    setPanes((prev) =>
      prev.map((pane) => {
        const tabs = pane.tabs.filter((t) => !isDeleted(t));
        const active = pane.active && isDeleted(pane.active) ? (tabs[tabs.length - 1] ?? null) : pane.active;
        return { ...pane, tabs, active };
      }),
    );
    setBuffers((b) => {
      const next = { ...b };
      for (const key of Object.keys(next)) if (isDeleted(key)) delete next[key];
      return next;
    });
    setSelected(new Set());

    if (isDeleted(activeEnvPath)) {
      localStorage.removeItem(ACTIVE_ENV_KEY);
      setActiveEnvPath(null);
      setActiveCategoryPath(null);
      setCategoryPanelOpen(false);
      setPanes([newPane()]);
      setFocusedPane(0);
      setDrawerOpen(true);
    } else if (isDeleted(activeCategoryPath)) {
      setActiveCategoryPath(null);
      setCategoryPanelOpen(false);
    }
    await reloadTree();
  }

  function openContextMenu(e: React.MouseEvent, node: TreeNode | null, parentPath: string) {
    if (node && !selected.has(node.path)) setSelected(new Set([node.path]));
    setContextMenu({ x: e.clientX, y: e.clientY, node, parentPath });
  }

  // Shared by the Environments drawer and the category rail: both just
  // offer a single "Delete <path>" action.
  function openDeleteContextMenu(e: React.MouseEvent, path: string, label: string) {
    setSimpleContextMenu({ x: e.clientX, y: e.clientY, path, label });
  }

  function contextMenuItems(): ContextMenuItem[] {
    if (!contextMenu) return [];
    const { node, parentPath } = contextMenu;
    const targetFolder = node?.type === "folder" ? node.path : parentPath;
    const items: ContextMenuItem[] = [
      { label: "New Note", onSelect: () => openDraft("note", targetFolder) },
      { label: "New Folder", onSelect: () => openDraft("folder", targetFolder) },
    ];
    if (node) {
      const targets = selected.has(node.path) && selected.size > 1 ? [...selected] : [node.path];
      items.push({ label: "Delete", danger: true, onSelect: () => deleteSelected(targets) });
    }
    return items;
  }

  const menus: MenuDef[] = [
    { label: "Settings", onClick: () => setSettingsOpen(true) },
    { label: "View", onClick: () => setCustomizationOpen(true) },
  ];

  return (
    <div className="app-shell">
      {customCss && <style>{customCss}</style>}
      <AppMenuBar menus={menus} />
      {customizationOpen && (
        <CustomizationModal
          theme={theme}
          onThemeChange={onThemeChange}
          accent={accent}
          onAccentChange={onAccentChange}
          initial={customCss}
          onSave={saveCustomCss}
          onCancel={() => setCustomizationOpen(false)}
        />
      )}
      {settingsOpen && (
        <SettingsModal
          vaultPath={vaultPath}
          environments={environments(tree)}
          onChangeVault={onChangeVault}
          onImport={() => void handleImportEnvironment()}
          onExport={handleExportEnvironment}
          onReset={(s, v) => void handleReset(s, v)}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      <EnvironmentDrawer
        open={drawerOpen}
        environments={environments(tree)}
        activeEnvPath={activeEnvPath}
        onSelect={selectEnvironment}
        onClose={() => setDrawerOpen(false)}
        onCreate={() => setModal("environment")}
        onContextMenu={(e, path) => openDeleteContextMenu(e, path, "Delete Environment")}
      />
      {modal && (
        <CreateModal
          kind={modal}
          vaultPath={vaultPath}
          envPath={activeEnvPath}
          onCancel={() => setModal(null)}
          onSubmit={handleCreate}
        />
      )}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems()}
          onClose={() => setContextMenu(null)}
        />
      )}
      {simpleContextMenu && (
        <ContextMenu
          x={simpleContextMenu.x}
          y={simpleContextMenu.y}
          items={[
            {
              label: simpleContextMenu.label,
              danger: true,
              onSelect: () => deleteSelected([simpleContextMenu.path]),
            },
          ]}
          onClose={() => setSimpleContextMenu(null)}
        />
      )}
      {categoryContextMenu && (
        <ContextMenu
          x={categoryContextMenu.x}
          y={categoryContextMenu.y}
          items={[
            { label: "Edit Style", onSelect: () => setEditingCategory(categoryContextMenu.path) },
            { label: "Delete Category", danger: true, onSelect: () => deleteSelected([categoryContextMenu.path]) },
          ]}
          onClose={() => setCategoryContextMenu(null)}
        />
      )}
      {editingCategory && activeEnvPath && (
        <EditCategoryModal
          vaultPath={vaultPath}
          envPath={activeEnvPath}
          initial={
            environmentMeta.categories[editingCategory] ?? { icon: "📁", iconKind: "emoji", color: "#4f46e5" }
          }
          onCancel={() => setEditingCategory(null)}
          onSave={(meta) => saveCategoryStyle(editingCategory, meta)}
        />
      )}

      <div className="workspace">
        {activeEnvPath && (
          <IconRail
            vaultPath={vaultPath}
            categories={categoryList}
            meta={environmentMeta.categories}
            activePath={activeCategoryPath}
            onSelect={selectCategory}
            onCreate={() => setModal("category")}
            onReorder={handleRailReorder}
            onContextMenu={(e, path) => setCategoryContextMenu({ x: e.clientX, y: e.clientY, path })}
          />
        )}

        {activeEnvPath && categoryPanelOpen && activeCategoryNode && (
          <CategoryPanel
            category={activeCategoryNode}
            order={environmentMeta.order}
            width={effectivePanelWidth}
            onResize={resizeCategoryPanel}
            selected={selected}
            openPaths={openPaths}
            draft={draft}
            contextMenuPath={contextMenu?.node?.path ?? null}
            onOpenFile={(path) => openInPane(focusedPane, path)}
            onOpenFolder={(path) => openInPane(focusedPane, path)}
            onToggleSelect={toggleSelect}
            onRangeSelect={rangeSelect}
            onContextMenu={openContextMenu}
            onDrop={handleTreeDrop}
            onDraftSubmit={submitDraft}
            onDraftCancel={() => setDraft(null)}
          />
        )}

        <div className="editor-area">
          {panes.map((pane, i) => (
            <EditorGroup
              key={i}
              pane={pane}
              isFocused={focusedPane === i}
              tree={tree}
              buffers={buffers}
              toolbarVisible={toolbarVisible}
              canSplit={panes.length === 1}
              canClose={panes.length === 2}
              canGoBack={pane.nav.index > 0}
              canGoForward={pane.nav.index < pane.nav.stack.length - 1}
              onFocus={() => setFocusedPane(i)}
              onOpenDrawer={() => setDrawerOpen(true)}
              onOpen={(path) => openInPane(i, path)}
              onCloseTab={(path) => closeTab(i, path)}
              onBack={() => goBack(i)}
              onForward={() => goForward(i)}
              onToggleToolbar={toggleToolbar}
              onSplit={splitPane}
              onClosePane={() => closePane(i)}
              onContentChange={updateContent}
              onSave={saveNow}
            />
          ))}
          {panes.length === 0 && (
            <div className="empty-state">
              {activeEnvPath ? "Select or create a note to start writing." : "Pick an Environment to get started."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function applyCategoryOrder(
  cats: ReturnType<typeof categories>,
  order: Record<string, string[]>,
  parentPath: string,
) {
  const sequence = fullOrder(cats, order, parentPath);
  const byName = new Map(cats.map((c) => [c.name, c]));
  return sequence.map((name) => byName.get(name)).filter((c): c is NonNullable<typeof c> => c !== undefined);
}
