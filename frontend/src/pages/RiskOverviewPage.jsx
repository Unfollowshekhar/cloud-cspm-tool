import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { SeverityBadge, EmptyState } from "@/components/shared";
import { SEVERITY_CONFIG, SERVICE_COLORS, SEVERITY_ORDER } from "@/utils/constants";
import { ChartBar } from "@phosphor-icons/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export default function RiskOverviewPage() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getScanResults()
      .then((res) => {
        if (res.data && !res.data.error) setResults(res.data);
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

  if (!results) {
    return (
      <div data-testid="risk-empty">
        <h1 className="font-['Chivo'] text-4xl sm:text-5xl font-black tracking-tight text-white mb-2">
          Risk Overview
        </h1>
        <EmptyState
          icon={ChartBar}
          title="No Risk Data"
          description="Run a security scan to generate risk analysis."
        />
      </div>
    );
  }

  const findings = results.findings || [];

  const severityData = SEVERITY_ORDER.map((s) => ({
    name: s,
    count: results.findings_by_severity?.[s] || 0,
    fill: SEVERITY_CONFIG[s].color,
  }));

  const serviceData = Object.entries(results.findings_by_service || {}).map(([name, count]) => ({
    name,
    value: count,
    color: SERVICE_COLORS[name] || "#666",
  }));

  const topFindings = [...findings]
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 10);

  // Score distribution for histogram
  const scoreRanges = [
    { range: "9.0-10.0", min: 9.0, max: 10.01 },
    { range: "7.0-8.9", min: 7.0, max: 9.0 },
    { range: "4.0-6.9", min: 4.0, max: 7.0 },
    { range: "1.0-3.9", min: 1.0, max: 4.0 },
  ];
  const scoreDistribution = scoreRanges.map((r, i) => ({
    range: r.range,
    count: findings.filter((f) => f.risk_score >= r.min && f.risk_score < r.max).length,
    fill: [SEVERITY_CONFIG.CRITICAL.color, SEVERITY_CONFIG.HIGH.color, SEVERITY_CONFIG.MEDIUM.color, SEVERITY_CONFIG.LOW.color][i],
  }));

  return (
    <div data-testid="risk-overview-page">
      <h1 className="font-['Chivo'] text-4xl sm:text-5xl font-black tracking-tight text-white mb-1">
        Risk Overview
      </h1>
      <p className="text-[#A1A1AA] text-base mb-8">
        Aggregated risk analysis of {findings.length} findings
      </p>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {/* Severity Bar */}
        <div className="bg-[#0A0A0A] border border-[#222222] rounded-sm p-6" data-testid="risk-severity-chart">
          <h3 className="font-['Chivo'] text-lg font-bold mb-4">Findings by Severity</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={severityData} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222222" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: "#A1A1AA", fontSize: 11, fontFamily: "JetBrains Mono" }}
                axisLine={{ stroke: "#222222" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#A1A1AA", fontSize: 11, fontFamily: "JetBrains Mono" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#0A0A0A",
                  border: "1px solid #222222",
                  borderRadius: "2px",
                  fontFamily: "JetBrains Mono",
                  fontSize: 12,
                  color: "#fff",
                }}
              />
              <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                {severityData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Service Pie */}
        <div className="bg-[#0A0A0A] border border-[#222222] rounded-sm p-6" data-testid="risk-service-chart">
          <h3 className="font-['Chivo'] text-lg font-bold mb-4">Findings by Service</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={serviceData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={95}
                dataKey="value"
                stroke="none"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {serviceData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#0A0A0A",
                  border: "1px solid #222222",
                  borderRadius: "2px",
                  fontFamily: "JetBrains Mono",
                  fontSize: 12,
                  color: "#fff",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Score Distribution */}
      <div className="bg-[#0A0A0A] border border-[#222222] rounded-sm p-6 mb-8" data-testid="risk-score-distribution">
        <h3 className="font-['Chivo'] text-lg font-bold mb-4">Risk Score Distribution</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={scoreDistribution} barSize={50}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222222" vertical={false} />
            <XAxis
              dataKey="range"
              tick={{ fill: "#A1A1AA", fontSize: 11, fontFamily: "JetBrains Mono" }}
              axisLine={{ stroke: "#222222" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#A1A1AA", fontSize: 11, fontFamily: "JetBrains Mono" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "#0A0A0A",
                border: "1px solid #222222",
                borderRadius: "2px",
                fontFamily: "JetBrains Mono",
                fontSize: 12,
                color: "#fff",
              }}
            />
            <Bar dataKey="count" radius={[2, 2, 0, 0]}>
              {scoreDistribution.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top 10 Findings Table */}
      <div className="bg-[#0A0A0A] border border-[#222222] rounded-sm p-6" data-testid="risk-top-findings">
        <h3 className="font-['Chivo'] text-lg font-bold mb-4">Top 10 Highest Risk Findings</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#222222]">
                <th className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#A1A1AA] py-3 pr-4">
                  #
                </th>
                <th className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#A1A1AA] py-3 pr-4">
                  Check
                </th>
                <th className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#A1A1AA] py-3 pr-4">
                  Title
                </th>
                <th className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#A1A1AA] py-3 pr-4">
                  Severity
                </th>
                <th className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#A1A1AA] py-3 pr-4">
                  Score
                </th>
                <th className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#A1A1AA] py-3 pr-4">
                  Resource
                </th>
                <th className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#A1A1AA] py-3">
                  Service
                </th>
              </tr>
            </thead>
            <tbody>
              {topFindings.map((f, i) => (
                <tr
                  key={f.finding_id}
                  className="border-b border-[#222222]/50 hover:bg-[#141414] transition-colors duration-150"
                >
                  <td className="py-3 pr-4 font-['JetBrains_Mono'] text-xs text-[#71717A]">
                    {i + 1}
                  </td>
                  <td className="py-3 pr-4 font-['JetBrains_Mono'] text-xs text-[#A1A1AA]">
                    {f.check_id}
                  </td>
                  <td className="py-3 pr-4 text-white">{f.title}</td>
                  <td className="py-3 pr-4">
                    <SeverityBadge severity={f.severity} />
                  </td>
                  <td className="py-3 pr-4 font-['JetBrains_Mono'] font-semibold text-white">
                    {f.risk_score}
                  </td>
                  <td className="py-3 pr-4 font-['JetBrains_Mono'] text-xs text-[#A1A1AA] max-w-[200px] truncate">
                    {f.resource_id}
                  </td>
                  <td className="py-3 font-['JetBrains_Mono'] text-xs text-[#A1A1AA]">
                    {f.service}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
