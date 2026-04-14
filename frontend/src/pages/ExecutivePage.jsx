import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { MetricCard, EmptyState } from "@/components/shared";
import { PresentationChart, ShieldWarning, Warning, ChartBar, Clock } from "@phosphor-icons/react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, RadialBarChart, RadialBar,
} from "recharts";
import { SEVERITY_CONFIG, SEVERITY_ORDER } from "@/utils/constants";

export default function ExecutivePage() {
  const [results, setResults] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    Promise.all([api.getScanResults(), api.getScanHistory()])
      .then(([rRes, hRes]) => {
        if (rRes.data && !rRes.data.error) setResults(rRes.data);
        if (hRes.data) setHistory(hRes.data.history || []);
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
      <div data-testid="executive-empty">
        <h1 className="font-['Chivo'] text-4xl sm:text-5xl font-black tracking-tight text-white mb-2">Executive View</h1>
        <EmptyState icon={PresentationChart} title="No Data Available" description="Run a scan to generate executive insights." />
      </div>
    );
  }

  const findings = results.findings || [];
  const avgScore = findings.length > 0 ? (findings.reduce((s, f) => s + f.risk_score, 0) / findings.length).toFixed(1) : 0;
  const overallScore = parseFloat(avgScore);
  const riskTier = overallScore >= 8 ? "CRITICAL" : overallScore >= 6 ? "HIGH" : overallScore >= 3.5 ? "MEDIUM" : "LOW";
  const gaugeColor = overallScore >= 8 ? "#FF3B30" : overallScore >= 6 ? "#FF9500" : overallScore >= 3.5 ? "#FFCC00" : "#34C759";

  const gaugeData = [{ name: "Risk", value: overallScore, fill: gaugeColor }];

  // Compliance per service
  const complianceData = Object.entries(results.findings_by_service || {}).map(([service, count]) => {
    const totalRules = service === "IAM" ? 7 : service === "S3" ? 6 : service === "EC2" ? 5 : service === "CloudTrail" ? 4 : service === "KMS" ? 2 : 3;
    const uniqueChecks = new Set(findings.filter((f) => f.service === service).map((f) => f.check_id)).size;
    const passRate = Math.round(((totalRules - uniqueChecks) / totalRules) * 100);
    return { service, pass: passRate, fail: 100 - passRate };
  });

  // Top 5 critical risks in plain language
  const plainLanguage = {
    "IAM-001": { title: "Root account has unrestricted access", impact: "Full AWS account takeover possible" },
    "IAM-002": { title: "Root account lacks multi-factor auth", impact: "Single password compromise = full access" },
    "S3-001": { title: "Data storage is publicly exposed", impact: "Sensitive data leak to the internet" },
    "S3-006": { title: "External parties can upload to storage", impact: "Malware distribution via your infrastructure" },
    "EC2-003": { title: "Servers exposed to all internet traffic", impact: "Any vulnerability can be exploited remotely" },
    "CT-001": { title: "Security monitoring is disabled", impact: "Attacks go completely undetected" },
    "CT-002": { title: "Audit logging is turned off", impact: "No evidence trail for incident response" },
  };

  const topCritical = findings
    .filter((f) => f.severity === "CRITICAL")
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 5)
    .map((f) => ({
      ...f,
      plain: plainLanguage[f.check_id] || { title: f.title, impact: f.description.slice(0, 60) },
    }));

  // Trend data from history
  const trendData = [...history]
    .reverse()
    .slice(-10)
    .map((h) => ({
      scan: h.timestamp ? new Date(h.timestamp).toLocaleDateString() : "",
      avg_risk: h.avg_risk_score || 0,
      findings: h.total_findings || 0,
    }));

  const handleExportPdf = () => {
    const url = api.getReportPdf();
    window.open(`${url}?token=${token}`, "_blank");
  };

  return (
    <div data-testid="executive-page">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-['Chivo'] text-4xl sm:text-5xl font-black tracking-tight text-white mb-1">Executive View</h1>
          <p className="text-[#A1A1AA] text-base">Security posture summary for stakeholders</p>
        </div>
        <button
          data-testid="export-pdf-button"
          onClick={handleExportPdf}
          className="bg-white text-black font-semibold rounded-sm px-6 py-2 hover:bg-gray-200 transition-colors duration-150 text-sm"
        >
          Export PDF Report
        </button>
      </div>

      {/* Risk Gauge + KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-8">
        <div className="lg:col-span-1 bg-[#0A0A0A] border border-[#222222] rounded-sm p-6 flex flex-col items-center justify-center" data-testid="risk-gauge">
          <ResponsiveContainer width={140} height={140}>
            <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" startAngle={180} endAngle={0} data={gaugeData} barSize={12}>
              <RadialBar background={{ fill: "#222222" }} dataKey="value" cornerRadius={6} max={10} />
            </RadialBarChart>
          </ResponsiveContainer>
          <span className="font-['Chivo'] text-3xl font-black mt-[-30px]" style={{ color: gaugeColor }}>{avgScore}</span>
          <span className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider mt-1" style={{ color: gaugeColor }}>{riskTier}</span>
          <span className="font-['JetBrains_Mono'] text-[10px] text-[#71717A] mt-1">Overall Risk Score</span>
        </div>
        <MetricCard label="Total Findings" value={results.total_findings} icon={ShieldWarning} />
        <MetricCard label="Critical" value={results.findings_by_severity?.CRITICAL || 0} severity="CRITICAL" icon={Warning} />
        <MetricCard label="Services Affected" value={Object.keys(results.findings_by_service || {}).length} icon={ChartBar} />
        <MetricCard label="Avg Risk Score" value={avgScore} />
      </div>

      {/* Compliance + Top Risks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <div className="bg-[#0A0A0A] border border-[#222222] rounded-sm p-6" data-testid="compliance-chart">
          <h3 className="font-['Chivo'] text-lg font-bold mb-4">CIS Benchmark Compliance</h3>
          {complianceData.map((d) => (
            <div key={d.service} className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-['JetBrains_Mono'] text-xs text-[#A1A1AA]">{d.service}</span>
                <span className="font-['JetBrains_Mono'] text-xs text-white">{d.pass}%</span>
              </div>
              <div className="w-full h-2 bg-[#222222] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${d.pass}%`, backgroundColor: d.pass >= 70 ? "#34C759" : d.pass >= 40 ? "#FFCC00" : "#FF3B30" }} />
              </div>
            </div>
          ))}
        </div>

        <div className="bg-[#0A0A0A] border border-[#222222] rounded-sm p-6" data-testid="top-critical-risks">
          <h3 className="font-['Chivo'] text-lg font-bold mb-4">Top Critical Risks</h3>
          {topCritical.map((f, i) => (
            <div key={i} className="mb-3 p-3 border border-[#222222]/50 rounded-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-white text-sm font-medium">{f.plain.title}</span>
                <span className="font-['JetBrains_Mono'] text-[10px] px-1.5 py-0 bg-[#FF3B30]/10 text-[#FF3B30] border border-[#FF3B30]/20 rounded-sm uppercase">Urgent</span>
              </div>
              <p className="text-[#71717A] text-xs">{f.plain.impact}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Trend */}
      <div className="bg-[#0A0A0A] border border-[#222222] rounded-sm p-6 mb-8" data-testid="risk-trend">
        <h3 className="font-['Chivo'] text-lg font-bold mb-4">Risk Trend</h3>
        {trendData.length < 2 ? (
          <p className="text-[#71717A] text-sm text-center py-8">Run more scans to see trends</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222222" />
              <XAxis dataKey="scan" tick={{ fill: "#A1A1AA", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={{ stroke: "#222222" }} tickLine={false} />
              <YAxis tick={{ fill: "#A1A1AA", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} domain={[0, 10]} />
              <Tooltip contentStyle={{ background: "#0A0A0A", border: "1px solid #222222", borderRadius: "2px", fontFamily: "JetBrains Mono", fontSize: 12, color: "#fff" }} />
              <Line type="monotone" dataKey="avg_risk" stroke="#FF3B30" strokeWidth={2} dot={{ fill: "#FF3B30", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Scan History Table */}
      <div className="bg-[#0A0A0A] border border-[#222222] rounded-sm p-6" data-testid="scan-history">
        <h3 className="font-['Chivo'] text-lg font-bold mb-4">Scan History</h3>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#222222]">
              <th className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#A1A1AA] py-3 pr-4">Date</th>
              <th className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#A1A1AA] py-3 pr-4">Findings</th>
              <th className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#A1A1AA] py-3 pr-4">Critical</th>
              <th className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#A1A1AA] py-3 pr-4">Avg Score</th>
              <th className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#A1A1AA] py-3">Scanned By</th>
            </tr>
          </thead>
          <tbody>
            {history.slice(0, 10).map((h, i) => (
              <tr key={i} className="border-b border-[#222222]/50 hover:bg-[#141414] transition-colors duration-150">
                <td className="py-3 pr-4 font-['JetBrains_Mono'] text-xs text-[#A1A1AA]">{h.timestamp ? new Date(h.timestamp).toLocaleString() : "-"}</td>
                <td className="py-3 pr-4 text-white font-semibold">{h.total_findings}</td>
                <td className="py-3 pr-4 text-[#FF3B30] font-semibold">{h.findings_by_severity?.CRITICAL || 0}</td>
                <td className="py-3 pr-4 font-['JetBrains_Mono'] text-white">{h.avg_risk_score || "-"}</td>
                <td className="py-3 font-['JetBrains_Mono'] text-xs text-[#71717A]">{h.scanned_by || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
