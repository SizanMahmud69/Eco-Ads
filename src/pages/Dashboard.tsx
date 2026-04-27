import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import React, { useEffect, useState } from 'react';
import { 
  Disc, Eraser, ListChecks, Wallet, TrendingUp, Users, Award, Zap, 
  Calculator, Brain, ShieldCheck, Palette, Eye, ArrowUpRight, 
  ArrowDownRight, Activity, Target, LayoutGrid, QrCode, Pickaxe, 
  CheckCircle, ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { ReferralPopup } from '@/components/ReferralPopup';
import { AdUnit } from '@/components/AdUnit';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';

import { useGameSettings } from '@/hooks/useGameSettings';

export default function Dashboard() {
  const { user, showReferralPopup, setShowReferralPopup } = useAuth();
  const { settings } = useGameSettings();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalEarnings: 0,
    totalWithdrawals: 0,
    remainingToday: 2000,
    yesterdayLost: 0,
    weeklyTrend: 0,
    withdrawTrend: 0,
    balanceTrend: 0,
    chartData: [] as any[],
  });
  const [loading, setLoading] = useState(true);

  // Prevent back navigation from dashboard
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      window.history.pushState(null, '', window.location.href);
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const historyRef = collection(db, 'history');
    const historyQuery = query(
      historyRef, 
      where('userId', '==', user.uid),
      limit(500)
    );

    // Using onSnapshot for history to make it more reactive and handle navigation better
    let isMounted = true;
    const unsubscribe = onSnapshot(historyQuery, (snapshot) => {
      if (!isMounted) return;
      try {
        if (snapshot.empty) {
          const today = new Date();
          setStats(prev => ({
            ...prev,
            totalEarnings: user?.points || 0,
            remainingToday: Number(settings.daily_point_limit) || 2000,
            chartData: Array.from({ length: 7 }, (_, i) => ({
              name: format(subDays(today, 6 - i), 'EEE'),
              points: 0
            })),
          }));
          setLoading(false);
          return;
        }

        const historySnapshotData = snapshot.docs.map(doc => doc.data()).filter(Boolean);
        
        // Unified date parsing helper
        const getTimestamp = (item: any) => {
          const raw = item.timestamp || item.created_at;
          if (!raw) return 0;
          if (raw.seconds !== undefined) return raw.seconds * 1000;
          if (typeof raw.toMillis === 'function') return raw.toMillis();
          if (raw instanceof Date) return raw.getTime();
          const parsed = new Date(raw).getTime();
          return isNaN(parsed) ? 0 : parsed;
        };

        // Sort in-memory to avoid index requirement
        const historyData = historySnapshotData.sort((a, b) => getTimestamp(b) - getTimestamp(a));
        
        // Use history for detailed trends, but current points as baseline for all-time
        let totalCalculatedEarned = 0;
        historyData.forEach(item => {
          const pts = Number(item.points);
          if (!isNaN(pts) && isFinite(pts) && pts > 0) totalCalculatedEarned += pts;
        });

        const displayTotalEarnings = Math.max(totalCalculatedEarned, Number(user?.points) || 0);

        const today = startOfDay(new Date());
        let earnedToday = 0;
        
        const processedHistory = historyData.map(item => {
          if (!item) return null;
          const ts = getTimestamp(item);
          const itemDate = ts > 0 ? new Date(ts) : null;
          
          const points = Number(item.points) || 0;
          return {
            ...item,
            parsedDate: itemDate,
            points: isFinite(points) ? points : 0
          };
        }).filter(item => item !== null && item.parsedDate !== null && !isNaN(item.parsedDate.getTime())) as any[];

        processedHistory.forEach(item => {
          if (item.parsedDate && isSameDay(item.parsedDate, today) && item.points > 0) {
            earnedToday += item.points;
          }
        });

        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = subDays(today, 6 - i);
          const dayEarnings = processedHistory
            .filter(item => item.parsedDate && isSameDay(item.parsedDate, date))
            .reduce((sum, item) => sum + (Number(item.points) || 0), 0);
          
          return {
            name: format(date, 'EEE'),
            points: isFinite(dayEarnings) ? dayEarnings : 0
          };
        });

        const earnedThisWeekTotal = last7Days.reduce((sum, d) => sum + d.points, 0);
        let earnedLastWeekTotal = 0;
        const sevenDaysAgo = startOfDay(subDays(today, 7));
        const fourteenDaysAgo = startOfDay(subDays(today, 14));

        processedHistory.forEach(item => {
          if (item.parsedDate && item.parsedDate < sevenDaysAgo && item.parsedDate >= fourteenDaysAgo && item.points > 0) {
            earnedLastWeekTotal += item.points;
          }
        });

        const calcTrend = (now: number, then: number) => {
          if (then > 0) return Math.round(((now - then) / then) * 100);
          return now > 0 ? 100 : 0;
        };

        const earnedTrend = calcTrend(earnedThisWeekTotal, earnedLastWeekTotal);
        
        // Calculate yesterday's lost coins
        const dailyLimit = Number(settings.daily_point_limit) || 2000;
        const yesterdayEarnings = last7Days[5]?.points || 0;
        const yLost = Math.max(0, dailyLimit - yesterdayEarnings);

        setStats(prev => ({
          ...prev,
          totalEarnings: isNaN(displayTotalEarnings) ? (user?.points || 0) : displayTotalEarnings,
          remainingToday: Math.max(0, dailyLimit - earnedToday),
          yesterdayLost: yLost,
          weeklyTrend: isNaN(earnedTrend) ? 0 : earnedTrend,
          chartData: last7Days,
        }));
      } catch (error) {
        console.error("Error processing dashboard history:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }, (error) => {
      console.error("Error listening to history:", error);
      if (isMounted) setLoading(false);
    });

    // Also fetch withdrawals once (or use another snapshot)
    const fetchWithdrawals = async () => {
      try {
        const withdrawRef = collection(db, 'withdrawals');
        const withdrawQuery = query(withdrawRef, where('userId', '==', user.uid));
        const withdrawSnap = await getDocs(withdrawQuery);
        
        if (!isMounted) return;

        if (withdrawSnap.empty) {
           setStats(prev => ({ ...prev, totalWithdrawals: 0, withdrawTrend: 0 }));
           return;
        }

        let totalWithdrawn = 0;
        const withdrawData = withdrawSnap.docs.map(doc => doc.data()).filter(Boolean);
        withdrawData.forEach(item => {
          if (!item) return;
          const amt = Number(item.amountPoints || item.amount || 0);
          if (!isNaN(amt)) totalWithdrawn += amt;
        });

        const today = startOfDay(new Date());
        const sevenDaysAgo = startOfDay(subDays(today, 7));
        const fourteenDaysAgo = startOfDay(subDays(today, 14));

        let withdrawnThisWeekTotal = 0;
        let withdrawnLastWeekTotal = 0;

        withdrawData.forEach(item => {
          if (!item) return;
          const rawDate = item.created_at;
          if (!rawDate) return;
          
          let itemDate: Date | null = null;
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
            
            if (!itemDate || isNaN(itemDate.getTime())) return;
          } catch (e) {
            return;
          }

          const amount = Number(item.amountPoints || item.amount || 0);
          if (isNaN(amount)) return;

          if (itemDate >= sevenDaysAgo && itemDate <= today) {
            withdrawnThisWeekTotal += amount;
          } else if (itemDate < sevenDaysAgo && itemDate >= fourteenDaysAgo) {
            withdrawnLastWeekTotal += amount;
          }
        });

        const calcTrend = (now: number, then: number) => {
          if (then > 0) return Math.round(((now - then) / then) * 100);
          return now > 0 ? 100 : 0;
        };

        const wTrend = calcTrend(withdrawnThisWeekTotal, withdrawnLastWeekTotal);

        setStats(prev => ({
          ...prev,
          totalWithdrawals: isNaN(totalWithdrawn) ? 0 : totalWithdrawn,
          withdrawTrend: isNaN(wTrend) ? 0 : wTrend,
        }));
      } catch (err) {
        console.error("Error fetching withdrawals:", err);
      }
    };

    fetchWithdrawals();

    return () => {
      isMounted = false;
      unsubscribe();
    };

  }, [user?.uid, settings.daily_point_limit]);

  return (
    <div className="space-y-6 md:space-y-8 pb-4 overflow-x-hidden w-full max-w-full px-1">
      <ReferralPopup 
        isOpen={showReferralPopup} 
        onClose={() => setShowReferralPopup(false)} 
      />
      
      {/* 1. Dashboard Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-5 md:p-8 bg-white dark:bg-slate-900 rounded-[1.5rem] md:rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-50 dark:border-slate-800 relative overflow-hidden w-full">
        <div className="flex items-center gap-4 md:gap-6 relative z-10 w-full overflow-hidden">
          <div className="shrink-0 w-14 h-14 md:w-20 md:h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[1.2rem] md:rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-emerald-500/30">
            <span className="text-xl md:text-3xl font-black">{(user?.username?.[0] || user?.email?.[0] || 'U')?.toUpperCase()}</span>
          </div>
          <div className="space-y-0.5 md:space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                Hello, {user?.username || 'User'}
              </h1>
              <span className="text-xl md:text-3xl">👋</span>
              {user?.is_premium && (
                <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1 rounded-full text-[10px] font-black border border-amber-500/20 animate-pulse">
                  <Zap size={10} className="fill-amber-500" />
                  PREMIUM
                </div>
              )}
            </div>
            <p className="text-xs md:text-base text-slate-500 dark:text-slate-400 font-medium tracking-wide truncate">
              Your earning journey at a glance.
            </p>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full -mr-32 -mt-32 pointer-events-none" />
      </header>

      {user?.is_frozen && (
        <div className="mx-1 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center gap-4 text-blue-500">
          <Activity size={24} className="shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-black uppercase tracking-tight">Account Restricted</p>
            <p className="text-xs font-medium opacity-80">Your account is currently frozen. Please contact support for more information.</p>
          </div>
        </div>
      )}
      
      {/* 2. Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="border-none shadow-lg bg-white dark:bg-slate-900 rounded-[1.5rem] p-6 animate-pulse">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-4" />
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/2 mb-2" />
              <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded w-3/4" />
            </Card>
          ))
        ) : (
          <>
            <StatCard 
              title="Total Earnings" 
              value={stats.totalEarnings || 0} 
              subtitle="All Time" 
              icon={<ArrowUpRight className="text-emerald-500" />} 
              color="bg-emerald-50"
              trend={isNaN(stats.weeklyTrend) ? null : `${stats.weeklyTrend >= 0 ? '+' : ''}${stats.weeklyTrend}%`}
            />
            <StatCard 
              title="Withdrawals" 
              value={stats.totalWithdrawals || 0} 
              subtitle="Processed" 
              icon={<ArrowDownRight className="text-rose-500" />} 
              color="bg-rose-50"
              trend={isNaN(stats.withdrawTrend) ? null : `${stats.withdrawTrend >= 0 ? '+' : ''}${stats.withdrawTrend}%`}
            />
            <StatCard 
              title="Balance" 
              value={user?.points || 0} 
              subtitle="Available" 
              icon={<Wallet className="text-blue-500" />} 
              color="bg-blue-50"
            />
            <StatCard 
              title="Status" 
              value={user?.is_premium ? 'Premium' : 'Free'} 
              subtitle={user?.is_premium ? 'Unlimited' : 'Basic'} 
              icon={<Award className="text-amber-500" />} 
              color="bg-amber-50"
            />
            <StatCard 
              title="Remaining" 
              value={stats.remainingToday || 0} 
              subtitle="Today" 
              icon={<Target className="text-indigo-500" />} 
              color="bg-indigo-50"
            />
            <StatCard 
              title="Yesterday Lost" 
              value={stats.yesterdayLost || 0} 
              subtitle="Missed" 
              icon={<Eraser className="text-orange-500" />} 
              color="bg-orange-50"
            />
          </>
        )}
      </div>

      {/* First Middle Ad */}
      <div className="py-2 px-1">
        <AdUnit code={settings.ad_banner_728x90 || settings.ad_square_300x250 || settings.ad_banner_320x50 || settings.clickadilla_banner} className="rounded-xl overflow-hidden" />
      </div>

      {/* 3. Performance Graph */}
      <Card className="border-none shadow-xl shadow-slate-200/40 overflow-hidden bg-white dark:bg-slate-900 rounded-[1.5rem] md:rounded-[2.5rem]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7 px-5 md:px-8">
          <div className="space-y-1">
            <CardTitle className="text-lg md:text-xl font-bold flex items-center gap-2">
              <TrendingUp className="text-emerald-500" size={20} />
              Earnings History
            </CardTitle>
            <p className="text-xs text-slate-500 font-medium">Last 7 days performance</p>
          </div>
        </CardHeader>
        <CardContent className="px-1 md:px-4 pb-6">
          {loading ? (
            <div className="h-[250px] md:h-[300px] w-full bg-slate-50 dark:bg-slate-800/50 animate-pulse rounded-3xl" />
          ) : stats.chartData && stats.chartData.length > 0 ? (
            <div className="h-[250px] md:h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      fontWeight: 'bold',
                      fontSize: '12px'
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="points" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorPoints)" 
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[250px] md:h-[300px] w-full flex items-center justify-center bg-slate-50 dark:bg-slate-800/20 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800">
               <div className="flex flex-col items-center gap-2 text-slate-400">
                  <Activity size={24} className="opacity-50" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">No activity recorded yet</p>
               </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Middle Page Ad */}
      <div className="py-2 px-1">
        <AdUnit code={settings.ad_banner_728x90 || settings.ad_square_300x250 || settings.clickadilla_banner} />
      </div>

      {/* 4. Quick Actions */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="space-y-0.5">
            <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <LayoutGrid className="text-primary" size={24} />
              Quick Actions
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Earn more points</p>
          </div>
          <Link to="/eco" className="group flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-primary hover:text-white rounded-xl text-[10px] font-black transition-all">
            VIEW ALL <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <ActionCard 
            to="/eco-scanner" 
            icon={<QrCode size={24} />} 
            label="Eco Scanner" 
            color="text-emerald-500" 
            isPremium
          />
          <ActionCard 
            to="/spin" 
            icon={<Disc size={24} />} 
            label="Spin Wheel" 
            color="text-blue-500" 
            completed={(user?.daily_plays?.spin || 0) >= (settings.daily_game_limit || 3)}
          />
          <ActionCard 
            to="/scratch" 
            icon={<Eraser size={24} />} 
            label="Scratch Card" 
            color="text-purple-500" 
            completed={(user?.daily_plays?.scratch || 0) >= (settings.daily_game_limit || 3)}
          />
          <ActionCard 
            to="/mining" 
            icon={<Pickaxe size={24} />} 
            label="Eco Mining" 
            color="text-yellow-500" 
            isPremium
          />
        </div>
      </section>

      {/* Promo Card */}
      {!user?.is_premium && (
        <Card className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white overflow-hidden border-none shadow-2xl shadow-indigo-500/20 rounded-[2rem] mx-1">
          <CardContent className="p-6 md:p-10">
            <div className="relative z-10 space-y-4 max-w-md">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold backdrop-blur-sm">
                <Zap size={12} className="fill-white" />
                PREMIUM BENEFITS
              </div>
              <h3 className="text-2xl md:text-3xl font-black">Go Premium!</h3>
              <p className="text-indigo-100 text-sm md:text-base font-medium">Get 2x points, instant withdrawals, and ad-free experience (on games).</p>
              <Button 
                variant="secondary" 
                size="lg"
                className="font-black rounded-xl px-8 shadow-lg hover:scale-105 transition-transform"
                onClick={() => navigate('/upgrade')}
              >
                Upgrade Now
              </Button>
            </div>
            <Award className="absolute -right-8 -bottom-8 w-48 h-48 text-white/10 rotate-12" />
          </CardContent>
        </Card>
      )}

    </div>
  );
}

