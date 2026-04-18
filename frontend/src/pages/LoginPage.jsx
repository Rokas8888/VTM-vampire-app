import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";

// ── Static film-grain noise (SVG turbulence — no animation) ───────────────────
const NOISE_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`;

function StaticNoise() {
  return (
    <div aria-hidden="true" style={{
      position: "fixed", inset: 0, zIndex: 3, pointerEvents: "none",
      backgroundImage: NOISE_SVG,
      backgroundRepeat: "repeat",
      opacity: 0.10,
    }} />
  );
}

// ── Blood drips ────────────────────────────────────────────────────────────────
function BloodDrips() {
  const drips = [
    { left: "5%",  delay: "0s",   duration: "3.2s", width: "3px", height: "90px"  },
    { left: "12%", delay: "1.1s", duration: "2.8s", width: "4px", height: "130px" },
    { left: "21%", delay: "0.4s", duration: "3.5s", width: "3px", height: "75px"  },
    { left: "33%", delay: "2.0s", duration: "2.6s", width: "5px", height: "110px" },
    { left: "45%", delay: "0.7s", duration: "3.8s", width: "3px", height: "95px"  },
    { left: "57%", delay: "1.5s", duration: "2.9s", width: "4px", height: "140px" },
    { left: "68%", delay: "0.2s", duration: "3.3s", width: "3px", height: "80px"  },
    { left: "79%", delay: "1.8s", duration: "2.7s", width: "5px", height: "120px" },
    { left: "88%", delay: "0.9s", duration: "3.6s", width: "3px", height: "100px" },
    { left: "95%", delay: "1.3s", duration: "3.0s", width: "4px", height: "85px"  },
  ];
  return (
    <div className="fixed top-0 left-0 w-full pointer-events-none" style={{ zIndex: 10 }}>
      {drips.map((d, i) => (
        <div key={i} className="blood-drip" style={{
          left: d.left, width: d.width,
          animationDuration: d.duration,
          animationDelay: d.delay,
          maxHeight: d.height,
        }} />
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const navigate = useNavigate();
  const { login, register } = useAuthStore();

  const [mode,    setMode]    = useState("login");
  const [form,    setForm]    = useState({ username: "", email: "", password: "", role: "player" });
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let user;
      if (mode === "login") {
        user = await login(form.username, form.password);
      } else {
        user = await register(form.username, form.email, form.password, form.role);
      }
      if (user.role === "player")     navigate("/dashboard");
      else if (user.role === "gm")    navigate("/gm");
      else if (user.role === "admin") navigate("/admin");
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">

      {/* Background image */}
      <div aria-hidden="true" style={{
        position: "fixed", inset: 0, zIndex: 0,
        backgroundImage:    "url(/assets/login-bg.jpg)",
        backgroundSize:     "cover",
        backgroundPosition: "center",
      }} />

      {/* Dark overlay — heavier to keep it atmospheric */}
      <div aria-hidden="true" className="fixed inset-0 pointer-events-none" style={{
        zIndex: 1,
        background:
          "radial-gradient(ellipse at center, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.95) 100%)," +
          "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.92) 100%)",
      }} />

      <StaticNoise />
      {/* <BloodDrips /> */}{/* uncomment to re-enable blood drip animation */}

      {/* ── Login card ── */}
      <div className="relative w-full max-w-md px-4" style={{ zIndex: 20 }}>

        {/* Logo */}
        <div className="text-center mb-8">
          <h1
            className="font-gothic font-bold text-blood leading-tight"
            style={{
              fontSize: "clamp(2rem, 6vw, 2.8rem)",
              letterSpacing: "0.12em",
              textShadow:
                "0 0 20px rgba(139,0,0,1), 0 0 60px rgba(139,0,0,0.7), 0 0 100px rgba(139,0,0,0.35), 0 2px 8px rgba(0,0,0,1)",
            }}
          >
            Vampire<br />Scriptorium
          </h1>
          <p className="text-gray-500 text-xs mt-3 tracking-widest uppercase font-gothic">
            Vampire: The Masquerade
          </p>
        </div>

        {/* Card */}
        <div className="border border-blood-dark rounded-lg p-8 shadow-2xl"
          style={{
            background: "rgba(10,10,10,0.72)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            boxShadow: "0 0 60px rgba(0,0,0,0.9), 0 0 40px rgba(80,0,0,0.25)",
          }}>

          {/* Tab switcher */}
          <div className="flex mb-6 border-b border-void-border">
            <button
              onClick={() => { setMode("login"); setError(""); }}
              className={`flex-1 py-2 text-sm font-gothic tracking-wider transition-colors ${
                mode === "login"
                  ? "text-blood border-b-2 border-blood"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Enter
            </button>
            <button
              onClick={() => { setMode("register"); setError(""); }}
              className={`flex-1 py-2 text-sm font-gothic tracking-wider transition-colors ${
                mode === "register"
                  ? "text-blood border-b-2 border-blood"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Embrace
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs text-gray-400 mb-1 tracking-widest uppercase">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={update("username")}
                required
                className="w-full bg-void border border-void-border rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-blood transition-colors"
                placeholder="your name in the darkness"
              />
            </div>

            {/* Email — register only */}
            {mode === "register" && (
              <div>
                <label className="block text-xs text-gray-400 mb-1 tracking-widest uppercase">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={update("email")}
                  required
                  className="w-full bg-void border border-void-border rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-blood transition-colors"
                  placeholder="your mortal contact"
                />
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-xs text-gray-400 mb-1 tracking-widest uppercase">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={update("password")}
                required
                className="w-full bg-void border border-void-border rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-blood transition-colors"
                placeholder="••••••••"
              />
            </div>

            {/* Role — register only */}
            {mode === "register" && (
              <div>
                <label className="block text-xs text-gray-400 mb-1 tracking-widest uppercase">You Are</label>
                <select
                  value={form.role}
                  onChange={update("role")}
                  className="w-full bg-void border border-void-border rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-blood transition-colors"
                >
                  <option value="player">🧛 Player — create and manage your vampire</option>
                  <option value="gm">🎭 Game Master — run sessions and manage groups</option>
                </select>
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="text-blood text-sm text-center">{error}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blood-dark hover:bg-blood text-white font-gothic tracking-widest py-3 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? "..." : mode === "login" ? "Enter the Night" : "Accept the Embrace"}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-700 text-xs mt-6 font-gothic">
          The night is eternal. So are we.
        </p>
      </div>
    </div>
  );
}
