import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import useAuthStore from "../store/authStore";

export default function SetPasswordPage() {
  const navigate = useNavigate();
  const { user, init } = useAuthStore();
  const [password,    setPassword]    = useState("");
  const [confirm,     setConfirm]     = useState("");
  const [error,       setError]       = useState("");
  const [submitting,  setSubmitting]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6)          { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm)         { setError("Passwords do not match."); return; }

    setSubmitting(true);
    try {
      await api.post("/api/auth/set-password", { new_password: password });
      await init(); // refresh user — clears force_password_reset
      // redirect based on role
      const role = user?.role;
      if (role === "admin")  navigate("/admin",     { replace: true });
      else if (role === "gm") navigate("/gm",       { replace: true });
      else                    navigate("/dashboard", { replace: true });
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to update password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-void flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <h1 className="font-gothic text-blood text-3xl tracking-widest mb-2">New Password</h1>
          <p className="text-gray-500 text-sm">
            Your administrator has reset your password.<br />
            Please create a new one to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-void-light border border-void-border rounded-lg p-6 space-y-4">

          {error && (
            <div className="bg-blood-dark border border-blood rounded p-3 text-sm text-blood">
              {error}
            </div>
          )}

          <div>
            <label className="block text-gray-500 text-xs tracking-widest uppercase mb-1">New Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              required
              className="w-full bg-void border border-void-border rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blood transition-colors"
              placeholder="Minimum 6 characters"
            />
          </div>

          <div>
            <label className="block text-gray-500 text-xs tracking-widest uppercase mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              className="w-full bg-void border border-void-border rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blood transition-colors"
              placeholder="Repeat your password"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blood-dark hover:bg-blood text-white font-gothic tracking-widest py-2.5 rounded transition-colors disabled:opacity-40"
          >
            {submitting ? "Saving…" : "Set Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
