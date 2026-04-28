import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  ShieldCheck,
  Zap, 
  History, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Wallet,
  Trophy,
  Activity,
  Heart,
  Ban,
  Snowflake,
  UserCheck,
  Smartphone,
  MapPin,
  Clock,
  ExternalLink,
  MessageSquare,
  RefreshCcw,
  Package,
  TrendingUp,
  CreditCard,
  Target,
  FileText,
  DollarSign,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminUserDetails() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const checkAdmin = async () => {
      if (!currentUser) return;
      try {
        const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
        if (adminDoc.exists()) {
          setIsAdmin(true);
        } else {
          toast.error("Unauthorized access");
          navigate('/');
        }
      } catch (err) {
        console.error("Error checking admin:", err);
        navigate('/');
      }
    };
    checkAdmin();
  }, [currentUser, navigate]);

  useEffect(() => {
    if (!isAdmin || !userId) return;

    const fetchUserDetails = async () => {
      setLoading(true);
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (!userDoc.exists()) {
          toast.error("User not found");
          setLoading(false);
          return;
        }

        const userData: any = { id: userDoc.id, ...userDoc.data() };
        
        try {
          const privateDoc = await getDoc(doc(db, 'users_private', userId));
          if (privateDoc.exists()) {
            userData.private = privateDoc.data();
          }
        } catch (e) {
          console.warn("Could not fetch private data", e);
        }

        setUser(userData);

        // Notifications
        const notifQuery = query(
          collection(db, 'notifications'),
          where('userId', '==', userData.uid),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
        const notifSnap = await getDocs(notifQuery);
        setRecentNotifications(notifSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // Payments
        const payQuery = query(
          collection(db, 'withdrawals'),
          where('userId', '==', userData.uid),
          orderBy('created_at', 'desc'),
          limit(10)
        );
        const paySnap = await getDocs(payQuery);
        setPaymentHistory(paySnap.docs.map(d => ({ id: d.id, ...d.data() })));

      } catch (err) {
        console.error("Error fetching user details:", err);
        toast.error("Failed to load user data");
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [isAdmin, userId]);

  const handleTogglePremium = async () => {
    if (!user) return;
    if (user.is_premium) {
      toast.error('Premium status cannot be revoked once granted.');
      return;
    }
    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      
      await updateDoc(doc(db, 'users', user.id), {
        is_premium: true,
        premium_expiry: expiryDate.toISOString()
      });
      setUser({ ...user, is_premium: true, premium_expiry: expiryDate.toISOString() });
      toast.success("Promoted to Premium (30 days)");
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleToggleFreeze = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.id), {
        is_frozen: !user.is_frozen
      });
      setUser({ ...user, is_frozen: !user.is_frozen });
      toast.success(user.is_frozen ? "Account Unfrozen" : "Account Frozen");
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleToggleBan = async () => {
    if (!user) return;
    if (!confirm(`Are you sure you want to ${user.is_banned ? 'unban' : 'ban'} this user?`)) return;
    try {
      await updateDoc(doc(db, 'users', user.id), {
        is_banned: !user.is_banned
      });
      setUser({ ...user, is_banned: !user.is_banned });
      toast.success(user.is_banned ? "User Unbanned" : "User Banned Successfully");
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleResetHealth = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.id), {
        profile_health: 100
      });
      setUser({ ...user, profile_health: 100 });
      toast.success("Health Reset to 100%");
    } catch (err) {
      toast.error("Failed to reset health");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="w-10 h-10 rounded-full" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl md:col-span-2" />
        </div>
      </div>
    );
  }

  if (!user) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle size={32} />
        </div>
        <h2 className="text-xl font-bold text-white">User Not Found</h2>
        <Button onClick={() => navigate('/admin')} variant="outline">Back to User List</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      {/* Header bar */}
      <div className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/admin')}
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/5 transition-colors text-slate-400 hover:text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-black text-lg tracking-tight">User Explorer</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">Internal Management</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {user.is_premium ? (
            <Badge className="bg-amber-500 text-black font-black tracking-widest text-[10px] py-1 px-3">PREMIUM</Badge>
          ) : (
            <Badge variant="outline" className="text-slate-500 border-white/5 font-black tracking-widest text-[10px] py-1 px-3">FREE TIER</Badge>
          )}
        </div>
      </div>

      <main className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Profile Card */}
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.5 }}
           className="relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 blur-3xl -z-10" />
          <Card className="bg-slate-900/50 border-white/5 overflow-hidden backdrop-blur-xl">
            <div className="h-40 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 relative">
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
               <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
            </div>
            
            <CardContent className="px-6 pb-8 relative">
              <div className="flex flex-col md:flex-row items-start md:items-end justify-between -mt-16 mb-8 gap-6">
                <div className="flex items-end gap-6">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-[2.5rem] bg-slate-800 border-4 border-slate-950 flex items-center justify-center text-indigo-400 overflow-hidden shadow-2xl transition-transform group-hover:scale-105 duration-300">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                      ) : (
                        <User size={64} className="opacity-20" />
                      )}
                    </div>
                    {user.is_premium && (
                      <div className="absolute -top-2 -right-2 w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg transform rotate-12 border-4 border-slate-950 text-black">
                        <Zap size={18} fill="currentColor" />
                      </div>
                    )}
                  </div>
                  <div className="pb-2 space-y-1">
                    <div className="flex items-center gap-3">
                      <h2 className="text-3xl font-black text-white tracking-tight">{user.username}</h2>
                      {user.email_verified && <ShieldCheck size={24} className="text-emerald-400" />}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] bg-white/5 py-1 px-2 rounded-lg text-slate-400 border border-white/5 font-mono tracking-widest">{user.uid}</span>
                      <Badge variant="outline" className={user.is_banned ? 'border-red-500/50 text-red-400' : 'border-emerald-500/50 text-emerald-400'}>
                        {user.is_banned ? 'Suspended' : 'Verified Member'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                   <Button 
                    variant="outline" 
                    className="flex-1 md:flex-none border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white rounded-xl h-12"
                    onClick={handleToggleFreeze}
                   >
                     {user.is_frozen ? <Zap size={18} className="mr-2" /> : <Snowflake size={18} className="mr-2" />}
                     {user.is_frozen ? 'Restore Account' : 'Freeze Access'}
                   </Button>
                   <Button 
                    variant="outline" 
                    className={`flex-1 md:flex-none h-12 rounded-xl border-red-500/20 ${user.is_banned ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'}`}
                    onClick={handleToggleBan}
                   >
                     {user.is_banned ? <UserCheck size={18} className="mr-2" /> : <Ban size={18} className="mr-2" />}
                     {user.is_banned ? 'Pardon User' : 'Ban Identity'}
                   </Button>
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                 <div className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-indigo-500/20 transition-colors group">
                    <div className="flex justify-between items-start mb-2">
                       <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform">
                          <Wallet size={16} />
                       </div>
                       <Badge className="bg-indigo-500/10 text-indigo-400 border-0">WALLET</Badge>
                    </div>
                    <p className="text-2xl font-black text-white">{user.points?.toLocaleString() || 0}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Available Points</p>
                 </div>

                 <div className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-emerald-500/20 transition-colors group">
                    <div className="flex justify-between items-start mb-2">
                       <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                          <Users size={16} />
                       </div>
                       <Badge className="bg-emerald-500/10 text-emerald-400 border-0">GROWTH</Badge>
                    </div>
                    <p className="text-2xl font-black text-white">{user.referrals_count || 0}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Active Referrals</p>
                 </div>

                 <div className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-amber-500/20 transition-colors group">
                    <div className="flex justify-between items-start mb-2">
                       <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
                          <Trophy size={16} />
                       </div>
                       <Badge className="bg-amber-500/10 text-amber-400 border-0">EARNED</Badge>
                    </div>
                    <p className="text-2xl font-black text-white">৳{((user.total_earned_points || 0) / 1000).toFixed(2)}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Lifetime Payout</p>
                 </div>

                 <div className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-red-500/20 transition-colors group">
                    <div className="flex justify-between items-start mb-2">
                       <div className="p-2 rounded-lg bg-red-500/10 text-red-400 group-hover:scale-110 transition-transform">
                          <Activity size={16} />
                       </div>
                       <Badge className="bg-red-500/10 text-red-400 border-0">HEALTH</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                       <p className={`text-2xl font-black ${user.profile_health < 50 ? 'text-red-400' : 'text-emerald-400'}`}>
                         {user.profile_health || 100}%
                       </p>
                       <Button size="icon" variant="ghost" className="w-8 h-8 rounded-full text-slate-500 hover:text-white" onClick={handleResetHealth}>
                          <RefreshCcw size={14} />
                       </Button>
                    </div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Reputation Score</p>
                 </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Tabs Area */}
          <div className="lg:col-span-2">
             <Tabs defaultValue="details" className="w-full">
                <TabsList className="bg-slate-900 border border-white/5 p-1 h-12 rounded-xl mb-6">
                   <TabsTrigger value="details" className="flex-1 rounded-lg font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Profile Details</TabsTrigger>
                   <TabsTrigger value="payments" className="flex-1 rounded-lg font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Payout History</TabsTrigger>
                   <TabsTrigger value="notifications" className="flex-1 rounded-lg font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Activity Logs</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-6">
                   <Card className="bg-slate-900 border-white/5 rounded-2xl">
                      <CardHeader className="border-b border-white/5">
                         <CardTitle className="text-lg font-bold flex items-center gap-3">
                            <FileText size={20} className="text-indigo-400" />
                            Account Blueprint
                         </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                         <div className="divide-y divide-white/5">
                            <DetailRow icon={<Mail />} label="Registered Email" value={user.private?.email || user.email || 'None'} />
                            <DetailRow icon={<Smartphone />} label="Phone Identity" value={user.private?.phone || user.phone || 'Not Assigned'} />
                            <DetailRow icon={<Calendar />} label="Joining Date" value={user.created_at ? new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Alpha Tester'} />
                            <DetailRow icon={<Clock />} label="System activity" value={user.last_activity ? new Date(user.last_activity).toLocaleTimeString() : 'Active Now'} />
                            <DetailRow icon={<Target />} label="Referral Code" value={user.referral_code?.toUpperCase() || 'ROOT'} isCopyable />
                            <DetailRow icon={<TrendingUp />} label="Earning Multiplier" value={user.multiplier ? `${user.multiplier}x BOOST` : '1x BASE'} isHighlighted />
                         </div>
                      </CardContent>
                   </Card>

                   <Card className="bg-slate-900 border-white/5 rounded-2xl p-6">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                            <Shield size={24} />
                         </div>
                         <div className="flex-1">
                            <h4 className="font-bold text-white">Trust Level Assessment</h4>
                            <p className="text-xs text-slate-500">Manual review of account behavior and potential fraudulent flags.</p>
                         </div>
                         <Badge className="bg-emerald-500/20 text-emerald-400 py-1 px-3">SAFEZONE</Badge>
                      </div>
                   </Card>
                </TabsContent>

                <TabsContent value="payments">
                   <Card className="bg-slate-900 border-white/5 rounded-2xl overflow-hidden">
                      <div className="divide-y divide-white/5">
                         {paymentHistory.length > 0 ? (
                            paymentHistory.map((pay) => (
                               <div key={pay.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                                  <div className="flex items-center gap-4">
                                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pay.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                                        <DollarSign size={20} />
                                     </div>
                                     <div>
                                        <p className="font-bold text-white">৳{pay.amountBDT}</p>
                                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{pay.method} • {new Date(pay.created_at).toLocaleDateString()}</p>
                                     </div>
                                  </div>
                                  <Badge variant={pay.status === 'approved' ? 'default' : 'secondary'} className="rounded-full px-4">
                                     {pay.status}
                                  </Badge>
                               </div>
                            ))
                         ) : (
                            <div className="p-20 text-center space-y-3">
                               <Package size={48} className="mx-auto text-slate-800" />
                               <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No payout records found</p>
                            </div>
                         )}
                      </div>
                   </Card>
                </TabsContent>

                <TabsContent value="notifications">
                   <Card className="bg-slate-900 border-white/5 rounded-2xl overflow-hidden">
                      <div className="divide-y divide-white/5">
                         {recentNotifications.length > 0 ? (
                            recentNotifications.map((n) => (
                               <div key={n.id} className="p-4 flex gap-4 hover:bg-white/5 transition-colors">
                                  <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-white ${
                                     n.type === 'success' ? 'bg-emerald-600' : n.type === 'alert' ? 'bg-amber-600' : 'bg-indigo-600'
                                  }`}>
                                     {n.type === 'success' ? <CheckCircle2 size={20} /> : <MessageSquare size={20} />}
                                  </div>
                                  <div>
                                     <h5 className="font-bold text-white text-sm">{n.title}</h5>
                                     <p className="text-xs text-slate-400 leading-relaxed mb-1">{n.message}</p>
                                     <span className="text-[10px] font-black uppercase text-slate-600 tracking-tighter">{new Date(n.createdAt).toLocaleString()}</span>
                                  </div>
                               </div>
                            ))
                         ) : (
                           <div className="p-20 text-center space-y-3">
                              <History size={48} className="mx-auto text-slate-800" />
                              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Activity log is empty</p>
                           </div>
                         )}
                      </div>
                   </Card>
                </TabsContent>
             </Tabs>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
             <Card className="bg-slate-900 border-white/5 rounded-2xl overflow-hidden">
                <CardHeader className="bg-indigo-600/5 border-b border-indigo-500/10">
                   <CardTitle className="text-sm font-black uppercase tracking-widest text-indigo-400">Control Hub</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                   <Button 
                    className={`w-full justify-start h-12 font-bold gap-3 rounded-xl border ${user.is_premium ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 cursor-default hover:bg-amber-500/10' : 'bg-white/5 hover:bg-white/10 text-white border-white/5'}`}
                    onClick={handleTogglePremium}
                   >
                     <Zap size={18} className={user.is_premium ? 'text-amber-500 fill-amber-500' : 'text-slate-500'} />
                     {user.is_premium ? 'Premium Membership Active' : 'Elevate to Premium'}
                   </Button>

                   <Button 
                    variant="outline"
                    className="w-full justify-start h-12 border-white/5 bg-white/5 text-slate-300 hover:text-white font-bold gap-3 rounded-xl"
                    onClick={() => {
                        const email = user.private?.email || user.email;
                        if (email) window.location.href = `mailto:${email}`;
                        else toast.error("No email associated");
                    }}
                   >
                     <Mail size={18} className="text-indigo-400" />
                     Contact Support Agent
                   </Button>
                   
                   <div className="pt-4 mt-2 border-t border-white/5">
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3">Diagnostic Tools</p>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-xs text-slate-500 hover:text-slate-300 font-bold p-0 px-3 h-8"
                        onClick={() => {
                           navigator.clipboard.writeText(JSON.stringify(user, null, 2));
                           toast.success("Full data object copied");
                        }}
                      >
                         <Smartphone size={14} className="mr-3" /> Full Data JSON
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-xs text-slate-500 hover:text-red-400 font-bold p-0 px-3 h-8"
                        onClick={() => toast.info("Audit history feature in dev")}
                      >
                         <History size={14} className="mr-3" /> System Audit Log
                      </Button>
                   </div>
                </CardContent>
             </Card>

             <Card className="bg-gradient-to-br from-indigo-900/40 via-slate-900 to-slate-900 border-white/5 rounded-2xl p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                <div className="relative z-10">
                   <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white mb-4">
                      <ShieldCheck size={28} />
                   </div>
                   <h3 className="text-xl font-black text-white mb-2 leading-none tracking-tight">Access Firewall</h3>
                   <p className="text-xs text-slate-400 leading-relaxed mb-6">
                     This user's login session and token can be invalidated for security audits. Last verified from Dhaka.
                   </p>
                   <div className="flex items-center gap-4 p-3 bg-black/40 rounded-xl border border-white/5">
                      <div className="w-10 h-10 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                         <MapPin size={20} />
                      </div>
                      <div>
                         <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Login Origin</p>
                         <p className="text-sm font-bold text-white">Dhaka, BD (IPv4)</p>
                      </div>
                   </div>
                </div>
             </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

function DetailRow({ icon, label, value, isHighlighted = false, isCopyable = false }: any) {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied!`);
  };

  return (
    <div className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors group">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 group-hover:text-indigo-400 transition-colors">
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{label}</p>
          <p className={`text-sm font-bold ${isHighlighted ? 'text-indigo-400' : 'text-slate-200'}`}>{value}</p>
        </div>
      </div>
      {isCopyable && (
        <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={copyToClipboard}>
          <CreditCard size={14} className="text-slate-600" />
        </Button>
      )}
    </div>
  );
}
