import { useAuthStore } from "../../store/auth.slice";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Wallet, Shield, LogOut } from "lucide-react";

export default function Dashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const balance = user?.balance ? Number(user.balance).toFixed(2) : "0.00";

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <header className="border-b border-white/5 bg-[#1a1a1a]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">BANCA <span className="text-[#00d4aa]">NEN</span></h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm">Hola, {user?.firstName}</span>
            <button onClick={handleLogout} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <LogOut className="w-4 h-4" />
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#00d4aa]/10 rounded-xl flex items-center justify-center">
                <Wallet className="w-5 h-5 text-[#00d4aa]" />
              </div>
              <span className="text-gray-400 text-sm">Balance</span>
            </div>
            <p className="text-3xl font-bold text-white">${balance}</p>
          </div>

          <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-gray-400 text-sm">Inversiones</span>
            </div>
            <p className="text-3xl font-bold text-white">$0.00</p>
          </div>

          <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-gray-400 text-sm">Estado</span>
            </div>
            <p className="text-3xl font-bold text-[#00d4aa]">{user?.status || "Activo"}</p>
          </div>
        </div>

        <div className="mt-8 bg-[#1a1a1a] rounded-2xl p-6 border border-white/5">
          <h2 className="text-xl font-semibold text-white mb-4">Tu cuenta</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-400">Email:</span> <span className="text-white">{user?.email}</span></div>
            <div><span className="text-gray-400">Nombre:</span> <span className="text-white">{user?.firstName} {user?.lastName}</span></div>
            <div><span className="text-gray-400">Rol:</span> <span className="text-white">{user?.role}</span></div>
            <div><span className="text-gray-400">Verificado:</span> <span className="text-white">{user?.isVerified ? "Si" : "No"}</span></div>
          </div>
        </div>
      </main>
    </div>
  );
}
