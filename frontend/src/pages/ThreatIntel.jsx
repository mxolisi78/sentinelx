import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Shield } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";
import ThemeToggle from "../components/ThemeToggle";
import ThreatBadge from "../components/ThreatBadge";

const SEVERITY_STYLES = {
  LOW: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500",
  MEDIUM: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500",
  HIGH: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500",
  CRITICAL: "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500",
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
  const [lookupIp, setLookupIp] = useState("");
  const [lookupResult, setLookupResult] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);

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

  async function handleLookup(e) {
    e.preventDefault();
    if (!lookupIp.trim()) return;
    setLookingUp(true);
    setLookupResult(null);
    try {
      const res = await client.get(
        `/threatintel/reputations/lookup/?ip=${encodeURIComponent(lookupIp.trim())}`
      );
      setLookupResult(res.data);
    } catch (err) {
      setLookupResult({ error: "Lookup failed" });
    } finally {
      setLookingUp(false);
    }
  }

  const visibleIocs = filterType ? iocs.filter((i) => i.ioc_type === filterType) : iocs;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-200 font-sans transition-colors">
      <header className="sticky top-0 z-10 flex justify-between items-center px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 backdrop-blur transition-colors">
        <div className="flex items-center gap-3">
          <Shield size={28} className="text-sky-500 dark:text-sky-400" />
          <div>
            <div className="font-bold tracking-wider text-sky-600 dark:text-sky-400">SentinelX</div>
            <div className="text-[0.65rem] uppercase tracking-[0.15em] text-slate-500">Threat Intelligence</div>
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
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 transition-colors">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
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
                  <span className="bg-sky-500 text-white dark:text-slate-950 text-[0.65rem] font-bold rounded-full px-2 py-0.5">
                    {t.key === "reputations" ? reputations.length : iocs.length}
                  </span>
                </button>
              ))}
            </div>

            {tab === "reputations" ? (
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="text-sm px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 outline-none focus:border-sky-500"
              >
                <option value="">All categories</option>
                {["CLEAN", "SUSPICIOUS", "MALICIOUS", "TOR_EXIT", "PROXY", "SCANNER", "BOTNET", "SPAM"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            ) : (
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="text-sm px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 outline-none focus:border-sky-500"
              >
                <option value="">All types</option>
                {["IP", "DOMAIN", "URL", "HASH_MD5", "HASH_SHA256", "EMAIL"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}
          </div>

          {tab === "reputations" && (
            <form onSubmit={handleLookup} className="flex gap-2 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={lookupIp}
                  onChange={(e) => setLookupIp(e.target.value)}
                  placeholder="Check an IP address..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 outline-none focus:border-sky-500"
                />
              </div>
              <button
                type="submit"
                disabled={lookingUp}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-sm font-semibold disabled:opacity-60 transition"
              >
                {lookingUp ? "Checking..." : "Look up"}
              </button>
            </form>
          )}

          {lookupResult && (
            <div className="mb-4 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-sm">
              {lookupResult.known ? (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono font-semibold">{lookupResult.ip}</span>
                  <ThreatBadge reputation={lookupResult} />
                  <span className="text-slate-500">
                    Abuse score: <b className="text-slate-700 dark:text-slate-300">{lookupResult.abuse_score}</b>
                  </span>
                  <span className="text-slate-500">{lookupResult.country}</span>
                  <span className="text-slate-500">{lookupResult.asn_owner}</span>
                </div>
              ) : (
                <span className="text-slate-500">
                  No data for <span className="font-mono">{lookupResult.ip || lookupIp}</span>
                </span>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-500/15 border border-red-500/40 text-red-700 dark:text-red-200 px-3 py-2 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

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
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
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
            <tr key={r.id} className="hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-colors">
              <Td mono>{r.ip}</Td>
              <Td><ThreatBadge reputation={r} /></Td>
              <Td>
                <span className={`font-semibold ${scoreColor(r.abuse_score)}`}>
                  {r.abuse_score}
                </span>
              </Td>
              <Td>{r.report_count}</Td>
              <Td mono>{r.country || "-"}</Td>
              <Td mono>{r.asn || "-"}</Td>
              <Td>{r.asn_owner || "-"}</Td>
            </tr>
          ))}
          {!loading && reputations.length === 0 && (
            <tr><td colSpan={7} className="text-center py-8 text-slate-500 italic">No reputations found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function IOCTable({ iocs, loading }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
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
          {iocs.map((ioc) => (
            <tr key={ioc.id} className="hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-colors">
              <Td mono>{ioc.ioc_type}</Td>
              <Td mono>{ioc.value}</Td>
              <Td>
                <span className={`border px-2.5 py-0.5 rounded-full text-[0.7rem] font-bold tracking-wide ${SEVERITY_STYLES[ioc.severity] || SEVERITY_STYLES.MEDIUM}`}>
                  {ioc.severity}
                </span>
              </Td>
              <Td>{ioc.source || "-"}</Td>
              <Td>{ioc.tags || "-"}</Td>
              <Td>{ioc.description || "-"}</Td>
            </tr>
          ))}
          {!loading && iocs.length === 0 && (
            <tr><td colSpan={6} className="text-center py-8 text-slate-500 italic">No IOCs found.</td></tr>
          )}
        </tbody>
      </table>
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

function scoreColor(score) {
  if (score >= 75) return "text-red-500";
  if (score >= 50) return "text-orange-500";
  if (score >= 25) return "text-yellow-600 dark:text-yellow-500";
  return "text-green-600 dark:text-green-400";
}
