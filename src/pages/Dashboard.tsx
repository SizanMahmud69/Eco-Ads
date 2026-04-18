import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Disc, Eraser, ListChecks, Wallet, TrendingUp, Users, Award, Zap, 
  Calculator, Brain, ShieldCheck, Palette, Eye, ArrowUpRight, 
  ArrowDownRight, Activity, Target, LayoutGrid, QrCode
} from 'lucide-react';
import { motion } from 'motion/react';
import { ReferralPopup } from '@/components/ReferralPopup';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';

export default function Dashboard() {
  const { user, showReferralPopup, setShowReferralPopup } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalEarnings: 0,
    totalWithdrawals: 0,
    remainingToday: 2000,
    chartData: [] as any[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      try {
        // Fetch History for Total Earnings and Chart
        const historyRef = collection(db, 'history');
        const historyQuery = query(
          historyRef, 
          where('userId', '==', user.uid),
          orderBy('timestamp', 'desc')
        );
        const historySnap = await getDocs(historyQuery);
        
        let totalEarned = 0;
        const historyData = historySnap.docs.map(doc => doc.data());
        
        // Calculate Total Earnings (only positive points)
        historyData.forEach(item => {
          if (item.points > 0) totalEarned += item.points;
        });

        // Calculate Today's Earnings for Remaining Points
        const today = startOfDay(new Date());
        let earnedToday = 0;
        historyData.forEach(item => {
          const itemDate = new Date(item.timestamp);
          if (isSameDay(itemDate, today) && item.points > 0) {
            earnedToday += item.points;
          }
        });

        // Fetch Withdrawals for Total Withdraw
        const withdrawRef = collection(db, 'withdrawals');
        const withdrawQuery = query(withdrawRef, where('userId', '==', user.uid));
        const withdrawSnap = await getDocs(withdrawQuery);
        
        let totalWithdrawn = 0;
        withdrawSnap.docs.forEach(doc => {
          totalWithdrawn += doc.data().amount || 0;
        });

        // Prepare Chart Data (Last 7 Days)
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = subDays(new Date(), 6 - i);
          const dayEarnings = historyData
            .filter(item => isSameDay(new Date(item.timestamp), date) && item.points > 0)
            .reduce((sum, item) => sum + item.points, 0);
          
          return {
            name: format(date, 'EEE'),
            points: dayEarnings
          };
        });

        setStats({
          totalEarnings: totalEarned,
          totalWithdrawals: totalWithdrawn,
          remainingToday: Math.max(0, 2000 - earnedToday),
          chartData: last7Days
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  return (
    <div className="space-y-8 pb-12">
      <ReferralPopup 
        isOpen={showReferralPopup} 
        onClose={() => setShowReferralPopup(false)} 
      />
      
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2 text-slate-900">
            Hello, {user?.username}
            {user?.is_premium && <Zap size={24} className="text-amber-500 fill-amber-500 animate-pulse" />}
            ! 👋
          </h1>
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold border border-emerald-100">
            <Activity size={14} />
            Live Updates
          </div>
        </div>
        <p className="text-slate-500 font-medium">Your earning journey at a glance.</p>
      </header>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard 
          title="Total Earnings" 
          value={stats.totalEarnings} 
          subtitle="All Time" 
          icon={<ArrowUpRight className="text-emerald-500" />} 
          color="bg-emerald-50"
          trend="+12% this week"
        />
        <StatCard 
          title="Total Withdraw" 
          value={stats.totalWithdrawals} 
          subtitle="Processed" 
          icon={<ArrowDownRight className="text-rose-500" />} 
          color="bg-rose-50"
        />
        <StatCard 
          title="Current Balance" 
          value={user?.points || 0} 
          subtitle="Available" 
          icon={<Wallet className="text-blue-500" />} 
          color="bg-blue-50"
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
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <LayoutGrid className="text-primary" size={24} />
            Quick Options
          </h2>
          <Link to="/tasks" className="text-sm font-bold text-primary hover:underline">View All Tasks</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          <ActionCard to="/eco-scanner" icon={<QrCode size={32} />} label="Eco Scanner" color="text-emerald-500" />
          <ActionCard to="/spin" icon={<Disc size={32} />} label="Spin Wheel" color="text-blue-500" />
          <ActionCard to="/scratch" icon={<Eraser size={32} />} label="Scratch Card" color="text-purple-500" />
          <ActionCard to="/tasks" icon={<ListChecks size={32} />} label="Daily Tasks" color="text-green-500" />
          <ActionCard to="/math-quiz" icon={<Calculator size={32} />} label="Math Challenge" color="text-orange-500" />
          <ActionCard to="/word-guess" icon={<Brain size={32} />} label="Word Scramble" color="text-pink-500" />
          <ActionCard to="/captcha" icon={<ShieldCheck size={32} />} label="Secure Captcha" color="text-cyan-500" />
          <ActionCard to="/color-match" icon={<Palette size={32} />} label="Color Match" color="text-pink-500" />
          <ActionCard to="/number-memory" icon={<Eye size={32} />} label="Number Memory" color="text-indigo-500" />
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

const StatCard = ({ title, value, subtitle, icon, color, trend }: any) => (
  <Card className="border-none shadow-xl shadow-slate-200/30 bg-white rounded-[2rem] overflow-hidden group hover:scale-[1.02] transition-all duration-300 relative border-b-[6px] border-emerald-500/10">
    <CardContent className="p-6 flex flex-col gap-4 relative z-10">
      <div className="flex items-center justify-between">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color} group-hover:rotate-6 transition-transform duration-300 shadow-sm`}>
          {icon}
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100/50">
            <TrendingUp size={10} />
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

const ActionCard = ({ to, icon, label, color }: any) => (
  <Link to={to}>
    <motion.div 
      whileHover={{ 
        y: -8,
        scale: 1.02,
      }}
      whileTap={{ scale: 0.95 }}
      className="bg-white p-6 rounded-[2.5rem] shadow-lg shadow-slate-200/50 border border-slate-50 flex flex-col items-center gap-4 text-center transition-all relative overflow-hidden group"
    >
      <div className={`w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center transition-all group-hover:bg-white group-hover:shadow-xl group-hover:shadow-current/10 ${color}`}>
        <motion.div
          whileHover={{ rotate: 15, scale: 1.1 }}
        >
          {icon}
        </motion.div>
      </div>
      <div className="space-y-1">
        <span className="text-sm font-black text-slate-800 block">{label}</span>
        <div className="flex items-center justify-center gap-1">
          <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Active</span>
        </div>
      </div>
      
      {/* Decorative background element */}
      <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-slate-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
    </motion.div>
  </Link>
);
