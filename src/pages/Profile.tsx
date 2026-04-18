import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { 
  User, Mail, Calendar, Wallet, LogOut, Shield, Zap, 
  Copy, CheckCircle2, Award, TrendingUp, Users, Gift,
  Star, Clock, ChevronRight, Sparkles, ArrowUpRight, QrCode,
  Calculator, Brain, ShieldCheck, Palette, Eye
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';

export default function Profile() {
  const { user, logout } = useAuth();
  const [realActivities, setRealActivities] = React.useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = React.useState(true);

  React.useEffect(() => {
    if (!user) return;

    // Fetch more items to handle sorting of mixed data types (String vs Timestamp) in memory
    const q = query(
      collection(db, 'history'),
      where('userId', '==', user.uid),
      orderBy('created_at', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activitiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];

      // In-memory unified sort to handle mixed data types during transition
      const sorted = activitiesData.sort((a, b) => {
        const dateA = a.created_at?.toMillis ? a.created_at.toMillis() : new Date(a.created_at || a.timestamp).getTime();
        const dateB = b.created_at?.toMillis ? b.created_at.toMillis() : new Date(b.created_at || b.timestamp).getTime();
        return (dateB || 0) - (dateA || 0);
      });

      setRealActivities(sorted.slice(0, 4));
      setLoadingActivities(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'history');
      setLoadingActivities(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Level calculation logic
  const pointsPerLevel = 1000;
  const currentLevel = Math.floor((user?.points || 0) / pointsPerLevel) + 1;
  const progressToNextLevel = ((user?.points || 0) % pointsPerLevel) / pointsPerLevel * 100;
  const pointsNeeded = pointsPerLevel - ((user?.points || 0) % pointsPerLevel);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  const getActivityIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('spin')) return <Sparkles size={14} className="text-blue-500" />;
    if (t.includes('scratch')) return <Gift size={14} className="text-purple-500" />;
    if (t.includes('bonus') || t.includes('daily')) return <Star size={14} className="text-amber-500" />;
    if (t.includes('scan')) return <QrCode size={14} className="text-emerald-500" />;
    if (t.includes('mining')) return <Zap size={14} className="text-yellow-500" />;
    if (t.includes('math')) return <Calculator size={14} className="text-orange-500" />;
    if (t.includes('word')) return <Brain size={14} className="text-pink-500" />;
    if (t.includes('captcha')) return <ShieldCheck size={14} className="text-cyan-500" />;
    if (t.includes('color')) return <Palette size={14} className="text-pink-500" />;
    if (t.includes('memory')) return <Eye size={14} className="text-indigo-500" />;
    return <CheckCircle2 size={14} className="text-slate-500" />;
  };

  const formatActivityName = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <motion.div 
      className="space-y-8 pb-10 relative"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Decorative Background Blobs */}
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-emerald-500/10 blur-[100px] -z-20 rounded-full" />
      <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-indigo-500/10 blur-[120px] -z-20 rounded-full" />

      {/* Hero Profile Section */}
      <motion.div variants={itemVariants} className="relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 to-indigo-600/20 rounded-3xl blur-3xl -z-10 group-hover:opacity-100 transition-opacity opacity-70" />
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 rounded-3xl p-8 shadow-2xl shadow-emerald-500/10 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4">
            {user?.is_premium ? (
              <motion.div 
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ repeat: Infinity, duration: 2, repeatType: "reverse" }}
                className="flex items-center gap-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1 rounded-full text-xs font-bold border border-amber-500/20"
              >
                <Zap size={14} className="fill-amber-500" />
                PREMIUM
              </motion.div>
            ) : (
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 px-3 py-1 rounded-full text-xs font-bold">
                Free Member
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative">
              <motion.div 
                whileHover={{ scale: 1.05, rotate: 5 }}
                className="w-28 h-28 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-emerald-500/30 relative z-10"
              >
                <User size={56} />
              </motion.div>
              <div className="absolute -inset-2 bg-emerald-500/20 rounded-[2.5rem] blur-lg -z-10" />
              {user?.is_premium && (
                <div className="absolute -bottom-2 -right-2 bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-800 z-20">
                  <Award size={24} className="text-amber-500" />
                </div>
              )}
            </div>
            
            <div className="text-center md:text-left space-y-3 flex-1">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center justify-center md:justify-start gap-2">
                  {user?.username}
                  <span className="text-sm bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-lg font-bold">
                    Lvl {currentLevel}
                  </span>
                </h1>
                <div className="flex items-center justify-center md:justify-start gap-2 text-slate-500 dark:text-slate-400 mt-1">
                  <Mail size={16} />
                  <span className="text-sm font-medium">{user?.email}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5 max-w-xs mx-auto md:mx-0">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <span>Level Progress</span>
                  <span>{Math.round(progressToNextLevel)}%</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progressToNextLevel}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-medium italic">
                  {pointsNeeded} points needed for next level
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <motion.div variants={itemVariants} className="col-span-2 md:col-span-1">
          <StatCard 
            title="Total Balance" 
            value={user?.points || 0} 
            unit="Points"
            icon={
              <Link to="/wallet">
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="text-emerald-500 hover:text-emerald-600 transition-colors"
                >
                  <Wallet className="text-emerald-500" />
                </motion.div>
              </Link>
            }
            color="emerald"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard 
            title="Referrals" 
            value={user?.referrals_count || 0} 
            unit="Users"
            icon={<Users className="text-indigo-500" />}
            color="indigo"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard 
            title="Bonus Earnings" 
            value={user?.referral_bonus_earned || 0} 
            unit="Points"
            icon={<TrendingUp className="text-amber-500" />}
            color="amber"
          />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Recent Activity */}
        <motion.div variants={itemVariants}>
          <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 h-full rounded-[2rem] overflow-hidden shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Clock size={20} className="text-indigo-500" />
                  Recent Activity
                </h3>
              </div>
              
              <div className="space-y-3">
                {loadingActivities ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : realActivities.length > 0 ? realActivities.map((activity, idx) => (
                  <div key={activity.id || idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100/50 dark:border-slate-700/30">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">{formatActivityName(activity.type)}</span>
                        <span className="text-[10px] text-emerald-600 font-bold">+{activity.points} Points</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      {(() => {
                        const rawDate = activity.timestamp || activity.created_at;
                        if (!rawDate) return 'Unknown';
                        const date = rawDate.toMillis ? new Date(rawDate.toMillis()) : new Date(rawDate);
                        return date.toLocaleDateString();
                      })()}
                    </span>
                  </div>
                )) : (
                  <div className="text-center py-8 space-y-2">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
                      <Clock size={24} />
                    </div>
                    <p className="text-sm text-slate-500">No activity yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Settings & Actions */}
      <motion.div variants={itemVariants} className="space-y-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
          Account Settings
          <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
        </h3>
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] overflow-hidden shadow-sm">
          <SettingsItem 
            icon={<Shield size={18} className="text-blue-500" />} 
            label="Membership Status" 
            value={user?.is_premium ? 'Premium' : 'Standard'} 
            badge={user?.is_premium}
          />
          <SettingsItem 
            icon={<CheckCircle2 size={18} className="text-emerald-500" />} 
            label="Email Verification" 
            value="Completed" 
          />
          <SettingsItem 
            icon={<Calendar size={18} className="text-indigo-500" />} 
            label="Joined Date" 
            value={new Date(user?.created_at || '').toLocaleDateString()} 
          />
        </div>

        <Button 
          onClick={logout}
          variant="outline" 
          className="w-full h-16 rounded-[1.5rem] font-bold gap-3 border-red-100 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-900/20 transition-all group"
        >
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
          Logout
        </Button>
      </motion.div>
    </motion.div>
  );
}

