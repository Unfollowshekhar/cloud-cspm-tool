import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { SeverityBadge, EmptyState } from "@/components/shared";
import { SEVERITY_ORDER } from "@/utils/constants";
import {
  ListChecks,
  FunnelSimple,
  CaretDown,
  CaretUp,
  MagnifyingGlass,
} from "@phosphor-icons/react";

export default function FindingsPage() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [serviceFilter, setServiceFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [sortField, setSortField] = useState("risk_score");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    api.getScanResults()
      .then((res) => {
        if (res.data && !res.data.error) {
          setResults(res.data);
        }
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
      <div data-testid="findings-empty">
        <h1 className="font-['Chivo'] text-4xl sm:text-5xl font-black tracking-tight text-white mb-2">
          Findings
        </h1>
        <EmptyState
          icon={ListChecks}
          title="No Findings Available"
          description="Run a security scan first to generate findings."
        />
      </div>
    );
  }

  const findings = results.findings || [];
  const services = [...new Set(findings.map((f) => f.service))].sort();

  // Filter
  let filtered = findings.filter((f) => {
    if (severityFilter !== "ALL" && f.severity !== severityFilter) return false;
    if (serviceFilter !== "ALL" && f.service !== serviceFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        f.title.toLowerCase().includes(q) ||
        f.check_id.toLowerCase().includes(q) ||
        f.resource_id.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Sort
  filtered.sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    if (sortField === "severity") {
      aVal = SEVERITY_ORDER.indexOf(a.severity);
      bVal = SEVERITY_ORDER.indexOf(b.severity);
    }
    if (typeof aVal === "string") aVal = aVal.toLowerCase();
    if (typeof bVal === "string") bVal = bVal.toLowerCase();
    if (sortDir === "asc") return aVal > bVal ? 1 : -1;
    return aVal < bVal ? 1 : -1;
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? (
      <CaretUp size={12} className="inline ml-1" />
    ) : (
      <CaretDown size={12} className="inline ml-1" />
    );
  };

  return (
    <div data-testid="findings-page">
      <h1 className="font-['Chivo'] text-4xl sm:text-5xl font-black tracking-tight text-white mb-1">
        Findings
      </h1>
      <p className="text-[#A1A1AA] text-base mb-6">
        {filtered.length} of {findings.length} findings
      </p>

      {/* Filters */}
      <div
        className="flex flex-col sm:flex-row gap-3 mb-6"
        data-testid="findings-filters"
      >
        {/* Search */}
        <div className="relative flex-1">
          <MagnifyingGlass
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]"
          />
          <input
            data-testid="findings-search"
            type="text"
            placeholder="Search findings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0A0A0A] border border-[#222222] rounded-sm pl-9 pr-4 py-2 text-sm text-white placeholder:text-[#71717A] focus:border-[#444444] transition-colors duration-150"
          />
        </div>

        {/* Severity filter */}
        <div className="relative">
          <FunnelSimple
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]"
          />
          <select
            data-testid="severity-filter"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-[#0A0A0A] border border-[#222222] rounded-sm pl-9 pr-8 py-2 text-sm text-white font-['JetBrains_Mono'] appearance-none focus:border-[#444444] transition-colors duration-150"
          >
            <option value="ALL">All Severities</option>
            {SEVERITY_ORDER.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Service filter */}
        <select
          data-testid="service-filter"
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="bg-[#0A0A0A] border border-[#222222] rounded-sm px-4 py-2 text-sm text-white font-['JetBrains_Mono'] appearance-none focus:border-[#444444] transition-colors duration-150"
        >
          <option value="ALL">All Services</option>
          {services.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#0A0A0A] border border-[#222222] rounded-sm overflow-hidden" data-testid="findings-table">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#222222]">
                <th
                  className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#A1A1AA] py-3 px-4 cursor-pointer hover:text-white transition-colors duration-150"
                  onClick={() => handleSort("check_id")}
                >
                  Check <SortIcon field="check_id" />
                </th>
                <th
                  className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#A1A1AA] py-3 px-4 cursor-pointer hover:text-white transition-colors duration-150"
                  onClick={() => handleSort("title")}
                >
                  Title <SortIcon field="title" />
                </th>
                <th
                  className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#A1A1AA] py-3 px-4 cursor-pointer hover:text-white transition-colors duration-150"
                  onClick={() => handleSort("severity")}
                >
                  Severity <SortIcon field="severity" />
                </th>
                <th
                  className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#A1A1AA] py-3 px-4 cursor-pointer hover:text-white transition-colors duration-150"
                  onClick={() => handleSort("risk_score")}
                >
                  Score <SortIcon field="risk_score" />
                </th>
                <th className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#A1A1AA] py-3 px-4">
                  Service
                </th>
                <th className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#A1A1AA] py-3 px-4">
                  Region
                </th>
                <th className="w-10 py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => (
                <FindingRow
                  key={f.finding_id}
                  finding={f}
                  expanded={expandedId === f.finding_id}
                  onToggle={() =>
                    setExpandedId(expandedId === f.finding_id ? null : f.finding_id)
                  }
                />
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#71717A] text-sm">
                    No findings match your filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FindingRow({ finding, expanded, onToggle }) {
  const f = finding;
  return (
    <>
      <tr
        data-testid={`finding-row-${f.check_id}`}
        onClick={onToggle}
        className="border-b border-[#222222]/50 hover:bg-[#141414] transition-colors duration-150 cursor-pointer"
      >
        <td className="py-3 px-4 font-['JetBrains_Mono'] text-xs text-[#A1A1AA]">
          {f.check_id}
        </td>
        <td className="py-3 px-4 text-white text-sm">{f.title}</td>
        <td className="py-3 px-4">
          <SeverityBadge severity={f.severity} />
        </td>
        <td className="py-3 px-4 font-['JetBrains_Mono'] font-semibold text-white">
          {f.risk_score}
        </td>
        <td className="py-3 px-4 font-['JetBrains_Mono'] text-xs text-[#A1A1AA]">
          {f.service}
        </td>
        <td className="py-3 px-4 font-['JetBrains_Mono'] text-xs text-[#A1A1AA]">
          {f.region}
        </td>
        <td className="py-3 px-4">
          <button data-testid={`expand-row-button-${f.check_id}`} className="text-[#71717A] hover:text-white transition-colors duration-150">
            {expanded ? <CaretUp size={14} /> : <CaretDown size={14} />}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr data-testid={`finding-detail-${f.check_id}`} className="bg-[#0A0A0A]">
          <td colSpan={7} className="px-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#71717A] block mb-1">
                  Description
                </span>
                <p className="text-[#A1A1AA] leading-relaxed">{f.description}</p>
              </div>
              <div>
                <span className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#71717A] block mb-1">
                  Resource ID
                </span>
                <p className="font-['JetBrains_Mono'] text-xs text-white break-all">
                  {f.resource_id}
                </p>
              </div>
              <div>
                <span className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#71717A] block mb-1">
                  Remediation
                </span>
                <p className="text-[#A1A1AA] leading-relaxed">{f.remediation}</p>
              </div>
              <div>
                <span className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#71717A] block mb-1">
                  CIS Reference
                </span>
                <p className="font-['JetBrains_Mono'] text-xs text-[#007AFF]">
                  {f.cis_reference}
                </p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
