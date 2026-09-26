const CATEGORY_STYLES = {
  TOR_EXIT:   { bg: "rgba(168, 85, 247, 0.18)", fg: "#c084fc", border: "#a855f7", label: "TOR" },
  MALICIOUS:  { bg: "rgba(239, 68, 68, 0.20)",  fg: "#f87171", border: "#ef4444", label: "MAL" },
  BOTNET:     { bg: "rgba(239, 68, 68, 0.20)",  fg: "#f87171", border: "#ef4444", label: "BOT" },
  SPAM:       { bg: "rgba(239, 68, 68, 0.15)",  fg: "#f87171", border: "#ef4444", label: "SPAM" },
  SCANNER:    { bg: "rgba(249, 115, 22, 0.15)", fg: "#fb923c", border: "#f97316", label: "SCAN" },
  SUSPICIOUS: { bg: "rgba(234, 179, 8, 0.15)",  fg: "#facc15", border: "#eab308", label: "SUS" },
  PROXY:      { bg: "rgba(56, 189, 248, 0.15)", fg: "#7dd3fc", border: "#38bdf8", label: "PROXY" },
  CLEAN:      { bg: "rgba(34, 197, 94, 0.12)",  fg: "#4ade80", border: "#22c55e", label: "OK" },
  UNKNOWN:    { bg: "rgba(148, 163, 184, 0.12)", fg: "#94a3b8", border: "#64748b", label: "?" },
};

export default function ThreatBadge({ reputation, compact = false }) {
  if (!reputation) {
    return <span style={{ color: "#475569", fontSize: "0.75rem" }}>?</span>;
  }

  const c = CATEGORY_STYLES[reputation.category] || CATEGORY_STYLES.UNKNOWN;

  if (compact) {
    return (
      <span
        title={`${reputation.category} (score ${reputation.abuse_score})`}
        style={{
          display: "inline-block",
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: c.fg,
          marginLeft: 6,
        }}
      />
    );
  }

  return (
    <span
      title={`${reputation.category} ? score ${reputation.abuse_score} ? ${reputation.report_count} reports`}
      style={{
        background: c.bg,
        color: c.fg,
        border: `1px solid ${c.border}`,
        padding: "0.1rem 0.45rem",
        borderRadius: "999px",
        fontSize: "0.65rem",
        fontWeight: 700,
        letterSpacing: "0.05em",
        display: "inline-block",
        marginLeft: 6,
      }}
    >
      {c.label}
    </span>
  );
}
