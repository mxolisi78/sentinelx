import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/ToastHost";
import { useActivitySocket } from "../api/socket";
import client from "../api/client";

const STATUS_COLORS = {
  OPEN: { bg: "rgba(239, 68, 68, 0.15)", fg: "#f87171", border: "#ef4444" },
  INVESTIGATING: { bg: "rgba(249, 115, 22, 0.15)", fg: "#fb923c", border: "#f97316" },
  RESOLVED: { bg: "rgba(34, 197, 94, 0.15)", fg: "#4ade80", border: "#22c55e" },
  CLOSED: { bg: "rgba(148, 163, 184, 0.15)", fg: "#94a3b8", border: "#64748b" },
  FALSE_POSITIVE: { bg: "rgba(168, 85, 247, 0.15)", fg: "#c084fc", border: "#a855f7" },
};

const SEVERITY_COLORS = {
  LOW: { bg: "rgba(34, 197, 94, 0.15)", fg: "#4ade80", border: "#22c55e" },
  MEDIUM: { bg: "rgba(234, 179, 8, 0.15)", fg: "#facc15", border: "#eab308" },
  HIGH: { bg: "rgba(249, 115, 22, 0.15)", fg: "#fb923c", border: "#f97316" },
  CRITICAL: { bg: "rgba(239, 68, 68, 0.18)", fg: "#f87171", border: "#ef4444" },
};

const STATUS_OPTIONS = ["OPEN", "INVESTIGATING", "RESOLVED", "CLOSED", "FALSE_POSITIVE"];

