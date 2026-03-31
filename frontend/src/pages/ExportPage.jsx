import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { EmptyState } from "@/components/shared";
import {
  Export,
  FileCode,
  FileCsv,
  DownloadSimple,
  CheckCircle,
  ShieldWarning,
} from "@phosphor-icons/react";

export default function ExportPage() {
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
      <div data-testid="export-empty">
        <h1 className="font-['Chivo'] text-4xl sm:text-5xl font-black tracking-tight text-white mb-2">
          Export
        </h1>
        <EmptyState
          icon={Export}
          title="No Data to Export"
          description="Run a security scan first to generate exportable findings."
        />
      </div>
    );
  }

  const handleDownload = (type) => {
    const url = type === "json" ? api.exportJson() : api.exportCsv();
    window.open(url, "_blank");
  };

  return (
    <div data-testid="export-page">
      <h1 className="font-['Chivo'] text-4xl sm:text-5xl font-black tracking-tight text-white mb-1">
        Export
      </h1>
      <p className="text-[#A1A1AA] text-base mb-8">
        Download scan findings in your preferred format
      </p>

      {/* Scan Info */}
      <div className="bg-[#0A0A0A] border border-[#222222] rounded-sm p-6 mb-6" data-testid="export-info">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle size={20} weight="fill" className="text-[#34C759]" />
          <span className="font-['Chivo'] font-bold text-white">Scan Data Available</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <span className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#71717A] block mb-1">
              Total Findings
            </span>
            <span className="font-['Chivo'] text-2xl font-bold text-white">
              {results.total_findings}
            </span>
          </div>
          <div>
            <span className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#71717A] block mb-1">
              Account
            </span>
            <span className="font-['JetBrains_Mono'] text-sm text-white">
              {results.account_id}
            </span>
          </div>
          <div>
            <span className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#71717A] block mb-1">
              Region
            </span>
            <span className="font-['JetBrains_Mono'] text-sm text-white">
              {results.region}
            </span>
          </div>
          <div>
            <span className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#71717A] block mb-1">
              Scan Time
            </span>
            <span className="font-['JetBrains_Mono'] text-sm text-white">
              {results.scan_time}s
            </span>
          </div>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-testid="export-buttons">
        <button
          data-testid="export-json-button"
          onClick={() => handleDownload("json")}
          className="bg-[#0A0A0A] border border-[#222222] rounded-sm p-6 flex items-center gap-4 hover:border-[#444444] transition-colors duration-200 group text-left"
        >
          <div className="w-12 h-12 bg-[#007AFF]/10 border border-[#007AFF]/20 rounded-sm flex items-center justify-center shrink-0">
            <FileCode size={24} className="text-[#007AFF]" />
          </div>
          <div className="flex-1">
            <span className="font-['Chivo'] font-bold text-white block mb-1">
              Export as JSON
            </span>
            <span className="text-[#71717A] text-sm">
              Structured data format for programmatic access
            </span>
          </div>
          <DownloadSimple
            size={20}
            className="text-[#71717A] group-hover:text-white transition-colors duration-150 shrink-0"
          />
        </button>

        <button
          data-testid="export-csv-button"
          onClick={() => handleDownload("csv")}
          className="bg-[#0A0A0A] border border-[#222222] rounded-sm p-6 flex items-center gap-4 hover:border-[#444444] transition-colors duration-200 group text-left"
        >
          <div className="w-12 h-12 bg-[#34C759]/10 border border-[#34C759]/20 rounded-sm flex items-center justify-center shrink-0">
            <FileCsv size={24} className="text-[#34C759]" />
          </div>
          <div className="flex-1">
            <span className="font-['Chivo'] font-bold text-white block mb-1">
              Export as CSV
            </span>
            <span className="text-[#71717A] text-sm">
              Spreadsheet-compatible format for analysis
            </span>
          </div>
          <DownloadSimple
            size={20}
            className="text-[#71717A] group-hover:text-white transition-colors duration-150 shrink-0"
          />
        </button>
      </div>
    </div>
  );
}
