import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Create axios instance with auth interceptor
const axiosAuth = axios.create({ baseURL: API });

let getTokenFn = null;
export const setTokenGetter = (fn) => { getTokenFn = fn; };

axiosAuth.interceptors.request.use((config) => {
  const token = getTokenFn ? getTokenFn() : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // Auth
  login: (username, password) => axios.post(`${API}/auth/login`, { username, password }),
  logout: (token) => axios.post(`${API}/auth/logout`, {}, { headers: { Authorization: `Bearer ${token}` } }),
  getMe: () => axiosAuth.get("/auth/me"),

  // Scan
  getRegions: () => axiosAuth.get("/regions"),
  getRules: () => axiosAuth.get("/rules"),
  runScan: (region) => axiosAuth.post("/scan", { region }),
  getScanProgress: () => axiosAuth.get("/scan/progress"),
  getScanResults: () => axiosAuth.get("/scan/results"),
  getScanHistory: () => axiosAuth.get("/scan/history"),
  exportJson: () => `${API}/scan/export/json`,
  exportCsv: () => `${API}/scan/export/csv`,

  // ATT&CK
  getAttackMappings: () => axiosAuth.get("/attack/mappings"),
  getAttackSummary: () => axiosAuth.get("/attack/summary"),

  // Threat Map
  getThreatLive: () => axiosAuth.get("/threat/live"),
  getThreatStats: () => axiosAuth.get("/threat/stats"),

  // Report
  getReportPdf: () => `${API}/report/pdf`,

  // Remediation
  getRemediation: () => axiosAuth.get("/remediation"),
  updateRemediation: (findingId, data) => axiosAuth.put(`/remediation/${findingId}`, data),
  getRemediationSummary: () => axiosAuth.get("/remediation/summary"),

  // Notifications
  getNotifications: () => axiosAuth.get("/notifications"),
  markNotificationsRead: () => axiosAuth.post("/notifications/mark-read"),
  getUnreadCount: () => axiosAuth.get("/notifications/unread-count"),
  getNotificationSettings: () => axiosAuth.get("/notifications/settings"),
  updateNotificationSettings: (data) => axiosAuth.put("/notifications/settings", data),
  getEmailStatus: () => axiosAuth.get("/notifications/email-status"),

  // Scheduler
  getSchedulerStatus: () => axiosAuth.get("/scheduler/status"),
  updateSchedulerConfig: (data) => axiosAuth.put("/scheduler/config", data),
  runSchedulerNow: () => axiosAuth.post("/scheduler/run-now"),

  // Posture (public - no auth)
  getPostureTrend: () => axios.get(`${API}/posture/trend`),
};
