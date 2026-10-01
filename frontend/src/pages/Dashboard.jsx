import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Loader2,
  PlayCircle,
  RefreshCw,
  Shield,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/ToastHost";
import { useActivitySocket } from "../api/socket";
import ThemeToggle from "../components/ThemeToggle";
import ThreatBadge from "../components/ThreatBadge";
import client from "../api/client";

const SEVERITY_STYLES = {
  LOW: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500",
  MEDIUM: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500",
  HIGH: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500",
  CRITICAL: "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500",
};

const RULE_COLORS = {
  BRUTE_FORCE_LOGIN: "text-red-600 dark:text-red-400 border-red-500/40",
  OFF_HOURS_ADMIN_LOGIN: "text-orange-600 dark:text-orange-400 border-orange-500/40",
  PRIVILEGE_ESCALATION: "text-purple-600 dark:text-purple-400 border-purple-500/40",
  PORT_SCAN_BURST: "text-yellow-700 dark:text-yellow-400 border-yellow-500/40",
  SUSPICIOUS_EXTERNAL_ACCESS: "text-sky-600 dark:text-sky-400 border-sky-500/40",
  HIGH_RISK_CORRELATION: "text-slate-500 dark:text-slate-400 border-slate-500/40",
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
  const [liveIncidents, setLiveIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [lastReport, setLastReport] = useState(null);

  const canAnalyze = user?.role === "ADMIN" || user?.role === "ANALYST";
  const { push: pushToast } = useToast();

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

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            events.reduce((s, e) => s + (e.combined_risk_score || 0), 0) / total
          );
    return { total, high, anomalies, avgRisk, detections: detections.length };
  }, [events, detections]);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-200 font-sans transition-colors">
      <header className="sticky top-0 z-10 flex justify-between items-center px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 backdrop-blur transition-colors">
        <div className="flex items-center gap-3">
          <Shield size={28} className="text-sky-500 dark:text-sky-400" />
          <div>
            <div className="font-bold tracking-wider text-sky-600 dark:text-sky-400">SentinelX</div>
            <div className="text-[0.65rem] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-500">
              Security Operations Dashboard
            </div>
          </div>
        </div>

        <nav className="flex gap-1">
  <NavLink to="/dashboard">Dashboard</NavLink>
  <NavLink to="/analytics">Analytics</NavLink>
  <NavLink to="/incidents">Incidents</NavLink>
  <NavLink to="/threat-intel">Threat Intel</NavLink>
  <NavLink to="/playbooks">Playbooks</NavLink>
</nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div className="text-right">
            <div className="text-sm font-semibold">{user?.username}</div>
            <div className="text-[0.65rem] tracking-wider text-sky-600 dark:text-sky-400 border border-sky-500/40 rounded-full px-2 inline-block">
              {user?.role}
            </div>
          </div>
          <button
            onClick={logout}
            className="text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:border-slate-500 text-slate-700 dark:text-slate-300 transition"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="p-6 max-w-[1500px] mx-auto">
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <SummaryCard label="Total Events" value={summary.total} accent="border-sky-500" icon={Activity} />
          <SummaryCard label="High / Critical" value={summary.high} accent="border-orange-500" icon={AlertTriangle} />
          <SummaryCard label="Anomalies" value={summary.anomalies} accent="border-red-500" icon={Zap} />
          <SummaryCard label="Avg Risk" value={summary.avgRisk} accent="border-purple-500" icon={TrendingUp} />
          <SummaryCard label="Detections" value={summary.detections} accent="border-green-500" icon={BarChart3} />
          <SummaryCard label="Live Incidents" value={liveIncidents.length} accent="border-pink-500" icon={AlertTriangle} />
        </section>

        {canAnalyze && (
          <section className="flex items-center gap-3 mb-6 flex-wrap">
            <button
              onClick={() => runDetection(false)}
              disabled={analyzing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-sm font-semibold tracking-wide disabled:opacity-60 disabled:cursor-wait transition"
            >
              {analyzing ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
              {analyzing ? "Running detection?" : "Run Detection"}
            </button>
            <button
              onClick={() => runDetection(true)}
              disabled={analyzing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:border-slate-500 text-slate-700 dark:text-slate-300 text-sm font-semibold disabled:opacity-60 transition"
            >
              <RefreshCw size={16} />
              Full Rescan
            </button>

            {lastReport && (
              <div className="flex gap-4 px-4 py-2 rounded-lg border border-green-500/25 bg-green-500/10 text-xs text-slate-700 dark:text-slate-300">
                <span>Scanned <b>{lastReport.events_scanned}</b></span>
                <span>Created <b>{lastReport.detections_created}</b></span>
                <span>Escalated <b>{lastReport.events_escalated}</b></span>
                <span>Took <b>{lastReport.duration_ms} ms</b></span>
              </div>
            )}
          </section>
        )}

        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 transition-colors">
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-1">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={
                    "px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition " +
                    (tab === t.key
                      ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-transparent")
                  }
                >
                  {t.label}
                  {t.key === "detections" && summary.detections > 0 && (
                    <span className="bg-sky-500 text-white dark:text-slate-950 text-[0.65rem] font-bold rounded-full px-2 py-0.5">
                      {summary.detections}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <span className="text-xs text-slate-500">
              {loading ? "Loading?" : ""}
            </span>
          </div>

          {error && (
            <div className="bg-red-500/15 border border-red-500/40 text-red-700 dark:text-red-200 px-3 py-2 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

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

function NavLink({ to, active, children }) {
  return (
    <Link
      to={to}
      className={
        "text-sm font-semibold px-3 py-1.5 rounded-md transition " +
        (active
          ? "text-sky-600 dark:text-sky-400 bg-sky-500/10"
          : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200")
      }
    >
      {children}
    </Link>
  );
}

function SummaryCard({ label, value, accent, icon: Icon }) {
  return (
    <div className={`rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 border-t-[3px] ${accent} p-4 transition-colors`}>
      <div className="flex justify-between items-start">
        <div className="text-[0.65rem] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
          {label}
        </div>
        {Icon && <Icon size={14} className="text-slate-400 dark:text-slate-500" />}
      </div>
      <div className="text-3xl font-bold mt-1.5 text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  );
}

function EventsTable({ events, loading }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <Th>Type</Th>
            <Th>Severity</Th>
            <Th>Source IP</Th>
            <Th>User</Th>
            <Th>Device</Th>
            <Th>Combined Risk</Th>
            <Th>Anomaly</Th>
            <Th>Time</Th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id} className="hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-colors">
              <Td><span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{e.event_type}</span></Td>
              <Td><SeverityBadge severity={e.severity} /></Td>
              <Td mono>
                {e.source_ip || "?"}
                <ThreatBadge reputation={e.source_ip_reputation} compact />
              </Td>
              <Td>{e.username || "?"}</Td>
              <Td>{e.device || "?"}</Td>
              <Td><RiskMeter score={e.combined_risk_score ?? e.risk_score} /></Td>
              <Td>
                {e.is_anomaly ? (
                  <span className="text-red-500 dark:text-red-400 font-semibold text-xs">? Yes</span>
                ) : (
                  <span className="text-slate-400 dark:text-slate-600">?</span>
                )}
              </Td>
              <Td mono>{formatTime(e.timestamp)}</Td>
            </tr>
          ))}
          {!loading && events.length === 0 && (
            <tr>
              <td colSpan={8} className="text-center py-8 text-slate-500 italic">
                No security events found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function DetectionsTable({ detections, loading }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
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
            <tr key={d.id} className="hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-colors">
              <Td>
                <span
                  className={
                    "text-[0.7rem] font-bold tracking-wide px-2.5 py-0.5 rounded-full border " +
                    (RULE_COLORS[d.rule_name] || "text-slate-500 dark:text-slate-400 border-slate-500/40")
                  }
                >
                  {d.rule_name}
                </span>
              </Td>
              <Td><span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{d.event_type}</span></Td>
              <Td><SeverityBadge severity={d.event_severity} /></Td>
              <Td><ConfidenceBar value={d.confidence} /></Td>
              <Td><span className="text-xs text-slate-500 dark:text-slate-400 max-w-md inline-block">{d.reason}</span></Td>
              <Td>
                {d.auto_escalated ? (
                  <span className="text-red-500 dark:text-red-400 font-semibold text-xs">? Yes</span>
                ) : (
                  <span className="text-slate-400 dark:text-slate-600">?</span>
                )}
              </Td>
              <Td mono>{formatTime(d.created_at)}</Td>
            </tr>
          ))}
          {!loading && detections.length === 0 && (
            <tr>
              <td colSpan={7} className="text-center py-8 text-slate-500 italic">
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
  const cls = SEVERITY_STYLES[severity] || SEVERITY_STYLES.LOW;
  return (
    <span className={`border px-2.5 py-0.5 rounded-full text-[0.72rem] font-semibold tracking-wide ${cls}`}>
      {severity}
    </span>
  );
}

function RiskMeter({ score }) {
  const safe = Math.max(0, Math.min(100, score || 0));
  const color =
    safe >= 80 ? "bg-red-500"
    : safe >= 60 ? "bg-orange-500"
    : safe >= 40 ? "bg-yellow-500"
    : "bg-green-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-slate-300 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${safe}%` }}
        />
      </div>
      <span className="text-xs text-slate-700 dark:text-slate-300 min-w-[24px]">{safe}</span>
    </div>
  );
}

function ConfidenceBar({ value }) {
  const safe = Math.max(0, Math.min(100, value || 0));
  const color = safe >= 80 ? "bg-green-500" : safe >= 60 ? "bg-yellow-500" : "bg-slate-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-slate-300 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${safe}%` }} />
      </div>
      <span className="text-xs text-slate-700 dark:text-slate-300 min-w-[30px]">{safe}%</span>
    </div>
  );
}

function Th({ children }) {
  return (
    <th className="text-left px-3 py-2.5 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold text-[0.72rem] tracking-wider uppercase">
      {children}
    </th>
  );
}

function Td({ children, mono }) {
  return (
    <td className={`px-3 py-2.5 border-b border-slate-200 dark:border-slate-800/60 text-slate-700 dark:text-slate-300 align-middle ${mono ? "font-mono" : ""}`}>
      {children}
    </td>
  );
}

function formatTime(iso) {
  if (!iso) return "?";
  return new Date(iso).toLocaleString();
}
