import * as React from 'react';
import { Component, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { Toaster } from '@/components/ui/sonner';

// Lazy load pages for better performance and to prevent early camera library initialization
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const AdminLogin = lazy(() => import('@/pages/AdminLogin'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Spin = lazy(() => import('@/pages/Spin'));
const Scratch = lazy(() => import('@/pages/Scratch'));
const Tasks = lazy(() => import('@/pages/Tasks'));
const Withdraw = lazy(() => import('@/pages/Withdraw'));
const Admin = lazy(() => import('@/pages/Admin'));
const Eco = lazy(() => import('@/pages/Eco'));
const Mining = lazy(() => import('@/pages/Mining'));
const Upgrade = lazy(() => import('@/pages/Upgrade'));
const Refer = lazy(() => import('@/pages/Refer'));
const Profile = lazy(() => import('@/pages/Profile'));
const MathQuiz = lazy(() => import('@/pages/MathQuiz'));
const WordGuess = lazy(() => import('@/pages/WordGuess'));
const Captcha = lazy(() => import('@/pages/Captcha'));
const ColorMatch = lazy(() => import('@/pages/ColorMatch'));
const EcoScanner = lazy(() => import('@/pages/EcoScanner'));
const WatchAds = lazy(() => import('@/pages/WatchAds'));
const WalletPage = lazy(() => import('@/pages/Wallet'));
const AdminUserDetails = lazy(() => import('@/pages/AdminUserDetails'));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));
const TermsConditions = lazy(() => import('@/pages/TermsConditions'));
import { Home, Disc, Eraser, ListChecks, Wallet, Settings, LogOut, User as UserIcon, Leaf, Zap, Users, User, Calculator, Brain, ShieldCheck, Palette, Eye, Loader2, AlertTriangle, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationCenter } from '@/components/NotificationCenter';
import { AdUnit } from '@/components/AdUnit';
import { useGameSettings } from '@/hooks/useGameSettings';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { RefreshCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center text-red-600 mb-6">
            <AlertTriangle size={40} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Something went wrong</h1>
          <p className="text-slate-500 max-w-xs mb-8">
            An unexpected error occurred. We've been notified and are looking into it.
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button 
              onClick={() => window.location.reload()}
              className="flex items-center justify-center gap-2 bg-emerald-600 text-white font-bold py-3 px-6 rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
            >
              <RefreshCcw size={18} />
              Reload Page
            </button>
            <button 
              onClick={() => {
                localStorage.clear();
                window.location.href = '/';
              }}
              className="text-slate-500 hover:text-slate-800 font-bold py-2 transition-colors"
            >
              Clear Cache & Restart
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const PageTransition = ({ children }: { children: React.ReactNode, key?: string }) => {
  const [loading, setLoading] = React.useState(true);
  const location = useLocation();

  React.useEffect(() => {
    // Save current path to handle iframe reloads (like when camera permission is granted)
    localStorage.setItem('lastPath', location.pathname);
  }, [location.pathname]);

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

const AppFooter = ({ dark = false }: { dark?: boolean }) => {
  const { settings } = useGameSettings();
  
  return (
    <footer className={`mt-8 py-8 md:py-12 text-center border-t ${dark ? 'border-slate-800' : 'border-slate-100/50'}`}>
      <div className="max-w-4xl mx-auto px-4 space-y-3">
        <div className="flex flex-col items-center gap-2">
          <div className={`text-[10px] font-black uppercase tracking-[0.3em] ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
            © {new Date().getFullYear()} Eco Ads • Sustainable Rewards
          </div>
          <div className={`h-[1px] w-12 ${dark ? 'bg-slate-800' : 'bg-slate-100'}`} />
          <div className="flex flex-col items-center gap-1">
            <div className={`flex items-center gap-3 sm:gap-4 text-[9px] sm:text-[10px] font-black uppercase tracking-widest mt-1 px-5 py-2.5 rounded-2xl border ${dark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-white/50 shadow-sm'}`}>
              <span className="flex items-center gap-1.5">
                <span className={dark ? 'text-slate-500' : 'text-slate-400'}>Developer:</span> 
                <span className="text-emerald-500/80">Sizan Mahmud</span>
              </span>
              <div className={`w-1 h-1 rounded-full ${dark ? 'bg-slate-800' : 'bg-slate-200'}`} />
              <span className="flex items-center gap-1.5">
                <span className={dark ? 'text-slate-500' : 'text-slate-400'}>Designer:</span> 
                <span className="text-blue-500/80">Black Dimond</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin, loading, logout } = useAuth();
  const { settings } = useGameSettings();
  const [maintenance, setMaintenance] = React.useState(false);
  const [progress, setProgress] = React.useState(88);

  React.useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'game_points'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMaintenance(data.maintenance_mode === true);
        
        // Calculate initial progress
        if (data.maintenance_mode && data.maintenance_start_at && data.maintenance_duration) {
          const start = new Date(data.maintenance_start_at).getTime();
          const durationMs = data.maintenance_duration * 60 * 60 * 1000;
          const now = Date.now();
          const elapsed = now - start;
          
          let p = Math.floor((elapsed / durationMs) * 100);
          if (p < 0) p = 0;
          if (p > 99) p = 99;
          setProgress(p);
        } else {
          setProgress(88);
        }
      }
    }, (error) => {
      console.error("Error listening to maintenance status:", error);
    });
    return () => unsub();
  }, []);

  // Update progress every minute if in maintenance
  React.useEffect(() => {
    if (!maintenance || isAdmin) return;
    
    const interval = setInterval(() => {
      if (settings.maintenance_start_at && settings.maintenance_duration) {
        const start = new Date(settings.maintenance_start_at).getTime();
        const durationMs = settings.maintenance_duration * 60 * 60 * 1000;
        const now = Date.now();
        const elapsed = now - start;
        
        let p = Math.floor((elapsed / durationMs) * 100);
        if (p < 0) p = 0;
        if (p > 99) p = 99;
        setProgress(p);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [maintenance, isAdmin, settings.maintenance_start_at, settings.maintenance_duration]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <motion.div
        animate={{ 
          rotate: 360,
          scale: [1, 1.1, 1]
        }}
        transition={{ 
          rotate: { duration: 1.5, repeat: Infinity, ease: "linear" },
          scale: { duration: 1, repeat: Infinity, ease: "easeInOut" }
        }}
        className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-6 shadow-xl shadow-emerald-500/10"
      >
        <Loader2 size={32} />
      </motion.div>
      <div className="flex flex-col items-center gap-2">
        <h3 className="text-lg font-black text-slate-800 tracking-tight">Eco <span className="text-emerald-600">Ads</span></h3>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] animate-pulse">Establishing Secure Session</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  
  if (maintenance && !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0c] p-6 text-center overflow-hidden">
        {/* Computer & Coding Animation */}
        <div className="relative mb-12 transform hover:scale-105 transition-transform duration-500">
          {/* Monitor Stand */}
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-16 h-8 bg-slate-800 rounded-b-xl" />
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-24 h-2 bg-slate-700 rounded-full" />
          
          {/* Monitor Frame */}
          <div className="relative w-64 h-48 sm:w-80 sm:h-56 bg-slate-900 rounded-2xl p-2.5 shadow-2xl shadow-emerald-500/10 border-2 border-slate-800">
            {/* Screen */}
            <div className="w-full h-full bg-[#1e1e1e] rounded-xl overflow-hidden relative border border-slate-800 flex flex-col items-start p-3 font-mono text-[10px] leading-relaxed select-none">
              <div className="flex gap-1.5 mb-2">
                <div className="w-2 h-2 rounded-full bg-red-500/50" />
                <div className="w-2 h-2 rounded-full bg-amber-500/50" />
                <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
              </div>
              
              <div className="w-full h-full overflow-hidden text-left space-y-1">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: [0.3, 1, 0.3], x: 0 }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity, 
                      delay: i * 0.15,
                      repeatDelay: 1
                    }}
                    className="flex gap-2"
                  >
                    <span className="text-slate-600 tabular-nums">{(i + 1).toString().padStart(2, '0')}</span>
                    <span className={i % 3 === 0 ? "text-emerald-400" : i % 3 === 1 ? "text-blue-400" : "text-purple-400"}>
                      {i % 4 === 0 ? "function deploy() {" : 
                       i % 4 === 1 ? "  optimizing_assets();" : 
                       i % 4 === 2 ? "  security_scan: OK;" : 
                       "}"}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Cursor Overlay */}
              <motion.div 
                animate={{ opacity: [1, 0, 1] }} 
                transition={{ duration: 0.8, repeat: Infinity }}
                className="absolute bottom-4 left-16 w-2 h-4 bg-emerald-500/50" 
              />
              
              {/* Screen Glow */}
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/5 to-transparent pointer-events-none" />
            </div>
            
            {/* Logo/Indicator */}
            <div className="absolute bottom-1 right-3 text-[8px] font-black text-slate-700 tracking-tighter italic">ECO TECH</div>
            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10"
        >
          <h1 className="text-3xl font-black text-white mb-2 tracking-tight">System <span className="text-emerald-500">Upgrade</span></h1>
          <p className="text-slate-400 max-w-sm mb-10 leading-relaxed font-medium">
            {settings.maintenance_message || "We're currently optimizing our systems to provide a smoother experience. We'll be back shortly!"}
          </p>
          
          <div className="flex flex-col items-center gap-6">
            <div className="px-6 py-2 bg-slate-900/50 border border-slate-800 rounded-full flex items-center gap-3">
              <div className="flex gap-1">
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              </div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Progress: {progress}%</span>
            </div>

            <button 
              onClick={() => logout()}
              className="group flex items-center gap-2 text-slate-500 hover:text-white font-bold transition-all py-3 px-8 rounded-2xl bg-white/5 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20"
            >
              <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
              Sign Out
            </button>
          </div>
        </motion.div>

        {/* Ambient Glow */}
        <div className="fixed -bottom-40 left-1/2 -translate-x-1/2 w-[600px] h-80 bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
      </div>
    );
  }

  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <motion.div
        animate={{ 
          rotate: 360,
          scale: [1, 1.1, 1]
        }}
        transition={{ 
          rotate: { duration: 1.5, repeat: Infinity, ease: "linear" },
          scale: { duration: 1, repeat: Infinity, ease: "easeInOut" }
        }}
        className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-6 shadow-xl shadow-emerald-500/10"
      >
        <Loader2 size={32} />
      </motion.div>
      <div className="flex flex-col items-center gap-2">
        <h3 className="text-lg font-black text-slate-800 tracking-tight">Eco <span className="text-emerald-600">Ads</span></h3>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] animate-pulse">Verifying Admin Privileges</p>
      </div>
    </div>
  );
  return user && isAdmin ? <>{children}</> : <Navigate to="/admin-login" replace />;
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout, isAdmin } = useAuth();
  const { settings } = useGameSettings();

  // Active Ad Cleanup for Admins
  React.useEffect(() => {
    if (!isAdmin) return;

    const cleanup = () => {
      const selectors = [
        '[id^="at-social-bar"]', 
        '.at-social-bar', 
        '[class*="social-bar"]',
        '[id^="propeller"]',
        '[id^="clickadilla"]',
        '[class*="popunder"]',
        '.native-ad-unit',
        'ins.adsbygoogle',
        '[id^="fixed-ad-container"]',
        '[id^="ad-frame"]',
        '.ad-container'
      ];
      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => (el as HTMLElement).remove());
      });

      // Aggressive check for common ad wrapper behaviors
      const allElements = document.querySelectorAll('body > div, body > span');
      allElements.forEach(el => {
        const style = window.getComputedStyle(el);
        const zIndex = parseInt(style.zIndex);
        if ((style.position === 'fixed' || style.position === 'absolute') && (zIndex > 1000 || zIndex === 2147483647)) {
          // If it's not a known UI component, remove it
          const isKnownUI = el.classList.contains('sonner-toast') || el.classList.contains('notification-center');
          if (!isKnownUI && el.querySelector('iframe, a, img, script')) {
            el.remove();
          }
        }
      });
    };

    const intervalId = setInterval(cleanup, 2000);
    cleanup();

    return () => clearInterval(intervalId);
  }, [isAdmin]);

  // Zoom Prevention Logic
  React.useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === '=' || e.key === '-' || e.key === '0' || e.key === '+')) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('wheel', handleWheel);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="min-h-screen bg-emerald-50/20 flex flex-col pt-0">
      {/* Global Ads (Floating/Overlay) */}
      <div className="fixed inset-0 pointer-events-none z-[60]">
        <AdUnit code={settings.ad_popunder} overlay hideLabel />
        <AdUnit code={settings.ad_social_bar} overlay hideLabel />
        <AdUnit code={settings.ad_banner_160x600} overlay hideLabel />
        <AdUnit code={settings.clickadilla_popunder} overlay hideLabel />
      </div>

      {/* Floating bottom banner - beautiful popup style */}
      <AdUnit 
        code={settings.ad_banner_728x90 || settings.ad_banner_320x50 || settings.clickadilla_banner || settings.ad_native_bottom} 
        stickyBottom 
        hideLabel 
      />
      
      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-b px-4 py-3 flex items-center justify-between z-[110] shadow-sm">
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

      <main className="flex-1 pt-16 pb-24 sm:pb-0 sm:pl-64 flex flex-col relative w-full overflow-x-hidden">
        <div className="max-w-4xl w-full mx-auto p-4 sm:p-8 flex-1 flex flex-col w-full">
          <div className="flex-1">
            <PageTransition key={useLocation().pathname}>
              {children}
            </PageTransition>
          </div>
          <AppFooter />
        </div>
      </main>

      {/* Sidebar / Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t flex justify-around p-2 sm:top-16 sm:left-0 sm:bottom-0 sm:w-64 sm:flex-col sm:justify-start sm:gap-2 sm:p-4 sm:border-r sm:border-t-0 z-[100] transition-all safe-area-pb shadow-[0_-5px_25px_rgba(0,0,0,0.05)]">
        <NavLink to="/" icon={<Home size={22} />} label="Dashboard" />
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

const InitRoute = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [init, setInit] = React.useState(false);

  React.useEffect(() => {
    if (!init && location.pathname === '/') {
      const lastPath = localStorage.getItem('lastPath');
      const isScannerReload = sessionStorage.getItem('scannerReloadPending') === 'true';
      
      // If we reloaded while starting scanner, or if we were on a specific page
      if (isScannerReload && lastPath && lastPath.includes('scanner')) {
        sessionStorage.removeItem('scannerReloadPending');
        navigate(lastPath, { replace: true });
      } else if (lastPath && lastPath !== '/' && lastPath !== '/login' && lastPath !== '/register') {
        // Fallback restoration for other reloads
        navigate(lastPath, { replace: true });
      }
    }
    setInit(true);
  }, [init, location.pathname, navigate]);

  return null;
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <InitRoute />
          <Suspense fallback={
            <div className="min-h-screen flex flex-col items-center justify-center bg-white">
              <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
            </div>
          }>
            <Routes>
              <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
              <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
              <Route path="/admin-login" element={<PageTransition><AdminLogin /></PageTransition>} />
              <Route path="/privacy-policy" element={<PageTransition><PrivacyPolicy /></PageTransition>} />
              <Route path="/terms-conditions" element={<PageTransition><TermsConditions /></PageTransition>} />
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
              <Route path="/watch-ads" element={<PrivateRoute><Layout><WatchAds /></Layout></PrivateRoute>} />
              <Route path="/withdraw" element={<PrivateRoute><Layout><Withdraw /></Layout></PrivateRoute>} />
              <Route path="/wallet" element={<PrivateRoute><Layout><WalletPage /></Layout></PrivateRoute>} />
              <Route path="/admin" element={<AdminRoute><PageTransition><Admin /></PageTransition></AdminRoute>} />
              <Route path="/admin/users/:userId" element={<AdminRoute><PageTransition><AdminUserDetails /></PageTransition></AdminRoute>} />
            </Routes>
          </Suspense>
        </Router>
        <Toaster position="top-center" />
      </AuthProvider>
    </ErrorBoundary>
  );
}
