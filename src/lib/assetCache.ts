import { readAssetDataUrl } from "./vault";

// Uploaded icon images get a fresh timestamped filename every time
// (save_category_icon in vault.rs), so a path is never reused for
// different content - caching by path for the session's lifetime is safe,
// no invalidation needed.
const cache = new Map<string, Promise<string>>();

export function getAssetDataUrl(vaultPath: string, path: string): Promise<string> {
	const key = `${vaultPath}::${path}`;
	let promise = cache.get(key);
	if (!promise) {
		promise = readAssetDataUrl(vaultPath, path);
		cache.set(key, promise);
	}
	return promise;
}
