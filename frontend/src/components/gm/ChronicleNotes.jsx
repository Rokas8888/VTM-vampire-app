import { useState, useEffect } from "react";
import api from "../../services/api";
import useAuthStore from "../../store/authStore";
import { useToast } from "../../store/toastStore";

export default function ChronicleNotes({ groupId, members = [] }) {
  const { user } = useAuthStore();
  const toast = useToast();
  const isGM = user?.role === "gm" || user?.role === "admin";

  const [notes,    setNotes]    = useState([]);
  const [editing,  setEditing]  = useState(null); // note id being edited, or "new-summary" / "new-personal"
  const [form,     setForm]     = useState({ title: "", content: "" });
  const [saving,   setSaving]   = useState(false);
  const [filter,   setFilter]   = useState("all"); // "all" | "summary" | "personal"

  const load = async () => {
    try {
      const res = await api.get(`/api/notes/group/${groupId}`);
      setNotes(res.data);
    } catch (_) {}
  };

  useEffect(() => { load(); }, [groupId]);

  const startNew = (type) => {
    setEditing(`new-${type}`);
    setForm({ title: "", content: "" });
  };

  const startEdit = (note) => {
    setEditing(note.id);
    setForm({ title: note.title ?? "", content: note.content });
  };

  const cancelEdit = () => { setEditing(null); setForm({ title: "", content: "" }); };

  const handleSave = async () => {
    if (!form.content.trim()) return;
    setSaving(true);
    try {
      if (editing === "new-summary" || editing === "new-personal") {
        const type = editing === "new-summary" ? "summary" : "personal";
        await api.post("/api/notes", { group_id: groupId, note_type: type, title: form.title || null, content: form.content });
        toast.success("Note saved.");
      } else {
        await api.put(`/api/notes/${editing}`, { title: form.title || null, content: form.content });
        toast.success("Note updated.");
      }
      cancelEdit();
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail ?? "Failed to save note.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/notes/${id}`);
      setNotes((n) => n.filter((x) => x.id !== id));
      toast.info("Note deleted.");
    } catch (e) {
      toast.error("Failed to delete note.");
    }
  };

  const visible = notes.filter((n) =>
    filter === "all" ? true : n.note_type === filter
  );

  const fmt = (iso) => new Date(iso).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {["all","summary","personal"].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1 rounded border capitalize transition-colors ${
                filter === f ? "border-blood text-blood bg-blood/10" : "border-void-border text-gray-500 hover:border-gray-500"
              }`}>{f}</button>
          ))}
        </div>
        <div className="flex gap-2">
          {isGM && (
            <button onClick={() => startNew("summary")} className="vtm-btn text-xs py-1 px-3">
              + Session Summary
            </button>
          )}
          <button onClick={() => startNew("personal")} className="vtm-btn-secondary text-xs py-1 px-3">
            + Personal Note
          </button>
        </div>
      </div>

      {/* New / edit form */}
      {editing !== null && (
        <div className="bg-black/30 border border-void-border rounded-lg p-4 space-y-3">
          <p className="text-xs text-gray-500 font-gothic tracking-wider uppercase">
            {editing === "new-summary" ? "New Session Summary" :
             editing === "new-personal" ? "New Personal Note" : "Edit Note"}
          </p>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Title (optional)…"
            className="w-full bg-void border border-void-border rounded px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blood"
          />
          <textarea
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder="Write your note…"
            rows={6}
            className="w-full bg-void border border-void-border rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blood resize-none"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={cancelEdit} className="vtm-btn-secondary text-xs py-1 px-3">Cancel</button>
            <button onClick={handleSave} disabled={!form.content.trim() || saving} className="vtm-btn text-xs py-1 px-3">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* Notes list */}
      {visible.length === 0 ? (
        <p className="text-gray-600 text-sm italic">No notes yet.</p>
      ) : (
        <div className="space-y-3">
          {visible.map((n) => (
            <div key={n.id} className="border border-void-border rounded-lg p-4 bg-void-light/30">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  {n.title && <p className="font-gothic text-gray-200 text-sm">{n.title}</p>}
                  <p className="text-xs text-gray-600">
                    <span className={`capitalize font-gothic ${n.note_type === "summary" ? "text-blood-dark" : "text-gray-500"}`}>
                      {n.note_type}
                    </span>
                    {" · "}{n.username}{" · "}{fmt(n.created_at)}
                  </p>
                </div>
                {(n.user_id === user?.id || user?.role === "admin") && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => startEdit(n)} className="text-gray-600 hover:text-gray-300 text-xs transition-colors">Edit</button>
                    <button onClick={() => handleDelete(n.id)} className="text-gray-600 hover:text-red-400 text-xs transition-colors">✕</button>
                  </div>
                )}
              </div>
              <p className="text-gray-400 text-sm whitespace-pre-wrap leading-relaxed">{n.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
