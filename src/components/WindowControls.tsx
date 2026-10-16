import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { CloseIcon, MaximizeIcon, MinimizeIcon, RestoreIcon } from "./icons";

const win = getCurrentWindow();

// Custom-drawn caption buttons for the decorations-off window (see
// tauri.conf.json), styled after Windows 11's own - these call the same
// window actions the native buttons would, just from our own row so they
// can sit flush with the menu bar instead of in their own strip above it.
export function WindowControls() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    win.isMaximized().then(setMaximized);
    const unlisten = win.onResized(() => {
      win.isMaximized().then(setMaximized);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return (
    <div className="window-controls">
      <button className="window-control-btn" onClick={() => win.minimize()} aria-label="Minimize">
        <MinimizeIcon />
      </button>
      <button className="window-control-btn" onClick={() => win.toggleMaximize()} aria-label="Maximize">
        {maximized ? <RestoreIcon /> : <MaximizeIcon />}
      </button>
      <button className="window-control-btn close" onClick={() => win.close()} aria-label="Close">
        <CloseIcon />
      </button>
    </div>
  );
}