export default function Incidents() {
  const { user, logout } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");

  const canModify = user?.role === "ADMIN" || user?.role === "ANALYST";

    const { push: pushToast } = useToast();

  useActivitySocket((msg) => {
    if (!msg || msg.event !== "incident.created") return;

    const inc = msg.incident;

    // Prepend only if not already present
    setIncidents((list) => {
      if (list.some((i) => i.id === inc.id)) return list;
      return [{ ...inc, event_count: 0, detection_count: 0 }, ...list];
    });

    if (inc.severity === "CRITICAL" || inc.severity === "HIGH") {
      pushToast({
        title: `${inc.severity} incident created`,
        body: inc.title,
        severity: inc.severity,
      });
    }
  });

  async function loadIncidents() {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterSeverity) params.severity = filterSeverity;
      const res = await client.get("/incidents/", { params });
      setIncidents(res.data);
    } catch (err) {
      setError("Failed to load incidents.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadIncidents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterSeverity]);

  const selected = useMemo(
    () => incidents.find((i) => i.id === selectedId) || null,
    [incidents, selectedId]
  );

  async function updateStatus(incidentId, newStatus, notes = "") {
    setUpdating(true);
    setError("");
    try {
      await client.post(`/incidents/${incidentId}/status/`, {
        status: newStatus,
        resolution_notes: notes,
      });
      await loadIncidents();
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to update incident.");
    } finally {
      setUpdating(false);
    }
  }

  async function assignToMe(incidentId) {
    setUpdating(true);
    setError("");
    try {
      await client.post(`/incidents/${incidentId}/assign/`, { user_id: user.id });
      await loadIncidents();
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to assign incident.");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.brand}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 2L3 6v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V6l-9-4z" fill="#38bdf8" stroke="#0ea5e9" strokeWidth="1"/>
</svg>
          <div>
            <div style={styles.brandName}>SentinelX</div>
            <div style={styles.brandSub}>Incidents</div>
          </div>
        </div>
        <nav style={styles.nav}>
  <Link to="/dashboard" style={styles.navLink}>Dashboard</Link>
  <Link to="/incidents" style={{ ...styles.navLink, ...styles.navActive }}>
    Incidents
  </Link>
  <Link to="/threat-intel" style={styles.navLink}>Threat Intel</Link>
</nav>
        <div style={styles.userBox}>
          <div style={styles.userInfo}>
            <div style={styles.username}>{user?.username}</div>
            <div style={styles.roleBadge}>{user?.role}</div>
          </div>
          <button style={styles.logoutBtn} onClick={logout}>Sign out</button>
        </div>
      </header>

      <main style={styles.main}>
        <section style={styles.panel}>
          <div style={styles.panelHeader}>
            <h2 style={styles.panelTitle}>Incident Queue</h2>
            <div style={styles.filters}>
              <select
                style={styles.select}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select
                style={styles.select}
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
              >
                <option value="">All severities</option>
                {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <Th>Severity</Th>
                  <Th>Status</Th>
                  <Th>Title</Th>
                  <Th>Events</Th>
                  <Th>Detections</Th>
                  <Th>Assignee</Th>
                  <Th>Created</Th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((i) => (
                  <tr
                    key={i.id}
                    style={{
                      ...styles.row,
                      background: selectedId === i.id ? "rgba(56, 189, 248, 0.08)" : "transparent",
                      cursor: "pointer",
                    }}
                    onClick={() => setSelectedId(i.id)}
                  >
                    <Td><Badge config={SEVERITY_COLORS[i.severity]}>{i.severity}</Badge></Td>
                    <Td><Badge config={STATUS_COLORS[i.status]}>{i.status}</Badge></Td>
                    <Td><span style={styles.titleText}>{i.title}</span></Td>
                    <Td>{i.event_count}</Td>
                    <Td>{i.detection_count}</Td>
                    <Td>{i.assigned_to_detail?.username || "—"}</Td>
                    <Td mono>{formatTime(i.created_at)}</Td>
                  </tr>
                ))}
                {!loading && incidents.length === 0 && (
                  <tr>
                    <td colSpan={7} style={styles.empty}>
                      No incidents match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {selected && (
          <section style={styles.detail}>
            <div style={styles.detailHeader}>
              <h3 style={styles.detailTitle}>{selected.title}</h3>
              <button style={styles.closeBtn} onClick={() => setSelectedId(null)}>×</button>
            </div>

            <div style={styles.detailMeta}>
              <Badge config={SEVERITY_COLORS[selected.severity]}>{selected.severity}</Badge>
              <Badge config={STATUS_COLORS[selected.status]}>{selected.status}</Badge>
              <span style={styles.metaText}>
                Assignee: <b>{selected.assigned_to_detail?.username || "unassigned"}</b>
              </span>
            </div>

            <p style={styles.description}>{selected.description}</p>

            {canModify && (
              <div style={styles.actions}>
                <div style={styles.actionRow}>
                  <label style={styles.actionLabel}>Status</label>
                  <select
                    style={styles.select}
                    value={selected.status}
                    disabled={updating}
                    onChange={(e) => updateStatus(selected.id, e.target.value)}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.actionRow}>
                  <label style={styles.actionLabel}>Assignee</label>
                  {selected.assigned_to === user.id ? (
                    <span style={styles.assignedTag}>Assigned to you</span>
                  ) : (
                    <button
                      style={styles.assignBtn}
                      disabled={updating}
                      onClick={() => assignToMe(selected.id)}
                    >
                      Assign to me
                    </button>
                  )}
                </div>
                {selected.resolved_at && (
                  <div style={styles.resolvedStamp}>
                    Resolved {formatTime(selected.resolved_at)}
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function Badge({ config, children }) {
  return (
    <span
      style={{
        background: config.bg,
        color: config.fg,
        border: `1px solid ${config.border}`,
        padding: "0.15rem 0.55rem",
        borderRadius: "999px",
        fontSize: "0.7rem",
        fontWeight: 600,
        letterSpacing: "0.05em",
      }}
    >
      {children}
    </span>
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
  panel: {
    background: "rgba(15, 23, 42, 0.7)",
    border: "1px solid #1e293b",
    borderRadius: "12px",
    padding: "1.25rem",
    marginBottom: "1.5rem",
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
    flexWrap: "wrap",
    gap: "1rem",
  },
  panelTitle: { margin: 0, fontSize: "1.05rem", color: "#e2e8f0" },
  filters: { display: "flex", gap: "0.5rem" },
  select: {
    background: "#0b1220",
    color: "#e2e8f0",
    border: "1px solid #334155",
    borderRadius: "6px",
    padding: "0.4rem 0.6rem",
    fontSize: "0.8rem",
  },
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
  titleText: { fontSize: "0.85rem", fontWeight: 600, color: "#e2e8f0" },
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
  detail: {
    background: "rgba(15, 23, 42, 0.85)",
    border: "1px solid rgba(56, 189, 248, 0.25)",
    borderRadius: "12px",
    padding: "1.5rem",
  },
  detailHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "0.75rem",
  },
  detailTitle: { margin: 0, fontSize: "1.1rem", color: "#f1f5f9" },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: "#94a3b8",
    fontSize: "1.5rem",
    lineHeight: 1,
    cursor: "pointer",
  },
  detailMeta: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    marginBottom: "1rem",
    flexWrap: "wrap",
  },
  metaText: { fontSize: "0.8rem", color: "#94a3b8" },
  description: {
    whiteSpace: "pre-wrap",
    fontSize: "0.85rem",
    color: "#cbd5e1",
    background: "#0b1220",
    border: "1px solid #1e293b",
    borderRadius: "8px",
    padding: "1rem",
    fontFamily: "ui-monospace, monospace",
    marginBottom: "1rem",
  },
  actions: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    borderTop: "1px solid #1e293b",
    paddingTop: "1rem",
  },
  actionRow: { display: "flex", alignItems: "center", gap: "0.75rem" },
  actionLabel: { fontSize: "0.8rem", color: "#94a3b8", width: 80 },
  assignBtn: {
    background: "linear-gradient(135deg, #0ea5e9, #2563eb)",
    color: "white",
    border: "none",
    padding: "0.4rem 0.9rem",
    borderRadius: "6px",
    fontWeight: 600,
    fontSize: "0.8rem",
    cursor: "pointer",
  },
  assignedTag: {
    color: "#4ade80",
    fontWeight: 600,
    fontSize: "0.8rem",
  },
  resolvedStamp: {
    fontSize: "0.75rem",
    color: "#4ade80",
    marginTop: "0.25rem",
  },
};