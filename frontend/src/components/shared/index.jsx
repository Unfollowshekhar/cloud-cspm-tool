import { SEVERITY_CONFIG } from "@/utils/constants";

export function SeverityBadge({ severity }) {
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.LOW;
  return (
    <span
      data-testid={`severity-badge-${severity?.toLowerCase()}`}
      className={`inline-flex items-center font-['JetBrains_Mono'] text-xs px-2 py-0.5 uppercase tracking-wider rounded-sm ${config.badge}`}
    >
      {severity}
    </span>
  );
}

export function MetricCard({ label, value, severity, icon: Icon }) {
  const config = severity ? SEVERITY_CONFIG[severity] : null;
  return (
    <div
      data-testid={`metric-card-${label?.toLowerCase().replace(/\s/g, "-")}`}
      className="bg-[#0A0A0A] border border-[#222222] rounded-sm p-6 flex flex-col"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-['JetBrains_Mono'] text-xs uppercase tracking-[0.2em] text-[#A1A1AA]">
          {label}
        </span>
        {Icon && <Icon size={18} className="text-[#71717A]" />}
      </div>
      <span
        className={`font-['Chivo'] text-4xl font-black tracking-tight ${
          config ? config.text : "text-white"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function EmptyState({ title, description, icon: Icon }) {
  return (
    <div
      data-testid="empty-state"
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      {Icon && <Icon size={48} className="text-[#333333] mb-4" />}
      <h3 className="font-['Chivo'] text-xl font-bold text-[#A1A1AA] mb-2">{title}</h3>
      <p className="text-sm text-[#71717A] max-w-md">{description}</p>
    </div>
  );
}
