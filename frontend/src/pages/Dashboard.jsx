import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/ToastHost";
import { useActivitySocket } from "../api/socket";
import client from "../api/client";

const SEVERITY_COLORS = {
  LOW: { bg: "rgba(34, 197, 94, 0.15)", fg: "#4ade80", border: "#22c55e" },
  MEDIUM: { bg: "rgba(234, 179, 8, 0.15)", fg: "#facc15", border: "#eab308" },
  HIGH: { bg: "rgba(249, 115, 22, 0.15)", fg: "#fb923c", border: "#f97316" },
  CRITICAL: { bg: "rgba(239, 68, 68, 0.18)", fg: "#f87171", border: "#ef4444" },
};

const RULE_COLORS = {
  BRUTE_FORCE_LOGIN: "#ef4444",
  OFF_HOURS_ADMIN_LOGIN: "#f97316",
  PRIVILEGE_ESCALATION: "#a855f7",
  PORT_SCAN_BURST: "#eab308",
  SUSPICIOUS_EXTERNAL_ACCESS: "#38bdf8",
  HIGH_RISK_CORRELATION: "#94a3b8",
};

const TABS = [
  { key: "events", label: "Security Events" },
  { key: "detections", label: "Detections" },
];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState("events");
  const [events, setEvents] = useState([]);
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [lastReport, setLastReport] = useState(null);

  const canAnalyze = user?.role === "ADMIN" || user?.role === "ANALYST";
    const [liveIncidents, setLiveIncidents] = useState([]);

  async function loadData() {
    setLoading(true);
    try {
      const [eventsRes, detectionsRes] = await Promise.all([
        client.get("/events/"),
        canAnalyze ? client.get("/detections/") : Promise.resolve({ data: [] }),
      ]);
      setEvents(eventsRes.data);
      setDetections(detectionsRes.data);
    } catch (err) {
      setError("Failed to load SentinelX data.");
    } finally {
      setLoading(false);
    }
  }

    const { push: pushToast } = useToast();

  useActivitySocket((msg) => {
    if (!msg || !msg.event) return;

    if (msg.event === "detection.created") {
      const d = msg.detection;
      setDetections((list) => [d, ...list]);

      if (d.event_severity === "CRITICAL") {
        pushToast({
          title: `Detection: ${d.rule_name}`,
          body: d.reason,
          severity: "CRITICAL",
        });
      }
    } else if (msg.event === "incident.created") {
      const i = msg.incident;
      setLiveIncidents((list) => [i, ...list]);

      if (i.severity === "CRITICAL" || i.severity === "HIGH") {
        pushToast({
          title: `${i.severity} incident created`,
          body: i.title,
          severity: i.severity,
          onClick: () => {
            window.location.href = "/incidents";
          },
        });
      }
    }
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runDetection(rescanAll = false) {
    setAnalyzing(true);
    setError("");
    try {
      const res = await client.post("/events/analyze/", { all: rescanAll });
      setLastReport(res.data);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.detail || "Detection run failed.");
    } finally {
      setAnalyzing(false);
    }
  }

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
    return {
      total,
      high,
      anomalies,
      avgRisk,
      detections: detections.length,
    };
  }, [events, detections]);

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
        <nav style={styles.nav}>
          <Link to="/dashboard" style={{ ...styles.navLink, ...styles.navActive }}>
            Dashboard
          </Link>
          <Link to="/incidents" style={styles.navLink}>Incidents</Link>
        </nav>
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
          <SummaryCard label="Anomalies" value={summary.anomalies} accent="#ef4444" />
          <SummaryCard label="Avg Risk" value={summary.avgRisk} accent="#a855f7" />
          <SummaryCard label="Detections" value={summary.detections} accent="#22c55e" />
          <SummaryCard
            label="Live Incidents"
            value={liveIncidents.length}
            accent="#f472b6"
          />
        </section>

        {canAnalyze && (
          <section style={styles.controls}>
            <button
              style={{
                ...styles.runBtn,
                opacity: analyzing ? 0.6 : 1,
                cursor: analyzing ? "wait" : "pointer",
              }}
              onClick={() => runDetection(false)}
              disabled={analyzing}
            >
              {analyzing ? "Running detection…" : "▶ Run Detection"}
            </button>
            <button
              style={{
                ...styles.runBtnSecondary,
                opacity: analyzing ? 0.6 : 1,
                cursor: analyzing ? "wait" : "pointer",
              }}
              onClick={() => runDetection(true)}
              disabled={analyzing}
            >
              ⟳ Full Rescan
            </button>

            {lastReport && (
              <div style={styles.report}>
                <span style={styles.reportItem}>
                  Scanned <b>{lastReport.events_scanned}</b>
                </span>
                <span style={styles.reportItem}>
                  Created <b>{lastReport.detections_created}</b>
                </span>
                <span style={styles.reportItem}>
                  Escalated <b>{lastReport.events_escalated}</b>
                </span>
                <span style={styles.reportItem}>
                  Took <b>{lastReport.duration_ms} ms</b>
                </span>
              </div>
            )}
          </section>
        )}

        <section style={styles.panel}>
          <div style={styles.panelHeader}>
            <div style={styles.tabs}>
              {TABS.map((t) => (
                <button
                  key={t.key}
                  style={{
                    ...styles.tab,
                    ...(tab === t.key ? styles.tabActive : {}),
                  }}
                  onClick={() => setTab(t.key)}
                >
                  {t.label}
                  {t.key === "detections" && summary.detections > 0 && (
                    <span style={styles.tabCount}>{summary.detections}</span>
                  )}
                </button>
              ))}
            </div>
            <span style={styles.panelMeta}>
              {loading ? "Loading…" : ""}
            </span>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          {tab === "events" ? (
            <EventsTable events={events} loading={loading} />
          ) : (
            <DetectionsTable detections={detections} loading={loading} />
          )}
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

