import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { MetricCard, SeverityBadge } from "@/components/shared";
import {
  MagnifyingGlass,
  Play,
  ShieldWarning,
  Warning,
  CheckCircle,
  CircleNotch,
  Globe,
} from "@phosphor-icons/react";

const SCAN_PHASES = [
  { pct: 10, label: "Initializing scanner..." },
  { pct: 25, label: "Scanning IAM configuration..." },
  { pct: 45, label: "Scanning S3 buckets..." },
  { pct: 65, label: "Scanning EC2 security groups..." },
  { pct: 80, label: "Scanning CloudTrail logs..." },
  { pct: 92, label: "Scoring findings..." },
  { pct: 100, label: "Scan complete" },
];

export default function ScanPage() {
  const [regions, setRegions] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState("us-east-1");
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phaseLabel, setPhaseLabel] = useState("");
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const phaseIdx = useRef(0);

  useEffect(() => {
    api.getRegions().then((res) => setRegions(res.data.regions || [])).catch(() => {});
  }, []);

  const handleScan = async () => {
    setScanning(true);
    setProgress(0);
    setResults(null);
    setError(null);
    phaseIdx.current = 0;

    // Animate progress phases
    const phaseInterval = setInterval(() => {
      if (phaseIdx.current < SCAN_PHASES.length) {
        const phase = SCAN_PHASES[phaseIdx.current];
        setProgress(phase.pct);
        setPhaseLabel(phase.label);
        phaseIdx.current++;
      }
    }, 350);

    try {
      const res = await api.runScan(selectedRegion);
      clearInterval(phaseInterval);
      setProgress(100);
      setPhaseLabel("Scan complete");

      if (res.data && !res.data.error) {
        setResults(res.data);
      } else {
        setError(res.data?.error || "Scan failed");
      }
    } catch (e) {
      clearInterval(phaseInterval);
      setError(e.response?.data?.error || "Scan failed. Please try again.");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div data-testid="scan-page">
      <h1 className="font-['Chivo'] text-4xl sm:text-5xl font-black tracking-tight text-white mb-1">
        Run Scan
      </h1>
      <p className="text-[#A1A1AA] text-base mb-8">
        Execute a security posture assessment against your AWS environment
      </p>

      {/* Scan Controls */}
      <div className="bg-[#0A0A0A] border border-[#222222] rounded-sm p-6 mb-6" data-testid="scan-controls">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
          <div className="flex-1 w-full sm:w-auto">
            <label className="font-['JetBrains_Mono'] text-xs uppercase tracking-[0.2em] text-[#A1A1AA] mb-2 block">
              AWS Region
            </label>
            <div className="relative">
              <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
              <select
                data-testid="region-selector"
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                disabled={scanning}
                className="w-full sm:w-64 bg-[#050505] border border-[#222222] rounded-sm pl-9 pr-4 py-2.5 text-sm text-white font-['JetBrains_Mono'] appearance-none focus:border-[#444444] transition-colors duration-150 disabled:opacity-50"
              >
                {regions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            data-testid="start-scan-button"
            onClick={handleScan}
            disabled={scanning}
            className="bg-white text-black font-semibold rounded-sm px-8 py-2.5 hover:bg-gray-200 transition-colors duration-150 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {scanning ? (
              <>
                <CircleNotch size={18} className="animate-spin" /> Scanning...
              </>
            ) : (
              <>
                <Play size={18} weight="fill" /> Start Scan
              </>
            )}
          </button>
        </div>

        {/* Progress Bar */}
        {(scanning || progress > 0) && (
          <div className="mt-6" data-testid="scan-progress">
            <div className="flex items-center justify-between mb-2">
              <span className="font-['JetBrains_Mono'] text-xs text-[#A1A1AA]">{phaseLabel}</span>
              <span className="font-['JetBrains_Mono'] text-xs text-[#A1A1AA]">{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#222222] rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-[width] duration-300 ease-in-out rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-sm p-4 mb-6 flex items-center gap-3" data-testid="scan-error">
          <Warning size={20} className="text-[#FF3B30] shrink-0" />
          <span className="text-[#FF3B30] text-sm">{error}</span>
        </div>
      )}

      {/* Results Summary */}
      {results && (
        <div data-testid="scan-results">
          <div className="flex items-center gap-2 mb-6">
            <CheckCircle size={20} weight="fill" className="text-[#34C759]" />
            <span className="font-['Chivo'] text-lg font-bold text-white">Scan Complete</span>
            <span className="font-['JetBrains_Mono'] text-xs text-[#71717A] ml-2">
              {results.scan_time}s &middot; {results.region} &middot; Account {results.account_id}
            </span>
            {results.demo_mode && (
              <span className="font-['JetBrains_Mono'] text-xs px-2 py-0.5 bg-[#007AFF]/10 text-[#007AFF] border border-[#007AFF]/20 rounded-sm uppercase ml-2">
                Demo Mode
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6" data-testid="scan-metrics">
            <MetricCard
              label="Total Findings"
              value={results.total_findings}
              icon={ShieldWarning}
            />
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
          </div>

          <div className="flex gap-3">
            <button
              data-testid="view-findings-button"
              onClick={() => navigate("/findings")}
              className="bg-white text-black font-semibold rounded-sm px-6 py-2 hover:bg-gray-200 transition-colors duration-150 text-sm"
            >
              View All Findings
            </button>
            <button
              data-testid="view-risk-button"
              onClick={() => navigate("/risk")}
              className="bg-transparent border border-[#222222] text-white rounded-sm px-6 py-2 hover:bg-[#141414] transition-colors duration-150 text-sm"
            >
              Risk Overview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
