import { describe, expect, it } from "vitest";
import {
	EMPTY_NAV,
	ancestorCategory,
	applyOrder,
	fullOrder,
	navBack,
	navCurrent,
	navForward,
	navPush,
	reorder,
	type FolderNode,
} from "./tree";
import type { TreeNode } from "./vault";

function file(name: string): TreeNode {
	return { type: "file", name, path: name };
}

function folder(path: string): FolderNode {
	return { type: "folder", name: path.split("/").pop()!, path, children: [] };
}

describe("fullOrder", () => {
	it("falls back to alphabetical when nothing has been reordered", () => {
		const nodes = [file("b.md"), file("a.md")];
		expect(fullOrder(nodes, {}, "env")).toEqual(["a.md", "b.md"]);
	});

	it("puts the saved order first and appends new/unlisted files after", () => {
		const nodes = [file("a.md"), file("b.md"), file("c.md")];
		const order = { env: ["c.md", "a.md"] };
		// b.md was created after the order was saved, so it wasn't recorded yet.
		expect(fullOrder(nodes, order, "env")).toEqual(["c.md", "a.md", "b.md"]);
	});

	it("drops saved names that no longer exist as children", () => {
		const nodes = [file("a.md")];
		const order = { env: ["deleted.md", "a.md"] };
		expect(fullOrder(nodes, order, "env")).toEqual(["a.md"]);
	});
});

describe("applyOrder", () => {
	it("sorts the actual node objects to match fullOrder", () => {
		const a = file("a.md");
		const b = file("b.md");
		const sorted = applyOrder([a, b], { env: ["b.md", "a.md"] }, "env");
		expect(sorted).toEqual([b, a]);
	});
});

describe("reorder", () => {
	it("moves a name to sit before the target", () => {
		expect(reorder(["a", "b", "c"], "c", "a", "before")).toEqual(["c", "a", "b"]);
	});

	it("moves a name to sit after the target", () => {
		expect(reorder(["a", "b", "c"], "a", "b", "after")).toEqual(["b", "a", "c"]);
	});

	it("appends at the end when there is no target (dropped inside a folder)", () => {
		expect(reorder(["a", "b"], "a", null, "after")).toEqual(["b", "a"]);
	});
});

describe("ancestorCategory", () => {
	const cats = [folder("Env/Work"), folder("Env/Play")];

	it("finds the category that directly contains a note", () => {
		expect(ancestorCategory(cats, "Env/Work/note.md")).toBe("Env/Work");
	});

	it("finds the category that contains a deeper nested note", () => {
		expect(ancestorCategory(cats, "Env/Work/sub/note.md")).toBe("Env/Work");
	});

	it("returns null for a path outside every category", () => {
		expect(ancestorCategory(cats, "Env/other.md")).toBeNull();
	});
});

describe("nav history", () => {
	it("pushes new visits and lets back/forward move through them", () => {
		let nav = navPush(EMPTY_NAV, "a");
		nav = navPush(nav, "b");
		nav = navPush(nav, "c");
		expect(navCurrent(nav)).toBe("c");

		nav = navBack(nav);
		expect(navCurrent(nav)).toBe("b");

		nav = navForward(nav);
		expect(navCurrent(nav)).toBe("c");
	});

	it("discards the forward branch once you visit somewhere new after going back", () => {
		let nav = navPush(EMPTY_NAV, "a");
		nav = navPush(nav, "b");
		nav = navBack(nav);
		nav = navPush(nav, "z");

		expect(nav.stack).toEqual(["a", "z"]);
		expect(navForward(nav)).toBe(nav); // nothing ahead to go to
	});

	it("does nothing at either end of the history", () => {
		const nav = navPush(EMPTY_NAV, "a");
		expect(navBack(nav)).toBe(nav);
		expect(navForward(nav)).toBe(nav);
	});
});