const StatCard = ({ title, value, subtitle, icon, color, trend }: any) => {
  const isNegative = trend && trend.startsWith('-');
  
  return (
    <Card className="border-none shadow-lg shadow-slate-200/30 bg-white dark:bg-slate-900 rounded-[1.5rem] md:rounded-[2rem] overflow-hidden group hover:scale-[1.02] transition-all duration-300 relative border-b-[4px] border-emerald-500/10">
      <CardContent className="p-4 md:p-6 flex flex-col gap-3 md:gap-4 relative z-10">
        <div className="flex items-center justify-between">
          <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center ${color} shadow-sm`}>
            {icon}
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-[8px] md:text-[10px] font-black ${isNegative ? 'text-rose-600 bg-rose-50' : 'text-emerald-600 bg-emerald-50'} px-2 py-0.5 rounded-full`}>
              {trend}
            </div>
          )}
        </div>
        <div className="space-y-0.5">
          <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-wider">{title}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-lg md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </span>
            <span className="text-[8px] font-bold text-slate-400 uppercase">{subtitle}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ActionCard = ({ to, icon, label, color, completed, isPremium }: any) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const handleClick = (e: React.MouseEvent) => {
    if (isPremium && !user?.is_premium) {
      e.preventDefault();
      toast.info('This is a Premium game. Please upgrade to play!', {
        icon: '💎'
      });
      navigate('/upgrade');
    }
  };

  return (
    <Link to={to} onClick={handleClick}>
      <motion.div 
        whileHover={{ y: -5, scale: 1.02 }}
        whileTap={{ scale: 0.95 }}
        className={`p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-md shadow-slate-200/50 border flex flex-col items-center gap-3 md:gap-4 text-center transition-all relative overflow-hidden group ${
          completed 
            ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-80' 
            : 'bg-white dark:bg-slate-900 border-slate-50 dark:border-slate-800'
        }`}
      >
        {isPremium && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full text-[8px] font-black border border-amber-500/20">
            <Zap size={8} className="fill-amber-500" />
            PRO
          </div>
        )}
        <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center transition-all ${
          completed 
            ? 'bg-slate-200 text-slate-400' 
            : `bg-slate-50 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-700 group-hover:shadow-xl group-hover:shadow-current/10 ${color}`
        }`}>
          {completed ? <CheckCircle size={24} /> : icon}
        </div>
        <div className="space-y-0.5">
          <span className={`text-xs md:text-sm font-black block ${completed ? 'text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
            {label}
          </span>
          <div className="flex items-center justify-center gap-1">
            {completed ? (
              <span className="text-[8px] font-bold text-slate-400 uppercase">Finished</span>
            ) : (
              <>
                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[8px] font-bold text-emerald-500 uppercase">Available</span>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
};
