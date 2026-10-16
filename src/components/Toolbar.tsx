import type { Editor } from "@tiptap/react";

interface Props {
	editor: Editor;
}

// Google-Docs-style formatting ribbon, driven directly by Tiptap commands -
// the editor itself renders the formatting live, this just triggers it.
export function Toolbar({ editor }: Props) {
	const chain = () => editor.chain().focus();

	function setLink() {
		const previous = editor.getAttributes("link").href as string | undefined;
		const url = window.prompt("Link URL", previous ?? "https://");
		if (url === null) return;
		if (url === "") {
			chain().unsetLink().run();
			return;
		}
		chain().setLink({ href: url }).run();
	}

	return (
		<div className="toolbar-formatting">
			<button title="Heading 1" onClick={() => chain().toggleHeading({ level: 1 }).run()}>
				H1
			</button>
			<button title="Heading 2" onClick={() => chain().toggleHeading({ level: 2 }).run()}>
				H2
			</button>
			<button title="Heading 3" onClick={() => chain().toggleHeading({ level: 3 }).run()}>
				H3
			</button>
			<span className="toolbar-divider" />
			<button title="Bold (Ctrl+B)" onClick={() => chain().toggleBold().run()}>
				<strong>B</strong>
			</button>
			<button title="Italic (Ctrl+I)" onClick={() => chain().toggleItalic().run()}>
				<em>I</em>
			</button>
			<button title="Strikethrough" onClick={() => chain().toggleStrike().run()}>
				<s>S</s>
			</button>
			<button title="Inline code" onClick={() => chain().toggleCode().run()}>
				{"</>"}
			</button>
			<span className="toolbar-divider" />
			<button title="Quote" onClick={() => chain().toggleBlockquote().run()}>
				“ ”
			</button>
			<button title="Bullet list" onClick={() => chain().toggleBulletList().run()}>
				• —
			</button>
			<button title="Numbered list" onClick={() => chain().toggleOrderedList().run()}>
				1. —
			</button>
			<span className="toolbar-divider" />
			<button title="Code block" onClick={() => chain().toggleCodeBlock().run()}>
				{"{ }"}
			</button>
			<button title="Link" onClick={setLink}>
				🔗
			</button>
			<button title="Horizontal rule" onClick={() => chain().setHorizontalRule().run()}>
				―
			</button>
		</div>
	);
}
