import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle,
  ChevronRight,
  Loader2,
  Shield,
  UserCheck,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/ToastHost";
import { useActivitySocket } from "../api/socket";
import ThemeToggle from "../components/ThemeToggle";
import client from "../api/client";

const STATUS_STYLES = {
  OPEN: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500",
  INVESTIGATING: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500",
  RESOLVED: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500",
  CLOSED: "bg-slate-500/15 text-slate-500 dark:text-slate-400 border-slate-500",
  FALSE_POSITIVE: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500",
};

const SEVERITY_STYLES = {
  LOW: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500",
  MEDIUM: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500",
  HIGH: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500",
  CRITICAL: "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500",
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

  useActivitySocket((msg) => {
    if (!msg || msg.event !== "incident.created") return;
    const inc = msg.incident;
    loadIncidents();
    if (inc.severity === "CRITICAL" || inc.severity === "HIGH") {
      pushToast({
        title: `${inc.severity} incident created`,
        body: inc.title,
        severity: inc.severity,
      });
    }
  });

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
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-200 font-sans transition-colors">
      <header className="sticky top-0 z-10 flex justify-between items-center px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 backdrop-blur transition-colors">
        <div className="flex items-center gap-3">
          <Shield size={28} className="text-sky-500 dark:text-sky-400" />
          <div>
            <div className="font-bold tracking-wider text-sky-600 dark:text-sky-400">SentinelX</div>
            <div className="text-[0.65rem] uppercase tracking-[0.15em] text-slate-500">Incidents</div>
          </div>
        </div>

        <nav className="flex gap-1">
  <NavLink to="/dashboard">Dashboard</NavLink>
  <NavLink to="/analytics">Analytics</NavLink>
  <NavLink to="/incidents">Incidents</NavLink>
  <NavLink to="/threat-intel">Threat Intel</NavLink>
  <NavLink to="/playbooks">Playbooks</NavLink>
  <NavLink to="/settings">Settings</NavLink>
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
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 transition-colors">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Incident Queue</h2>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-sm px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 outline-none focus:border-sky-500"
              >
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="text-sm px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 outline-none focus:border-sky-500"
              >
                <option value="">All severities</option>
                {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/15 border border-red-500/40 text-red-700 dark:text-red-200 px-3 py-2 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <Th>Severity</Th>
                  <Th>Status</Th>
                  <Th>Title</Th>
                  <Th>Events</Th>
                  <Th>Detections</Th>
                  <Th>Assignee</Th>
                  <Th>Created</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((i) => (
                  <tr
                    key={i.id}
                    onClick={() => setSelectedId(i.id)}
                    className={
                      "cursor-pointer transition-colors " +
                      (selectedId === i.id
                        ? "bg-sky-500/10"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800/30")
                    }
                  >
                    <Td><Pill cls={SEVERITY_STYLES[i.severity]}>{i.severity}</Pill></Td>
                    <Td><Pill cls={STATUS_STYLES[i.status]}>{i.status}</Pill></Td>
                    <Td><span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{i.title}</span></Td>
                    <Td>{i.event_count}</Td>
                    <Td>{i.detection_count}</Td>
                    <Td>{i.assigned_to_detail?.username || "-"}</Td>
                    <Td mono>{formatTime(i.created_at)}</Td>
                    <Td><ChevronRight size={14} className="text-slate-400" /></Td>
                  </tr>
                ))}
                {!loading && incidents.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-500 italic">
                      No incidents match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {selected && (
        <DetailDrawer
          incident={selected}
          canModify={canModify}
          updating={updating}
          userId={user?.id}
          onClose={() => setSelectedId(null)}
          onStatusChange={updateStatus}
          onAssign={assignToMe}
        />
      )}
    </div>
  );
}

function DetailDrawer({ incident, canModify, updating, userId, onClose, onStatusChange, onAssign }) {
  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      <aside className="fixed top-0 right-0 h-full w-full max-w-xl bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 z-50 overflow-y-auto transition-colors">
        <div className="sticky top-0 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-between items-start gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {incident.title}
            </h3>
            <div className="flex gap-2 mt-2">
              <Pill cls={SEVERITY_STYLES[incident.severity]}>{incident.severity}</Pill>
              <Pill cls={STATUS_STYLES[incident.status]}>{incident.status}</Pill>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-slate-500 hover:border-slate-500"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Assignee">{incident.assigned_to_detail?.username || "unassigned"}</Field>
            <Field label="Created">{formatTime(incident.created_at)}</Field>
            <Field label="Events">{incident.event_count}</Field>
            <Field label="Detections">{incident.detection_count}</Field>
          </div>

          <div>
            <div className="text-[0.7rem] uppercase tracking-[0.12em] text-slate-500 mb-2">
              Description
            </div>
            <pre className="text-xs font-mono whitespace-pre-wrap bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 text-slate-700 dark:text-slate-300">
              {incident.description}
            </pre>
          </div>

          {canModify && (
            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-4">
              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-500 w-20">Status</label>
                <select
                  value={incident.status}
                  disabled={updating}
                  onChange={(e) => onStatusChange(incident.id, e.target.value)}
                  className="flex-1 text-sm px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none focus:border-sky-500"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-500 w-20">Assignee</label>
                {incident.assigned_to === userId ? (
                  <span className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-semibold">
                    <UserCheck size={16} /> Assigned to you
                  </span>
                ) : (
                  <button
                    onClick={() => onAssign(incident.id)}
                    disabled={updating}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-sm font-semibold disabled:opacity-60 transition"
                  >
                    {updating ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
                    Assign to me
                  </button>
                )}
              </div>

              {incident.resolved_at && (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-xs">
                  <CheckCircle size={14} />
                  Resolved {formatTime(incident.resolved_at)}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
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

function Pill({ cls, children }) {
  return (
    <span className={`border px-2.5 py-0.5 rounded-full text-[0.7rem] font-bold tracking-wide ${cls}`}>
      {children}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-[0.65rem] uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className="text-sm text-slate-900 dark:text-slate-200 mt-0.5">{children}</div>
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
  if (!iso) return "-";
  return new Date(iso).toLocaleString();
}
