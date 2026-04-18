import * as React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import AdminLogin from '@/pages/AdminLogin';
import Dashboard from '@/pages/Dashboard';
import Spin from '@/pages/Spin';
import Scratch from '@/pages/Scratch';
import Tasks from '@/pages/Tasks';
import Withdraw from '@/pages/Withdraw';
import Admin from '@/pages/Admin';
import Eco from '@/pages/Eco';
import Mining from '@/pages/Mining';
import Upgrade from '@/pages/Upgrade';
import Refer from '@/pages/Refer';
import Profile from '@/pages/Profile';
import MathQuiz from '@/pages/MathQuiz';
import WordGuess from '@/pages/WordGuess';
import Captcha from '@/pages/Captcha';
import ColorMatch from '@/pages/ColorMatch';
import EcoScanner from '@/pages/EcoScanner';
import WalletPage from '@/pages/Wallet';
import { Home, Disc, Eraser, ListChecks, Wallet, Settings, LogOut, User as UserIcon, Leaf, Zap, Users, User, Calculator, Brain, ShieldCheck, Palette, Eye, Loader2, AlertTriangle, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationCenter } from '@/components/NotificationCenter';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const PageTransition = ({ children }: { children: React.ReactNode, key?: string }) => {
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <motion.div
          key="loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white"
        >
          <motion.div
            animate={{ 
              rotate: 360,
              scale: [1, 1.2, 1],
            }}
            transition={{ 
              rotate: { duration: 2, repeat: Infinity, ease: "linear" },
              scale: { duration: 1, repeat: Infinity, ease: "easeInOut" }
            }}
            className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shadow-xl shadow-emerald-500/10 mb-4"
          >
            <Leaf size={32} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-1"
          >
            <span className="text-lg font-bold text-slate-800 tracking-tight">Eco <span className="text-emerald-600">Ads</span></span>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  className="w-1.5 h-1.5 bg-emerald-500 rounded-full"
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin, loading, logout } = useAuth();
  const [maintenance, setMaintenance] = React.useState(false);

  React.useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'game_points'), (docSnap) => {
      if (docSnap.exists()) {
        setMaintenance(docSnap.data().maintenance_mode === true);
      }
    });
    return () => unsub();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  
  if (maintenance && !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="w-20 h-20 bg-amber-100 rounded-3xl flex items-center justify-center text-amber-600 mb-6">
          <AlertTriangle size={40} />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-2">Maintenance Mode</h1>
        <p className="text-slate-500 max-w-xs mb-8">
          We are currently performing some system updates. Please check back later!
        </p>
        <div className="w-full max-w-xs p-4 bg-white rounded-2xl border border-slate-200 shadow-sm mb-6">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
          <p className="text-emerald-600 font-black">Updating Servers...</p>
        </div>

        <button 
          onClick={() => logout()}
          className="flex items-center gap-2 text-slate-500 hover:text-red-600 font-bold transition-colors py-2 px-4 rounded-xl hover:bg-red-50"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  return user && isAdmin ? <>{children}</> : <Navigate to="/admin-login" />;
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout, isAdmin } = useAuth();

  return (
    <div className="min-h-screen bg-emerald-50/20 flex flex-col">
      {/* Top Bar */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Leaf size={24} />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-xl tracking-tight leading-none">Eco <span className="text-emerald-600">Ads</span></span>
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Sustainable Earnings</span>
          </div>
        </Link>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-full">
            <span className="text-primary font-bold">{user?.points || 0}</span>
            <span className="text-xs text-primary/70 font-medium">Points</span>
          </div>
          <NotificationCenter />
        </div>
      </header>

      <main className="flex-1 pb-24 sm:pb-0 sm:pl-64">
        <div className="max-w-4xl mx-auto p-4 sm:p-8">
          <PageTransition key={useLocation().pathname}>
            {children}
          </PageTransition>
        </div>
      </main>

      {/* Sidebar / Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-2 sm:top-16 sm:left-0 sm:bottom-0 sm:w-64 sm:flex-col sm:justify-start sm:gap-2 sm:p-4 sm:border-r sm:border-t-0 z-40">
        <NavLink to="/" icon={<Home size={20} />} label="Dashboard" />
        <NavLink to="/eco" icon={<Leaf size={20} />} label="Eco" />
        <NavLink to="/upgrade" icon={<Zap size={20} />} label="Upgrade" />
        <NavLink to="/refer" icon={<Users size={20} />} label="Refer" />
        <NavLink to="/profile" icon={<User size={20} />} label="Profile" />
        {isAdmin && (
          <NavLink to="/admin" icon={<Settings size={20} />} label="Admin Panel" />
        )}
      </nav>
    </div>
  );
};

const NavLink = ({ to, icon, label }: { to: string, icon: React.ReactNode, label: string }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link 
      to={to} 
      className={`flex flex-col items-center gap-1 p-2 transition-all sm:flex-row sm:gap-3 sm:px-4 sm:py-3 sm:rounded-xl ${
        isActive 
          ? 'text-emerald-600 bg-emerald-50/50 sm:bg-emerald-50' 
          : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50/30 sm:hover:bg-emerald-50/50'
      }`}
    >
      <div className={isActive ? 'text-emerald-600' : ''}>
        {icon}
      </div>
      <span className="text-[10px] sm:text-sm font-bold">{label}</span>
    </Link>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
          <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
          <Route path="/admin-login" element={<PageTransition><AdminLogin /></PageTransition>} />
          <Route path="/" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
          <Route path="/eco" element={<PrivateRoute><Layout><Eco /></Layout></PrivateRoute>} />
          <Route path="/mining" element={<PrivateRoute><Layout><Mining /></Layout></PrivateRoute>} />
          <Route path="/upgrade" element={<PrivateRoute><Layout><Upgrade /></Layout></PrivateRoute>} />
          <Route path="/refer" element={<PrivateRoute><Layout><Refer /></Layout></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Layout><Profile /></Layout></PrivateRoute>} />
          <Route path="/spin" element={<PrivateRoute><Layout><Spin /></Layout></PrivateRoute>} />
          <Route path="/scratch" element={<PrivateRoute><Layout><Scratch /></Layout></PrivateRoute>} />
          <Route path="/tasks" element={<PrivateRoute><Layout><Tasks /></Layout></PrivateRoute>} />
          <Route path="/math-quiz" element={<PrivateRoute><Layout><MathQuiz /></Layout></PrivateRoute>} />
          <Route path="/word-guess" element={<PrivateRoute><Layout><WordGuess /></Layout></PrivateRoute>} />
          <Route path="/captcha" element={<PrivateRoute><Layout><Captcha /></Layout></PrivateRoute>} />
          <Route path="/eco-scanner" element={<PrivateRoute><Layout><EcoScanner /></Layout></PrivateRoute>} />
          <Route path="/color-match" element={<PrivateRoute><Layout><ColorMatch /></Layout></PrivateRoute>} />
          <Route path="/withdraw" element={<PrivateRoute><Layout><Withdraw /></Layout></PrivateRoute>} />
          <Route path="/wallet" element={<PrivateRoute><Layout><WalletPage /></Layout></PrivateRoute>} />
          <Route path="/admin" element={<AdminRoute><PageTransition><Admin /></PageTransition></AdminRoute>} />
        </Routes>
      </Router>
      <Toaster position="top-center" />
    </AuthProvider>
  );
}
