import Link from "@tiptap/extension-link";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef } from "react";
import { Markdown, type MarkdownStorage } from "tiptap-markdown";
import { FolderView } from "./FolderView";
import { Toolbar } from "./Toolbar";
import { findFolder } from "../lib/tree";
import type { TreeNode } from "../lib/vault";

export interface NoteBuffer {
	content: string;
	dirty: boolean;
}

export interface Pane {
	tabs: string[];
	active: string | null;
	nav: { stack: string[]; index: number };
}

interface Props {
	pane: Pane;
	isFocused: boolean;
	tree: TreeNode[];
	buffers: Record<string, NoteBuffer>;
	toolbarVisible: boolean;
	canSplit: boolean;
	canClose: boolean;
	canGoBack: boolean;
	canGoForward: boolean;
	onFocus: () => void;
	onOpenDrawer: () => void;
	onOpen: (path: string) => void;
	onCloseTab: (path: string) => void;
	onBack: () => void;
	onForward: () => void;
	onToggleToolbar: () => void;
	onSplit: () => void;
	onClosePane: () => void;
	onContentChange: (path: string, text: string) => void;
	onSave: (path: string) => void;
}

// One VSCode-style editor group: its own tab strip, back/forward history,
// and content area - a live WYSIWYG markdown editor (Tiptap), or a folder
// listing. The explorer sidebar is shared across groups; only this side
// splits.
export function EditorGroup({
	pane,
	isFocused,
	tree,
	buffers,
	toolbarVisible,
	canSplit,
	canClose,
	canGoBack,
	canGoForward,
	onFocus,
	onOpenDrawer,
	onOpen,
	onCloseTab,
	onBack,
	onForward,
	onToggleToolbar,
	onSplit,
	onClosePane,
	onContentChange,
	onSave,
}: Props) {
	const activePath = pane.active;
	const activeFolder = activePath ? findFolder(tree, activePath) : null;
	const buffer = activePath && !activeFolder ? buffers[activePath] : null;
	const loadedPathRef = useRef<string | null>(null);

	const editor = useEditor({
		extensions: [
			StarterKit,
			Link.configure({ openOnClick: false }),
			Markdown.configure({ html: false }),
		],
		content: "",
		onUpdate: ({ editor }) => {
			if (!activePath) return;
			const storage = editor.storage as unknown as { markdown: MarkdownStorage };
			onContentChange(activePath, storage.markdown.getMarkdown());
		},
	});

	// Swap the editor's content when the active note changes - but not on
	// every keystroke, which would reset the caret to the start each time.
	useEffect(() => {
		if (!editor || !buffer || loadedPathRef.current === activePath) return;
		editor.commands.setContent(buffer.content);
		loadedPathRef.current = activePath;
	}, [editor, activePath, buffer]);

	function onKeyDown(e: React.KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && e.key === "s") {
			e.preventDefault();
			if (activePath) onSave(activePath);
		}
	}

	return (
		<div className={`editor-group ${isFocused ? "focused" : ""}`} onMouseDown={onFocus}>
			{pane.tabs.length > 0 && (
				<div className="tab-bar">
					{pane.tabs.map((path) => (
						<div
							key={path}
							className={`tab ${path === activePath ? "active" : ""}`}
							onClick={() => onOpen(path)}
							onMouseDown={(e) => {
								if (e.button === 1) e.preventDefault(); // stop the middle-click autoscroll cursor
							}}
							onAuxClick={(e) => {
								if (e.button === 1) onCloseTab(path);
							}}
						>
							<span className="tab-icon">{findFolder(tree, path) ? "📁" : "📄"}</span>
							<span className="tab-name">{path.split("/").pop()}</span>
							{buffers[path]?.dirty && (
								<span className="tab-dot" title="Unsaved changes" />
							)}
							<button
								className="tab-close"
								aria-label="Close tab"
								onClick={(e) => {
									e.stopPropagation();
									onCloseTab(path);
								}}
							>
								✕
							</button>
						</div>
					))}
				</div>
			)}

			<div className="top-bar">
				<button className="icon-button" onClick={onOpenDrawer} title="Environments">
					☰
				</button>
				<button className="icon-button" onClick={onBack} disabled={!canGoBack} title="Back">
					←
				</button>
				<button
					className="icon-button"
					onClick={onForward}
					disabled={!canGoForward}
					title="Forward"
				>
					→
				</button>
				{activePath ? (
					<Breadcrumb path={activePath} onNavigate={onOpen} />
				) : (
					<div className="breadcrumb" />
				)}
				{buffer && (
					<button
						className="icon-button"
						onClick={onToggleToolbar}
						title={toolbarVisible ? "Hide formatting bar" : "Show formatting bar"}
					>
						{toolbarVisible ? "▾" : "▸"}
					</button>
				)}
				{buffer && (
					<button
						className={`save-button ${buffer.dirty ? "primary" : ""}`}
						onClick={() => onSave(activePath!)}
						disabled={!buffer.dirty}
					>
						{buffer.dirty ? "Save" : "Saved"}
					</button>
				)}
				{canSplit && (
					<button className="icon-button" onClick={onSplit} title="Split right">
						⬓
					</button>
				)}
				{canClose && (
					<button className="icon-button" onClick={onClosePane} title="Close this pane">
						✕
					</button>
				)}
			</div>

			{toolbarVisible && buffer && editor && <Toolbar editor={editor} />}

			{buffer && editor ? (
				<div className="editor-scroll" onKeyDown={onKeyDown}>
					<EditorContent editor={editor} className="editor" />
				</div>
			) : activeFolder ? (
				<FolderView folder={activeFolder} onOpenFolder={onOpen} onOpenFile={onOpen} />
			) : (
				<div className="empty-state">Select or create a note to start writing.</div>
			)}
		</div>
	);
}

function Breadcrumb({ path, onNavigate }: { path: string; onNavigate: (path: string) => void }) {
	const segments = path.split("/");
	let cumulative = "";
	return (
		<div className="breadcrumb">
			{segments.map((segment, i) => {
				cumulative = cumulative ? `${cumulative}/${segment}` : segment;
				const isLast = i === segments.length - 1;
				const target = cumulative;
				return (
					<span key={target}>
						{i > 0 && <span className="breadcrumb-sep"> / </span>}
						{isLast ? (
							<span className="breadcrumb-current">{segment}</span>
						) : (
							<button className="breadcrumb-link" onClick={() => onNavigate(target)}>
								{segment}
							</button>
						)}
					</span>
				);
			})}
		</div>
	);
}
