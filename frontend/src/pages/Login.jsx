import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.brand}>
          <div style={styles.logo}>🛡️</div>
          <h1 style={styles.title}>SentinelX</h1>
          <p style={styles.subtitle}>Cyber Defense Platform</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Username
            <input
              style={styles.input}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </label>

          <label style={styles.label}>
            Password
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {error && <div style={styles.error}>{error}</div>}

          <button style={styles.button} type="submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p style={styles.footer}>
          Authorized personnel only. All access is logged.
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "radial-gradient(circle at 20% 20%, #0f172a 0%, #020617 60%, #000 100%)",
    fontFamily:
      "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    color: "#e2e8f0",
    padding: "1rem",
  },
  card: {
    width: "100%",
    maxWidth: "400px",
    background: "rgba(15, 23, 42, 0.85)",
    border: "1px solid rgba(56, 189, 248, 0.25)",
    borderRadius: "16px",
    padding: "2.5rem",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
    backdropFilter: "blur(10px)",
  },
  brand: {
    textAlign: "center",
    marginBottom: "2rem",
  },
  logo: {
    fontSize: "2.5rem",
    marginBottom: "0.25rem",
  },
  title: {
    margin: 0,
    fontSize: "1.75rem",
    letterSpacing: "0.05em",
    color: "#38bdf8",
  },
  subtitle: {
    margin: "0.25rem 0 0",
    fontSize: "0.85rem",
    color: "#94a3b8",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: "0.35rem",
    fontSize: "0.85rem",
    color: "#cbd5e1",
  },
  input: {
    padding: "0.65rem 0.75rem",
    borderRadius: "8px",
    border: "1px solid #334155",
    background: "#0b1220",
    color: "#e2e8f0",
    fontSize: "0.95rem",
    outline: "none",
  },
  button: {
    marginTop: "0.5rem",
    padding: "0.75rem",
    borderRadius: "8px",
    border: "none",
    background: "linear-gradient(135deg, #0ea5e9, #2563eb)",
    color: "white",
    fontWeight: 600,
    fontSize: "0.95rem",
    cursor: "pointer",
    letterSpacing: "0.03em",
  },
  error: {
    background: "rgba(239, 68, 68, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.4)",
    color: "#fecaca",
    padding: "0.6rem 0.75rem",
    borderRadius: "8px",
    fontSize: "0.85rem",
  },
  footer: {
    marginTop: "1.5rem",
    textAlign: "center",
    fontSize: "0.75rem",
    color: "#64748b",
  },
};