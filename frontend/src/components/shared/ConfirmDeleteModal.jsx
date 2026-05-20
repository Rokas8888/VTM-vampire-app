import { useState } from "react";

/**
 * Reusable delete confirmation modal.
 * User must type "DELETE" before the confirm button activates.
 *
 * Props:
 *   title       — modal heading (e.g. "Remove Merit")
 *   description — body text explaining what will be deleted
 *   onConfirm   — async () => void — called when confirmed
 *   onClose     — () => void — called on cancel or backdrop click
 */
export default function ConfirmDeleteModal({ title, description, onConfirm, onClose }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try { await onConfirm(); }
    finally { setBusy(false); }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-void-light border border-blood-dark rounded-lg p-6 max-w-md w-full"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-gothic text-xl text-blood mb-2">{title}</h3>
        <p className="text-gray-400 text-sm mb-4">{description}</p>
        <p className="text-gray-500 text-xs mb-2 uppercase tracking-wider">Type DELETE to confirm</p>
        <input
          className="vtm-input mb-4"
          placeholder="DELETE"
          value={text}
          onChange={e => setText(e.target.value)}
          autoFocus
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={busy}
            className="vtm-btn-secondary flex-1"
          >Cancel</button>
          <button
            onClick={handleConfirm}
            disabled={text !== "DELETE" || busy}
            className="flex-1 bg-red-900/40 hover:bg-red-900/60 border border-red-800 text-red-300 rounded px-4 py-2 text-sm font-gothic tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >{busy ? "Removing…" : "Remove"}</button>
        </div>
      </div>
    </div>
  );
}
