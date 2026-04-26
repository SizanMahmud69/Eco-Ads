import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Wallet as WalletIcon, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  ArrowLeft, 
  ArrowUpRight,
  History as HistoryIcon,
  Sparkles,
  Gift,
  Star,
  CheckCircle2,
  Calculator,
  Brain,
  ShieldCheck,
  Palette,
  Eye,
  Pickaxe
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, limit, getDoc, doc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { AdUnit } from '@/components/AdUnit';
import { useGameSettings } from '@/hooks/useGameSettings';

export default function Wallet() {
  const { user } = useAuth();
  const { settings } = useGameSettings();
  const navigate = useNavigate();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pointsPerBdt, setPointsPerBdt] = useState(100);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsSnap = await getDoc(doc(db, 'settings', 'game_points'));
        if (settingsSnap.exists()) {
          setPointsPerBdt(settingsSnap.data().points_per_bdt || 100);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    const q = query(
      collection(db, 'history'),
      where('userId', '==', user.uid),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!isMounted) return;
      try {
        const historyData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Sort in-memory to avoid index requirement
        const sorted = historyData.sort((a: any, b: any) => {
          const rawA = a.created_at || a.timestamp;
          const rawB = b.created_at || b.timestamp;
          const getTime = (raw: any) => {
            if (!raw) return 0;
            if (raw.seconds !== undefined) return raw.seconds * 1000;
            if (typeof raw.toMillis === 'function') return raw.toMillis();
            if (raw instanceof Date) return raw.getTime();
            const parsed = new Date(raw).getTime();
            return isNaN(parsed) ? 0 : parsed;
          };
          return getTime(rawB) - getTime(rawA);
        });

        setHistory(sorted);
        setLoading(false);
      } catch (err) {
        console.error("Error processing wallet history:", err);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [user?.uid]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'spin': return <Sparkles size={18} className="text-blue-500" />;
      case 'scratch': return <Gift size={18} className="text-purple-500" />;
      case 'daily': return <Star size={18} className="text-amber-500" />;
      case 'task': return <CheckCircle2 size={18} className="text-green-500" />;
      case 'math_quiz': return <Calculator size={18} className="text-orange-500" />;
      case 'word_guess': return <Brain size={18} className="text-pink-500" />;
      case 'captcha': return <ShieldCheck size={18} className="text-cyan-500" />;
      case 'color_match': return <Palette size={18} className="text-pink-500" />;
      case 'number_memory': return <Eye size={18} className="text-indigo-500" />;
      case 'mining': return <Pickaxe size={18} className="text-emerald-500" />;
      default: return <TrendingUp size={18} className="text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <header className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(-1)}
          className="rounded-full hover:bg-emerald-50 text-slate-600"
        >
          <ArrowLeft size={24} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Wallet</h1>
          <p className="text-sm text-slate-500">Manage your earnings and history</p>
        </div>
      </header>

      {/* Balance Card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <Card className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-none shadow-xl shadow-emerald-500/20 rounded-[2.5rem] overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <WalletIcon size={120} />
          </div>
          <CardContent className="p-8 space-y-6 relative z-10">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-emerald-100 text-sm font-bold uppercase tracking-widest">Total Balance</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black">{user?.points?.toLocaleString() || 0}</span>
                  <span className="text-emerald-200 font-bold">Points</span>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-3xl text-right">
                <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest mb-1">Estimated Value</p>
                <div className="flex items-baseline justify-end gap-1">
                  <span className="text-2xl font-black">৳{((user?.points || 0) / pointsPerBdt).toFixed(2)}</span>
                  <span className="text-[10px] font-bold text-emerald-200">BDT</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={() => navigate('/withdraw')}
                className="bg-white text-emerald-700 hover:bg-emerald-50 font-bold rounded-2xl px-6 h-12 shadow-lg shadow-black/10"
              >
                Withdraw Now
                <ArrowUpRight size={18} className="ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* History Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <HistoryIcon size={20} className="text-indigo-500" />
            Transaction History
          </h2>
          <span className="text-xs font-bold text-slate-400 uppercase">{history.length} Records</span>
        </div>

        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="text-emerald-500"
                >
                  <Clock size={32} />
                </motion.div>
                <p className="text-slate-400 font-medium">Loading history...</p>
              </div>
            ) : history.length > 0 ? (
              history.map((item, idx) => (
                <div key={item.id}>
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="mb-3"
                  >
                    <Card className="border-slate-100 shadow-sm hover:shadow-md transition-shadow rounded-2xl overflow-hidden">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center shadow-inner">
                          {getIcon(item.type)}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-sm capitalize">{item.type.replace('_', ' ')}</h4>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {(() => {
                              const rawDate = item.created_at || item.timestamp;
                              let itemDate: Date | null = null;
                              
                              if (rawDate) {
                                try {
                                  if (rawDate.seconds !== undefined) {
                                    itemDate = new Date(rawDate.seconds * 1000);
                                  } else if (rawDate && typeof rawDate.toMillis === 'function') {
                                    const ms = rawDate.toMillis();
                                    if (typeof ms === 'number') itemDate = new Date(ms);
                                  } else if (rawDate instanceof Date) {
                                    itemDate = rawDate;
                                  } else {
                                    const parsed = new Date(rawDate);
                                    if (!isNaN(parsed.getTime())) itemDate = parsed;
                                  }
                                } catch (e) {
                                  itemDate = null;
                                }
                              }

                              return (!itemDate || isNaN(itemDate.getTime())) ? 'Recently' : itemDate.toLocaleString();
                            })()}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-emerald-600 font-black">
                            <TrendingUp size={14} />
                            <span>+{item.points}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Points</p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                  
                  {(idx + 1) % 4 === 0 && (
                    <div className="my-4 flex justify-center">
                      <AdUnit code={settings.ad_banner_468x60} className="" />
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-20 space-y-4">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                  <HistoryIcon size={40} />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-slate-800">No transactions yet</p>
                  <p className="text-sm text-slate-500">Start playing games to earn points!</p>
                </div>
                <Button 
                  onClick={() => navigate('/')}
                  variant="outline"
                  className="rounded-xl border-emerald-100 text-emerald-600"
                >
                  Go to Dashboard
                </Button>
              </div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
