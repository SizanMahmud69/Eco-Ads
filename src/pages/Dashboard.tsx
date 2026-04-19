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
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
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

    const fetchStats = async () => {
      try {
        // Fetch History for Total Earnings and Chart
        const historyRef = collection(db, 'history');
        const historyQuery = query(
          historyRef, 
          where('userId', '==', user.uid),
          orderBy('created_at', 'desc')
        );
        const historySnap = await getDocs(historyQuery);
        
        let totalEarned = 0;
        const historyData = historySnap.docs.map(doc => doc.data());
        
        // Calculate Total Earnings (only positive points)
        historyData.forEach(item => {
          const pts = item.points || 0;
          if (pts > 0) totalEarned += pts;
        });

        // Calculate Today's Earnings for Remaining Points
        const today = startOfDay(new Date());
        let earnedToday = 0;
        historyData.forEach(item => {
          // Handle both timestamp and created_at, as well as Firestore serverTimestamp objects
          const rawDate = item.timestamp || item.created_at;
          if (!rawDate) return;
          
          let itemDate: Date;
          if (rawDate.toMillis) {
            itemDate = new Date(rawDate.toMillis());
          } else {
            itemDate = new Date(rawDate);
          }

          if (isSameDay(itemDate, today) && (item.points || 0) > 0) {
            earnedToday += item.points;
          }
        });

        // Fetch Withdrawals for Total Withdraw
        const withdrawRef = collection(db, 'withdrawals');
        const withdrawQuery = query(withdrawRef, where('userId', '==', user.uid));
        const withdrawSnap = await getDocs(withdrawQuery);
        
        let totalWithdrawn = 0;
        withdrawSnap.docs.forEach(doc => {
          const data = doc.data();
          // Support both 'amount' and 'amountPoints'
          totalWithdrawn += data.amountPoints || data.amount || 0;
        });

        // Prepare Chart Data (Last 7 Days)
        let earnedThisWeekTotal = 0;
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = subDays(new Date(), 6 - i);
          const dayEarnings = historyData
            .filter(item => {
              const rawDate = item.timestamp || item.created_at;
              if (!rawDate) return false;
              const itemDate = rawDate.toMillis ? new Date(rawDate.toMillis()) : new Date(rawDate);
              return isSameDay(itemDate, date) && (item.points || 0) > 0;
            })
            .reduce((sum, item) => sum + (item.points || 0), 0);
          
          earnedThisWeekTotal += dayEarnings;
          return {
            name: format(date, 'EEE'),
            points: dayEarnings
          };
        });

        // Calculate previous 7 days trend (7-14 days ago)
        let earnedLastWeekTotal = 0;
        const sevenDaysAgo = startOfDay(subDays(today, 7));
        const fourteenDaysAgo = startOfDay(subDays(today, 14));

        historyData.forEach(item => {
          const rawDate = item.timestamp || item.created_at;
          if (!rawDate) return;
          const itemDate = rawDate.toMillis ? new Date(rawDate.toMillis()) : new Date(rawDate);
          
          if (itemDate < sevenDaysAgo && itemDate >= fourteenDaysAgo && (item.points || 0) > 0) {
            earnedLastWeekTotal += item.points;
          }
        });

        // Withdrawal Trends
        const withdrawData = withdrawSnap.docs.map(doc => doc.data());
        let withdrawnThisWeekTotal = 0;
        let withdrawnLastWeekTotal = 0;

        withdrawData.forEach(item => {
          const rawDate = item.created_at;
          if (!rawDate) return;
          const itemDate = rawDate.toMillis ? new Date(rawDate.toMillis()) : new Date(rawDate);
          const amount = item.amountPoints || item.amount || 0;

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

        const earnedTrend = calcTrend(earnedThisWeekTotal, earnedLastWeekTotal);
        const wTrend = calcTrend(withdrawnThisWeekTotal, withdrawnLastWeekTotal);
        
        // Balance Trend: Comparing net accumulation (Earned - Withdrawn)
        const netThisWeek = earnedThisWeekTotal - withdrawnThisWeekTotal;
        const netLastWeek = earnedLastWeekTotal - withdrawnLastWeekTotal;
        const bTrend = calcTrend(netThisWeek, netLastWeek);

        setStats({
          totalEarnings: totalEarned,
          totalWithdrawals: totalWithdrawn,
          remainingToday: Math.max(0, (settings.daily_point_limit || 2000) - earnedToday),
          weeklyTrend: earnedTrend,
          withdrawTrend: wTrend,
          balanceTrend: bTrend,
          chartData: last7Days,
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, settings]);

  return (
    <div className="space-y-8 pb-12">
      <ReferralPopup 
        isOpen={showReferralPopup} 
        onClose={() => setShowReferralPopup(false)} 
      />
      
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 md:p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-50 dark:border-slate-800 relative overflow-hidden group">
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-16 md:w-20 h-16 md:h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-emerald-500/30 group-hover:rotate-3 transition-transform duration-500">
            <span className="text-2xl md:text-3xl font-black">{user?.username?.[0]?.toUpperCase()}</span>
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Hello, {user?.username}
              </h1>
              <span className="text-2xl md:text-3xl">👋</span>
              {user?.is_premium && (
                <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1 rounded-full text-[10px] font-black border border-amber-500/20 animate-pulse">
                  <Zap size={12} className="fill-amber-500" />
                  PREMIUM
                </div>
              )}
            </div>
            <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-medium tracking-wide">
              Your earning journey at a glance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 relative z-10">
          <div className="flex items-center gap-2.5 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl text-[10px] font-black border border-emerald-100 dark:border-emerald-500/20 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            LIVE UPDATES
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full -mr-32 -mt-32 group-hover:bg-emerald-500/10 transition-colors duration-700" />
        <div className="absolute -bottom-10 left-0 w-40 h-40 bg-indigo-500/5 blur-[60px] rounded-full -ml-20 group-hover:bg-indigo-500/10 transition-colors duration-700" />
      </header>

      <AdUnit code={settings.ad_banner_728x90} className="w-full" minimal hideLabel />
      <AdUnit code={settings.ad_native_top} className="w-full my-4 min-h-[100px]" />
      <AdUnit code={settings.ad_banner_468x60} className="w-full my-2" />

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard 
          title="Total Earnings" 
          value={stats.totalEarnings} 
          subtitle="All Time" 
          icon={<ArrowUpRight className="text-emerald-500" />} 
          color="bg-emerald-50"
          trend={`${stats.weeklyTrend >= 0 ? '+' : ''}${stats.weeklyTrend}% this week`}
        />
        <StatCard 
          title="Total Withdraw" 
          value={stats.totalWithdrawals} 
          subtitle="Processed" 
          icon={<ArrowDownRight className="text-rose-500" />} 
          color="bg-rose-50"
          trend={`${stats.withdrawTrend >= 0 ? '+' : ''}${stats.withdrawTrend}% this week`}
        />
        <StatCard 
          title="Current Balance" 
          value={user?.points || 0} 
          subtitle="Available" 
          icon={<Wallet className="text-blue-500" />} 
          color="bg-blue-50"
          trend={`${stats.balanceTrend >= 0 ? '+' : ''}${stats.balanceTrend}% this week`}
        />
        <StatCard 
          title="Account Status" 
          value={user?.is_premium ? 'Premium' : 'Free'} 
          subtitle={user?.is_premium ? 'Unlimited' : 'Basic'} 
          icon={<Award className="text-amber-500" />} 
          color="bg-amber-50"
        />
        <StatCard 
          title="Daily Remaining" 
          value={stats.remainingToday} 
          subtitle="Points Left" 
          icon={<Target className="text-indigo-500" />} 
          color="bg-indigo-50"
        />
      </div>

      {/* Performance Graph */}
      <div className="flex flex-col gap-4 items-center my-6">
        <AdUnit code={settings.ad_square_300x250} className="min-h-[250px]" />
        <AdUnit code={settings.ad_banner_320x50} className="min-h-[50px]" />
      </div>
      <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden bg-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <TrendingUp className="text-emerald-500" size={20} />
              Earnings Overview
            </CardTitle>
            <p className="text-sm text-slate-500 font-medium">Your performance over the last 7 days</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs font-bold text-slate-400">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              Points
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-2">
          <div className="h-[300px] w-full">
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
                  tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontWeight: 'bold'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="points" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorPoints)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions Section */}
      <AdUnit code={settings.ad_native_bottom} className="w-full" />
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <LayoutGrid className="text-primary" size={24} />
              Quick Options
            </h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Start earning points now</p>
          </div>
          <Link to="/eco" className="group flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-primary hover:text-white rounded-xl text-xs font-black transition-all">
            VIEW ALL <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <ActionCard 
            to="/eco-scanner" 
            icon={<QrCode size={28} />} 
            label="Eco Scanner" 
            color="text-emerald-500" 
            isPremium
          />
          <ActionCard 
            to="/spin" 
            icon={<Disc size={28} />} 
            label="Spin Wheel" 
            color="text-blue-500" 
            completed={(user?.daily_plays?.spin || 0) >= (settings.daily_game_limit || 3)}
          />
          <ActionCard 
            to="/scratch" 
            icon={<Eraser size={28} />} 
            label="Scratch Card" 
            color="text-purple-500" 
            completed={(user?.daily_plays?.scratch || 0) >= (settings.daily_game_limit || 3)}
          />
          <ActionCard 
            to="/mining" 
            icon={<Pickaxe size={28} />} 
            label="Eco Mining" 
            color="text-yellow-500" 
            isPremium
          />
        </div>
      </section>

      {/* Promo Card */}
      {!user?.is_premium && (
        <Card className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white overflow-hidden border-none shadow-2xl shadow-indigo-500/20">
          <CardContent className="p-8">
            <div className="relative z-10 space-y-4 max-w-md">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-xs font-bold backdrop-blur-sm">
                <Zap size={14} className="fill-white" />
                LIMITED TIME OFFER
              </div>
              <h3 className="text-3xl font-black">Go Premium Today!</h3>
              <p className="text-indigo-100 font-medium">Get 2x points on all activities, instant withdrawals, and an ad-free experience.</p>
              <Button 
                variant="secondary" 
                size="lg"
                className="font-black rounded-xl px-8 shadow-lg hover:scale-105 transition-transform"
                onClick={() => navigate('/upgrade')}
              >
                Upgrade Now
              </Button>
            </div>
            <Award className="absolute -right-8 -bottom-8 w-64 h-64 text-white/10 rotate-12" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const StatCard = ({ title, value, subtitle, icon, color, trend }: any) => {
  const isNegative = trend && trend.startsWith('-');
  
  return (
    <Card className="border-none shadow-xl shadow-slate-200/30 bg-white rounded-[2rem] overflow-hidden group hover:scale-[1.02] transition-all duration-300 relative border-b-[6px] border-emerald-500/10">
      <CardContent className="p-6 flex flex-col gap-4 relative z-10">
        <div className="flex items-center justify-between">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color} group-hover:rotate-6 transition-transform duration-300 shadow-sm`}>
            {icon}
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-[10px] font-black ${isNegative ? 'text-rose-600 bg-rose-50 border-rose-100/50' : 'text-emerald-600 bg-emerald-50 border-emerald-100/50'} px-2.5 py-1 rounded-full border`}>
              {isNegative ? <ArrowDownRight size={10} /> : <TrendingUp size={10} />}
              {trend}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] leading-none">{title}</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{subtitle}</span>
          </div>
        </div>
      </CardContent>
      <div className="absolute -bottom-12 -left-12 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
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
        whileHover={{ y: -8, scale: 1.02 }}
        whileTap={{ scale: 0.95 }}
        className={`p-6 rounded-[2rem] shadow-lg shadow-slate-200/50 border flex flex-col items-center gap-4 text-center transition-all relative overflow-hidden group ${
          completed 
            ? 'bg-slate-50 border-slate-200 opacity-80' 
            : 'bg-white border-slate-50'
        }`}
      >
        {isPremium && (
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full text-[8px] font-black border border-amber-500/20">
            <Zap size={8} className="fill-amber-500" />
            PREMIUM
          </div>
        )}
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
          completed 
            ? 'bg-slate-200 text-slate-400' 
            : `bg-slate-50 group-hover:bg-white group-hover:shadow-xl group-hover:shadow-current/10 ${color}`
        }`}>
          {completed ? <CheckCircle size={28} /> : icon}
        </div>
        <div className="space-y-1">
          <span className={`text-sm font-black block ${completed ? 'text-slate-400' : 'text-slate-800'}`}>
            {label}
          </span>
          <div className="flex items-center justify-center gap-1">
            {completed ? (
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Finished</span>
            ) : (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Available</span>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
};
