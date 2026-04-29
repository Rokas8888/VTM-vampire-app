import { useState, useEffect, useCallback } from "react";
import useAuthStore from "../store/authStore";
import api from "../services/api";
import HelpModal from "../components/shared/HelpModal";

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, accent }) {
  return (
    <div
      className="bg-void-light border border-void-border rounded-lg p-5 text-center"
      style={{ borderColor: accent ? "#5c0000" : undefined }}
    >
      <p
        className="font-gothic text-3xl font-bold"
        style={{ color: accent || "#e0d6c8" }}
      >
        {value ?? "—"}
      </p>
      <p className="text-gray-500 text-xs tracking-widest uppercase mt-1">{label}</p>
    </div>
  );
}

// ── Role badge ────────────────────────────────────────────────────────────────
const ROLE_COLORS = {
  admin: "bg-blood-dark text-blood border-blood-dark",
  gm:    "bg-void border-void-border text-amber-400",
  player:"bg-void border-void-border text-gray-300",
};

function RoleBadge({ role }) {
  return (
    <span className={`text-xs border rounded px-2 py-0.5 font-gothic tracking-wider ${ROLE_COLORS[role] || "text-gray-400"}`}>
      {role}
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user, logout } = useAuthStore();

  const [stats,   setStats]   = useState(null);
  const [users,   setUsers]   = useState([]);
  const [search,  setSearch]  = useState("");
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  // Confirmation modal state
  const [confirm, setConfirm] = useState(null); // { type: "delete"|"role"|"active", userId, value, label }
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  // ── Fetch helpers ───────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    const res = await api.get("/api/admin/stats");
    setStats(res.data);
  }, []);

  const fetchUsers = useCallback(async (q = "") => {
    const params = q ? { search: q } : {};
    const res = await api.get("/api/admin/users", { params });
    setUsers(res.data);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([fetchStats(), fetchUsers()]);
      } catch (e) {
        setError(e.response?.data?.detail || "Failed to load admin data.");
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchStats, fetchUsers]);

  // Live search — debounced slightly
  useEffect(() => {
    const t = setTimeout(() => fetchUsers(search), 300);
    return () => clearTimeout(t);
  }, [search, fetchUsers]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const updateUser = async (userId, patch) => {
    try {
      const res = await api.put(`/api/admin/users/${userId}`, patch);
      setUsers((prev) => prev.map((u) => (u.id === userId ? res.data : u)));
    } catch (e) {
      setError(e.response?.data?.detail || "Update failed.");
    }
  };

  const deleteUser = async (userId) => {
    try {
      await api.delete(`/api/admin/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      await fetchStats(); // refresh counts
    } catch (e) {
      setError(e.response?.data?.detail || "Delete failed.");
    }
  };

  const forceReset = async (userId) => {
    try {
      const res = await api.post(`/api/admin/users/${userId}/force-reset`);
      setUsers((prev) => prev.map((u) => (u.id === userId ? res.data : u)));
    } catch (e) {
      setError(e.response?.data?.detail || "Reset failed.");
    }
  };

  const handleSeed = async () => {
    setSeeding(true); setSeedMsg("");
    try {
      const res = await api.post("/api/admin/seed");
      setSeedMsg(res.data.message);
    } catch (e) {
      setSeedMsg(e.response?.data?.detail || "Seed failed.");
    } finally {
      setSeeding(false);
    }
  };

  // ── Execute confirmed action ─────────────────────────────────────────────────
  const executeConfirm = async () => {
    if (!confirm) return;
    const { type, userId, value } = confirm;
    setConfirm(null);
    if (type === "delete")  await deleteUser(userId);
    if (type === "role")    await updateUser(userId, { role: value });
    if (type === "active")  await updateUser(userId, { is_active: value });
    if (type === "reset")   await forceReset(userId);
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-void text-gray-200">

      {/* Header */}
      <header className="border-b border-void-border bg-void-light px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-gothic text-blood text-2xl tracking-widest">Vampire Scriptorium</h1>
          <p className="text-gray-600 text-xs tracking-widest uppercase">Admin Sanctum</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-500 text-sm">{user?.username}</span>
          <button
            onClick={() => setShowHelp(true)}
            className="text-xs text-gray-500 hover:text-blood border border-void-border px-3 py-1.5 rounded transition-colors font-gothic tracking-wider"
          >
            ? Help
          </button>
          <button
            onClick={logout}
            className="text-xs text-gray-500 hover:text-blood border border-void-border px-3 py-1.5 rounded transition-colors font-gothic tracking-wider"
          >
            Depart
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">

        {/* Error banner */}
        {error && (
          <div className="bg-blood-dark border border-blood rounded p-3 text-sm text-blood flex justify-between">
            <span>{error}</span>
            <button onClick={() => setError("")} className="text-blood hover:text-white ml-4">✕</button>
          </div>
        )}

        {/* Stats */}
        <section>
          <h2 className="font-gothic text-gray-400 text-xs tracking-widest uppercase mb-4">System Overview</h2>
          {loading ? (
            <p className="text-blood animate-pulse font-gothic">Consulting the records…</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              <StatCard label="Total Users"  value={stats?.total_users}      accent="#8B0000" />
              <StatCard label="Players"      value={stats?.players} />
              <StatCard label="GMs"          value={stats?.gms} />
              <StatCard label="Admins"       value={stats?.admins} />
              <StatCard label="Groups"       value={stats?.total_groups} />
              <StatCard label="Characters"   value={stats?.total_characters} />
              <StatCard label="Monsters"     value={stats?.total_monsters} />
            </div>
          )}
        </section>

        {/* Game data */}
        <section>
          <h2 className="font-gothic text-gray-400 text-xs tracking-widest uppercase mb-4">Game Data</h2>
          <div className="bg-void-light border border-void-border rounded-lg p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-gray-300 text-sm font-gothic">Seed / Restore Game Data</p>
              <p className="text-gray-600 text-xs mt-0.5">Seeds clans, disciplines, powers, merits, flaws, predator types. Safe to run multiple times — skips if data already exists.</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {seedMsg && <span className="text-xs text-gray-500">{seedMsg}</span>}
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="vtm-btn text-sm py-2 px-4 whitespace-nowrap"
              >
                {seeding ? "Seeding…" : "Seed Game Data"}
              </button>
            </div>
          </div>
        </section>

        {/* Users table */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-gothic text-gray-400 text-xs tracking-widest uppercase">Kindred Registry</h2>
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-void border border-void-border rounded px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blood transition-colors w-56"
            />
          </div>

          <div className="bg-void-light border border-void-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-void-border">
                  <th className="text-left px-4 py-3 text-gray-500 text-xs tracking-widest uppercase font-normal">ID</th>
                  <th className="text-left px-4 py-3 text-gray-500 text-xs tracking-widest uppercase font-normal">Username</th>
                  <th className="text-left px-4 py-3 text-gray-500 text-xs tracking-widest uppercase font-normal hidden md:table-cell">Email</th>
                  <th className="text-left px-4 py-3 text-gray-500 text-xs tracking-widest uppercase font-normal">Role</th>
                  <th className="text-left px-4 py-3 text-gray-500 text-xs tracking-widest uppercase font-normal">Status</th>
                  <th className="text-right px-4 py-3 text-gray-500 text-xs tracking-widest uppercase font-normal">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-600 font-gothic">
                      {loading ? "Loading…" : "No souls found."}
                    </td>
                  </tr>
                )}
                {users.map((u) => {
                  const isSelf = u.id === user?.id;
                  return (
                    <tr key={u.id} className="border-b border-void-border last:border-0 hover:bg-void transition-colors">
                      <td className="px-4 py-3 text-gray-600 text-xs">{u.id}</td>
                      <td className="px-4 py-3 text-gray-200 font-gothic">
                        {u.username}
                        {isSelf && <span className="ml-2 text-xs text-blood">(you)</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{u.email}</td>

                      {/* Role selector */}
                      <td className="px-4 py-3">
                        {isSelf ? (
                          <RoleBadge role={u.role} />
                        ) : (
                          <select
                            value={u.role}
                            onChange={(e) =>
                              setConfirm({
                                type: "role",
                                userId: u.id,
                                value: e.target.value,
                                label: `Change ${u.username}'s role to "${e.target.value}"?`,
                              })
                            }
                            className="bg-void border border-void-border rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-blood transition-colors"
                          >
                            <option value="player">player</option>
                            <option value="gm">gm</option>
                            <option value="admin">admin</option>
                          </select>
                        )}
                      </td>

                      {/* Active toggle */}
                      <td className="px-4 py-3">
                        {isSelf ? (
                          <span className="text-xs text-green-600">active</span>
                        ) : (
                          <button
                            onClick={() =>
                              setConfirm({
                                type: "active",
                                userId: u.id,
                                value: !u.is_active,
                                label: `${u.is_active ? "Deactivate" : "Reactivate"} ${u.username}?`,
                              })
                            }
                            className={`text-xs border rounded px-2 py-0.5 transition-colors ${
                              u.is_active
                                ? "border-green-900 text-green-600 hover:border-red-900 hover:text-blood"
                                : "border-red-900 text-blood hover:border-green-900 hover:text-green-600"
                            }`}
                          >
                            {u.is_active ? "active" : "inactive"}
                          </button>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        {!isSelf && (
                          <div className="flex items-center justify-end gap-3">
                            {u.force_password_reset && (
                              <span className="text-xs text-amber-500 font-gothic" title="User must set a new password on next login">
                                reset pending
                              </span>
                            )}
                            <button
                              onClick={() =>
                                setConfirm({
                                  type: "reset",
                                  userId: u.id,
                                  label: `Force ${u.username} to set a new password on next login?`,
                                })
                              }
                              className="text-xs text-gray-500 hover:text-amber-400 transition-colors"
                              title="Force password reset"
                            >
                              reset pwd
                            </button>
                            <button
                              onClick={() =>
                                setConfirm({
                                  type: "delete",
                                  userId: u.id,
                                  label: `Permanently destroy ${u.username} and all their data?`,
                                })
                              }
                              className="text-xs text-gray-600 hover:text-blood transition-colors"
                              title="Delete user"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* ── Confirmation modal ─────────────────────────────────────────────────── */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-void-light border border-blood-dark rounded-lg p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-gothic text-blood text-lg mb-4">Confirm Action</h3>
            <p className="text-gray-300 text-sm mb-6">{confirm.label}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirm(null)}
                className="text-sm text-gray-400 hover:text-gray-200 border border-void-border px-4 py-2 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeConfirm}
                className="text-sm bg-blood-dark hover:bg-blood text-white px-4 py-2 rounded transition-colors font-gothic"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
