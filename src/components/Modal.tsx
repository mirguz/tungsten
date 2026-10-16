import type { ReactNode } from "react";

interface Props {
	title: string;
	onClose: () => void;
	children: ReactNode;
	wide?: boolean;
	/** Nav buttons for a multi-page modal; when given, `children` renders beside it instead of alone. */
	sidebar?: ReactNode;
}

export function Modal({ title, onClose, children, wide, sidebar }: Props) {
	return (
		<div className="modal-backdrop" onClick={onClose}>
			<div className={`modal ${wide ? "wide" : ""}`} onClick={(e) => e.stopPropagation()}>
				<div className="modal-header">
					<h2>{title}</h2>
					<button className="icon-button" onClick={onClose} aria-label="Close">
						✕
					</button>
				</div>
				{sidebar ? (
					<div className="modal-body">
						<nav className="modal-sidebar">{sidebar}</nav>
						<div className="modal-content">{children}</div>
					</div>
				) : (
					children
				)}
			</div>
		</div>
	);
}
