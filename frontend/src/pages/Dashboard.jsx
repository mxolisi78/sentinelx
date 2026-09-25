import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";

const SEVERITY_COLORS = {
  LOW: { bg: "rgba(34, 197, 94, 0.15)", fg: "#4ade80", border: "#22c55e" },
  MEDIUM: { bg: "rgba(234, 179, 8, 0.15)", fg: "#facc15", border: "#eab308" },
  HIGH: { bg: "rgba(249, 115, 22, 0.15)", fg: "#fb923c", border: "#f97316" },
  CRITICAL: { bg: "rgba(239, 68, 68, 0.18)", fg: "#f87171", border: "#ef4444" },
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await client.get("/events/");
        if (!cancelled) setEvents(res.data);
      } catch (err) {
        if (!cancelled) setError("Failed to load security events.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useMemo(() => {
    const total = events.length;
    const high = events.filter(
      (e) => e.severity === "HIGH" || e.severity === "CRITICAL"
    ).length;
    const anomalies = events.filter((e) => e.is_anomaly).length;
    const avgRisk =
      total === 0
        ? 0
        : Math.round(
            events.reduce((s, e) => s + (e.risk_score || 0), 0) / total
          );
    return { total, high, anomalies, avgRisk };
  }, [events]);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.brand}>
          <span style={styles.logo}>🛡️</span>
          <div>
            <div style={styles.brandName}>SentinelX</div>
            <div style={styles.brandSub}>Security Operations Dashboard</div>
          </div>
        </div>
        <div style={styles.userBox}>
          <div style={styles.userInfo}>
            <div style={styles.username}>{user?.username}</div>
            <div style={styles.roleBadge}>{user?.role}</div>
          </div>
          <button style={styles.logoutBtn} onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      <main style={styles.main}>
        <section style={styles.cards}>
          <SummaryCard label="Total Events" value={summary.total} accent="#38bdf8" />
          <SummaryCard label="High / Critical" value={summary.high} accent="#f97316" />
          <SummaryCard label="Anomalies Flagged" value={summary.anomalies} accent="#ef4444" />
          <SummaryCard label="Avg Risk Score" value={summary.avgRisk} accent="#a855f7" />
        </section>

        <section style={styles.panel}>
          <div style={styles.panelHeader}>
            <h2 style={styles.panelTitle}>Recent Security Events</h2>
            <span style={styles.panelMeta}>
              {loading ? "Loading…" : `${events.length} events`}
            </span>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <Th>Type</Th>
                  <Th>Severity</Th>
                  <Th>Source IP</Th>
                  <Th>User</Th>
                  <Th>Device</Th>
                  <Th>Risk</Th>
                  <Th>Anomaly</Th>
                  <Th>Time</Th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} style={styles.row}>
                    <Td>
                      <span style={styles.typeText}>{e.event_type}</span>
                    </Td>
                    <Td>
                      <SeverityBadge severity={e.severity} />
                    </Td>
                    <Td mono>{e.source_ip || "—"}</Td>
                    <Td>{e.username || "—"}</Td>
                    <Td>{e.device || "—"}</Td>
                    <Td>
                      <RiskMeter score={e.risk_score} />
                    </Td>
                    <Td>
                      {e.is_anomaly ? (
                        <span style={styles.anomaly}>⚠ Yes</span>
                      ) : (
                        <span style={styles.noAnomaly}>—</span>
                      )}
                    </Td>
                    <Td mono>{formatTime(e.timestamp)}</Td>
                  </tr>
                ))}
                {!loading && events.length === 0 && (
                  <tr>
                    <td colSpan={8} style={styles.empty}>
                      No security events found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function SummaryCard({ label, value, accent }) {
  return (
    <div style={{ ...styles.card, borderTop: `3px solid ${accent}` }}>
      <div style={styles.cardLabel}>{label}</div>
      <div style={styles.cardValue}>{value}</div>
    </div>
  );
}

function SeverityBadge({ severity }) {
  const c = SEVERITY_COLORS[severity] || SEVERITY_COLORS.LOW;
  return (
    <span
      style={{
        background: c.bg,
        color: c.fg,
        border: `1px solid ${c.border}`,
        padding: "0.15rem 0.55rem",
        borderRadius: "999px",
        fontSize: "0.72rem",
        fontWeight: 600,
        letterSpacing: "0.05em",
      }}
    >
      {severity}
    </span>
  );
}

function RiskMeter({ score }) {
  const safe = Math.max(0, Math.min(100, score || 0));
  const color =
    safe >= 80 ? "#ef4444" : safe >= 60 ? "#f97316" : safe >= 40 ? "#eab308" : "#22c55e";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <div style={styles.meterTrack}>
        <div
          style={{
            width: `${safe}%`,
            height: "100%",
            background: color,
            borderRadius: "999px",
            transition: "width 0.3s",
          }}
        />
      </div>
      <span style={{ fontSize: "0.8rem", color: "#cbd5e1", minWidth: 24 }}>
        {safe}
      </span>
    </div>
  );
}

function Th({ children }) {
  return <th style={styles.th}>{children}</th>;
}

function Td({ children, mono }) {
  return (
    <td style={{ ...styles.td, fontFamily: mono ? "ui-monospace, monospace" : "inherit" }}>
      {children}
    </td>
  );
}

function formatTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString();
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 20% 0%, #0b1220 0%, #020617 55%, #000 100%)",
    color: "#e2e8f0",
    fontFamily:
      "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 2rem",
    borderBottom: "1px solid #1e293b",
    background: "rgba(2, 6, 23, 0.75)",
    backdropFilter: "blur(8px)",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  brand: { display: "flex", alignItems: "center", gap: "0.75rem" },
  logo: { fontSize: "1.75rem" },
  brandName: {
    fontWeight: 700,
    letterSpacing: "0.05em",
    color: "#38bdf8",
  },
  brandSub: {
    fontSize: "0.7rem",
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    color: "#64748b",
  },
  userBox: { display: "flex", alignItems: "center", gap: "1rem" },
  userInfo: { textAlign: "right" },
  username: { fontSize: "0.85rem", fontWeight: 600 },
  roleBadge: {
    fontSize: "0.65rem",
    letterSpacing: "0.1em",
    color: "#38bdf8",
    border: "1px solid rgba(56, 189, 248, 0.4)",
    padding: "0.05rem 0.45rem",
    borderRadius: "999px",
    display: "inline-block",
    marginTop: "0.15rem",
  },
  logoutBtn: {
    background: "transparent",
    border: "1px solid #334155",
    color: "#cbd5e1",
    padding: "0.4rem 0.75rem",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.8rem",
  },
  main: { padding: "2rem", maxWidth: "1400px", margin: "0 auto" },
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "1rem",
    marginBottom: "2rem",
  },
  card: {
    background: "rgba(15, 23, 42, 0.7)",
    border: "1px solid #1e293b",
    borderRadius: "12px",
    padding: "1.25rem",
  },
  cardLabel: {
    fontSize: "0.7rem",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#94a3b8",
  },
  cardValue: {
    fontSize: "1.9rem",
    fontWeight: 700,
    marginTop: "0.35rem",
    color: "#f1f5f9",
  },
  panel: {
    background: "rgba(15, 23, 42, 0.7)",
    border: "1px solid #1e293b",
    borderRadius: "12px",
    padding: "1.25rem",
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
  },
  panelTitle: { margin: 0, fontSize: "1.05rem", color: "#e2e8f0" },
  panelMeta: { fontSize: "0.8rem", color: "#64748b" },
  tableWrap: { overflowX: "auto" },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.85rem",
  },
  th: {
    textAlign: "left",
    padding: "0.6rem 0.75rem",
    borderBottom: "1px solid #1e293b",
    color: "#94a3b8",
    fontWeight: 600,
    fontSize: "0.72rem",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  td: {
    padding: "0.65rem 0.75rem",
    borderBottom: "1px solid rgba(30, 41, 59, 0.6)",
    color: "#cbd5e1",
    verticalAlign: "middle",
  },
  row: { transition: "background 0.15s" },
  typeText: { fontSize: "0.78rem", fontWeight: 600, color: "#e2e8f0" },
  anomaly: { color: "#f87171", fontWeight: 600, fontSize: "0.8rem" },
  noAnomaly: { color: "#475569" },
  empty: {
    padding: "2rem",
    textAlign: "center",
    color: "#64748b",
    fontStyle: "italic",
  },
  error: {
    background: "rgba(239, 68, 68, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.4)",
    color: "#fecaca",
    padding: "0.6rem 0.75rem",
    borderRadius: "8px",
    fontSize: "0.85rem",
    marginBottom: "1rem",
  },
  meterTrack: {
    width: 60,
    height: 6,
    background: "#1e293b",
    borderRadius: "999px",
    overflow: "hidden",
  },
};