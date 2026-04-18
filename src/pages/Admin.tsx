import * as React from 'react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Users, 
  Wallet, 
  Settings, 
  Check, 
  X, 
  RefreshCw, 
  LayoutDashboard, 
  ShieldCheck, 
  Ban,
  TrendingUp,
  ArrowUpRight,
  LogOut,
  Menu,
  Leaf,
  ListChecks,
  Zap,
  Pickaxe,
  Plus,
  Trash2,
  Edit,
  Award
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDocs, addDoc, deleteDoc, limit, where, increment, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';

export default function Admin() {
  const { isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [usersPrivate, setUsersPrivate] = useState<Record<string, string>>({});
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [miningSessions, setMiningSessions] = useState<any[]>([]);
  const [premiumRequests, setPremiumRequests] = useState<any[]>([]);
  const [referralRewards, setReferralRewards] = useState<any[]>([]);
  const [gameSettings, setGameSettings] = useState({
    spin_points_min: 10,
    spin_points_max: 100,
    scratch_points_min: 5,
    scratch_points_max: 50,
    math_quiz_points: 2,
    word_guess_points: 10,
    captcha_points: 5,
    color_match_points: 5,
    number_memory_points: 10,
    referral_bonus: 500,
    points_per_bdt: 1000,
    min_withdrawal: 5000,
    daily_game_limit: 3,
    daily_point_limit: 2000,
    spin_cooldown: 60,
    scratch_cooldown: 30,
    maintenance_mode: false,
    registrations_enabled: true,
    bkash_number: '01700000000',
    nagad_number: '01700000000',
    rocket_number: '01700000000'
  });
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPoints: 0,
    pendingWithdrawals: 0,
    totalPaid: 0,
    premiumUsers: 0
  });

  // Form states for adding tasks/plans
  const [newTask, setNewTask] = useState({ title: '', description: '', points_reward: 0, type: 'daily', link: '', timer: 30 });
  const [newPlan, setNewPlan] = useState({ name: '', price: 0, duration_days: 30, features: '', multiplier: 1 });

  useEffect(() => {
    if (!isAdmin) return;

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const userData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(userData);
      const totalPoints = userData.reduce((acc: number, u: any) => acc + (u.points || 0), 0);
      const premiumCount = userData.filter((u: any) => u.is_premium).length;
      setStats(prev => ({ ...prev, totalUsers: userData.length, totalPoints, premiumUsers: premiumCount }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

    const unsubUsersPrivate = onSnapshot(collection(db, 'users_private'), (snapshot) => {
      const privateData: Record<string, string> = {};
      snapshot.docs.forEach(doc => {
        privateData[doc.id] = doc.data().email;
      });
      setUsersPrivate(privateData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users_private'));

    const unsubWithdrawals = onSnapshot(query(collection(db, 'withdrawals'), orderBy('created_at', 'desc')), (snapshot) => {
      const withdrawalData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWithdrawals(withdrawalData);
      const pending = withdrawalData.filter((w: any) => w.status === 'pending').length;
      const paid = withdrawalData.filter((w: any) => w.status === 'approved').reduce((acc: number, w: any) => acc + (w.amountBDT || 0), 0);
      setStats(prev => ({ ...prev, pendingWithdrawals: pending, totalPaid: paid }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'withdrawals'));

    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubPlans = onSnapshot(collection(db, 'plans'), (snapshot) => {
      setPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubMining = onSnapshot(query(collection(db, 'mining_sessions'), orderBy('start_at', 'desc'), limit(50)), (snapshot) => {
      setMiningSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubPremium = onSnapshot(query(collection(db, 'premium_requests'), orderBy('created_at', 'desc')), (snapshot) => {
      setPremiumRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubReferralRewards = onSnapshot(query(collection(db, 'referral_rewards'), orderBy('created_at', 'desc')), (snapshot) => {
      setReferralRewards(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'game_points'), (docSnap) => {
      if (docSnap.exists()) {
        setGameSettings(prev => ({ ...prev, ...docSnap.data() }));
      }
    });

    return () => {
      unsubUsers();
      unsubUsersPrivate();
      unsubWithdrawals();
      unsubTasks();
      unsubPlans();
      unsubMining();
      unsubPremium();
      unsubReferralRewards();
      unsubSettings();
    };
  }, [isAdmin]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'tasks'), {
        ...newTask,
        timer: newTask.timer || 30 // Default to 30s if not set
      });
      setNewTask({ title: '', description: '', points_reward: 0, type: 'daily', link: '', timer: 30 });
      toast.success('Task added successfully');
    } catch (error) {
      toast.error('Failed to add task');
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await deleteDoc(doc(db, 'tasks', id));
      toast.success('Task deleted');
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const handleAddPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const planData = {
        ...newPlan,
        features: newPlan.features.split(',').map(f => f.trim())
      };
      await addDoc(collection(db, 'plans'), planData);
      setNewPlan({ name: '', price: 0, duration_days: 30, features: '', multiplier: 1 });
      toast.success('Plan added successfully');
    } catch (error) {
      toast.error('Failed to add plan');
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;
    try {
      await deleteDoc(doc(db, 'plans', id));
      toast.success('Plan deleted');
    } catch (error) {
      toast.error('Failed to delete plan');
    }
  };

  const handleTogglePremium = async (userId: string, currentStatus: boolean) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        is_premium: !currentStatus
      });
      toast.success(`User status updated to ${!currentStatus ? 'Premium' : 'Free'}`);
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const handleApprovePremium = async (request: any) => {
    try {
      const userRef = doc(db, 'users', request.userId);
      await updateDoc(userRef, {
        is_premium: true,
        planId: request.planId,
        planName: request.planName,
        multiplier: request.multiplier || 1
      });

      const requestRef = doc(db, 'premium_requests', request.id);
      await updateDoc(requestRef, { status: 'approved' });

      // Send Notification
      await addDoc(collection(db, 'notifications'), {
        userId: request.userId,
        title: 'Premium Upgrade Approved! 💎',
        message: `Congratulations! Your ${request.planName} plan is now active. Enjoy your ${request.multiplier}x points!`,
        type: 'success',
        read: false,
        created_at: serverTimestamp()
      });

      toast.success('Premium request approved!');
    } catch (error) {
      toast.error('Failed to approve request');
    }
  };

  const handleRejectPremium = async (requestId: string) => {
    try {
      const requestRef = doc(db, 'premium_requests', requestId);
      const requestSnap = await getDoc(requestRef);
      await updateDoc(requestRef, { status: 'rejected' });
      
      if (requestSnap.exists()) {
        const requestData = requestSnap.data();
        await addDoc(collection(db, 'notifications'), {
          userId: requestData.userId,
          title: 'Premium Request Rejected',
          message: 'Your premium upgrade request was rejected. Please contact support if you think this is a mistake.',
          type: 'alert',
          read: false,
          created_at: serverTimestamp()
        });
      }

      toast.success('Premium request rejected');
    } catch (error) {
      toast.error('Failed to reject request');
    }
  };

  const handleApproveReferral = async (reward: any) => {
    try {
      const referrerRef = doc(db, 'users', reward.referrerId);
      const referrerSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', reward.referrerId)));
      
      if (!referrerSnap.empty) {
        const referrerData = referrerSnap.docs[0].data();
        const currentPoints = referrerData.points || 0;
        const currentBonus = referrerData.referral_bonus_earned || 0;
        
        await updateDoc(referrerSnap.docs[0].ref, {
          points: increment(reward.bonusAmount),
          referral_bonus_earned: increment(reward.bonusAmount)
        });

        const rewardRef = doc(db, 'referral_rewards', reward.id);
        await updateDoc(rewardRef, { status: 'approved' });

        // Notification for referrer
        await addDoc(collection(db, 'notifications'), {
          userId: reward.referrerId,
          title: 'Referral Bonus Received! 🎁',
          message: `You earned ${reward.bonusAmount} points as ${reward.referredUsername} reached 1000 points!`,
          type: 'success',
          read: false,
          created_at: serverTimestamp()
        });

        toast.success('Referral reward approved!');
      }
    } catch (error) {
      console.error("Error approving referral:", error);
      toast.error('Failed to approve referral reward');
    }
  };

  const handleRejectReferral = async (rewardId: string) => {
    try {
      const rewardRef = doc(db, 'referral_rewards', rewardId);
      const rewardSnap = await getDoc(rewardRef);
      await updateDoc(rewardRef, { status: 'rejected' });

      if (rewardSnap.exists()) {
        const rData = rewardSnap.data();
        await addDoc(collection(db, 'notifications'), {
          userId: rData.referrerId,
          title: 'Referral Reward Rejected',
          message: 'One of your referral rewards was rejected after manual verification.',
          type: 'alert',
          read: false,
          created_at: serverTimestamp()
        });
      }

      toast.success('Referral reward rejected');
    } catch (error) {
      toast.error('Failed to reject referral reward');
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const withdrawalRef = doc(db, 'withdrawals', id);
      const withdrawalSnap = await getDoc(withdrawalRef);
      await updateDoc(withdrawalRef, { status });

      if (withdrawalSnap.exists()) {
        const wData = withdrawalSnap.data();
        await addDoc(collection(db, 'notifications'), {
          userId: wData.userId,
          title: status === 'approved' ? 'Withdrawal Approved! 💰' : 'Withdrawal Rejected',
          message: status === 'approved' 
            ? `Your withdrawal of ৳${wData.amountBDT} has been processed successfully.`
            : `Your withdrawal request for ৳${wData.amountBDT} was rejected. Points have been refunded.`,
          type: status === 'approved' ? 'success' : 'alert',
          read: false,
          created_at: serverTimestamp()
        });
      }

      toast.success(`Withdrawal ${status}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `withdrawals/${id}`);
    }
  };

  const handleUpdateGameSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'settings', 'game_points'), gameSettings);
      toast.success('Game settings updated successfully');
    } catch (error) {
      toast.error('Failed to update game settings');
    }
  };

  const fetchData = async () => {
    // onSnapshot handles real-time updates, but we can manually re-fetch if needed
    setLoading(true);
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const withdrawalsSnap = await getDocs(query(collection(db, 'withdrawals'), orderBy('created_at', 'desc')));
      
      setUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setWithdrawals(withdrawalsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      toast.error('Failed to sync data');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) return null;

  const handleNavClick = (tab: string) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col sm:flex-row overflow-hidden text-slate-100">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-[110] sm:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Admin Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-slate-950 border-r border-slate-800 flex flex-col z-[120] transition-transform duration-300 ease-in-out
        sm:relative sm:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Leaf className="text-white" size={24} />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Eco Ads</h1>
              <p className="text-xs text-slate-500">Admin Control Panel</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="sm:hidden text-slate-400"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={20} />
          </Button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <AdminNavLink 
            icon={<LayoutDashboard size={20} />} 
            label="Overview" 
            active={activeTab === 'overview'} 
            onClick={() => handleNavClick('overview')} 
          />
          <AdminNavLink 
            icon={<Wallet size={20} />} 
            label="Withdrawals" 
            active={activeTab === 'withdrawals'}
            count={stats.pendingWithdrawals} 
            onClick={() => handleNavClick('withdrawals')} 
          />
          <AdminNavLink 
            icon={<Users size={20} />} 
            label="Users" 
            active={activeTab === 'users'}
            onClick={() => handleNavClick('users')} 
          />
          <AdminNavLink 
            icon={<ListChecks size={20} />} 
            label="Tasks" 
            active={activeTab === 'tasks'}
            onClick={() => handleNavClick('tasks')} 
          />
          <AdminNavLink 
            icon={<ShieldCheck size={20} />} 
            label="Premium" 
            active={activeTab === 'premium'}
            count={premiumRequests.filter(r => r.status === 'pending').length}
            onClick={() => handleNavClick('premium')} 
          />
          <AdminNavLink 
            icon={<Zap size={20} />} 
            label="Plans" 
            active={activeTab === 'plans'}
            onClick={() => handleNavClick('plans')} 
          />
          <AdminNavLink 
            icon={<Award size={20} />} 
            label="Referrals" 
            active={activeTab === 'referrals'}
            count={referralRewards.filter(r => r.status === 'pending').length}
            onClick={() => handleNavClick('referrals')} 
          />
          <AdminNavLink 
            icon={<Pickaxe size={20} />} 
            label="Mining" 
            active={activeTab === 'mining'}
            onClick={() => handleNavClick('mining')} 
          />
          <AdminNavLink 
            icon={<Settings size={20} />} 
            label="Settings" 
            active={activeTab === 'settings'}
            onClick={() => handleNavClick('settings')} 
          />
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-950/30"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            <LogOut size={18} className="mr-3" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-900">
        {/* Header */}
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-4 sm:px-8 bg-slate-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="sm:hidden text-slate-400 hover:bg-slate-800"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={24} />
            </Button>
            <h2 className="font-semibold text-slate-200 capitalize">{activeTab} Overview</h2>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" className="hidden sm:flex bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Sync Data
            </Button>
            <Button variant="outline" size="icon" className="sm:hidden bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/50 flex items-center justify-center text-indigo-400 text-xs font-bold">
              AD
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8">
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <AdminStatCard title="Total Users" value={stats.totalUsers} icon={<Users className="text-blue-400" />} />
                <AdminStatCard title="Premium Users" value={stats.premiumUsers} icon={<Zap className="text-amber-400" />} />
                <AdminStatCard title="Total Points" value={stats.totalPoints.toLocaleString()} icon={<TrendingUp className="text-indigo-400" />} />
                <AdminStatCard title="Pending Requests" value={stats.pendingWithdrawals} icon={<Wallet className="text-amber-400" />} highlight={stats.pendingWithdrawals > 0} />
                <AdminStatCard title="Total Paid" value={`৳${stats.totalPaid.toLocaleString()}`} icon={<Check className="text-emerald-400" />} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="bg-slate-800 border-slate-700 text-slate-100">
                  <CardHeader>
                    <CardTitle>Recent Withdrawals</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableBody>
                        {withdrawals.slice(0, 5).map((w) => (
                          <TableRow key={w.id} className="border-slate-700">
                            <TableCell className="text-slate-300">{w.username}</TableCell>
                            <TableCell className="text-indigo-400 font-bold">৳{w.amountBDT}</TableCell>
                            <TableCell>
                              <Badge variant={w.status === 'approved' ? 'default' : 'secondary'}>{w.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Button variant="ghost" className="w-full text-indigo-400 hover:text-indigo-300" onClick={() => setActiveTab('withdrawals')}>View All</Button>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800 border-slate-700 text-slate-100">
                  <CardHeader>
                    <CardTitle>New Users</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableBody>
                        {users.slice(0, 5).map((u) => (
                          <TableRow key={u.id} className="border-slate-700">
                            <TableCell className="text-slate-300">
                              <div className="flex items-center gap-2">
                                {u.username}
                                {u.is_premium && <Zap size={12} className="text-amber-500 fill-amber-500" />}
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-500 text-xs">{u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}</TableCell>
                            <TableCell className="text-right flex items-center justify-end gap-2">
                              <Badge className={u.is_premium ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-700 text-slate-400'}>
                                {u.is_premium ? 'Premium' : 'Free'}
                              </Badge>
                              <Badge className="bg-indigo-500/10 text-indigo-400">{u.points || 0} pts</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Button variant="ghost" className="w-full text-indigo-400 hover:text-indigo-300" onClick={() => setActiveTab('users')}>View All</Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'withdrawals' && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <Card className="bg-slate-800 border-slate-700 text-slate-100">
                <CardHeader>
                  <CardTitle>Withdrawal Requests</CardTitle>
                  <CardDescription className="text-slate-400">Review and process user payout requests.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-900/50">
                      <TableRow className="border-slate-700">
                        <TableHead className="text-slate-400">User Details</TableHead>
                        <TableHead className="text-slate-400">Amount (BDT)</TableHead>
                        <TableHead className="text-slate-400">Method</TableHead>
                        <TableHead className="text-slate-400">Account</TableHead>
                        <TableHead className="text-slate-400">Status</TableHead>
                        <TableHead className="text-right text-slate-400">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {withdrawals.map((w) => (
                        <TableRow key={w.id} className="border-slate-700 hover:bg-slate-700/30">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-200">{w.username}</span>
                              <span className="text-xs text-slate-500">{w.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-indigo-400">৳ {w.amountBDT}</span>
                              <span className="text-xs text-slate-500">{w.amountPoints} pts</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-slate-700 text-slate-300 border-slate-600">{w.method}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-slate-300">{w.accountNumber}</TableCell>
                          <TableCell>
                            <Badge variant={w.status === 'approved' ? 'default' : w.status === 'pending' ? 'secondary' : 'destructive'} 
                                   className={w.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : ''}>
                              {w.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {w.status === 'pending' && (
                              <div className="flex justify-end gap-2">
                                <Button size="icon" variant="outline" className="h-8 w-8 bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-white" onClick={() => handleUpdateStatus(w.id, 'approved')}>
                                  <Check size={16} />
                                </Button>
                                <Button size="icon" variant="outline" className="h-8 w-8 bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white" onClick={() => handleUpdateStatus(w.id, 'rejected')}>
                                  <X size={16} />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <Card className="bg-slate-800 border-slate-700 text-slate-100">
                <CardHeader>
                  <CardTitle>Registered Users</CardTitle>
                  <CardDescription className="text-slate-400">Full list of users and their activity.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-900/50">
                      <TableRow className="border-slate-700">
                        <TableHead className="text-slate-400">Username</TableHead>
                        <TableHead className="text-slate-400">Email</TableHead>
                        <TableHead className="text-slate-400">Balance</TableHead>
                        <TableHead className="text-slate-400">Referral Code</TableHead>
                        <TableHead className="text-slate-400">Status</TableHead>
                        <TableHead className="text-slate-400">Joined</TableHead>
                        <TableHead className="text-right text-slate-400">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id} className="border-slate-700 hover:bg-slate-700/30">
                          <TableCell className="font-medium text-slate-200">{u.username}</TableCell>
                          <TableCell className="text-slate-400">{usersPrivate[u.id] || u.email || 'N/A'}</TableCell>
                          <TableCell className="font-bold text-indigo-400">{u.points || 0} pts</TableCell>
                          <TableCell className="font-mono text-xs text-slate-500">{u.referral_code}</TableCell>
                          <TableCell>
                            <Badge className={u.is_premium ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-slate-700 text-slate-400 border-slate-600'}>
                              {u.is_premium ? 'Premium' : 'Free'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className={`h-8 w-8 ${u.is_premium ? 'text-amber-500 hover:text-amber-400' : 'text-slate-500 hover:text-emerald-400'}`}
                                onClick={() => handleTogglePremium(u.id, !!u.is_premium)}
                                title={u.is_premium ? "Remove Premium" : "Make Premium"}
                              >
                                <Zap size={16} className={u.is_premium ? 'fill-amber-500' : ''} />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-red-400">
                                <Ban size={16} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <Card className="bg-slate-800 border-slate-700 text-slate-100">
                <CardHeader>
                  <CardTitle>Add New Task</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddTask} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} className="bg-slate-900 border-slate-700" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Points Reward</Label>
                      <Input type="number" value={newTask.points_reward} onChange={e => setNewTask({...newTask, points_reward: parseInt(e.target.value) || 0})} className="bg-slate-900 border-slate-700" required />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Description</Label>
                      <Input value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} className="bg-slate-900 border-slate-700" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <select value={newTask.type} onChange={e => setNewTask({...newTask, type: e.target.value})} className="w-full h-10 px-3 rounded-md bg-slate-900 border border-slate-700">
                        <option value="daily">Daily</option>
                        <option value="one-time">One-time</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Link (Optional)</Label>
                      <Input value={newTask.link} onChange={e => setNewTask({...newTask, link: e.target.value})} className="bg-slate-900 border-slate-700" />
                    </div>
                    <div className="space-y-2">
                      <Label>Timer (Seconds)</Label>
                      <Input type="number" value={newTask.timer} onChange={e => setNewTask({...newTask, timer: parseInt(e.target.value) || 0})} className="bg-slate-900 border-slate-700" required />
                    </div>
                    <Button type="submit" className="md:col-span-2 bg-emerald-600 hover:bg-emerald-700">Add Task</Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700 text-slate-100">
                <CardHeader>
                  <CardTitle>Existing Tasks</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700">
                        <TableHead>Task</TableHead>
                        <TableHead>Reward</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Timer</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tasks.map(task => (
                        <TableRow key={task.id} className="border-slate-700">
                          <TableCell>
                            <div className="font-medium">{task.title}</div>
                            <div className="text-xs text-slate-500">{task.description}</div>
                          </TableCell>
                          <TableCell className="text-emerald-400 font-bold">{task.points_reward} pts</TableCell>
                          <TableCell><Badge variant="outline">{task.type}</Badge></TableCell>
                          <TableCell className="text-slate-400">{task.timer || 0}s</TableCell>
                          <TableCell className="text-right">
                            <Button size="icon" variant="ghost" className="text-red-400" onClick={() => handleDeleteTask(task.id)}>
                              <Trash2 size={16} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'plans' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <Card className="bg-slate-800 border-slate-700 text-slate-100">
                <CardHeader>
                  <CardTitle>Add New Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddPlan} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Plan Name</Label>
                      <Input value={newPlan.name} onChange={e => setNewPlan({...newPlan, name: e.target.value})} className="bg-slate-900 border-slate-700" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Price (BDT)</Label>
                      <Input type="number" step="0.01" value={newPlan.price} onChange={e => setNewPlan({...newPlan, price: parseFloat(e.target.value) || 0})} className="bg-slate-900 border-slate-700" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Duration (Days)</Label>
                      <Input type="number" value={newPlan.duration_days} onChange={e => setNewPlan({...newPlan, duration_days: parseInt(e.target.value) || 0})} className="bg-slate-900 border-slate-700" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Multiplier</Label>
                      <Input type="number" step="0.1" value={newPlan.multiplier} onChange={e => setNewPlan({...newPlan, multiplier: parseFloat(e.target.value) || 0})} className="bg-slate-900 border-slate-700" required />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Features (comma separated)</Label>
                      <Input value={newPlan.features} onChange={e => setNewPlan({...newPlan, features: e.target.value})} className="bg-slate-900 border-slate-700" placeholder="Feature 1, Feature 2, Feature 3" required />
                    </div>
                    <Button type="submit" className="md:col-span-2 bg-emerald-600 hover:bg-emerald-700">Add Plan</Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700 text-slate-100">
                <CardHeader>
                  <CardTitle>Subscription Plans</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700">
                        <TableHead>Plan</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Multiplier</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plans.map(plan => (
                        <TableRow key={plan.id} className="border-slate-700">
                          <TableCell className="font-bold">{plan.name}</TableCell>
                          <TableCell className="text-emerald-400">৳{plan.price}</TableCell>
                          <TableCell>{plan.duration_days} Days</TableCell>
                          <TableCell>{plan.multiplier}x</TableCell>
                          <TableCell className="text-right">
                            <Button size="icon" variant="ghost" className="text-red-400" onClick={() => handleDeletePlan(plan.id)}>
                              <Trash2 size={16} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'mining' && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <Card className="bg-slate-800 border-slate-700 text-slate-100">
                <CardHeader>
                  <CardTitle>Active Mining Sessions</CardTitle>
                  <CardDescription className="text-slate-400">Real-time view of users currently mining.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700">
                        <TableHead>User ID</TableHead>
                        <TableHead>Started At</TableHead>
                        <TableHead>Ends At</TableHead>
                        <TableHead>Reward</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {miningSessions.map(session => (
                        <TableRow key={session.id} className="border-slate-700">
                          <TableCell className="font-mono text-xs text-slate-400">{session.userId}</TableCell>
                          <TableCell className="text-xs">{new Date(session.start_at).toLocaleString()}</TableCell>
                          <TableCell className="text-xs">{new Date(session.end_at).toLocaleString()}</TableCell>
                          <TableCell className="font-bold text-emerald-400">{session.points_to_claim} pts</TableCell>
                          <TableCell>
                            <Badge variant={session.status === 'active' ? 'secondary' : 'default'}>
                              {session.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'premium' && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <Card className="bg-slate-800 border-slate-700 text-slate-100">
                <CardHeader>
                  <CardTitle>Premium Upgrade Requests</CardTitle>
                  <CardDescription className="text-slate-400">Review and approve user payment for premium plans.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700">
                        <TableHead>User</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {premiumRequests.map(request => (
                        <TableRow key={request.id} className="border-slate-700">
                          <TableCell>
                            <div className="font-medium">{request.username}</div>
                            <div className="text-xs text-slate-500">{request.email}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-bold text-emerald-400">{request.planName}</div>
                            <div className="text-xs text-slate-400">৳{request.amount}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-slate-600 text-slate-300">
                              {request.method}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs"><span className="text-slate-500">From:</span> {request.senderNumber}</div>
                            <div className="text-xs font-mono text-indigo-400"><span className="text-slate-500">Trx:</span> {request.transactionId}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={request.status === 'approved' ? 'default' : request.status === 'pending' ? 'secondary' : 'destructive'}>
                              {request.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {request.status === 'pending' && (
                              <div className="flex justify-end gap-2">
                                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleApprovePremium(request)}>
                                  <Check size={14} className="mr-1" /> Approve
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleRejectPremium(request.id)}>
                                  <X size={14} className="mr-1" /> Reject
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {premiumRequests.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-10 text-slate-500">No premium requests found.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'referrals' && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <Card className="bg-slate-800 border-slate-700 text-slate-100">
                <CardHeader>
                  <CardTitle>Referral Reward Claims</CardTitle>
                  <CardDescription className="text-slate-400">Review and approve referral bonuses for users.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700">
                        <TableHead>Referrer ID</TableHead>
                        <TableHead>Referred User</TableHead>
                        <TableHead>Bonus</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {referralRewards.map(reward => (
                        <TableRow key={reward.id} className="border-slate-700">
                          <TableCell className="font-mono text-xs text-slate-400">{reward.referrerId}</TableCell>
                          <TableCell>
                            <div className="font-medium">{reward.referredUsername}</div>
                            <div className="text-xs text-slate-500">{reward.referredId}</div>
                          </TableCell>
                          <TableCell className="font-bold text-emerald-400">{reward.bonusAmount} pts</TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {new Date(reward.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={reward.status === 'approved' ? 'default' : reward.status === 'pending' ? 'secondary' : 'destructive'}>
                              {reward.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {reward.status === 'pending' && (
                              <div className="flex justify-end gap-2">
                                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleApproveReferral(reward)}>
                                  <Check size={14} className="mr-1" /> Approve
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleRejectReferral(reward.id)}>
                                  <X size={14} className="mr-1" /> Reject
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {referralRewards.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-10 text-slate-500">No referral rewards found.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <Tabs defaultValue="game_points" className="space-y-6">
                <TabsList className="bg-slate-800 border-slate-700 p-1">
                  <TabsTrigger value="game_points" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Game Points</TabsTrigger>
                  <TabsTrigger value="economy" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Economy</TabsTrigger>
                  <TabsTrigger value="payment" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Payment</TabsTrigger>
                  <TabsTrigger value="access" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Control Access</TabsTrigger>
                </TabsList>

                <TabsContent value="game_points">
                  <Card className="bg-slate-800 border-slate-700 text-slate-100">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="text-amber-500" size={20} />
                        Game Points Settings
                      </CardTitle>
                      <CardDescription className="text-slate-400">Set points for various games and activities.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleUpdateGameSettings} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Label>Spin Points (Min - Max)</Label>
                          <div className="flex gap-2">
                            <Input type="number" value={gameSettings.spin_points_min} onChange={e => setGameSettings({...gameSettings, spin_points_min: parseInt(e.target.value) || 0})} className="bg-slate-900 border-slate-700" />
                            <Input type="number" value={gameSettings.spin_points_max} onChange={e => setGameSettings({...gameSettings, spin_points_max: parseInt(e.target.value) || 0})} className="bg-slate-900 border-slate-700" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Scratch Points (Min - Max)</Label>
                          <div className="flex gap-2">
                            <Input type="number" value={gameSettings.scratch_points_min} onChange={e => setGameSettings({...gameSettings, scratch_points_min: parseInt(e.target.value) || 0})} className="bg-slate-900 border-slate-700" />
                            <Input type="number" value={gameSettings.scratch_points_max} onChange={e => setGameSettings({...gameSettings, scratch_points_max: parseInt(e.target.value) || 0})} className="bg-slate-900 border-slate-700" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Math Quiz (per answer)</Label>
                          <Input type="number" value={gameSettings.math_quiz_points} onChange={e => setGameSettings({...gameSettings, math_quiz_points: parseInt(e.target.value) || 0})} className="bg-slate-900 border-slate-700" />
                        </div>
                        <div className="space-y-2">
                          <Label>Word Guess (per word)</Label>
                          <Input type="number" value={gameSettings.word_guess_points} onChange={e => setGameSettings({...gameSettings, word_guess_points: parseInt(e.target.value) || 0})} className="bg-slate-900 border-slate-700" />
                        </div>
                        <div className="space-y-2">
                          <Label>Captcha (per solve)</Label>
                          <Input type="number" value={gameSettings.captcha_points} onChange={e => setGameSettings({...gameSettings, captcha_points: parseInt(e.target.value) || 0})} className="bg-slate-900 border-slate-700" />
                        </div>
                        <div className="space-y-2">
                          <Label>Color Match (per round)</Label>
                          <Input type="number" value={gameSettings.color_match_points} onChange={e => setGameSettings({...gameSettings, color_match_points: parseInt(e.target.value) || 0})} className="bg-slate-900 border-slate-700" />
                        </div>
                        <div className="space-y-2">
                          <Label>Number Memory (per level)</Label>
                          <Input type="number" value={gameSettings.number_memory_points} onChange={e => setGameSettings({...gameSettings, number_memory_points: parseInt(e.target.value) || 0})} className="bg-slate-900 border-slate-700" />
                        </div>
                        <Button type="submit" className="md:col-span-2 lg:col-span-3 bg-emerald-600 hover:bg-emerald-700">Save Game Settings</Button>
                      </form>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="economy">
                  <Card className="bg-slate-800 border-slate-700 text-slate-100">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="text-indigo-400" size={20} />
                        Economy & Rewards Settings
                      </CardTitle>
                      <CardDescription className="text-slate-400">Control points conversion, referral rewards, and limits.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label className="text-slate-300">Points per 1 BDT</Label>
                          <div className="flex gap-2">
                            <Input type="number" value={gameSettings.points_per_bdt} onChange={e => setGameSettings({...gameSettings, points_per_bdt: parseInt(e.target.value) || 0})} className="bg-slate-900 border-slate-700 text-white" />
                            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleUpdateGameSettings}>Update</Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-300">Minimum Withdrawal Points</Label>
                          <div className="flex gap-2">
                            <Input type="number" value={gameSettings.min_withdrawal} onChange={e => setGameSettings({...gameSettings, min_withdrawal: parseInt(e.target.value) || 0})} className="bg-slate-900 border-slate-700 text-white" />
                            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleUpdateGameSettings}>Update</Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-300">Daily Game Limit (Plays per day)</Label>
                          <div className="flex gap-2">
                            <Input type="number" value={gameSettings.daily_game_limit} onChange={e => setGameSettings({...gameSettings, daily_game_limit: parseInt(e.target.value) || 1})} className="bg-slate-900 border-slate-700 text-white" />
                            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleUpdateGameSettings}>Update</Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-300">Daily Max Earning Limit (Points)</Label>
                          <div className="flex gap-2">
                            <Input type="number" value={gameSettings.daily_point_limit} onChange={e => setGameSettings({...gameSettings, daily_point_limit: parseInt(e.target.value) || 0})} className="bg-slate-900 border-slate-700 text-white" />
                            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleUpdateGameSettings}>Update</Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-300">Spin Cooldown (Minutes)</Label>
                          <div className="flex gap-2">
                            <Input type="number" value={gameSettings.spin_cooldown} onChange={e => setGameSettings({...gameSettings, spin_cooldown: parseInt(e.target.value) || 1})} className="bg-slate-900 border-slate-700 text-white" />
                            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleUpdateGameSettings}>Update</Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-300">Scratch Cooldown (Minutes)</Label>
                          <div className="flex gap-2">
                            <Input type="number" value={gameSettings.scratch_cooldown} onChange={e => setGameSettings({...gameSettings, scratch_cooldown: parseInt(e.target.value) || 1})} className="bg-slate-900 border-slate-700 text-white" />
                            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleUpdateGameSettings}>Update</Button>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div className="space-y-2 p-4 bg-slate-900/40 rounded-2xl border border-slate-700/50">
                          <Label className="text-slate-300 flex items-center gap-2 mb-2">
                            <Users size={16} className="text-emerald-400" />
                            Referral Reward (per user)
                          </Label>
                          <div className="flex gap-2">
                            <Input type="number" value={gameSettings.referral_bonus} onChange={e => setGameSettings({...gameSettings, referral_bonus: parseInt(e.target.value) || 0})} className="bg-slate-900 border-slate-700 text-white" />
                            <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20" onClick={handleUpdateGameSettings}>Set Bonus</Button>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-2 font-medium">Points given to the referrer when their referral reaches 1,000 points.</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="payment">
                  <Card className="bg-slate-800 border-slate-700 text-slate-100">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Wallet className="text-blue-400" size={20} />
                        Payment Settings
                      </CardTitle>
                      <CardDescription className="text-slate-400">Set official numbers for different mobile banking methods.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2 p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                          <Label className="text-pink-500 font-bold">bKash Number</Label>
                          <div className="flex gap-2">
                            <Input value={gameSettings.bkash_number || ''} onChange={e => setGameSettings({...gameSettings, bkash_number: e.target.value})} className="bg-slate-900 border-slate-700 text-white font-mono" placeholder="017XXXXXXXX" />
                          </div>
                        </div>

                        <div className="space-y-2 p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                          <Label className="text-orange-500 font-bold">Nagad Number</Label>
                          <div className="flex gap-2">
                            <Input value={gameSettings.nagad_number || ''} onChange={e => setGameSettings({...gameSettings, nagad_number: e.target.value})} className="bg-slate-900 border-slate-700 text-white font-mono" placeholder="017XXXXXXXX" />
                          </div>
                        </div>

                        <div className="space-y-2 p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                          <Label className="text-purple-500 font-bold">Rocket Number</Label>
                          <div className="flex gap-2">
                            <Input value={gameSettings.rocket_number || ''} onChange={e => setGameSettings({...gameSettings, rocket_number: e.target.value})} className="bg-slate-900 border-slate-700 text-white font-mono" placeholder="017XXXXXXXX" />
                          </div>
                        </div>
                      </div>
                      <div className="mt-8">
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700 py-6 font-bold text-lg rounded-2xl shadow-xl shadow-indigo-600/20" onClick={handleUpdateGameSettings}>
                          SAVE PAYMENT NUMBERS
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="access">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="bg-slate-800 border-slate-700 text-slate-100">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <ShieldCheck className="text-red-400" size={20} />
                          System Control
                        </CardTitle>
                        <CardDescription className="text-slate-400">Maintenance and global toggles.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-700 transition-all hover:border-slate-600">
                          <div>
                            <p className="font-bold text-slate-200">Maintenance Mode</p>
                            <p className="text-xs text-slate-500">Disable app access for all users</p>
                          </div>
                          <div 
                            onClick={async () => {
                              const newVal = !gameSettings.maintenance_mode;
                              setGameSettings({...gameSettings, maintenance_mode: newVal});
                              await setDoc(doc(db, 'settings', 'game_points'), {...gameSettings, maintenance_mode: newVal});
                              toast.success(`Maintenance mode ${newVal ? 'Enabled' : 'Disabled'}`);
                            }}
                            className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${gameSettings.maintenance_mode ? 'bg-red-600' : 'bg-slate-700'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${gameSettings.maintenance_mode ? 'right-1' : 'left-1'}`} />
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-700 transition-all hover:border-slate-600">
                          <div>
                            <p className="font-bold text-slate-200">New Registrations</p>
                            <p className="text-xs text-slate-500">Allow new users to sign up</p>
                          </div>
                          <div 
                            onClick={async () => {
                              const newVal = !gameSettings.registrations_enabled;
                              setGameSettings({...gameSettings, registrations_enabled: newVal});
                              await setDoc(doc(db, 'settings', 'game_points'), {...gameSettings, registrations_enabled: newVal});
                              toast.success(`Registrations ${newVal ? 'Enabled' : 'Disabled'}`);
                            }}
                            className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${gameSettings.registrations_enabled ? 'bg-indigo-600' : 'bg-slate-700'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${gameSettings.registrations_enabled ? 'right-1' : 'left-1'}`} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

const AdminNavLink = ({ icon, label, active = false, count = 0, onClick }: any) => (
  <div 
    onClick={onClick}
    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
  >
    <div className="flex items-center gap-3">
      {icon}
      <span className="font-medium">{label}</span>
    </div>
    {count > 0 && (
      <span className="bg-amber-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
        {count}
      </span>
    )}
  </div>
);

const AdminStatCard = ({ title, value, icon, highlight = false }: any) => (
  <Card className={`bg-slate-800 border-slate-700 text-slate-100 overflow-hidden relative ${highlight ? 'ring-1 ring-amber-500/50' : ''}`}>
    <CardContent className="p-6 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-700">
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-bold text-slate-100">{value}</p>
      </div>
      {highlight && (
        <div className="absolute top-0 right-0 w-1 h-full bg-amber-500" />
      )}
    </CardContent>
  </Card>
);
