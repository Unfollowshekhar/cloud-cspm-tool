import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { EmptyState, SeverityBadge } from "@/components/shared";
import { Crosshair, Warning, Lightning } from "@phosphor-icons/react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const TACTIC_COLORS = {
  "Credential Access": "#FF3B30",
  "Initial Access": "#FF9500",
  "Collection": "#FFCC00",
  "Lateral Movement": "#007AFF",
  "Defense Evasion": "#AF52DE",
  "Impact": "#FF2D55",
};

export default function AttackMapPage() {
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getAttackMappings(), api.getAttackSummary()])
      .then(([mRes, sRes]) => {
        if (mRes.data && !mRes.data.error) setData(mRes.data);
        if (sRes.data) setSummary(sRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#333333] border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || data.total === 0) {
    return (
      <div data-testid="attack-empty">
        <h1 className="font-['Chivo'] text-4xl sm:text-5xl font-black tracking-tight text-white mb-2">MITRE ATT&CK Map</h1>
        <EmptyState icon={Crosshair} title="No ATT&CK Mappings" description="Run a scan to see MITRE ATT&CK technique mappings." />
      </div>
    );
  }

  const tacticData = summary?.tactics
    ? Object.entries(summary.tactics).map(([name, count]) => ({
        name,
        count,
        fill: TACTIC_COLORS[name] || "#666",
      }))
    : [];

  const combined = data.mappings.filter((m) => m.is_combined);
  const individual = data.mappings.filter((m) => !m.is_combined);

  return (
    <div data-testid="attack-map-page">
      <h1 className="font-['Chivo'] text-4xl sm:text-5xl font-black tracking-tight text-white mb-1">MITRE ATT&CK Map</h1>
      <p className="text-[#A1A1AA] text-base mb-6">
        {data.techniques_triggered} techniques triggered | {data.combined_paths} combined attack paths
      </p>

      {/* Combined Paths Alert */}
      {combined.length > 0 && (
        <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-sm p-4 mb-6" data-testid="combined-alert">
          <div className="flex items-center gap-2 mb-2">
            <Warning size={18} weight="fill" className="text-[#FF3B30]" />
            <span className="font-['Chivo'] font-bold text-[#FF3B30]">Combined Attack Paths Detected</span>
          </div>
          {combined.map((m, i) => (
            <div key={i} className="mt-2 pl-6">
              <p className="text-[#FF3B30] text-sm font-medium">{m.technique_name}</p>
              <p className="text-[#A1A1AA] text-xs mt-1">{m.attack_path}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tactic Distribution */}
      <div className="bg-[#0A0A0A] border border-[#222222] rounded-sm p-6 mb-6" data-testid="tactic-chart">
        <h3 className="font-['Chivo'] text-lg font-bold mb-4">Tactic Distribution</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={tacticData} barSize={36}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222222" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "#A1A1AA", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={{ stroke: "#222222" }} tickLine={false} />
            <YAxis tick={{ fill: "#A1A1AA", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "#0A0A0A", border: "1px solid #222222", borderRadius: "2px", fontFamily: "JetBrains Mono", fontSize: 12, color: "#fff" }} />
            <Bar dataKey="count" radius={[2, 2, 0, 0]}>
              {tacticData.map((entry, i) => (<Cell key={i} fill={entry.fill} />))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Technique Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="technique-cards">
        {individual.map((m, i) => (
          <div
            key={i}
            className="bg-[#0A0A0A] border border-[#222222] rounded-sm p-5 hover:border-[#444444] transition-colors duration-200"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-['JetBrains_Mono'] text-xs text-[#007AFF]">{m.technique_id}</span>
              <span
                className="font-['JetBrains_Mono'] text-[10px] px-2 py-0.5 rounded-sm border uppercase tracking-wider"
                style={{
                  color: TACTIC_COLORS[m.tactic] || "#666",
                  borderColor: (TACTIC_COLORS[m.tactic] || "#666") + "33",
                  backgroundColor: (TACTIC_COLORS[m.tactic] || "#666") + "15",
                }}
              >
                {m.tactic}
              </span>
            </div>
            <h4 className="font-['Chivo'] text-sm font-bold text-white mb-2">{m.technique_name}</h4>
            <p className="text-[#A1A1AA] text-xs leading-relaxed mb-3">{m.attack_path}</p>
            <div className="flex items-center gap-2">
              <Lightning size={12} className="text-[#FF9500]" />
              <span className="font-['JetBrains_Mono'] text-xs text-[#FF9500]">+{m.severity_boost} severity boost</span>
            </div>
          </div>
        ))}
      </div>

      {/* ATT&CK Navigator Link */}
      <div className="mt-6 flex justify-center">
        <a
          href="https://mitre-attack.github.io/attack-navigator/"
          target="_blank"
          rel="noopener noreferrer"
          data-testid="attack-navigator-link"
          className="bg-transparent border border-[#222222] text-white rounded-sm px-6 py-2 hover:bg-[#141414] transition-colors duration-150 text-sm"
        >
          View on ATT&CK Navigator
        </a>
      </div>
    </div>
  );
}
