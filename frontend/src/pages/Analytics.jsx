import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Loader2,
  Shield,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import ThemeToggle from "../components/ThemeToggle";
import client from "../api/client";

const SEVERITY_COLORS = {
  CRITICAL: "#ef4444",
  HIGH: "#f97316",
  MEDIUM: "#eab308",
  LOW: "#22c55e",
};

const RULE_COLORS = {
  BRUTE_FORCE_LOGIN: "#ef4444",
  OFF_HOURS_ADMIN_LOGIN: "#f97316",
  PRIVILEGE_ESCALATION: "#a855f7",
  PORT_SCAN_BURST: "#eab308",
  SUSPICIOUS_EXTERNAL_ACCESS: "#38bdf8",
  HIGH_RISK_CORRELATION: "#94a3b8",
};

export default function Analytics() {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const [data, setData] = useState(null);
  const [days, setDays] = useState(14);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const res = await client.get(`/analytics/summary/?days=${days}`);
      setData(res.data);
    } catch (err) {
      setError("Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const isDark = theme === "dark";
  const axisColor = isDark ? "#64748b" : "#94a3b8";
  const gridColor = isDark ? "#1e293b" : "#e2e8f0";
  const tooltipStyle = isDark
    ? { background: "#0f172a", border: "1px solid #334155", color: "#e2e8f0", borderRadius: 8 }
    : { background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a", borderRadius: 8 };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-200 font-sans transition-colors">
      <header className="sticky top-0 z-10 flex justify-between items-center px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 backdrop-blur transition-colors">
        <div className="flex items-center gap-3">
          <Shield size={28} className="text-sky-500 dark:text-sky-400" />
          <div>
            <div className="font-bold tracking-wider text-sky-600 dark:text-sky-400">SentinelX</div>
            <div className="text-[0.65rem] uppercase tracking-[0.15em] text-slate-500">Analytics</div>
          </div>
        </div>

        <nav className="flex gap-1">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/analytics" active>Analytics</NavLink>
          <NavLink to="/incidents">Incidents</NavLink>
          <NavLink to="/threat-intel">Threat Intel</NavLink>
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

      <main className="p-6 max-w-[1600px] mx-auto">
        {error && (
          <div className="bg-red-500/15 border border-red-500/40 text-red-700 dark:text-red-200 px-3 py-2 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <div className="flex gap-3 flex-wrap">
            <SummaryCard
              label="Events this week"
              value={data?.trends.events_this_week ?? "-"}
              icon={Activity}
              accent="text-sky-500"
              delta={data?.trends.delta_pct}
            />
            <SummaryCard
              label="Detections (14d)"
              value={data?.detections_by_rule.reduce((s, d) => s + d.count, 0) ?? "-"}
              icon={BarChart3}
              accent="text-green-500"
            />
            <SummaryCard
              label="Incidents total"
              value={data?.incidents_by_severity.reduce((s, i) => s + i.count, 0) ?? "-"}
              icon={AlertTriangle}
              accent="text-orange-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">Range</label>
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="text-sm px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 outline-none focus:border-sky-500"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-500">
            <Loader2 className="animate-spin mr-2" size={20} /> Loading analytics?
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Events per day" subtitle={`Last ${days} days`}>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data?.events_per_day || []}>
                  <defs>
                    <linearGradient id="eventGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis
                    dataKey="date"
                    stroke={axisColor}
                    fontSize={11}
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis stroke={axisColor} fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    fill="url(#eventGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Detections by rule" subtitle="Grouped by date">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={pivotDetectionsByRule(data?.detections_by_rule || [])}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis
                    dataKey="date"
                    stroke={axisColor}
                    fontSize={11}
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis stroke={axisColor} fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend
                    wrapperStyle={{ fontSize: 10, color: axisColor }}
                    iconSize={8}
                  />
                  {Object.keys(RULE_COLORS).map((rule) => (
                    <Bar
                      key={rule}
                      dataKey={rule}
                      stackId="a"
                      fill={RULE_COLORS[rule]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Incidents by severity" subtitle="All time">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={data?.incidents_by_severity || []}
                    dataKey="count"
                    nameKey="severity"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={2}
                    label={(entry) => `${entry.severity}: ${entry.count}`}
                    labelLine={false}
                  >
                    {(data?.incidents_by_severity || []).map((entry) => (
                      <Cell
                        key={entry.severity}
                        fill={SEVERITY_COLORS[entry.severity] || "#94a3b8"}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Top source IPs" subtitle="By event count">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={data?.top_source_ips || []}
                  layout="vertical"
                  margin={{ left: 20, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis type="number" stroke={axisColor} fontSize={11} />
                  <YAxis
                    type="category"
                    dataKey="source_ip"
                    stroke={axisColor}
                    fontSize={11}
                    width={120}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}
      </main>
    </div>
  );
}

function pivotDetectionsByRule(rows) {
  const dates = Array.from(new Set(rows.map((r) => r.date))).sort();
  const byDate = {};
  dates.forEach((d) => {
    byDate[d] = { date: d };
  });
  rows.forEach((r) => {
    byDate[r.date][r.rule_name] = r.count;
  });
  return Object.values(byDate);
}

function SummaryCard({ label, value, icon: Icon, accent, delta }) {
  const positive = delta !== undefined && delta >= 0;
  return (
    <div className="rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 px-4 py-3 min-w-[180px] transition-colors">
      <div className="flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        {Icon && <Icon size={12} className={accent} />}
        {label}
      </div>
      <div className="flex items-end gap-2 mt-1">
        <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {value}
        </span>
        {delta !== undefined && (
          <span
            className={
              "flex items-center gap-0.5 text-xs font-semibold mb-1 " +
              (positive ? "text-green-600 dark:text-green-400" : "text-red-500")
            }
          >
            {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {delta}%
          </span>
        )}
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 transition-colors">
      <div className="mb-3">
        <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</div>
        {subtitle && (
          <div className="text-[0.7rem] text-slate-500 dark:text-slate-400">{subtitle}</div>
        )}
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
