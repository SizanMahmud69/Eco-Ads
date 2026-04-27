import * as React from 'react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  LayoutGrid,
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
  Award,
  Bell,
  Info,
  Eye,
  MoreVertical,
  Snowflake,
  User,
  UserCheck,
  UserX,
  Mail,
  Heart
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDocs, addDoc, deleteDoc, limit, where, increment, setDoc, serverTimestamp, getDoc, writeBatch } from 'firebase/firestore';

import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
    watch_ads_points: 20,
    watch_ads_cooldown: 5,
    referral_bonus: 500,
    points_per_bdt: 1000,
    min_withdrawal: 5000,
    daily_game_limit: 3,
    daily_point_limit: 2000,
    spin_cooldown: 60,
    scratch_cooldown: 30,
    maintenance_mode: false,
    ad_popunder: '',
    ad_social_bar: '',
    ad_banner_728x90: '',
    ad_banner_468x60: '',
    ad_banner_320x50: '',
    ad_square_300x250: '',
    ad_native_top: '',
    ad_native_bottom: '',
    clickadilla_banner: '',
    clickadilla_native: '',
    clickadilla_popunder: '',
    clickadilla_instream: '',
    registrations_enabled: true,
    bkash_number: '01700000000',
    nagad_number: '01700000000',
    rocket_number: '01700000000'
  });
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Prevent back navigation from admin dashboard
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

  // Aggressive cleanup for any leftover ad elements when entering admin
  useEffect(() => {
    const cleanupAds = () => {
      const selectors = [
        '[id^="at-social-bar"]', 
        '.at-social-bar', 
        '[class*="social-bar"]',
        '[id^="propeller"]',
        '[id^="clickadilla"]',
        '[class*="popunder"]',
        '.native-ad-unit',
        'ins.adsbygoogle',
        '[id^="fixed-ad-container"]'
      ];
      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => (el as HTMLElement).remove());
      });
      
      // Also check for fixed position elements created by ads
      const allDivs = document.querySelectorAll('body > div');
      allDivs.forEach(div => {
        const style = window.getComputedStyle(div);
        if ((style.position === 'fixed' || style.position === 'absolute') && 
            (style.zIndex === '9999' || style.zIndex === '10000' || style.zIndex === '2147483647')) {
          // Double check if it looks like an ad container
          if (div.querySelector('iframe, a, img, script')) {
            div.remove();
          }
        }
      });
    };
    
    cleanupAds();
    const interval = setInterval(cleanupAds, 1000); 
    const timeout = setTimeout(() => clearInterval(interval), 15000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

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
  const [broadcast, setBroadcast] = useState({ title: '', message: '', type: 'info' as any, link: '', targetType: 'all', targetUids: [] as string[] });
  const [broadcasting, setBroadcasting] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');

  useEffect(() => {
    if (!isAdmin) return;

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const userData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(userData);
      const totalPoints = userData.reduce((acc: number, u: any) => acc + (u.points || 0), 0);
      const premiumCount = userData.filter((u: any) => u.is_premium).length;
      setStats(prev => ({ ...prev, totalUsers: userData.length, totalPoints, premiumUsers: premiumCount }));
    }, (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'users');
      } catch (e) {
        console.error(e);
      }
    });

    const unsubUsersPrivate = onSnapshot(collection(db, 'users_private'), (snapshot) => {
      const privateData: Record<string, string> = {};
      snapshot.docs.forEach(doc => {
        privateData[doc.id] = doc.data().email;
      });
      setUsersPrivate(privateData);
    }, (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'users_private');
      } catch (e) {
        console.error(e);
      }
    });

    const unsubWithdrawals = onSnapshot(query(collection(db, 'withdrawals'), orderBy('created_at', 'desc')), (snapshot) => {
      const withdrawalData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWithdrawals(withdrawalData);
      const pending = withdrawalData.filter((w: any) => w.status === 'pending').length;
      const paid = withdrawalData.filter((w: any) => w.status === 'approved').reduce((acc: number, w: any) => acc + (w.amountBDT || 0), 0);
      setStats(prev => ({ ...prev, pendingWithdrawals: pending, totalPaid: paid }));
    }, (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'withdrawals');
      } catch (e) {
        console.error(e);
      }
    });

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

  const handleToggleFreeze = async (userId: string, currentStatus: boolean) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        is_frozen: !currentStatus
      });
      toast.success(`User ${!currentStatus ? 'Frozen' : 'Unfrozen'} successfully`);
    } catch (error) {
      toast.error('Failed to update freeze status');
    }
  };

  const handleToggleBan = async (userId: string, currentStatus: boolean) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        is_banned: !currentStatus
      });
      toast.success(`User ${!currentStatus ? 'Banned' : 'Unbanned'} successfully`);
    } catch (error) {
      toast.error('Failed to update ban status');
    }
  };

  const handleResetHealth = async (userId: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        profile_health: 100
      });
      toast.success('Profile health reset to 100%');
    } catch (error) {
      toast.error('Failed to reset health');
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
        link: '/profile',
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
          link: '/upgrade',
          read: false,
          created_at: serverTimestamp()
        });
      }

      toast.success('Premium request rejected');
    } catch (error) {
      toast.error('Failed to reject request');
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcast.title || !broadcast.message) {
      toast.error('Please fill in both title and message');
      return;
    }

    const isSpecific = broadcast.targetType === 'specific';
    if (isSpecific && broadcast.targetUids.length === 0) {
      toast.error('Please select at least one target user');
      return;
    }

    const targetUsers = isSpecific 
      ? users.filter(u => broadcast.targetUids.includes(u.uid || u.id))
      : users;

    if (targetUsers.length === 0) {
      toast.error(isSpecific ? "Target users not found" : "No users to broadcast to");
      return;
    }

    setBroadcasting(true);
    try {
      // Firestore batches are limited to 500 operations
      const CHUNK_SIZE = 450; 
      for (let i = 0; i < targetUsers.length; i += CHUNK_SIZE) {
        const chunk = targetUsers.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        
        chunk.forEach(u => {
          const notifRef = doc(collection(db, 'notifications'));
          batch.set(notifRef, {
            userId: u.uid || u.id,
            title: broadcast.title,
            message: broadcast.message,
            type: broadcast.type,
            link: broadcast.link || null,
            read: false,
            created_at: serverTimestamp()
          });
        });
        
        await batch.commit();
      }

      setBroadcast({ ...broadcast, title: '', message: '', link: '', targetUids: [] });
      setUserSearchTerm('');
      toast.success(`Broadcast sent to ${targetUsers.length} user(s)!`);
    } catch (error: any) {
      console.error("Broadcast error:", error);
      toast.error(`Broadcast failed: ${error.message || 'Unknown error'}`);
    } finally {
      setBroadcasting(false);
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
          link: '/refer',
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
          link: '/refer',
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
          link: '/wallet',
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
            icon={<Bell size={20} />} 
            label="Broadcast" 
            active={activeTab === 'broadcast'}
            onClick={() => handleNavClick('broadcast')} 
          />
          <AdminNavLink 
            icon={<Settings size={20} />} 
            label="Settings" 
            active={activeTab === 'settings'}
            onClick={() => handleNavClick('settings')} 
          />
          <AdminNavLink 
            icon={<LayoutGrid size={20} />} 
            label="Ads" 
            active={activeTab === 'ads'} 
            onClick={() => handleNavClick('ads')} 
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col">
          <div className="flex-1 space-y-8">
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
                            <TableCell className="text-slate-500 text-xs">
                              {(() => {
                                const date = u.created_at?.toDate?.() || (u.created_at ? new Date(u.created_at) : null);
                                return date && !isNaN(date.getTime()) ? date.toLocaleDateString() : 'N/A';
                              })()}
                            </TableCell>
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
              <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl shadow-2xl text-slate-100 overflow-hidden">
                <CardHeader className="p-6 pb-2">
                  <CardTitle className="text-2xl font-black tracking-tight text-white">Withdrawal Requests</CardTitle>
                  <CardDescription className="text-slate-400">Review and process user payout requests with full transparency.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-900/40">
                        <TableRow className="border-slate-700/50">
                          <TableHead className="text-slate-500 uppercase text-[10px] font-black tracking-widest p-6">User Details</TableHead>
                          <TableHead className="text-slate-500 uppercase text-[10px] font-black tracking-widest p-6">Amount (BDT)</TableHead>
                          <TableHead className="text-slate-500 uppercase text-[10px] font-black tracking-widest p-6">Method</TableHead>
                          <TableHead className="text-slate-500 uppercase text-[10px] font-black tracking-widest p-6">Account</TableHead>
                          <TableHead className="text-slate-500 uppercase text-[10px] font-black tracking-widest p-6">Status</TableHead>
                          <TableHead className="text-right text-slate-500 uppercase text-[10px] font-black tracking-widest p-6">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {withdrawals.map((w) => (
                          <TableRow key={w.id} className="border-slate-700/50 hover:bg-slate-700/20 transition-colors group">
                            <TableCell className="p-6">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold border border-indigo-500/20">
                                  {w.username?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-200 group-hover:text-white transition-colors">{w.username}</span>
                                  <span className="text-xs text-slate-500">{w.email}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="p-6">
                              <div className="flex flex-col">
                                <span className="font-black text-lg text-emerald-400">৳{w.amountBDT}</span>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{w.amountPoints.toLocaleString()} PTS</span>
                              </div>
                            </TableCell>
                            <TableCell className="p-6">
                              <Badge className="bg-slate-900/50 text-slate-300 border-slate-700 px-3 py-1 font-bold text-[10px] uppercase tracking-wider">
                                {w.method}
                              </Badge>
                            </TableCell>
                            <TableCell className="p-6">
                              <div className="bg-slate-900/30 px-3 py-1.5 rounded-lg border border-slate-700/50 w-fit">
                                <span className="font-mono text-sm text-indigo-300">{w.accountNumber}</span>
                              </div>
                            </TableCell>
                            <TableCell className="p-6">
                              <Badge 
                                variant={w.status === 'approved' ? 'default' : w.status === 'pending' ? 'secondary' : 'destructive'} 
                                className={`px-3 py-1 font-black text-[10px] uppercase tracking-tighter ${
                                  w.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                                  w.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                  'bg-red-500/10 text-red-400 border-red-500/20'
                                }`}
                              >
                                {w.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="p-6 text-right">
                              {w.status === 'pending' && (
                                <div className="flex justify-end gap-3 translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                  <Button size="icon" variant="outline" className="h-9 w-9 bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-white rounded-xl shadow-lg shadow-emerald-500/20" onClick={() => handleUpdateStatus(w.id, 'approved')}>
                                    <Check size={18} />
                                  </Button>
                                  <Button size="icon" variant="outline" className="h-9 w-9 bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white rounded-xl shadow-lg shadow-red-500/20" onClick={() => handleUpdateStatus(w.id, 'rejected')}>
                                    <X size={18} />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl shadow-2xl text-slate-100 overflow-hidden">
                <CardHeader className="p-6 pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl font-black tracking-tight text-white">Registered Users</CardTitle>
                      <CardDescription className="text-slate-400">Total management of your community database.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <div className="bg-slate-900/50 px-4 py-2 rounded-xl border border-slate-700 flex items-center gap-2">
                        <Users size={16} className="text-indigo-400" />
                        <span className="text-xs font-black uppercase tracking-widest">{users.length} Users</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-900/40">
                        <TableRow className="border-slate-700/50">
                          <TableHead className="text-slate-500 uppercase text-[10px] font-black tracking-widest p-6">Username</TableHead>
                          <TableHead className="text-slate-500 uppercase text-[10px] font-black tracking-widest p-6">Email</TableHead>
                          <TableHead className="text-slate-500 uppercase text-[10px] font-black tracking-widest p-6">Balance</TableHead>
                          <TableHead className="text-slate-500 uppercase text-[10px] font-black tracking-widest p-6">Referral Code</TableHead>
                          <TableHead className="text-slate-500 uppercase text-[10px] font-black tracking-widest p-6">Status</TableHead>
                          <TableHead className="text-slate-500 uppercase text-[10px] font-black tracking-widest p-6">Joined</TableHead>
                          <TableHead className="text-right text-slate-500 uppercase text-[10px] font-black tracking-widest p-6">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((u) => (
                          <TableRow key={u.id} className="border-slate-700/50 hover:bg-slate-700/20 transition-colors group">
                            <TableCell className="p-6 font-bold text-slate-200 group-hover:text-white">{u.username}</TableCell>
                            <TableCell className="p-6 text-slate-400 text-sm">{usersPrivate[u.id] || u.email || 'N/A'}</TableCell>
                            <TableCell className="p-6">
                              <span className="font-black text-indigo-400 bg-indigo-500/5 px-3 py-1.5 rounded-lg border border-indigo-500/10">
                                {u.points?.toLocaleString() || 0} PTS
                              </span>
                            </TableCell>
                            <TableCell className="p-6">
                              <span className="font-mono text-xs text-slate-500 bg-slate-900/50 px-2.5 py-1 rounded-md border border-slate-700">
                                {u.referral_code}
                              </span>
                            </TableCell>
                            <TableCell className="p-6">
                              <Badge className={`px-3 py-1 font-black text-[10px] uppercase tracking-tighter ${
                                u.is_banned ? 'bg-red-500/20 text-red-500 border-red-500/30' : 
                                u.is_frozen ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 
                                u.is_premium ? 'bg-amber-500/20 text-amber-500 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 
                                'bg-slate-700/50 text-slate-400 border-slate-600'
                              }`}>
                                {u.is_banned ? 'Banned' : u.is_frozen ? 'Frozen' : u.is_premium ? 'Premium' : 'Free'}
                              </Badge>
                            </TableCell>
                            <TableCell className="p-6 text-xs font-bold text-slate-500 uppercase tracking-tighter">
                              {(() => {
                                const date = u.created_at?.toDate?.() || (u.created_at ? new Date(u.created_at) : null);
                                return date && !isNaN(date.getTime()) ? date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
                              })()}
                            </TableCell>
                            <TableCell className="p-6 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger 
                                  render={
                                    <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all">
                                      <MoreVertical size={18} />
                                    </Button>
                                  }
                                />
                                <DropdownMenuContent align="end" className="bg-slate-900/95 backdrop-blur-xl border-slate-700/50 text-slate-200 w-56 p-2 rounded-2xl shadow-2xl">
                                  <div className="px-3 pb-2 pt-2 text-[10px] font-black uppercase tracking-widest text-slate-500">User Management</div>
                                  <DropdownMenuSeparator className="bg-slate-800" />
                                  
                                  <DropdownMenuItem onClick={() => navigate('/admin/users/' + u.id)} className="hover:bg-indigo-500/10 hover:text-indigo-400 cursor-pointer rounded-xl py-3 px-4 transition-colors">
                                    <Info size={16} className="mr-3" /> <span className="font-bold text-sm">Full Profile</span>
                                  </DropdownMenuItem>
                                  
                                  <DropdownMenuItem onClick={() => handleTogglePremium(u.id, !!u.is_premium)} className="hover:bg-amber-500/10 hover:text-amber-500 cursor-pointer rounded-xl py-3 px-4 transition-colors">
                                    <Zap size={16} className={`mr-3 ${u.is_premium ? 'fill-amber-500' : ''}`} /> 
                                    <span className="font-bold text-sm">{u.is_premium ? 'Downgrade to Free' : 'Grant Premium'}</span>
                                  </DropdownMenuItem>
  
                                  <DropdownMenuItem onClick={() => handleToggleFreeze(u.id, !!u.is_frozen)} className="hover:bg-blue-500/10 hover:text-blue-400 cursor-pointer rounded-xl py-3 px-4 transition-colors">
                                    <Snowflake size={16} className={`mr-3 ${u.is_frozen ? 'animate-pulse' : ''}`} /> 
                                    <span className="font-bold text-sm">{u.is_frozen ? 'Unfreeze Account' : 'Freeze Account'}</span>
                                  </DropdownMenuItem>

                                  <DropdownMenuItem onClick={() => handleResetHealth(u.id)} className="hover:bg-emerald-500/10 hover:text-emerald-400 cursor-pointer rounded-xl py-3 px-4 transition-colors">
                                    <Heart size={16} className="mr-3" /> 
                                    <span className="font-bold text-sm">Reset Health</span>
                                  </DropdownMenuItem>
  
                                  <DropdownMenuSeparator className="bg-slate-800" />
  
                                  <DropdownMenuItem 
                                    onClick={() => handleToggleBan(u.id, !!u.is_banned)} 
                                    className={`cursor-pointer rounded-xl py-3 px-4 transition-colors ${u.is_banned ? 'hover:bg-emerald-500/10 hover:text-emerald-400' : 'hover:bg-red-500/10 hover:text-red-400'}`}
                                  >
                                    {u.is_banned ? <UserCheck size={16} className="mr-3" /> : <UserX size={16} className="mr-3" />}
                                    <span className="font-bold text-sm">{u.is_banned ? 'Restore User' : 'Ban User Permanently'}</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
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
                            <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => handleDeleteTask(task.id)}>
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
                            <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => handleDeletePlan(plan.id)}>
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
              <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl shadow-2xl text-slate-100 overflow-hidden">
                <CardHeader className="p-6 pb-2">
                  <CardTitle className="text-2xl font-black tracking-tight text-white">Premium Upgrade Requests</CardTitle>
                  <CardDescription className="text-slate-400">Review and approve user payment for premium plans.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-900/40">
                        <TableRow className="border-slate-700/50">
                          <TableHead className="text-slate-500 uppercase text-[10px] font-black tracking-widest p-6">User</TableHead>
                          <TableHead className="text-slate-500 uppercase text-[10px] font-black tracking-widest p-6">Plan</TableHead>
                          <TableHead className="text-slate-500 uppercase text-[10px] font-black tracking-widest p-6">Payment</TableHead>
                          <TableHead className="text-slate-500 uppercase text-[10px] font-black tracking-widest p-6">Details</TableHead>
                          <TableHead className="text-slate-500 uppercase text-[10px] font-black tracking-widest p-6">Status</TableHead>
                          <TableHead className="text-right text-slate-500 uppercase text-[10px] font-black tracking-widest p-6">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {premiumRequests.map(request => (
                          <TableRow key={request.id} className="border-slate-700/50 hover:bg-slate-700/20 transition-colors group">
                            <TableCell className="p-6">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                                  <User size={20} />
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-200">{request.username}</span>
                                  <span className="text-xs text-slate-500">{request.email}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="p-6">
                              <div className="flex flex-col">
                                <div className="font-black text-amber-500 flex items-center gap-1 uppercase tracking-tight">
                                  <Zap size={14} className="fill-amber-500" />
                                  {request.planName}
                                </div>
                                <div className="text-xs font-bold text-slate-400">৳{request.amount}</div>
                              </div>
                            </TableCell>
                            <TableCell className="p-6">
                              <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 px-3 py-1 font-bold text-[10px] uppercase tracking-wider">
                                {request.method}
                              </Badge>
                            </TableCell>
                            <TableCell className="p-6">
                              <div className="space-y-1 bg-slate-900/30 p-2 rounded-lg border border-slate-700/50 w-fit">
                                <div className="text-[10px] flex items-center gap-1.5"><span className="text-slate-500 uppercase font-black tracking-tighter">Sender:</span> <span className="text-slate-200 font-bold">{request.senderNumber}</span></div>
                                <div className="text-[10px] flex items-center gap-1.5"><span className="text-slate-500 uppercase font-black tracking-tighter">Trx ID:</span> <span className="text-indigo-400 font-mono font-bold tracking-widest uppercase">{request.transactionId}</span></div>
                              </div>
                            </TableCell>
                            <TableCell className="p-6">
                              <Badge 
                                variant={request.status === 'approved' ? 'default' : request.status === 'pending' ? 'secondary' : 'destructive'}
                                className={`px-3 py-1 font-black text-[10px] uppercase tracking-tighter ${
                                  request.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                                  request.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                  'bg-red-500/10 text-red-400 border-red-500/20'
                                }`}
                              >
                                {request.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="p-6 text-right">
                              {request.status === 'pending' && (
                                <div className="flex justify-end gap-3 translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 font-black uppercase text-[10px] tracking-widest rounded-xl px-4 py-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95" onClick={() => handleApprovePremium(request)}>
                                    <Check size={14} className="mr-1.5" /> Approve
                                  </Button>
                                  <Button size="sm" variant="destructive" className="font-black uppercase text-[10px] tracking-widest rounded-xl px-4 py-2 shadow-lg shadow-red-500/20 transition-all active:scale-95" onClick={() => handleRejectPremium(request.id)}>
                                    <X size={14} className="mr-1.5" /> Reject
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {premiumRequests.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-20">
                              <div className="flex flex-col items-center gap-3">
                                <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-slate-700">
                                  <Zap size={32} />
                                </div>
                                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No pending requests at the moment</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'referrals' && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-xl shadow-2xl text-slate-100 overflow-hidden">
                <CardHeader className="p-6 pb-2">
                  <CardTitle className="text-2xl font-black tracking-tight text-white">Referral Reward Claims</CardTitle>
                  <CardDescription className="text-slate-400">Review and approve referral bonuses for verified users.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-900/40">
                        <TableRow className="border-slate-700/50">
                          <TableHead className="text-slate-500 uppercase text-[10px] font-black tracking-widest p-6">Referrer ID</TableHead>
                          <TableHead className="text-slate-500 uppercase text-[10px] font-black tracking-widest p-6">Referred User</TableHead>
                          <TableHead className="text-slate-500 uppercase text-[10px] font-black tracking-widest p-6">Bonus</TableHead>
                          <TableHead className="text-slate-500 uppercase text-[10px] font-black tracking-widest p-6">Date</TableHead>
                          <TableHead className="text-slate-500 uppercase text-[10px] font-black tracking-widest p-6">Status</TableHead>
                          <TableHead className="text-right text-slate-500 uppercase text-[10px] font-black tracking-widest p-6">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {referralRewards.map(reward => (
                          <TableRow key={reward.id} className="border-slate-700/50 hover:bg-slate-700/20 transition-colors group">
                            <TableCell className="p-6">
                              <div className="bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-700/50 w-fit">
                                <span className="font-mono text-[10px] text-slate-400 tracking-tighter">{reward.referrerId}</span>
                              </div>
                            </TableCell>
                            <TableCell className="p-6">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold border border-indigo-500/20">
                                  <Users size={16} />
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-200">{reward.referredUsername}</span>
                                  <span className="text-[10px] text-slate-500 font-mono">{reward.referredId}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="p-6">
                              <span className="font-black text-emerald-400 bg-emerald-500/5 px-3 py-1 rounded-lg border border-emerald-500/10">
                                +{reward.bonusAmount?.toLocaleString()} PTS
                              </span>
                            </TableCell>
                            <TableCell className="p-6">
                              <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">
                                {new Date(reward.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                            </TableCell>
                            <TableCell className="p-6">
                              <Badge 
                                variant={reward.status === 'approved' ? 'default' : reward.status === 'pending' ? 'secondary' : 'destructive'}
                                className={`px-3 py-1 font-black text-[10px] uppercase tracking-tighter ${
                                  reward.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                                  reward.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                  'bg-red-500/10 text-red-400 border-red-500/20'
                                }`}
                              >
                                {reward.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="p-6 text-right">
                              {reward.status === 'pending' && (
                                <div className="flex justify-end gap-3 translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 font-black uppercase text-[10px] tracking-widest rounded-xl px-4 py-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95" onClick={() => handleApproveReferral(reward)}>
                                    <Check size={14} className="mr-1.5" /> Approve
                                  </Button>
                                  <Button size="sm" variant="destructive" className="font-black uppercase text-[10px] tracking-widest rounded-xl px-4 py-2 shadow-lg shadow-red-500/20 transition-all active:scale-95" onClick={() => handleRejectReferral(reward.id)}>
                                    <X size={14} className="mr-1.5" /> Reject
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {referralRewards.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-20">
                              <div className="flex flex-col items-center gap-3">
                                <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-slate-700">
                                  <Users size={32} />
                                </div>
                                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No referral claims found</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'broadcast' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Broadcast System</h2>
                  <p className="text-slate-400">Send notifications to all registered users</p>
                </div>
              </div>

              <Card className="bg-slate-800 border-slate-700 max-w-2xl">
                <CardHeader>
                  <CardTitle className="text-white">New Broadcast Message</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleBroadcast} className="space-y-6">
                    <div className="space-y-2">
                       <Label className="text-slate-300">Audience Type</Label>
                       <div className="grid grid-cols-2 gap-3">
                         <button
                           type="button"
                           onClick={() => setBroadcast({...broadcast, targetType: 'all', targetUids: []})}
                           className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all font-bold uppercase text-[10px] tracking-widest ${broadcast.targetType === 'all' ? 'border-indigo-600 bg-indigo-600/10 text-white shadow-[0_0_20px_rgba(79,70,229,0.1)]' : 'border-slate-800 bg-slate-900/50 text-slate-500'}`}
                         >
                           <Users size={16} />
                           All Registered Users
                         </button>
                         <button
                           type="button"
                           onClick={() => setBroadcast({...broadcast, targetType: 'specific'})}
                           className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all font-bold uppercase text-[10px] tracking-widest ${broadcast.targetType === 'specific' ? 'border-indigo-600 bg-indigo-600/10 text-white shadow-[0_0_20px_rgba(79,70,229,0.1)]' : 'border-slate-800 bg-slate-900/50 text-slate-500'}`}
                         >
                           <User size={16} />
                           Specific Users
                         </button>
                       </div>
                    </div>

                    {broadcast.targetType === 'specific' && (
                      <div className="space-y-3 p-4 bg-slate-900/40 rounded-2xl border border-slate-700/50 animate-in slide-in-from-top-2 duration-300">
                        <Label className="text-slate-300 flex items-center gap-2">
                           <Users size={12} className="text-indigo-400" />
                           Select Target Recipients ({broadcast.targetUids.length})
                        </Label>
                        <div className="relative">
                          <Input 
                            placeholder="Type username or account ID..." 
                            value={userSearchTerm}
                            onChange={e => setUserSearchTerm(e.target.value)}
                            className="bg-slate-900 border-slate-700 h-11 rounded-xl focus:ring-indigo-500/20 text-white placeholder:text-slate-400"
                          />
                          {userSearchTerm && (
                            <button 
                              type="button"
                              onClick={() => setUserSearchTerm('')}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>

                        {userSearchTerm && (
                          <div className="bg-slate-950 border border-slate-700 rounded-xl max-h-48 overflow-y-auto p-1 mt-2 shadow-2xl shadow-black/50 divide-y divide-slate-800">
                            {users.filter(u => 
                              (u.username?.toLowerCase().includes(userSearchTerm.toLowerCase()) || 
                               u.uid?.toLowerCase().includes(userSearchTerm.toLowerCase())) &&
                              !broadcast.targetUids.includes(u.uid)
                            ).slice(0, 6).map(u => (
                              <div 
                                key={u.uid}
                                onClick={() => {
                                  setBroadcast({...broadcast, targetUids: [...broadcast.targetUids, u.uid]});
                                  setUserSearchTerm('');
                                }}
                                className="p-3 cursor-pointer flex items-center justify-between group hover:bg-indigo-600/10 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800 text-slate-500 group-hover:border-indigo-500/30 group-hover:text-indigo-400 transition-colors">
                                    <User size={14} />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-bold text-sm text-slate-300 group-hover:text-white">{u.username}</span>
                                    <span className="text-[9px] text-slate-500 font-mono tracking-tighter uppercase">{u.uid}</span>
                                  </div>
                                </div>
                                <div className="w-6 h-6 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center bg-indigo-500/20 text-indigo-400 transition-all">
                                  <Plus size={14} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {broadcast.targetUids.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-2">
                            {broadcast.targetUids.map(uid => {
                              const u = users.find(user => user.uid === uid);
                              return (
                                <div key={uid} className="flex items-center gap-2 p-1.5 pl-3 bg-indigo-500/10 border border-indigo-500/20 rounded-full animate-in zoom-in-95 duration-200">
                                  <span className="text-[10px] font-bold text-indigo-400">{u?.username || uid.slice(0, 6)}</span>
                                  <button 
                                    type="button"
                                    onClick={() => setBroadcast({...broadcast, targetUids: broadcast.targetUids.filter(id => id !== uid)})}
                                    className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center hover:bg-indigo-500/40"
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              );
                            })}
                            {broadcast.targetUids.length > 1 && (
                              <button 
                                type="button"
                                onClick={() => setBroadcast({...broadcast, targetUids: []})}
                                className="text-[10px] font-bold text-red-400 hover:text-red-300 px-2"
                              >
                                Clear All
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-slate-300">Message Title</Label>
                        <Input 
                          placeholder="e.g. Weekly Bonus Alert! 🎁" 
                          value={broadcast.title}
                          onChange={e => setBroadcast({...broadcast, title: e.target.value})}
                          className="bg-slate-950 border-slate-700 text-white h-12 rounded-xl placeholder:text-slate-500 focus:ring-indigo-500/20"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-300">Detailed Message</Label>
                        <Textarea 
                          placeholder="Type your message here..." 
                          value={broadcast.message}
                          onChange={e => setBroadcast({...broadcast, message: e.target.value})}
                          className="bg-slate-950 border-slate-700 text-white min-h-[120px] rounded-xl placeholder:text-slate-500 focus:ring-indigo-500/20"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-300">Target Link (Optional)</Label>
                        <Input 
                          placeholder="e.g. /tasks or /wallet" 
                          value={broadcast.link}
                          onChange={e => setBroadcast({...broadcast, link: e.target.value})}
                          className="bg-slate-950 border-slate-700 text-white h-12 rounded-xl placeholder:text-slate-500 focus:ring-indigo-500/20"
                        />
                        <p className="text-[10px] text-slate-500 font-medium px-1">Internal routes like /tasks, /wallet, /withdraw, etc.</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-300">Notification Appearance</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {['info', 'success', 'alert', 'gift', 'premium'].map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setBroadcast({...broadcast, type: t as any})}
                              className={`py-3 rounded-xl border-2 transition-all text-[10px] font-black uppercase tracking-[0.2em] ${broadcast.type === t ? 'border-amber-500 bg-amber-500/10 text-amber-500' : 'border-slate-800 bg-slate-950 text-slate-600 grayscale hover:grayscale-0'}`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      disabled={broadcasting}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 h-16 font-black text-xs tracking-[0.2em] gap-3 rounded-2xl shadow-xl shadow-indigo-600/20 border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1 transition-all mt-4"
                    >
                      {broadcasting ? <RefreshCw className="animate-spin text-white" /> : <Bell size={24} className="text-white" />}
                      {broadcast.targetType === 'all' 
                        ? `BROADCAST TO ${users.length} USERS` 
                        : `SEND TO ${broadcast.targetUids.length} SELECTED USERS`
                      }
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-indigo-500/5 border-indigo-500/20">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400">
                      <Info size={20} />
                    </div>
                    <div className="text-xs text-indigo-300">
                      <p className="font-bold mb-1 uppercase tracking-widest text-[10px]">Real-time Alert</p>
                      <p>Users online will receive a toast notification and audio alert instantly.</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-amber-500/5 border-amber-500/20">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center text-amber-500">
                      <X size={20} />
                    </div>
                    <div className="text-xs text-amber-200">
                      <p className="font-bold mb-1 uppercase tracking-widest text-[10px]">Immutable</p>
                      <p>Once sent, broadcasts cannot be edited. Please double check before sending.</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
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
                        <div className="space-y-2">
                          <Label>Watch Ads (per video)</Label>
                          <Input type="number" value={gameSettings.watch_ads_points} onChange={e => setGameSettings({...gameSettings, watch_ads_points: parseInt(e.target.value) || 0})} className="bg-slate-900 border-slate-700" />
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
                        <div className="space-y-2">
                          <Label className="text-slate-300">Watch Ads Cooldown (Minutes)</Label>
                          <div className="flex gap-2">
                            <Input type="number" value={gameSettings.watch_ads_cooldown} onChange={e => setGameSettings({...gameSettings, watch_ads_cooldown: parseInt(e.target.value) || 1})} className="bg-slate-900 border-slate-700 text-white" />
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

          {activeTab === 'ads' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Ad Management</h2>
                  <p className="text-slate-400">Configure your ad network codes across the platform.</p>
                </div>
              </div>

              <Tabs defaultValue="adsterra" className="space-y-6">
                <TabsList className="bg-slate-800 border-slate-700 p-1">
                  <TabsTrigger value="adsterra" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-2">
                    <LayoutGrid size={16} />
                    Adsterra
                  </TabsTrigger>
                  <TabsTrigger value="clickadilla" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white gap-2">
                    <Eye size={16} />
                    Clickadilla
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="adsterra">
                  <Card className="bg-slate-800 border-slate-700 text-slate-100">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Active</Badge>
                        Adsterra Settings
                      </CardTitle>
                      <CardDescription className="text-slate-400">Manage Adsterra HTML/JS scripts for different formats.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-slate-300">Popunder Ad Code</Label>
                          <Textarea 
                            placeholder="Paste Popunder script here..." 
                            value={gameSettings.ad_popunder || ''} 
                            onChange={e => setGameSettings({...gameSettings, ad_popunder: e.target.value})}
                            className="bg-slate-900 border-slate-700 font-mono text-xs h-32"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-300">Social Bar Ad Code</Label>
                          <Textarea 
                            placeholder="Paste Social Bar script here..." 
                            value={gameSettings.ad_social_bar || ''} 
                            onChange={e => setGameSettings({...gameSettings, ad_social_bar: e.target.value})}
                            className="bg-slate-900 border-slate-700 font-mono text-xs h-32"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-300">Banner 728x90 (Header/Footer)</Label>
                          <Textarea 
                            placeholder="Paste Banner 728x90 script here..." 
                            value={gameSettings.ad_banner_728x90 || ''} 
                            onChange={e => setGameSettings({...gameSettings, ad_banner_728x90: e.target.value})}
                            className="bg-slate-900 border-slate-700 font-mono text-xs h-32"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-300">Banner 468x60 (Game/Task)</Label>
                          <Textarea 
                            placeholder="Paste Banner 468x60 script here..." 
                            value={gameSettings.ad_banner_468x60 || ''} 
                            onChange={e => setGameSettings({...gameSettings, ad_banner_468x60: e.target.value})}
                            className="bg-slate-900 border-slate-700 font-mono text-xs h-32"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-300">Banner 320x50 (Mobile View)</Label>
                          <Textarea 
                            placeholder="Paste Banner 320x50 script here..." 
                            value={gameSettings.ad_banner_320x50 || ''} 
                            onChange={e => setGameSettings({...gameSettings, ad_banner_320x50: e.target.value})}
                            className="bg-slate-900 border-slate-700 font-mono text-xs h-32"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-300">Square 300x250 (Mid-page)</Label>
                          <Textarea 
                            placeholder="Paste Square 300x250 script here..." 
                            value={gameSettings.ad_square_300x250 || ''} 
                            onChange={e => setGameSettings({...gameSettings, ad_square_300x250: e.target.value})}
                            className="bg-slate-900 border-slate-700 font-mono text-xs h-32"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-300">Native Ad Top</Label>
                          <Textarea 
                            placeholder="Paste Native Ad script here..." 
                            value={gameSettings.ad_native_top || ''} 
                            onChange={e => setGameSettings({...gameSettings, ad_native_top: e.target.value})}
                            className="bg-slate-900 border-slate-700 font-mono text-xs h-32"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-300">Native Ad Bottom</Label>
                          <Textarea 
                            placeholder="Paste Native Ad script here..." 
                            value={gameSettings.ad_native_bottom || ''} 
                            onChange={e => setGameSettings({...gameSettings, ad_native_bottom: e.target.value})}
                            className="bg-slate-900 border-slate-700 font-mono text-xs h-32"
                          />
                        </div>
                      </div>
                      <Button onClick={handleUpdateGameSettings} className="w-full bg-emerald-600 hover:bg-emerald-700 py-6 font-bold text-lg rounded-2xl">
                        UPDATE ADSTERRA CODES
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="clickadilla">
                  <Card className="bg-slate-800 border-slate-700 text-slate-100">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Alternate</Badge>
                        Clickadilla Settings
                      </CardTitle>
                      <CardDescription className="text-slate-400">Manage Clickadilla HTML/JS scripts for different formats.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-slate-300">Clickadilla Popunder</Label>
                          <Textarea 
                            placeholder="Paste Clickadilla Popunder script here..." 
                            value={gameSettings.clickadilla_popunder || ''} 
                            onChange={e => setGameSettings({...gameSettings, clickadilla_popunder: e.target.value})}
                            className="bg-slate-900 border-slate-700 font-mono text-xs h-32 border-blue-500/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-300">Clickadilla Banner</Label>
                          <Textarea 
                            placeholder="Paste Clickadilla Banner script here..." 
                            value={gameSettings.clickadilla_banner || ''} 
                            onChange={e => setGameSettings({...gameSettings, clickadilla_banner: e.target.value})}
                            className="bg-slate-900 border-slate-700 font-mono text-xs h-32 border-blue-500/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-300">Clickadilla Native</Label>
                          <Textarea 
                            placeholder="Paste Clickadilla Native script here..." 
                            value={gameSettings.clickadilla_native || ''} 
                            onChange={e => setGameSettings({...gameSettings, clickadilla_native: e.target.value})}
                            className="bg-slate-900 border-slate-700 font-mono text-xs h-32 border-blue-500/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-300">Clickadilla In-stream (Video Ads)</Label>
                          <Textarea 
                            placeholder="Paste Clickadilla In-stream script here..." 
                            value={gameSettings.clickadilla_instream || ''} 
                            onChange={e => setGameSettings({...gameSettings, clickadilla_instream: e.target.value})}
                            className="bg-slate-900 border-slate-700 font-mono text-xs h-32 border-blue-500/20"
                          />
                        </div>
                      </div>
                      <Button onClick={handleUpdateGameSettings} className="w-full bg-blue-600 hover:bg-blue-700 py-6 font-bold text-lg rounded-2xl">
                        UPDATE CLICKADILLA CODES
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}

          </div>

          <footer className="mt-20 py-12 text-center border-t border-slate-800 bg-slate-900/50 rounded-b-[2rem]">
            <div className="max-w-4xl mx-auto px-4 space-y-4">
              <div className="flex flex-col items-center gap-2">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                  © {new Date().getFullYear()} Eco Ads Management • Internal Access
                </div>
                <div className="h-[1px] w-12 bg-slate-800" />
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-3 sm:gap-4 text-[9px] sm:text-[10px] font-black uppercase tracking-widest mt-2 px-5 py-2.5 rounded-2xl border border-slate-800 bg-slate-950/50">
                    <span className="flex items-center gap-1.5">
                      <span className="text-slate-500">Developer:</span> 
                      <span className="text-emerald-500/80">Sizan Mahmud</span>
                    </span>
                    <div className="w-1 h-1 rounded-full bg-slate-800" />
                    <span className="flex items-center gap-1.5">
                      <span className="text-slate-500">Designer:</span> 
                      <span className="text-blue-500/80">Black Dimond</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </footer>
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
