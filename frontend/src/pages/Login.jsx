import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(username, password);
      navigate("/dashboard");
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        "Login failed. Check your credentials.";
      setError(detail);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-black">
      <div className="w-full max-w-md bg-slate-900/80 border border-sky-500/25 rounded-2xl p-10 shadow-2xl backdrop-blur-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-2">
            <Shield size={48} className="text-sky-400" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-bold tracking-wide text-sky-400">
            SentinelX
          </h1>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mt-1">
            Cyber Defense Platform
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm text-slate-300">
            Username
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              className="px-3 py-2.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-100 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/50 transition"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm text-slate-300">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="px-3 py-2.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-100 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/50 transition"
            />
          </label>

          {error && (
            <div className="bg-red-500/10 border border-red-500/40 text-red-200 px-3 py-2.5 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 py-3 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold text-sm tracking-wide hover:from-sky-400 hover:to-blue-500 disabled:opacity-60 disabled:cursor-wait transition"
          >
            {submitting ? "Signing in?" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Authorized personnel only. All access is logged.
        </p>
      </div>
    </div>
  );
}
