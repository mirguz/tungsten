// Vault = a folder the user picked on their own disk. Everything here reads
// and writes plain .md files directly, so "where are my files" is always
// just "wherever the user put them" - no DB, no hidden format.
use base64::Engine;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

/// Whether a category's `icon` is a typed/pasted emoji or a vault-relative
/// path to an uploaded image under that Environment's `.tungsten/icons/`.
#[derive(Serialize, Deserialize, Clone, Default, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum IconKind {
    #[default]
    Emoji,
    Image,
}

/// Per-category display customization, set when the user creates (or later
/// restyles) a category in the UI.
#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CategoryMeta {
    pub icon: String,
    #[serde(default)]
    pub icon_kind: IconKind,
    pub color: String,
}

/// Everything about an Environment that isn't just "files on disk": category
/// styling, plus a manual child order per folder (keyed by that folder's
/// vault-relative path) for drag-to-reorder. A folder with no entry here
/// falls back to alphabetical - the frontend appends newly created entries
/// at the end rather than writing this on every create.
#[derive(Serialize, Deserialize, Clone, Default)]
pub struct EnvironmentMeta {
    #[serde(default)]
    pub categories: HashMap<String, CategoryMeta>,
    #[serde(default)]
    pub order: HashMap<String, Vec<String>>,
}

// Every Environment gets one hidden folder for Tungsten's own data (today:
// style metadata and uploaded icon images) living next to the user's actual
// notes - visible if they go looking, never mistaken for their content.
const TUNGSTEN_DIR: &str = ".tungsten";
const META_FILE: &str = "meta.json";
const ALLOWED_IMAGE_EXTS: &[&str] = &["png", "jpg", "jpeg", "gif", "webp", "svg"];

/// A node in the vault's folder/file tree. Folders are "Environments" in
/// Tungsten's terms; only markdown files are surfaced, everything else
/// (images, .git, lockfiles, ...) is ignored for now.
#[derive(Serialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum TreeNode {
    Folder {
        name: String,
        path: String,
        children: Vec<TreeNode>,
    },
    File {
        name: String,
        path: String,
    },
}

/// Resolves `relative` against `vault_root` and rejects anything that would
/// escape the vault (e.g. "../../etc/passwd"). `relative` comes straight
/// from the frontend on every call, so this is the one gate all commands
/// below route through rather than trusting the path as-is.
fn resolve_in_vault(vault_root: &str, relative: &str) -> Result<PathBuf, String> {
    let root = fs::canonicalize(vault_root).map_err(|e| e.to_string())?;
    let candidate = root.join(relative.trim_start_matches(['/', '\\']));

    // canonicalize() requires the path to exist, so for a not-yet-created
    // target (a new note, or a nested ".tungsten/icons/..." path where
    // several levels in a row might not exist yet) we walk up to the
    // nearest existing ancestor, canonicalize that, then re-attach
    // whichever trailing components don't exist yet.
    let mut missing = Vec::new();
    let mut existing = candidate.as_path();
    while !existing.exists() {
        missing.push(existing.file_name().ok_or("invalid path")?.to_owned());
        existing = existing.parent().ok_or("invalid path")?;
    }
    let mut resolved = fs::canonicalize(existing).map_err(|e| e.to_string())?;
    for component in missing.iter().rev() {
        resolved.push(component);
    }

    if !resolved.starts_with(&root) {
        return Err("path escapes vault".into());
    }
    Ok(candidate)
}

fn is_markdown(path: &Path) -> bool {
    path.extension()
        .map(|e| e.eq_ignore_ascii_case("md"))
        .unwrap_or(false)
}

fn build_tree(dir: &Path, root: &Path) -> std::io::Result<Vec<TreeNode>> {
    let mut entries: Vec<_> = fs::read_dir(dir)?.filter_map(|e| e.ok()).collect();
    entries.sort_by_key(|e| e.file_name());

    let mut nodes = Vec::new();
    for entry in entries {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') {
            continue; // skip hidden entries (.git, .DS_Store, ...)
        }
        let rel = path
            .strip_prefix(root)
            .unwrap_or(&path)
            .to_string_lossy()
            .replace('\\', "/");

        if path.is_dir() {
            nodes.push(TreeNode::Folder {
                name,
                path: rel,
                children: build_tree(&path, root)?,
            });
        } else if is_markdown(&path) {
            nodes.push(TreeNode::File { name, path: rel });
        }
    }
    Ok(nodes)
}

