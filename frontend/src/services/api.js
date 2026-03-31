import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const api = {
  getRegions: () => axios.get(`${API}/regions`),
  getRules: () => axios.get(`${API}/rules`),
  runScan: (region) => axios.post(`${API}/scan`, { region }),
  getScanProgress: () => axios.get(`${API}/scan/progress`),
  getScanResults: () => axios.get(`${API}/scan/results`),
  exportJson: () => `${API}/scan/export/json`,
  exportCsv: () => `${API}/scan/export/csv`,
};
