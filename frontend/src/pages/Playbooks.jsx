import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Play,
  Power,
  RefreshCw,
  Shield,
  UserCheck,
  XCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "../components/ThemeToggle";
import client from "../api/client";

const TRIGGER_LABELS = {
  SEVERITY: "Severity",
  RULE: "Rule",
  IP_CATEGORY: "IP category",
  MIN_RISK: "Min combined risk",
};

const ACTION_LABELS = {
  SET_STATUS: "Set status",
  SET_SEVERITY: "Set severity",
  ASSIGN_TO: "Assign to",
  ADD_NOTE: "Add note",
  CREATE_EVENT: "Create event",
  NOTIFY: "Send notification",
};

export default function Playbooks() {
  const { user, logout } = useAuth();
  const [playbooks, setPlaybooks] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState({});
  const [updating, setUpdating] = useState(null);

  const canModify = user?.role === "ADMIN" || user?.role === "ANALYST";

  async function loadData() {
    setLoading(true);
    try {
      const [pbs, execs] = await Promise.all([
        client.get("/playbooks/"),
        client.get("/playbook-executions/"),
      ]);
      setPlaybooks(pbs.data);
      setExecutions(execs.data);
    } catch (err) {
      setError("Failed to load playbooks.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function togglePlaybook(id) {
    setUpdating(id);
    try {
      await client.post(`/playbooks/${id}/toggle/`, {});
      await loadData();
    } catch (err) {
      setError("Toggle failed.");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-200 font-sans transition-colors">
      <header className="sticky top-0 z-10 flex justify-between items-center px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 backdrop-blur transition-colors">
        <div className="flex items-center gap-3">
          <Shield size={28} className="text-sky-500 dark:text-sky-400" />
          <div>
            <div className="font-bold tracking-wider text-sky-600 dark:text-sky-400">SentinelX</div>
            <div className="text-[0.65rem] uppercase tracking-[0.15em] text-slate-500">Response Playbooks</div>
          </div>
        </div>

        <nav className="flex gap-1">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/analytics">Analytics</NavLink>
          <NavLink to="/incidents">Incidents</NavLink>
          <NavLink to="/threat-intel">Threat Intel</NavLink>
          <NavLink to="/playbooks" active>Playbooks</NavLink>
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

      <main className="p-6 max-w-[1400px] mx-auto space-y-6">
        {error && (
          <div className="bg-red-500/15 border border-red-500/40 text-red-700 dark:text-red-200 px-3 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">Playbooks</h2>
            <span className="text-xs text-slate-500">
              {playbooks.filter((p) => p.enabled).length} of {playbooks.length} enabled
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <Loader2 className="animate-spin mr-2" size={20} /> Loading playbooks?
            </div>
          ) : (
            <div className="grid gap-3">
              {playbooks.map((p) => (
                <PlaybookCard
                  key={p.id}
                  playbook={p}
                  expanded={!!expanded[p.id]}
                  onToggleExpand={() =>
                    setExpanded((e) => ({ ...e, [p.id]: !e[p.id] }))
                  }
                  onToggleEnabled={() => togglePlaybook(p.id)}
                  updating={updating === p.id}
                  canModify={canModify}
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-bold mb-3">Recent Executions</h2>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden transition-colors">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <Th>Playbook</Th>
                  <Th>Incident</Th>
                  <Th>Result</Th>
                  <Th>Actions</Th>
                  <Th>Time</Th>
                </tr>
              </thead>
              <tbody>
                {executions.slice(0, 20).map((e) => (
                  <tr
                    key={e.id}
                    className="hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <Td>{e.playbook_name}</Td>
                    <Td>
                      <span className="text-xs">{e.incident_title}</span>
                    </Td>
                    <Td>
                      {e.success ? (
                        <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-semibold">
                          <CheckCircle size={12} /> OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 text-xs font-semibold">
                          <XCircle size={12} /> Failed
                        </span>
                      )}
                    </Td>
                    <Td>{e.actions_run?.length || 0}</Td>
                    <Td mono>{formatTime(e.executed_at)}</Td>
                  </tr>
                ))}
                {!loading && executions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-500 italic">
                      No playbook executions yet.
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

function PlaybookCard({ playbook, expanded, onToggleExpand, onToggleEnabled, updating, canModify }) {
  return (
    <div
      className={
        "rounded-xl border bg-white dark:bg-slate-900/60 transition-colors " +
        (playbook.enabled
          ? "border-slate-200 dark:border-slate-800"
          : "border-slate-300 dark:border-slate-800 opacity-60")
      }
    >
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={onToggleExpand}
      >
        <button className="text-slate-400">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{playbook.name}</span>
            {playbook.enabled ? (
              <span className="text-[0.65rem] px-2 py-0.5 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/40 font-bold">
                ENABLED
              </span>
            ) : (
              <span className="text-[0.65rem] px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-500 dark:text-slate-400 border border-slate-500/40 font-bold">
                DISABLED
              </span>
            )}
            <span className="text-[0.65rem] text-slate-500">
              {playbook.execution_count} execution{playbook.execution_count === 1 ? "" : "s"}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {playbook.description}
          </p>
        </div>

        {canModify && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleEnabled();
            }}
            disabled={updating}
            className={
              "p-2 rounded-md border transition " +
              (playbook.enabled
                ? "border-orange-500/40 text-orange-500 hover:bg-orange-500/10"
                : "border-green-500/40 text-green-500 hover:bg-green-500/10")
            }
            title={playbook.enabled ? "Disable" : "Enable"}
          >
            {updating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Power size={14} />
            )}
          </button>
        )}
      </div>

      {expanded && (
        <div className="border-t border-slate-200 dark:border-slate-800 px-4 py-3 grid md:grid-cols-2 gap-4">
          <div>
            <div className="text-[0.7rem] uppercase tracking-[0.12em] text-slate-500 mb-2">
              Trigger
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 font-semibold">
                {TRIGGER_LABELS[playbook.trigger?.type] || playbook.trigger?.type}
              </span>
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {String(playbook.trigger?.value)}
              </span>
            </div>
          </div>

          <div>
            <div className="text-[0.7rem] uppercase tracking-[0.12em] text-slate-500 mb-2">
              Actions ({playbook.actions?.length || 0})
            </div>
            <ol className="space-y-1">
              {(playbook.actions || []).map((a, idx) => (
                <li key={idx} className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-mono w-5">{idx + 1}.</span>
                  <ActionIcon type={a.type} />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {ACTION_LABELS[a.type] || a.type}
                  </span>
                  {typeof a.value === "string" && (
                    <span className="text-slate-500 truncate">?{a.value}?</span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionIcon({ type }) {
  const size = 12;
  if (type === "ASSIGN_TO") return <UserCheck size={size} className="text-purple-500" />;
  if (type === "CREATE_EVENT") return <AlertTriangle size={size} className="text-orange-500" />;
  if (type === "NOTIFY") return <Bell size={size} className="text-yellow-500" />;
  if (type === "ADD_NOTE") return <Play size={size} className="text-sky-500" />;
  return <RefreshCw size={size} className="text-slate-400" />;
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
