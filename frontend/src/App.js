import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { setTokenGetter } from "@/services/api";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import ScanPage from "@/pages/ScanPage";
import FindingsPage from "@/pages/FindingsPage";
import RiskOverviewPage from "@/pages/RiskOverviewPage";
import ExportPage from "@/pages/ExportPage";
import AttackMapPage from "@/pages/AttackMapPage";
import ThreatMapPage from "@/pages/ThreatMapPage";
import ExecutivePage from "@/pages/ExecutivePage";
import RemediationPage from "@/pages/RemediationPage";
import NotificationsPage from "@/pages/NotificationsPage";

function TokenSetter() {
  const { token } = useAuth();
  useEffect(() => {
    setTokenGetter(() => token);
  }, [token]);
  return null;
}

function App() {
  return (
    <AuthProvider>
      <TokenSetter />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="scan" element={<ProtectedRoute minRole="analyst"><ScanPage /></ProtectedRoute>} />
            <Route path="findings" element={<FindingsPage />} />
            <Route path="risk" element={<RiskOverviewPage />} />
            <Route path="attack" element={<AttackMapPage />} />
            <Route path="threat" element={<ThreatMapPage />} />
            <Route path="executive" element={<ProtectedRoute minRole="analyst"><ExecutivePage /></ProtectedRoute>} />
            <Route path="remediation" element={<RemediationPage />} />
            <Route path="export" element={<ProtectedRoute minRole="analyst"><ExportPage /></ProtectedRoute>} />
            <Route path="notifications" element={<ProtectedRoute minRole="admin"><NotificationsPage /></ProtectedRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
