mod vault;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            vault::read_vault_tree,
            vault::read_note,
            vault::write_note,
            vault::create_note,
            vault::create_folder,
            vault::read_environment_meta,
            vault::write_environment_meta,
            vault::move_entry,
            vault::delete_entry,
            vault::save_category_icon,
            vault::read_asset_data_url,
            vault::import_environment,
            vault::export_environment,
            vault::read_custom_css,
            vault::write_custom_css,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
