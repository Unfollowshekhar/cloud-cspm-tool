import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { EmptyState } from "@/components/shared";
import { SEVERITY_CONFIG } from "@/utils/constants";
import { CheckSquareOffset, FunnelSimple } from "@phosphor-icons/react";

const STATUS_CONFIG = {
  open: { label: "Open", color: "bg-[#FF3B30]/10 text-[#FF3B30] border-[#FF3B30]/20" },
  in_progress: { label: "In Progress", color: "bg-[#FF9500]/10 text-[#FF9500] border-[#FF9500]/20" },
  resolved: { label: "Resolved", color: "bg-[#34C759]/10 text-[#34C759] border-[#34C759]/20" },
  accepted_risk: { label: "Accepted", color: "bg-[#007AFF]/10 text-[#007AFF] border-[#007AFF]/20" },
};

export default function RemediationPage() {
  const [results, setResults] = useState(null);
  const [remediation, setRemediation] = useState({});
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [serviceFilter, setServiceFilter] = useState("ALL");

  useEffect(() => {
    Promise.all([api.getScanResults(), api.getRemediation(), api.getRemediationSummary()])
      .then(([rRes, remRes, sumRes]) => {
        if (rRes.data && !rRes.data.error) setResults(rRes.data);
        if (remRes.data) {
          const map = {};
          (remRes.data.items || []).forEach((item) => { map[item.finding_id] = item; });
          setRemediation(map);
        }
        if (sumRes.data) setSummary(sumRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = async (findingId, newStatus) => {
    try {
      await api.updateRemediation(findingId, { status: newStatus, assigned_to: "", notes: "" });
      setRemediation((prev) => ({
        ...prev,
        [findingId]: { ...prev[findingId], finding_id: findingId, status: newStatus },
      }));
    } catch (e) {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#333333] border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!results) {
    return (
      <div data-testid="remediation-empty">
        <h1 className="font-['Chivo'] text-4xl sm:text-5xl font-black tracking-tight text-white mb-2">Remediation</h1>
        <EmptyState icon={CheckSquareOffset} title="No Data" description="Run a scan to start tracking remediation." />
      </div>
    );
  }

  const findings = results.findings || [];
  const services = [...new Set(findings.map((f) => f.service))].sort();

  const getStatus = (fid) => remediation[fid]?.status || "open";

  let filtered = findings;
  if (filter !== "ALL") filtered = filtered.filter((f) => getStatus(f.finding_id) === filter);
  if (serviceFilter !== "ALL") filtered = filtered.filter((f) => f.service === serviceFilter);

  const total = findings.length;
  const resolvedCount = findings.filter((f) => getStatus(f.finding_id) === "resolved").length;
  const progressPct = total > 0 ? Math.round((resolvedCount / total) * 100) : 0;

  return (
    <div data-testid="remediation-page">
      <h1 className="font-['Chivo'] text-4xl sm:text-5xl font-black tracking-tight text-white mb-1">Remediation</h1>
      <p className="text-[#A1A1AA] text-base mb-6">Track and manage finding remediation status</p>

      {/* Progress Bar */}
      <div className="bg-[#0A0A0A] border border-[#222222] rounded-sm p-6 mb-6" data-testid="remediation-progress">
        <div className="flex items-center justify-between mb-2">
          <span className="font-['Chivo'] font-bold text-white">{resolvedCount} of {total} findings resolved</span>
          <span className="font-['JetBrains_Mono'] text-sm text-white">{progressPct}%</span>
        </div>
        <div className="w-full h-2 bg-[#222222] rounded-full overflow-hidden">
          <div className="h-full bg-[#34C759] rounded-full transition-[width] duration-300" style={{ width: `${progressPct}%` }} />
        </div>
        {summary && (
          <div className="flex gap-6 mt-4">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <div key={key} className="text-center">
                <span className="font-['Chivo'] text-lg font-bold text-white block">{summary[key] || 0}</span>
                <span className="font-['JetBrains_Mono'] text-[10px] text-[#71717A] uppercase">{cfg.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          data-testid="remediation-status-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-[#0A0A0A] border border-[#222222] rounded-sm px-4 py-2 text-sm text-white font-['JetBrains_Mono'] appearance-none focus:border-[#444444] transition-colors duration-150"
        >
          <option value="ALL">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
        <select
          data-testid="remediation-service-filter"
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="bg-[#0A0A0A] border border-[#222222] rounded-sm px-4 py-2 text-sm text-white font-['JetBrains_Mono'] appearance-none focus:border-[#444444] transition-colors duration-150"
        >
          <option value="ALL">All Services</option>
          {services.map((s) => (<option key={s} value={s}>{s}</option>))}
        </select>
      </div>

      {/* Findings with status */}
      <div className="bg-[#0A0A0A] border border-[#222222] rounded-sm overflow-hidden" data-testid="remediation-table">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#222222]">
              <th className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#A1A1AA] py-3 px-4">Check</th>
              <th className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#A1A1AA] py-3 px-4">Title</th>
              <th className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#A1A1AA] py-3 px-4">Severity</th>
              <th className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#A1A1AA] py-3 px-4">Score</th>
              <th className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#A1A1AA] py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((f) => {
              const status = getStatus(f.finding_id);
              const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.open;
              const sevCfg = SEVERITY_CONFIG[f.severity] || SEVERITY_CONFIG.LOW;
              return (
                <tr key={f.finding_id} className="border-b border-[#222222]/50 hover:bg-[#141414] transition-colors duration-150">
                  <td className="py-3 px-4 font-['JetBrains_Mono'] text-xs text-[#A1A1AA]">{f.check_id}</td>
                  <td className="py-3 px-4 text-white text-sm">{f.title}</td>
                  <td className="py-3 px-4">
                    <span className={`font-['JetBrains_Mono'] text-xs px-2 py-0.5 uppercase tracking-wider rounded-sm border ${sevCfg.badge}`}>{f.severity}</span>
                  </td>
                  <td className="py-3 px-4 font-['JetBrains_Mono'] font-semibold text-white">{f.risk_score}</td>
                  <td className="py-3 px-4">
                    <select
                      data-testid={`status-select-${f.finding_id}`}
                      value={status}
                      onChange={(e) => handleStatusChange(f.finding_id, e.target.value)}
                      className={`font-['JetBrains_Mono'] text-xs px-2 py-1 rounded-sm border appearance-none cursor-pointer ${cfg.color}`}
                    >
                      {Object.entries(STATUS_CONFIG).map(([key, c]) => (
                        <option key={key} value={key}>{c.label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
