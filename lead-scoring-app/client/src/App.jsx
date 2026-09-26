import React, { useState, useEffect } from "react";
import { Radar, Loader2, ChevronRight, Sparkles, Trash2 } from "lucide-react";

const API_BASE = "http://localhost:4020";

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600&display=swap');`;

const TIER_META = {
  hot: { label: "Hot", color: "#E8A33D", glow: "rgba(232,163,61,0.35)" },
  warm: { label: "Warm", color: "#7FA8A0", glow: "rgba(127,168,160,0.3)" },
  cold: { label: "Cold", color: "#5C6B73", glow: "rgba(92,107,115,0.25)" },
};

export default function App() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ company: "", industry: "", dealSize: "", source: "", notes: "" });
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/leads`);
      if (!res.ok) throw new Error("Failed to fetch leads");
      setLeads(await res.json());
    } catch (e) {
      setError("Can't reach the API. Is the server running on port 4020?");
    } finally {
      setLoading(false);
    }
  }

  async function scoreLead(id) {
    setLoadingId(id);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/leads/${id}/score`, { method: "POST" });
      if (!res.ok) throw new Error("Scoring failed");
      const updated = await res.json();
      setLeads((prev) =>
        [...prev.map((l) => (l.id === id ? updated : l))].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
      );
    } catch (e) {
      setError("Couldn't score that lead — check your ANTHROPIC_API_KEY in server/.env");
    } finally {
      setLoadingId(null);
    }
  }

  async function addLead() {
    if (!form.company.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const newLead = await res.json();
      setLeads((prev) => [newLead, ...prev]);
      setForm({ company: "", industry: "", dealSize: "", source: "", notes: "" });
      setShowForm(false);
    } catch (e) {
      setError("Couldn't add lead.");
    }
  }

  async function deleteLead(id) {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    try {
      await fetch(`${API_BASE}/api/leads/${id}`, { method: "DELETE" });
    } catch (e) {
      /* silent - refetch would restore it anyway */
    }
  }

  return (
    <div style={styles.page}>
      <style>{FONT_IMPORT}</style>

      <div style={styles.header}>
        <div style={styles.eyebrow}>
          <Radar size={13} strokeWidth={2} />
          <span>LEAD INTELLIGENCE</span>
        </div>
        <h1 style={styles.title}>Lead Scoring Desk</h1>
        <p style={styles.subtitle}>Every lead gets read like a case file — signals in, a score and a reason out.</p>
      </div>

      <div style={styles.toolbar}>
        <button style={styles.addBtn} onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "+ New lead"}
        </button>
      </div>

      {showForm && (
        <div style={styles.formCard}>
          {["company", "industry", "dealSize", "source"].map((field) => (
            <input
              key={field}
              placeholder={field === "dealSize" ? "Deal size (e.g. $12,000/yr)" : field[0].toUpperCase() + field.slice(1)}
              value={form[field]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              style={styles.input}
            />
          ))}
          <textarea
            placeholder="Notes — engagement, replies, budget/timeline signals, anything relevant"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            style={{ ...styles.input, minHeight: 70, resize: "vertical" }}
          />
          <button style={styles.submitBtn} onClick={addLead}>
            Add to desk
          </button>
        </div>
      )}

      {error && <div style={styles.errorBanner}>{error}</div>}
      {loading && <div style={styles.loadingLine}>Loading leads…</div>}

      <div style={styles.list}>
        {leads.map((lead) => {
          const tier = lead.tier ? TIER_META[lead.tier] : null;
          const isOpen = expanded === lead.id;
          const hasScore = typeof lead.score === "number";
          return (
            <div
              key={lead.id}
              style={{
                ...styles.card,
                borderColor: tier ? tier.color : "#2A2E33",
                boxShadow: tier ? `0 0 0 1px ${tier.glow}` : "none",
              }}
            >
              <div style={styles.cardTop} onClick={() => hasScore && setExpanded(isOpen ? null : lead.id)}>
                <div style={styles.gaugeWrap}>
                  <Gauge score={lead.score} color={tier?.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={styles.companyRow}>
                    <span style={styles.companyName}>{lead.company}</span>
                    {tier && (
                      <span style={{ ...styles.tierChip, color: tier.color, borderColor: tier.color }}>
                        {tier.label}
                      </span>
                    )}
                  </div>
                  <div style={styles.meta}>
                    {lead.industry} · {lead.dealSize} · {lead.source}
                  </div>
                </div>
                <button
                  style={styles.deleteBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteLead(lead.id);
                  }}
                  title="Remove lead"
                >
                  <Trash2 size={14} />
                </button>
                {hasScore && (
                  <ChevronRight
                    size={16}
                    style={{
                      transform: isOpen ? "rotate(90deg)" : "none",
                      transition: "transform 0.15s ease",
                      color: "#5C6B73",
                      flexShrink: 0,
                    }}
                  />
                )}
              </div>

              {!hasScore && (
                <button style={styles.scoreBtn} onClick={() => scoreLead(lead.id)} disabled={loadingId === lead.id}>
                  {loadingId === lead.id ? (
                    <>
                      <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Reading signals…
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} /> Score this lead
                    </>
                  )}
                </button>
              )}

              {hasScore && isOpen && (
                <div style={styles.detail}>
                  <p style={styles.reasoning}>{lead.reasoning}</p>
                  <div style={styles.factorsRow}>
                    {lead.keyFactors?.map((f, i) => (
                      <span key={i} style={styles.factorChip}>
                        {f}
                      </span>
                    ))}
                  </div>
                  <div style={styles.actionLine}>
                    <span style={styles.actionLabel}>NEXT STEP</span>
                    <span style={styles.actionText}>{lead.recommendedAction}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Gauge({ score, color }) {
  const pct = typeof score === "number" ? score : 0;
  const r = 26;
  const c = 2 * Math.PI * r;
  const arc = (pct / 100) * (c / 2);
  return (
    <svg width="64" height="40" viewBox="0 0 64 40">
      <path d="M 6 34 A 26 26 0 0 1 58 34" fill="none" stroke="#2A2E33" strokeWidth="5" strokeLinecap="round" />
      {typeof score === "number" && (
        <path
          d="M 6 34 A 26 26 0 0 1 58 34"
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${arc} ${c}`}
        />
      )}
      <text
        x="32"
        y="30"
        textAnchor="middle"
        fontFamily="'IBM Plex Mono', monospace"
        fontSize="15"
        fontWeight="600"
        fill={typeof score === "number" ? color : "#5C6B73"}
      >
        {typeof score === "number" ? score : "—"}
      </text>
    </svg>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#14171A",
    color: "#E8E6E1",
    fontFamily: "'Inter', sans-serif",
    padding: "32px 20px 60px",
    maxWidth: 640,
    margin: "0 auto",
  },
  header: { marginBottom: 24 },
  eyebrow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    color: "#E8A33D",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    letterSpacing: "0.12em",
    marginBottom: 10,
  },
  title: { fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 32, margin: 0, letterSpacing: "-0.01em" },
  subtitle: { color: "#9CA6AC", fontSize: 14, marginTop: 8, lineHeight: 1.5 },
  toolbar: { marginBottom: 14 },
  addBtn: {
    background: "transparent",
    border: "1px solid #3A3F44",
    color: "#E8E6E1",
    borderRadius: 6,
    padding: "8px 14px",
    fontFamily: "'Inter', sans-serif",
    fontSize: 13,
    cursor: "pointer",
  },
  formCard: {
    background: "#1B1F23",
    border: "1px solid #2A2E33",
    borderRadius: 10,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginBottom: 20,
  },
  input: {
    background: "#14171A",
    border: "1px solid #2A2E33",
    borderRadius: 6,
    padding: "9px 11px",
    color: "#E8E6E1",
    fontFamily: "'Inter', sans-serif",
    fontSize: 13,
    outline: "none",
  },
  submitBtn: {
    background: "#E8A33D",
    color: "#14171A",
    border: "none",
    borderRadius: 6,
    padding: "9px 14px",
    fontFamily: "'Inter', sans-serif",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
    alignSelf: "flex-start",
  },
  errorBanner: {
    background: "rgba(200,80,80,0.12)",
    border: "1px solid rgba(200,80,80,0.4)",
    color: "#E8A0A0",
    borderRadius: 6,
    padding: "8px 12px",
    fontSize: 13,
    marginBottom: 14,
  },
  loadingLine: { color: "#7C868C", fontSize: 13, marginBottom: 14 },
  list: { display: "flex", flexDirection: "column", gap: 12 },
  card: { background: "#1B1F23", border: "1px solid #2A2E33", borderRadius: 10, padding: 14, transition: "border-color 0.2s ease" },
  cardTop: { display: "flex", alignItems: "center", gap: 10, cursor: "pointer" },
  gaugeWrap: { flexShrink: 0 },
  companyRow: { display: "flex", alignItems: "center", gap: 8 },
  companyName: { fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 16 },
  tierChip: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10,
    letterSpacing: "0.06em",
    border: "1px solid",
    borderRadius: 20,
    padding: "1px 8px",
  },
  meta: { color: "#7C868C", fontSize: 12.5, marginTop: 3 },
  deleteBtn: {
    background: "none",
    border: "none",
    color: "#5C6B73",
    cursor: "pointer",
    padding: 4,
    flexShrink: 0,
    display: "flex",
  },
  scoreBtn: {
    marginTop: 12,
    width: "100%",
    background: "#22262A",
    border: "1px solid #2A2E33",
    color: "#E8E6E1",
    borderRadius: 6,
    padding: "9px 0",
    fontFamily: "'Inter', sans-serif",
    fontSize: 13,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  detail: { marginTop: 14, paddingTop: 14, borderTop: "1px solid #2A2E33" },
  reasoning: { fontSize: 13.5, lineHeight: 1.55, color: "#C8CDD1", margin: 0 },
  factorsRow: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 },
  factorChip: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    background: "#14171A",
    border: "1px solid #2A2E33",
    borderRadius: 4,
    padding: "3px 8px",
    color: "#9CA6AC",
  },
  actionLine: { marginTop: 12, display: "flex", flexDirection: "column", gap: 3 },
  actionLabel: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.1em", color: "#E8A33D" },
  actionText: { fontSize: 13, color: "#E8E6E1" },
};