#[tauri::command]
pub fn read_vault_tree(vault_root: String) -> Result<Vec<TreeNode>, String> {
    let root = fs::canonicalize(&vault_root).map_err(|e| e.to_string())?;
    build_tree(&root, &root).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn read_note(vault_root: String, path: String) -> Result<String, String> {
    let full = resolve_in_vault(&vault_root, &path)?;
    if !is_markdown(&full) {
        return Err("not a markdown file".into());
    }
    fs::read_to_string(full).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_note(vault_root: String, path: String, content: String) -> Result<(), String> {
    let full = resolve_in_vault(&vault_root, &path)?;
    if !is_markdown(&full) {
        return Err("not a markdown file".into());
    }
    fs::write(full, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn read_environment_meta(vault_root: String, env_path: String) -> Result<EnvironmentMeta, String> {
    let rel = format!("{env_path}/{TUNGSTEN_DIR}/{META_FILE}");
    let full = resolve_in_vault(&vault_root, &rel)?;
    if !full.exists() {
        return Ok(EnvironmentMeta::default());
    }
    let raw = fs::read_to_string(full).map_err(|e| e.to_string())?;
    serde_json::from_str(&raw).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_environment_meta(
    vault_root: String,
    env_path: String,
    meta: EnvironmentMeta,
) -> Result<(), String> {
    let dir_rel = format!("{env_path}/{TUNGSTEN_DIR}");
    let dir_full = resolve_in_vault(&vault_root, &dir_rel)?;
    fs::create_dir_all(&dir_full).map_err(|e| e.to_string())?;

    let full = resolve_in_vault(&vault_root, &format!("{env_path}/{TUNGSTEN_DIR}/{META_FILE}"))?;
    let raw = serde_json::to_string_pretty(&meta).map_err(|e| e.to_string())?;
    fs::write(full, raw).map_err(|e| e.to_string())
}

/// Copies a user-picked image (from anywhere on disk, via the native file
/// dialog) into this Environment's `.tungsten/icons/`, so category icons are
/// real files the user can find, back up and move with the rest of the
/// vault - not blobs buried in a JSON file.
#[tauri::command]
pub fn save_category_icon(vault_root: String, env_path: String, source_path: String) -> Result<String, String> {
    let source = Path::new(&source_path);
    let ext = source
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    if !ALLOWED_IMAGE_EXTS.contains(&ext.as_str()) {
        return Err("unsupported image type".into());
    }

    let dir_rel = format!("{env_path}/{TUNGSTEN_DIR}/icons");
    let dir_full = resolve_in_vault(&vault_root, &dir_rel)?;
    fs::create_dir_all(&dir_full).map_err(|e| e.to_string())?;

    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_nanos();
    let rel = format!("{dir_rel}/{nanos}.{ext}");
    let full = resolve_in_vault(&vault_root, &rel)?;
    fs::copy(source, &full).map_err(|e| e.to_string())?;
    Ok(rel)
}

/// Reads any file inside the vault back as a data URL, for displaying
/// uploaded icon images - goes through the same path-safety gate as every
/// other read, rather than opening a separate, unvalidated access route.
#[tauri::command]
pub fn read_asset_data_url(vault_root: String, path: String) -> Result<String, String> {
    let full = resolve_in_vault(&vault_root, &path)?;
    let bytes = fs::read(&full).map_err(|e| e.to_string())?;
    let ext = full
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    let mime = match ext.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        _ => "application/octet-stream",
    };
    let encoded = base64::engine::general_purpose::STANDARD.encode(bytes);
    Ok(format!("data:{mime};base64,{encoded}"))
}

#[tauri::command]
pub fn move_entry(vault_root: String, from: String, to: String) -> Result<(), String> {
    let from_full = resolve_in_vault(&vault_root, &from)?;
    if !from_full.exists() {
        return Err("source does not exist".into());
    }
    let to_full = resolve_in_vault(&vault_root, &to)?;
    if to_full.exists() {
        return Err("a file or folder already exists at the destination".into());
    }
    if from_full.is_dir() && to_full.starts_with(&from_full) {
        return Err("can't move a folder inside itself".into());
    }
    fs::rename(from_full, to_full).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_entry(vault_root: String, path: String) -> Result<(), String> {
    let full = resolve_in_vault(&vault_root, &path)?;
    if full.is_dir() {
        fs::remove_dir_all(full).map_err(|e| e.to_string())
    } else {
        fs::remove_file(full).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn create_note(vault_root: String, parent: String, name: String) -> Result<String, String> {
    if parent.is_empty() {
        return Err("notes must be created inside an Environment".into());
    }
    let file_name = if name.ends_with(".md") {
        name
    } else {
        format!("{name}.md")
    };
    let rel = if parent.is_empty() {
        file_name
    } else {
        format!("{parent}/{file_name}")
    };
    let full = resolve_in_vault(&vault_root, &rel)?;
    if full.exists() {
        return Err("a file with that name already exists".into());
    }
    fs::write(&full, "").map_err(|e| e.to_string())?;
    Ok(rel)
}

#[tauri::command]
pub fn create_folder(vault_root: String, parent: String, name: String) -> Result<String, String> {
    let rel = if parent.is_empty() {
        name.clone()
    } else {
        format!("{parent}/{name}")
    };
    let full = resolve_in_vault(&vault_root, &rel)?;
    if full.exists() {
        return Err("a folder with that name already exists".into());
    }
    fs::create_dir(&full).map_err(|e| e.to_string())?;
    Ok(rel)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    /// Creates a fresh temp dir the test owns and removes on drop, so tests
    /// don't need an external crate just to sandbox the filesystem.
    struct TempDir(PathBuf);

    impl TempDir {
        fn new() -> Self {
            let nanos = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos();
            let path = std::env::temp_dir().join(format!("tungsten_test_{nanos}"));
            fs::create_dir_all(&path).unwrap();
            TempDir(path)
        }
    }

    impl Drop for TempDir {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    #[test]
    fn resolve_in_vault_allows_path_inside_root() {
        let dir = TempDir::new();
        fs::write(dir.0.join("note.md"), "hi").unwrap();

        let resolved = resolve_in_vault(dir.0.to_str().unwrap(), "note.md").unwrap();
        assert_eq!(resolved.file_name().unwrap(), "note.md");
    }

    #[test]
    fn resolve_in_vault_allows_several_missing_levels_at_once() {
        let dir = TempDir::new();
        // Neither "sub" nor "deeper" exist yet - this is exactly the shape
        // of a fresh Environment's ".tungsten/icons/<file>" path. Compared
        // by suffix, not exact equality: canonicalize() prefixes `\\?\` on
        // Windows, which callers tolerate but a raw string compare wouldn't.
        let resolved = resolve_in_vault(dir.0.to_str().unwrap(), "sub/deeper/file.png").unwrap();
        assert!(resolved.ends_with("sub/deeper/file.png")); // Path::ends_with compares components, not raw text
    }

    #[test]
    fn resolve_in_vault_rejects_path_traversal() {
        let dir = TempDir::new();
        // Escaping one level up lands in temp_dir's parent, which exists,
        // so this reaches the starts_with() check instead of failing
        // earlier on a nonexistent intermediate directory.
        fs::write(dir.0.parent().unwrap().join("sibling.md"), "").unwrap();
        let path = dir.0.parent().unwrap().join("sibling.md");

        let err = resolve_in_vault(dir.0.to_str().unwrap(), "../sibling.md").unwrap_err();
        assert_eq!(err, "path escapes vault");

        let _ = fs::remove_file(path);
    }

    #[test]
    fn resolve_in_vault_rejects_traversal_for_not_yet_created_files() {
        let dir = TempDir::new();

        // create_note/create_folder hit this branch since the target
        // doesn't exist yet - it must be guarded the same as the other one.
        let err = resolve_in_vault(dir.0.to_str().unwrap(), "../outside.md").unwrap_err();
        assert_eq!(err, "path escapes vault");
    }

    #[test]
    fn build_tree_lists_markdown_and_skips_the_rest() {
        let dir = TempDir::new();
        fs::write(dir.0.join("a.md"), "").unwrap();
        fs::write(dir.0.join("image.png"), "").unwrap();
        fs::create_dir(dir.0.join(".git")).unwrap();
        fs::create_dir(dir.0.join("sub")).unwrap();
        fs::write(dir.0.join("sub/b.md"), "").unwrap();

        let tree = build_tree(&dir.0, &dir.0).unwrap();
        let names: Vec<&str> = tree
            .iter()
            .map(|n| match n {
                TreeNode::Folder { name, .. } => name.as_str(),
                TreeNode::File { name, .. } => name.as_str(),
            })
            .collect();

        assert_eq!(names, vec!["a.md", "sub"]); // sorted, png/.git skipped
    }

    #[test]
    fn create_note_rejects_empty_parent() {
        let dir = TempDir::new();

        let err = create_note(dir.0.to_str().unwrap().into(), "".into(), "note".into())
            .unwrap_err();
        assert_eq!(err, "notes must be created inside an Environment");
    }

    #[test]
    fn environment_meta_round_trips_through_the_hidden_file() {
        let dir = TempDir::new();
        fs::create_dir(dir.0.join("env")).unwrap();
        let mut meta = EnvironmentMeta::default();
        meta.categories.insert(
            "env/work".to_string(),
            CategoryMeta {
                icon: "📁".into(),
                icon_kind: IconKind::Emoji,
                color: "#4f46e5".into(),
            },
        );
        meta.order
            .insert("env".to_string(), vec!["work".to_string(), "play".to_string()]);

        write_environment_meta(dir.0.to_str().unwrap().into(), "env".into(), meta).unwrap();
        let read_back =
            read_environment_meta(dir.0.to_str().unwrap().into(), "env".into()).unwrap();

        assert_eq!(read_back.categories["env/work"].icon, "📁");
        assert_eq!(read_back.order["env"], vec!["work", "play"]);
    }

    #[test]
    fn read_environment_meta_defaults_when_file_is_missing() {
        let dir = TempDir::new();
        fs::create_dir(dir.0.join("env")).unwrap();

        let meta = read_environment_meta(dir.0.to_str().unwrap().into(), "env".into()).unwrap();

        assert!(meta.categories.is_empty());
        assert!(meta.order.is_empty());
    }

    #[test]
    fn move_entry_moves_a_file_into_another_folder() {
        let dir = TempDir::new();
        fs::create_dir(dir.0.join("target")).unwrap();
        fs::write(dir.0.join("note.md"), "hi").unwrap();

        move_entry(
            dir.0.to_str().unwrap().into(),
            "note.md".into(),
            "target/note.md".into(),
        )
        .unwrap();

        assert!(!dir.0.join("note.md").exists());
        assert_eq!(fs::read_to_string(dir.0.join("target/note.md")).unwrap(), "hi");
    }

    #[test]
    fn move_entry_rejects_moving_a_folder_into_its_own_descendant() {
        let dir = TempDir::new();
        fs::create_dir(dir.0.join("parent")).unwrap();
        fs::create_dir(dir.0.join("parent/child")).unwrap();

        let err = move_entry(
            dir.0.to_str().unwrap().into(),
            "parent".into(),
            "parent/child/parent".into(),
        )
        .unwrap_err();
        assert_eq!(err, "can't move a folder inside itself");
    }

    #[test]
    fn move_entry_rejects_overwriting_an_existing_destination() {
        let dir = TempDir::new();
        fs::write(dir.0.join("a.md"), "a").unwrap();
        fs::write(dir.0.join("b.md"), "b").unwrap();

        let err = move_entry(dir.0.to_str().unwrap().into(), "a.md".into(), "b.md".into())
            .unwrap_err();
        assert_eq!(err, "a file or folder already exists at the destination");
    }

    #[test]
    fn delete_entry_removes_a_file_and_a_folder_recursively() {
        let dir = TempDir::new();
        fs::write(dir.0.join("a.md"), "").unwrap();
        fs::create_dir(dir.0.join("sub")).unwrap();
        fs::write(dir.0.join("sub/b.md"), "").unwrap();

        delete_entry(dir.0.to_str().unwrap().into(), "a.md".into()).unwrap();
        delete_entry(dir.0.to_str().unwrap().into(), "sub".into()).unwrap();

        assert!(!dir.0.join("a.md").exists());
        assert!(!dir.0.join("sub").exists());
    }

    #[test]
    fn save_category_icon_copies_the_file_into_tungsten_icons() {
        let dir = TempDir::new();
        fs::create_dir(dir.0.join("env")).unwrap();
        let source = dir.0.join("source.png");
        fs::write(&source, b"fake-png-bytes").unwrap();

        let rel = save_category_icon(
            dir.0.to_str().unwrap().into(),
            "env".into(),
            source.to_str().unwrap().into(),
        )
        .unwrap();

        assert!(rel.starts_with("env/.tungsten/icons/"));
        assert!(rel.ends_with(".png"));
        let full = dir.0.join(&rel);
        assert_eq!(fs::read(full).unwrap(), b"fake-png-bytes");
    }

    #[test]
    fn save_category_icon_rejects_non_image_extensions() {
        let dir = TempDir::new();
        fs::create_dir(dir.0.join("env")).unwrap();
        let source = dir.0.join("not-an-image.exe");
        fs::write(&source, b"nope").unwrap();

        let err = save_category_icon(
            dir.0.to_str().unwrap().into(),
            "env".into(),
            source.to_str().unwrap().into(),
        )
        .unwrap_err();
        assert_eq!(err, "unsupported image type");
    }

    #[test]
    fn read_asset_data_url_encodes_bytes_with_the_right_mime_type() {
        let dir = TempDir::new();
        fs::write(dir.0.join("icon.png"), b"fake-png-bytes").unwrap();

        let url = read_asset_data_url(dir.0.to_str().unwrap().into(), "icon.png".into()).unwrap();

        assert!(url.starts_with("data:image/png;base64,"));
    }
}
