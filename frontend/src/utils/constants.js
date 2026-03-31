export const SEVERITY_CONFIG = {
  CRITICAL: {
    color: "#FF3B30",
    bg: "bg-[#FF3B30]/10",
    text: "text-[#FF3B30]",
    border: "border-[#FF3B30]/20",
    badge: "bg-[#FF3B30]/10 text-[#FF3B30] border border-[#FF3B30]/20",
  },
  HIGH: {
    color: "#FF9500",
    bg: "bg-[#FF9500]/10",
    text: "text-[#FF9500]",
    border: "border-[#FF9500]/20",
    badge: "bg-[#FF9500]/10 text-[#FF9500] border border-[#FF9500]/20",
  },
  MEDIUM: {
    color: "#FFCC00",
    bg: "bg-[#FFCC00]/10",
    text: "text-[#FFCC00]",
    border: "border-[#FFCC00]/20",
    badge: "bg-[#FFCC00]/10 text-[#FFCC00] border border-[#FFCC00]/20",
  },
  LOW: {
    color: "#34C759",
    bg: "bg-[#34C759]/10",
    text: "text-[#34C759]",
    border: "border-[#34C759]/20",
    badge: "bg-[#34C759]/10 text-[#34C759] border border-[#34C759]/20",
  },
};

export const SERVICE_COLORS = {
  IAM: "#007AFF",
  S3: "#FF9500",
  EC2: "#AF52DE",
  CloudTrail: "#34C759",
};

export const SEVERITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
