import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({ children, minRole = "viewer" }) {
  const { isAuthenticated, hasRole } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasRole(minRole)) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#050505]" data-testid="access-denied">
        <div className="text-center">
          <h1 className="font-['Chivo'] text-4xl font-black text-[#FF3B30] mb-2">Access Denied</h1>
          <p className="text-[#A1A1AA]">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return children;
}
