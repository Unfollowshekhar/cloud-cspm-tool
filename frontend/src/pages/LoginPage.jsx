import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ShieldCheck, User, Lock, Eye, EyeSlash, CircleNotch } from "@phosphor-icons/react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4" data-testid="login-page">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <ShieldCheck size={40} weight="fill" className="text-[#FF3B30]" />
            <h1 className="font-['Chivo'] text-4xl font-black tracking-tight text-white">Cloud CSPM</h1>
          </div>
          <p className="text-[#A1A1AA] text-sm">Cloud Misconfiguration Detection & Risk Prioritization</p>
        </div>

        {/* Login Card */}
        <div className="bg-[#0A0A0A] border border-[#222222] rounded-sm p-8">
          <h2 className="font-['Chivo'] text-xl font-bold text-white mb-6">Sign In</h2>

          {error && (
            <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-sm px-4 py-3 mb-4" data-testid="login-error">
              <p className="text-[#FF3B30] text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="font-['JetBrains_Mono'] text-xs uppercase tracking-[0.2em] text-[#A1A1AA] mb-2 block">
                Username
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
                <input
                  data-testid="login-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full bg-[#050505] border border-[#222222] rounded-sm pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-[#71717A] focus:border-[#444444] transition-colors duration-150"
                  required
                />
              </div>
            </div>

            <div>
              <label className="font-['JetBrains_Mono'] text-xs uppercase tracking-[0.2em] text-[#A1A1AA] mb-2 block">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
                <input
                  data-testid="login-password"
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full bg-[#050505] border border-[#222222] rounded-sm pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-[#71717A] focus:border-[#444444] transition-colors duration-150"
                  required
                />
                <button
                  type="button"
                  data-testid="toggle-password"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-white transition-colors duration-150"
                >
                  {showPwd ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              data-testid="login-submit"
              disabled={loading}
              className="w-full bg-white text-black font-semibold rounded-sm py-2.5 hover:bg-gray-200 transition-colors duration-150 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <CircleNotch size={18} className="animate-spin" /> : "Sign In"}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#222222]">
            <p className="text-[#71717A] text-xs font-['JetBrains_Mono'] text-center">
              Demo credentials: admin / Admin@123
            </p>
          </div>
        </div>

        <p className="text-[#71717A] text-xs text-center mt-6">UPES Dehradun | IBM Industry Project</p>
      </div>
    </div>
  );
}
