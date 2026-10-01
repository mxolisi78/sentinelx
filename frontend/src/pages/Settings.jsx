import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  CheckCircle,
  Loader2,
  Mail,
  MessageSquare,
  Plus,
  Power,
  Send,
  Shield,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "../components/ThemeToggle";
import client from "../api/client";

const TYPE_ICONS = {
  EMAIL: Mail,
  SLACK: MessageSquare,
};

const SEVERITY_COLORS = {
  LOW: "text-green-600 dark:text-green-400",
  MEDIUM: "text-yellow-600 dark:text-yellow-400",
  HIGH: "text-orange-600 dark:text-orange-400",
  CRITICAL: "text-red-600 dark:text-red-400",
};

export default function Settings() {
  const { user, logout } = useAuth();
  const [channels, setChannels] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null); // null | "new" | channel object
  const [testing, setTesting] = useState(null);
  const [testResult, setTestResult] = useState({});

  const canModify = user?.role === "ADMIN" || user?.role === "ANALYST";

  async function loadData() {
    setLoading(true);
    try {
      const [chRes, logsRes] = await Promise.all([
        client.get("/notifications/channels/"),
        client.get("/notifications/logs/"),
      ]);
      setChannels(chRes.data);
      setLogs(logsRes.data);
    } catch (err) {
      setError("Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSave(channelData) {
    try {
      if (channelData.id) {
        await client.put(`/notifications/channels/${channelData.id}/`, channelData);
      } else {
        await client.post("/notifications/channels/", channelData);
      }
      setEditing(null);
      await loadData();
    } catch (err) {
      setError("Save failed: " + (err?.response?.data?.detail || "unknown"));
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this notification channel?")) return;
    try {
      await client.delete(`/notifications/channels/${id}/`);
      await loadData();
    } catch (err) {
      setError("Delete failed.");
    }
  }

  async function handleToggle(id) {
    try {
      await client.post(`/notifications/channels/${id}/toggle/`, {});
      await loadData();
    } catch (err) {
      setError("Toggle failed.");
    }
  }

  async function handleTest(id) {
    setTesting(id);
    try {
      const res = await client.post(`/notifications/channels/${id}/test/`, {});
      setTestResult((tr) => ({ ...tr, [id]: { ok: true, message: "Test sent" } }));
      await loadData();
    } catch (err) {
      const detail =
        err?.response?.data?.error || err?.response?.data?.detail || "Test failed";
      setTestResult((tr) => ({ ...tr, [id]: { ok: false, message: detail } }));
    } finally {
      setTesting(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-200 font-sans transition-colors">
      <header className="sticky top-0 z-10 flex justify-between items-center px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 backdrop-blur transition-colors">
        <div className="flex items-center gap-3">
          <Shield size={28} className="text-sky-500 dark:text-sky-400" />
          <div>
            <div className="font-bold tracking-wider text-sky-600 dark:text-sky-400">SentinelX</div>
            <div className="text-[0.65rem] uppercase tracking-[0.15em] text-slate-500">Settings</div>
          </div>
        </div>

        <nav className="flex gap-1">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/analytics">Analytics</NavLink>
          <NavLink to="/incidents">Incidents</NavLink>
          <NavLink to="/threat-intel">Threat Intel</NavLink>
          <NavLink to="/playbooks">Playbooks</NavLink>
          <NavLink to="/settings" active>Settings</NavLink>
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
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Bell size={18} className="text-sky-500" />
              Notification Channels
            </h2>
            {canModify && (
              <button
                onClick={() => setEditing("new")}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-sm font-semibold transition"
              >
                <Plus size={14} />
                Add channel
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <Loader2 className="animate-spin mr-2" size={20} /> Loading channels?
            </div>
          ) : (
            <div className="grid gap-3">
              {channels.map((ch) => {
                const Icon = TYPE_ICONS[ch.channel_type] || Bell;
                const tr = testResult[ch.id];
                return (
                  <div
                    key={ch.id}
                    className={
                      "rounded-xl border bg-white dark:bg-slate-900/60 px-4 py-3 transition-colors " +
                      (ch.enabled
                        ? "border-slate-200 dark:border-slate-800"
                        : "border-slate-300 dark:border-slate-800 opacity-60")
                    }
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={20} className="text-sky-500" />

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{ch.name}</span>
                          <span className="text-[0.65rem] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/40 font-bold">
                            {ch.channel_type}
                          </span>
                          {ch.auto_notify && (
                            <span className="text-[0.65rem] px-2 py-0.5 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/40 font-bold">
                              AUTO
                            </span>
                          )}
                          <span className={"text-[0.65rem] font-bold " + (SEVERITY_COLORS[ch.min_severity] || "text-slate-500")}>
                            ? {ch.min_severity}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                          {ch.channel_type === "EMAIL"
                            ? (ch.config.recipients || []).join(", ")
                            : ch.config.webhook_url}
                        </div>
                        {tr && (
                          <div
                            className={
                              "text-xs mt-1 " +
                              (tr.ok ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")
                            }
                          >
                            {tr.ok ? "? " : "? "}
                            {tr.message}
                          </div>
                        )}
                      </div>

                      <span className="text-xs text-slate-500">{ch.log_count} sends</span>

                      {canModify && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleTest(ch.id)}
                            disabled={testing === ch.id}
                            title="Send test"
                            className="p-2 rounded-md border border-sky-500/40 text-sky-500 hover:bg-sky-500/10 transition"
                          >
                            {testing === ch.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Send size={14} />
                            )}
                          </button>
                          <button
                            onClick={() => handleToggle(ch.id)}
                            title={ch.enabled ? "Disable" : "Enable"}
                            className={
                              "p-2 rounded-md border transition " +
                              (ch.enabled
                                ? "border-orange-500/40 text-orange-500 hover:bg-orange-500/10"
                                : "border-green-500/40 text-green-500 hover:bg-green-500/10")
                            }
                          >
                            <Power size={14} />
                          </button>
                          <button
                            onClick={() => setEditing(ch)}
                            title="Edit"
                            className="p-2 rounded-md border border-slate-300 dark:border-slate-700 text-slate-500 hover:bg-slate-500/10 transition"
                          >
                            <MessageSquare size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(ch.id)}
                            title="Delete"
                            className="p-2 rounded-md border border-red-500/40 text-red-500 hover:bg-red-500/10 transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {channels.length === 0 && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 px-4 py-8 text-center text-slate-500 italic">
                  No notification channels configured.
                </div>
              )}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-bold mb-3">Recent Sends</h2>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden transition-colors">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <Th>Channel</Th>
                  <Th>Incident</Th>
                  <Th>Result</Th>
                  <Th>Preview</Th>
                  <Th>Time</Th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 25).map((l) => (
                  <tr key={l.id} className="hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-colors">
                    <Td>{l.channel_name}</Td>
                    <Td>
                      <span className="text-xs">{l.incident_title || "-"}</span>
                    </Td>
                    <Td>
                      {l.success ? (
                        <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-semibold">
                          <CheckCircle size={12} /> OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 text-xs font-semibold">
                          <XCircle size={12} /> Failed
                        </span>
                      )}
                    </Td>
                    <Td>
                      <span className="text-xs text-slate-500 dark:text-slate-400 max-w-md inline-block truncate">
                        {l.success ? l.payload_preview : l.error}
                      </span>
                    </Td>
                    <Td mono>{formatTime(l.sent_at)}</Td>
                  </tr>
                ))}
                {!loading && logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-500 italic">
                      No notifications sent yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {editing && (
        <ChannelEditor
          channel={editing === "new" ? null : editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function ChannelEditor({ channel, onSave, onClose }) {
  const [name, setName] = useState(channel?.name || "");
  const [channelType, setChannelType] = useState(channel?.channel_type || "EMAIL");
  const [enabled, setEnabled] = useState(channel?.enabled ?? true);
  const [autoNotify, setAutoNotify] = useState(channel?.auto_notify ?? true);
  const [minSeverity, setMinSeverity] = useState(channel?.min_severity || "HIGH");
  const [emailRecipients, setEmailRecipients] = useState(
    (channel?.config?.recipients || []).join(", ")
  );
  const [webhookUrl, setWebhookUrl] = useState(channel?.config?.webhook_url || "");

  function buildConfig() {
    if (channelType === "EMAIL") {
      return {
        recipients: emailRecipients
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
    }
    return { webhook_url: webhookUrl };
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      id: channel?.id,
      name,
      channel_type: channelType,
      config: buildConfig(),
      enabled,
      auto_notify: autoNotify,
      min_severity: minSeverity,
    });
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />
      <aside className="fixed top-0 right-0 h-full w-full max-w-lg bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 z-50 overflow-y-auto transition-colors">
        <div className="sticky top-0 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-bold">
            {channel ? "Edit channel" : "New notification channel"}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-slate-500 hover:border-slate-500"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Field label="Name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:border-sky-500"
            />
          </Field>

          <Field label="Type">
            <select
              value={channelType}
              onChange={(e) => setChannelType(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:border-sky-500"
            >
              <option value="EMAIL">Email</option>
              <option value="SLACK">Slack webhook</option>
            </select>
          </Field>

          {channelType === "EMAIL" ? (
            <Field label="Recipients (comma-separated)">
              <input
                type="text"
                value={emailRecipients}
                onChange={(e) => setEmailRecipients(e.target.value)}
                placeholder="security@example.com, ops@example.com"
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-slate-900 dark:text-slate-100 outline-none focus:border-sky-500"
              />
            </Field>
          ) : (
            <Field label="Slack webhook URL">
              <input
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-slate-900 dark:text-slate-100 outline-none focus:border-sky-500"
              />
            </Field>
          )}

          <Field label="Minimum severity (auto-notify)">
            <select
              value={minSeverity}
              onChange={(e) => setMinSeverity(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:border-sky-500"
            >
              {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="accent-sky-500"
              />
              Enabled
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoNotify}
                onChange={(e) => setAutoNotify(e.target.checked)}
                className="accent-sky-500"
              />
              Auto-notify on incident creation
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-sm font-semibold"
            >
              Save channel
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-[0.7rem] uppercase tracking-[0.12em] text-slate-500 mb-1.5">
        {label}
      </div>
      {children}
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
