// Monochrome, theme-aware (currentColor) replacements for the old folder/file
// emoji. Folders read by shape, not color: empty is an outline, full (has
// any children) is a solid closed folder, and open - expanded, a live drag
// target, or the target of its own context menu - is a solid, distinctly
// shaped open folder.
interface IconProps {
  size?: number;
}

export function FolderIcon({ variant, size = 14 }: IconProps & { variant: "empty" | "full" | "open" }) {
  if (variant === "open") {
    return (
      <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
        <path
          d="M1.5 4.5a1 1 0 0 1 1-1h3.1l1.1 1.3h6.3a1 1 0 0 1 .97 1.24l-1.1 4.5a1 1 0 0 1-.97.76H2.5a1 1 0 0 1-1-1v-5.8Z"
          fill="currentColor"
          fillOpacity={0.85}
          stroke="currentColor"
          strokeWidth={1}
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
      <path
        d="M1.5 3.5h4l1.2 1.6h7.3v7.4a.5.5 0 0 1-.5.5h-12a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5Z"
        fill={variant === "full" ? "currentColor" : "none"}
        fillOpacity={variant === "full" ? 0.85 : undefined}
        stroke="currentColor"
        strokeWidth={1.1}
        strokeLinejoin="round"
      />
    </svg>
  );
}

// A plain geometric mark for the menu bar's far-left corner, in the spirit
// of a desktop app's title-bar icon - decorative, not a button.
export function AppIcon({ size = 16 }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
      <path
        d="M8 1.2 14.3 4.9v6.2L8 14.8 1.7 11.1V4.9Z"
        fill="currentColor"
        fillOpacity={0.12}
        stroke="currentColor"
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="2" fill="currentColor" />
    </svg>
  );
}

// Windows 11-style caption glyphs (thin single-stroke lines), for the
// custom-drawn minimize/maximize/restore/close row replacing the native one.
export function MinimizeIcon({ size = 10 }: IconProps) {
  return (
    <svg viewBox="0 0 10 10" width={size} height={size} aria-hidden="true">
      <path d="M0.5 5h9" stroke="currentColor" strokeWidth={1} />
    </svg>
  );
}

export function MaximizeIcon({ size = 10 }: IconProps) {
  return (
    <svg viewBox="0 0 10 10" width={size} height={size} aria-hidden="true">
      <rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth={1} />
    </svg>
  );
}

export function RestoreIcon({ size = 10 }: IconProps) {
  return (
    <svg viewBox="0 0 10 10" width={size} height={size} aria-hidden="true">
      <rect x="2.3" y="0.5" width="7.2" height="7.2" fill="none" stroke="currentColor" strokeWidth={1} />
      <path d="M0.5 2.8h5.9v5.9H0.5Z" fill="var(--surface)" stroke="currentColor" strokeWidth={1} />
    </svg>
  );
}

export function CloseIcon({ size = 10 }: IconProps) {
  return (
    <svg viewBox="0 0 10 10" width={size} height={size} aria-hidden="true">
      <path d="M0.5 0.5l9 9M9.5 0.5l-9 9" stroke="currentColor" strokeWidth={1} />
    </svg>
  );
}

export function FileIcon({ size = 14 }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
      <path
        d="M3.5 1.5h5l3 3v9.5a.5.5 0 0 1-.5.5h-7.5a.5.5 0 0 1-.5-.5v-12a.5.5 0 0 1 .5-.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.1}
        strokeLinejoin="round"
      />
      <path d="M8.5 1.5v3h3" fill="none" stroke="currentColor" strokeWidth={1.1} strokeLinejoin="round" />
    </svg>
  );
}
