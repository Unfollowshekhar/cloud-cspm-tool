import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { MetricCard, EmptyState, SeverityBadge } from "@/components/shared";
import { SEVERITY_CONFIG, SERVICE_COLORS, SEVERITY_ORDER } from "@/utils/constants";
import {
  ShieldWarning,
  MagnifyingGlass,
  Warning,
  ShieldCheck,
  ArrowRight,
  Clock,
} from "@phosphor-icons/react";
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
} from "recharts";

export default function DashboardPage() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await api.getScanResults();
        if (res.data && !res.data.error) {
          setResults(res.data);
        }
      } catch (e) {
        // No results yet
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
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
      <div data-testid="dashboard-empty">
        <h1 className="font-['Chivo'] text-4xl sm:text-5xl font-black tracking-tight text-white mb-2">
          Dashboard
        </h1>
        <p className="text-[#A1A1AA] text-base mb-10">Cloud Security Posture Management</p>
        <EmptyState
          icon={MagnifyingGlass}
          title="No Scan Results"
          description="Run your first security scan to see findings and risk metrics. Navigate to Run Scan to get started."
        />
        <div className="flex justify-center mt-6">
          <button
            data-testid="go-to-scan-button"
            onClick={() => navigate("/scan")}
            className="bg-white text-black font-semibold rounded-sm px-6 py-2.5 hover:bg-gray-200 transition-colors duration-150 flex items-center gap-2"
          >
            Run First Scan <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

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

  const topFindings = [...(results.findings || [])]
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 5);

  return (
    <div data-testid="dashboard-page">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-['Chivo'] text-4xl sm:text-5xl font-black tracking-tight text-white mb-1">
            Dashboard
          </h1>
          <p className="text-[#A1A1AA] text-base">
            Account {results.account_id} &middot; {results.region}
            {results.demo_mode && (
              <span className="ml-2 font-['JetBrains_Mono'] text-xs px-2 py-0.5 bg-[#007AFF]/10 text-[#007AFF] border border-[#007AFF]/20 rounded-sm uppercase">
                Demo
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[#71717A] text-sm">
          <Clock size={14} />
          <span className="font-['JetBrains_Mono'] text-xs">{results.scan_time}s scan time</span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8" data-testid="metrics-grid">
        <MetricCard label="Total Findings" value={results.total_findings} icon={ShieldWarning} />
        <MetricCard
          label="Critical"
          value={results.findings_by_severity?.CRITICAL || 0}
          severity="CRITICAL"
          icon={Warning}
        />
        <MetricCard
          label="High"
          value={results.findings_by_severity?.HIGH || 0}
          severity="HIGH"
        />
        <MetricCard
          label="Medium"
          value={results.findings_by_severity?.MEDIUM || 0}
          severity="MEDIUM"
        />
        <MetricCard
          label="Low"
          value={results.findings_by_severity?.LOW || 0}
          severity="LOW"
          icon={ShieldCheck}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {/* Severity Bar Chart */}
        <div className="bg-[#0A0A0A] border border-[#222222] rounded-sm p-6" data-testid="severity-chart">
          <h3 className="font-['Chivo'] text-lg font-bold mb-4">Findings by Severity</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={severityData} barSize={32}>
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

        {/* Service Pie Chart */}
        <div className="bg-[#0A0A0A] border border-[#222222] rounded-sm p-6" data-testid="service-chart">
          <h3 className="font-['Chivo'] text-lg font-bold mb-4">Findings by Service</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={serviceData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
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

      {/* Top Risk Findings */}
      <div className="bg-[#0A0A0A] border border-[#222222] rounded-sm p-6" data-testid="top-findings">
        <h3 className="font-['Chivo'] text-lg font-bold mb-4">Top Risk Findings</h3>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#222222]">
              <th className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#A1A1AA] py-3 pr-4">Check</th>
              <th className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#A1A1AA] py-3 pr-4">Title</th>
              <th className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#A1A1AA] py-3 pr-4">Severity</th>
              <th className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#A1A1AA] py-3 pr-4">Score</th>
              <th className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#A1A1AA] py-3">Service</th>
            </tr>
          </thead>
          <tbody>
            {topFindings.map((f) => (
              <tr
                key={f.finding_id}
                className="border-b border-[#222222]/50 hover:bg-[#141414] transition-colors duration-150"
              >
                <td className="py-3 pr-4 font-['JetBrains_Mono'] text-xs text-[#A1A1AA]">{f.check_id}</td>
                <td className="py-3 pr-4 text-white">{f.title}</td>
                <td className="py-3 pr-4"><SeverityBadge severity={f.severity} /></td>
                <td className="py-3 pr-4 font-['JetBrains_Mono'] font-semibold text-white">{f.risk_score}</td>
                <td className="py-3 font-['JetBrains_Mono'] text-xs text-[#A1A1AA]">{f.service}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