const StatCard = ({ title, value, unit, icon, color, action }: any) => {
  const colorClasses: any = {
    emerald: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20",
    indigo: "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20",
    amber: "bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20",
  };

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className={`p-6 rounded-[2rem] border ${colorClasses[color]} space-y-3 relative overflow-hidden group h-full border-b-[6px] border-emerald-500/20`}
    >
      <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
        {React.cloneElement(icon, { size: 80 })}
      </div>
      <div className="flex items-center justify-between relative z-10">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{title}</span>
        <div className="p-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm">
          {icon}
        </div>
      </div>
      <div className="flex flex-col relative z-10">
        <span className="text-3xl font-black text-slate-900 dark:text-white leading-none">{value.toLocaleString()}</span>
        <span className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">{unit}</span>
        {action}
      </div>
    </motion.div>
  );
};

const SettingsItem = ({ icon, label, value, badge }: any) => (
  <div className="flex items-center justify-between p-5 border-b border-slate-50 dark:border-slate-800/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
    <div className="flex items-center gap-4">
      <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-2xl group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{label}</span>
    </div>
    <div className="flex items-center gap-3">
      <span className={`text-sm font-black ${badge ? 'text-amber-500' : 'text-slate-900 dark:text-white'}`}>{value}</span>
      {badge ? (
        <Zap size={16} className="text-amber-500 fill-amber-500" />
      ) : (
        <ChevronRight size={16} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
      )}
    </div>
  </div>
);


