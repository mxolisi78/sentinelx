import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";
import ThreatBadge from "../components/ThreatBadge";

const SEVERITY_COLORS = {
  LOW: { bg: "rgba(34, 197, 94, 0.15)", fg: "#4ade80", border: "#22c55e" },
  MEDIUM: { bg: "rgba(234, 179, 8, 0.15)", fg: "#facc15", border: "#eab308" },
  HIGH: { bg: "rgba(249, 115, 22, 0.15)", fg: "#fb923c", border: "#f97316" },
  CRITICAL: { bg: "rgba(239, 68, 68, 0.18)", fg: "#f87171", border: "#ef4444" },
};

const TABS = [
  { key: "reputations", label: "IP Reputations" },
  { key: "iocs", label: "IOCs" },
];

export default function ThreatIntel() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState("reputations");
  const [reputations, setReputations] = useState([]);
  const [iocs, setIocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterType, setFilterType] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const params = {};
      if (filterCategory) params.category = filterCategory;

      const [repsRes, iocsRes] = await Promise.all([
        client.get("/threatintel/reputations/", { params }),
        client.get("/threatintel/iocs/"),
      ]);
      setReputations(repsRes.data);
      setIocs(iocsRes.data);
    } catch (err) {
      setError("Failed to load threat intel.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCategory]);

  const visibleIocs = filterType
    ? iocs.filter((i) => i.ioc_type === filterType)
    : iocs;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.brand}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 2L3 6v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V6l-9-4z" fill="#38bdf8" stroke="#0ea5e9" strokeWidth="1"/>
</svg>
          <div>
            <div style={styles.brandName}>SentinelX</div>
            <div style={styles.brandSub}>Threat Intelligence</div>
          </div>
        </div>
        <nav style={styles.nav}>
          <Link to="/dashboard" style={styles.navLink}>Dashboard</Link>
          <Link to="/incidents" style={styles.navLink}>Incidents</Link>
          <Link to="/threat-intel" style={{ ...styles.navLink, ...styles.navActive }}>Threat Intel</Link>
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
            <div style={styles.tabs}>
              {TABS.map((t) => (
                <button
                  key={t.key}
                  style={{ ...styles.tab, ...(tab === t.key ? styles.tabActive : {}) }}
                  onClick={() => setTab(t.key)}
                >
                  {t.label}
                  <span style={styles.tabCount}>
                    {t.key === "reputations" ? reputations.length : iocs.length}
                  </span>
                </button>
              ))}
            </div>

            {tab === "reputations" ? (
              <select
                style={styles.select}
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="">All categories</option>
                {["CLEAN", "SUSPICIOUS", "MALICIOUS", "TOR_EXIT", "PROXY", "SCANNER", "BOTNET", "SPAM"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            ) : (
              <select
                style={styles.select}
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="">All types</option>
                {["IP", "DOMAIN", "URL", "HASH_MD5", "HASH_SHA256", "EMAIL"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}
          </div>

          {error && <div style={styles.error}>{error}</div>}

          {tab === "reputations" ? (
            <ReputationTable reputations={reputations} loading={loading} />
          ) : (
            <IOCTable iocs={visibleIocs} loading={loading} />
          )}
        </section>
      </main>
    </div>
  );
}

function ReputationTable({ reputations, loading }) {
  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <Th>IP</Th>
            <Th>Category</Th>
            <Th>Abuse Score</Th>
            <Th>Reports</Th>
            <Th>Country</Th>
            <Th>ASN</Th>
            <Th>Owner</Th>
          </tr>
        </thead>
        <tbody>
          {reputations.map((r) => (
            <tr key={r.id} style={styles.row}>
              <Td mono>{r.ip}</Td>
              <Td><ThreatBadge reputation={r} /></Td>
              <Td>
                <span style={{ color: scoreColor(r.abuse_score), fontWeight: 600 }}>
                  {r.abuse_score}
                </span>
              </Td>
              <Td>{r.report_count}</Td>
              <Td mono>{r.country || "?"}</Td>
              <Td mono>{r.asn || "?"}</Td>
              <Td>{r.asn_owner || "?"}</Td>
            </tr>
          ))}
          {!loading && reputations.length === 0 && (
            <tr><td colSpan={7} style={styles.empty}>No reputations found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function IOCTable({ iocs, loading }) {
  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <Th>Type</Th>
            <Th>Value</Th>
            <Th>Severity</Th>
            <Th>Source</Th>
            <Th>Tags</Th>
            <Th>Description</Th>
          </tr>
        </thead>
        <tbody>
          {iocs.map((ioc) => {
            const c = SEVERITY_COLORS[ioc.severity] || SEVERITY_COLORS.MEDIUM;
            return (
              <tr key={ioc.id} style={styles.row}>
                <Td mono>{ioc.ioc_type}</Td>
                <Td mono>{ioc.value}</Td>
                <Td>
                  <span
                    style={{
                      background: c.bg, color: c.fg, border: `1px solid ${c.border}`,
                      padding: "0.15rem 0.55rem", borderRadius: "999px",
                      fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.05em",
                    }}
                  >
                    {ioc.severity}
                  </span>
                </Td>
                <Td>{ioc.source || "?"}</Td>
                <Td>{ioc.tags || "?"}</Td>
                <Td>{ioc.description || "?"}</Td>
              </tr>
            );
          })}
          {!loading && iocs.length === 0 && (
            <tr><td colSpan={6} style={styles.empty}>No IOCs found.</td></tr>
          )}
        </tbody>
      </table>
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

function scoreColor(score) {
  if (score >= 75) return "#ef4444";
  if (score >= 50) return "#f97316";
  if (score >= 25) return "#eab308";
  return "#4ade80";
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(circle at 20% 0%, #0b1220 0%, #020617 55%, #000 100%)",
    color: "#e2e8f0",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "1rem 2rem", borderBottom: "1px solid #1e293b",
    background: "rgba(2, 6, 23, 0.75)", backdropFilter: "blur(8px)",
    position: "sticky", top: 0, zIndex: 10,
  },
  brand: { display: "flex", alignItems: "center", gap: "0.75rem" },
  logo: { fontSize: "1.75rem" },
  brandName: { fontWeight: 700, letterSpacing: "0.05em", color: "#38bdf8" },
  brandSub: { fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#64748b" },
  nav: { display: "flex", gap: "0.5rem" },
  navLink: { color: "#94a3b8", textDecoration: "none", fontSize: "0.85rem", fontWeight: 600, padding: "0.4rem 0.8rem", borderRadius: "6px" },
  navActive: { color: "#38bdf8", background: "rgba(56, 189, 248, 0.1)" },
  userBox: { display: "flex", alignItems: "center", gap: "1rem" },
  userInfo: { textAlign: "right" },
  username: { fontSize: "0.85rem", fontWeight: 600 },
  roleBadge: {
    fontSize: "0.65rem", letterSpacing: "0.1em", color: "#38bdf8",
    border: "1px solid rgba(56, 189, 248, 0.4)", padding: "0.05rem 0.45rem",
    borderRadius: "999px", display: "inline-block", marginTop: "0.15rem",
  },
  logoutBtn: {
    background: "transparent", border: "1px solid #334155", color: "#cbd5e1",
    padding: "0.4rem 0.75rem", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem",
  },
  main: { padding: "2rem", maxWidth: "1500px", margin: "0 auto" },
  panel: {
    background: "rgba(15, 23, 42, 0.7)", border: "1px solid #1e293b",
    borderRadius: "12px", padding: "1.25rem",
  },
  panelHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: "1rem", flexWrap: "wrap", gap: "1rem",
  },
  tabs: { display: "flex", gap: "0.25rem" },
  tab: {
    background: "transparent", border: "1px solid transparent", color: "#94a3b8",
    padding: "0.5rem 0.9rem", borderRadius: "8px", cursor: "pointer",
    fontSize: "0.85rem", fontWeight: 600, letterSpacing: "0.03em",
    display: "flex", alignItems: "center", gap: "0.4rem",
  },
  tabActive: {
    background: "rgba(56, 189, 248, 0.1)", color: "#38bdf8",
    border: "1px solid rgba(56, 189, 248, 0.3)",
  },
  tabCount: {
    background: "#38bdf8", color: "#0b1220", fontSize: "0.7rem",
    fontWeight: 700, borderRadius: "999px", padding: "0.05rem 0.45rem",
  },
  select: {
    background: "#0b1220", color: "#e2e8f0", border: "1px solid #334155",
    borderRadius: "6px", padding: "0.4rem 0.6rem", fontSize: "0.8rem",
  },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" },
  th: {
    textAlign: "left", padding: "0.6rem 0.75rem", borderBottom: "1px solid #1e293b",
    color: "#94a3b8", fontWeight: 600, fontSize: "0.72rem",
    letterSpacing: "0.08em", textTransform: "uppercase",
  },
  td: {
    padding: "0.65rem 0.75rem", borderBottom: "1px solid rgba(30, 41, 59, 0.6)",
    color: "#cbd5e1", verticalAlign: "middle",
  },
  row: { transition: "background 0.15s" },
  empty: { padding: "2rem", textAlign: "center", color: "#64748b", fontStyle: "italic" },
  error: {
    background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)",
    color: "#fecaca", padding: "0.6rem 0.75rem", borderRadius: "8px",
    fontSize: "0.85rem", marginBottom: "1rem",
  },
};