function EventsTable({ events, loading }) {
  return (
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
              <Td><span style={styles.typeText}>{e.event_type}</span></Td>
              <Td><SeverityBadge severity={e.severity} /></Td>
              <Td mono>{e.source_ip || "—"}</Td>
              <Td>{e.username || "—"}</Td>
              <Td>{e.device || "—"}</Td>
              <Td><RiskMeter score={e.risk_score} /></Td>
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
              <td colSpan={8} style={styles.empty}>No security events found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function DetectionsTable({ detections, loading }) {
  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <Th>Rule</Th>
            <Th>Event Type</Th>
            <Th>Severity</Th>
            <Th>Confidence</Th>
            <Th>Reason</Th>
            <Th>Escalated</Th>
            <Th>Time</Th>
          </tr>
        </thead>
        <tbody>
          {detections.map((d) => (
            <tr key={d.id} style={styles.row}>
              <Td>
                <span
                  style={{
                    ...styles.rulePill,
                    color: RULE_COLORS[d.rule_name] || "#94a3b8",
                    borderColor: (RULE_COLORS[d.rule_name] || "#94a3b8") + "66",
                  }}
                >
                  {d.rule_name}
                </span>
              </Td>
              <Td><span style={styles.typeText}>{d.event_type}</span></Td>
              <Td><SeverityBadge severity={d.event_severity} /></Td>
              <Td><ConfidenceBar value={d.confidence} /></Td>
              <Td><span style={styles.reason}>{d.reason}</span></Td>
              <Td>
                {d.auto_escalated ? (
                  <span style={styles.anomaly}>↑ Yes</span>
                ) : (
                  <span style={styles.noAnomaly}>—</span>
                )}
              </Td>
              <Td mono>{formatTime(d.created_at)}</Td>
            </tr>
          ))}
          {!loading && detections.length === 0 && (
            <tr>
              <td colSpan={7} style={styles.empty}>
                No detections yet. Click <b>Run Detection</b> to analyze events.
              </td>
            </tr>
          )}
        </tbody>
      </table>
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
    safe >= 80 ? "#ef4444"
    : safe >= 60 ? "#f97316"
    : safe >= 40 ? "#eab308"
    : "#22c55e";
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

function ConfidenceBar({ value }) {
  const safe = Math.max(0, Math.min(100, value || 0));
  const color = safe >= 80 ? "#22c55e" : safe >= 60 ? "#eab308" : "#94a3b8";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <div style={styles.meterTrack}>
        <div
          style={{
            width: `${safe}%`,
            height: "100%",
            background: color,
            borderRadius: "999px",
          }}
        />
      </div>
      <span style={{ fontSize: "0.8rem", color: "#cbd5e1", minWidth: 30 }}>
        {safe}%
      </span>
    </div>
  );
}

function Th({ children }) {
  return <th style={styles.th}>{children}</th>;
}

function Td({ children, mono }) {
  return (
    <td
      style={{
        ...styles.td,
        fontFamily: mono ? "ui-monospace, monospace" : "inherit",
      }}
    >
      {children}
    </td>
  );
}

function formatTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(circle at 20% 0%, #0b1220 0%, #020617 55%, #000 100%)",
    color: "#e2e8f0",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
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
  brandName: { fontWeight: 700, letterSpacing: "0.05em", color: "#38bdf8" },
  brandSub: { fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#64748b" },
  nav: { display: "flex", gap: "0.5rem" },
  navLink: {
    color: "#94a3b8",
    textDecoration: "none",
    fontSize: "0.85rem",
    fontWeight: 600,
    padding: "0.4rem 0.8rem",
    borderRadius: "6px",
  },
  navActive: { color: "#38bdf8", background: "rgba(56, 189, 248, 0.1)" },
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
  main: { padding: "2rem", maxWidth: "1500px", margin: "0 auto" },
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "1rem",
    marginBottom: "1.5rem",
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
  controls: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    marginBottom: "1.5rem",
    flexWrap: "wrap",
  },
  runBtn: {
    background: "linear-gradient(135deg, #0ea5e9, #2563eb)",
    color: "white",
    border: "none",
    padding: "0.65rem 1.25rem",
    borderRadius: "8px",
    fontWeight: 600,
    fontSize: "0.9rem",
    letterSpacing: "0.03em",
  },
  runBtnSecondary: {
    background: "transparent",
    color: "#cbd5e1",
    border: "1px solid #334155",
    padding: "0.65rem 1.25rem",
    borderRadius: "8px",
    fontWeight: 600,
    fontSize: "0.9rem",
  },
  report: {
    display: "flex",
    gap: "1.25rem",
    padding: "0.55rem 1rem",
    background: "rgba(34, 197, 94, 0.08)",
    border: "1px solid rgba(34, 197, 94, 0.25)",
    borderRadius: "8px",
    fontSize: "0.8rem",
    color: "#cbd5e1",
  },
  reportItem: { color: "#94a3b8" },
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
  tabs: { display: "flex", gap: "0.25rem" },
  tab: {
    background: "transparent",
    border: "1px solid transparent",
    color: "#94a3b8",
    padding: "0.5rem 0.9rem",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: 600,
    letterSpacing: "0.03em",
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
  },
  tabActive: {
    background: "rgba(56, 189, 248, 0.1)",
    color: "#38bdf8",
    border: "1px solid rgba(56, 189, 248, 0.3)",
  },
  tabCount: {
    background: "#38bdf8",
    color: "#0b1220",
    fontSize: "0.7rem",
    fontWeight: 700,
    borderRadius: "999px",
    padding: "0.05rem 0.45rem",
  },
  panelMeta: { fontSize: "0.8rem", color: "#64748b" },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" },
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
  rulePill: {
    fontSize: "0.7rem",
    fontWeight: 700,
    letterSpacing: "0.05em",
    padding: "0.15rem 0.55rem",
    borderRadius: "999px",
    border: "1px solid",
    display: "inline-block",
  },
  reason: {
    fontSize: "0.78rem",
    color: "#94a3b8",
    maxWidth: 420,
    display: "inline-block",
  },
};