import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, serverTimestamp, addDoc, writeBatch } from 'firebase/firestore';
import { Bell, Clock, CheckCircle, Info, ChevronRight, X, Gift, Zap, Pickaxe, Trash2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'alert' | 'gift' | 'premium' | 'mining';
  read: boolean;
  created_at: any;
}

export const NotificationCenter: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const initialLoad = useRef(true);

  useEffect(() => {
    // Hidden audio element for notification sound
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.volume = 0.5;
    audioRef.current = audio;
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('created_at', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Notification[];
      
      // If new unread notification arrives and it's not the first load
      if (!initialLoad.current && data.length > notifications.length) {
        const hasNewUnread = data.some(n => !n.read && !notifications.find(old => old.id === n.id));
        if (hasNewUnread) {
          const newest = data.find(n => !n.read && !notifications.find(old => old.id === n.id));
          if (newest) {
            toast(newest.title, {
              description: newest.message,
              icon: getIcon(newest.type),
            });
            audioRef.current?.play().catch(e => console.log('Audio play failed', e));
          }
        }
      }

      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
      initialLoad.current = false;
    }, (error) => {
      console.error("Notification listener error:", error);
    });

    return () => unsubscribe();
  }, [user, notifications]);

  // Periodic check for game availability
  useEffect(() => {
    if (!user) return;

    const checkAvailability = () => {
      const now = Date.now();
      const lastSpin = user.last_spin_at ? new Date(user.last_spin_at).getTime() : 0;
      const lastScratch = user.last_scratch_at ? new Date(user.last_scratch_at).getTime() : 0;
      
      const hourInMs = 60 * 60 * 1000;
      
      if (lastSpin > 0 && (now - lastSpin) >= hourInMs) {
        sendLocalNotification('Spin & Win is Ready!', 'Your hourly spin is now available. Try your luck!', 'success');
      }

      if (lastScratch > 0 && (now - lastScratch) >= hourInMs) {
        sendLocalNotification('Scratch Card is Ready!', 'Get your guaranteed points now!', 'success');
      }
    };

    const sendLocalNotification = async (title: string, message: string, type: 'info' | 'success' | 'alert') => {
      const recent = notifications.find(n => n.title === title && Date.now() - (n.created_at?.toMillis?.() || Date.now()) < 3600000);
      if (recent) return;

      try {
        await addDoc(collection(db, 'notifications'), {
          userId: user.uid,
          title,
          message,
          type,
          read: false,
          created_at: serverTimestamp()
        });
      } catch (err) {
        console.error("Local notify error:", err);
      }
    };

    const interval = setInterval(checkAvailability, 60000);
    return () => clearInterval(interval);
  }, [user, notifications]);

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    const batch = writeBatch(db);
    notifications.filter(n => !n.read).forEach(n => {
      const ref = doc(db, 'notifications', n.id);
      batch.update(ref, { read: true });
    });
    await batch.commit();
  };

  const clearAllNotifications = async () => {
    const batch = writeBatch(db);
    notifications.forEach(n => {
      const ref = doc(db, 'notifications', n.id);
      // We don't delete to avoid Firestore size fluctuations, just mark as archived/read
      batch.update(ref, { read: true });
    });
    await batch.commit();
    toast.success('All notifications cleared');
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="text-emerald-500" size={18} />;
      case 'alert': return <Info className="text-amber-500" size={18} />;
      case 'gift': return <Gift className="text-purple-500" size={18} />;
      case 'premium': return <Zap className="text-amber-400 fill-amber-400" size={18} />;
      case 'mining': return <Pickaxe className="text-emerald-600" size={18} />;
      default: return <Info className="text-blue-500" size={18} />;
    }
  };

  const groupNotifications = (notifs: Notification[]) => {
    const groups: { [key: string]: Notification[] } = {
      Today: [],
      Yesterday: [],
      Earlier: []
    };

    notifs.forEach(n => {
      const date = n.created_at?.toMillis ? new Date(n.created_at.toMillis()) : new Date();
      if (isToday(date)) groups.Today.push(n);
      else if (isYesterday(date)) groups.Yesterday.push(n);
      else groups.Earlier.push(n);
    });

    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  };

  return (
    <div className="relative">
      <button 
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && unreadCount > 0) markAllAsRead();
        }}
        className={`relative p-2.5 rounded-xl transition-all duration-300 ${isOpen ? 'bg-emerald-100 text-emerald-700 shadow-lg shadow-emerald-500/10' : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'}`}
      >
        <Bell size={22} className={unreadCount > 0 ? 'animate-bounce' : ''} />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-5 h-5 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="absolute right-0 mt-3 w-[calc(100vw-2rem)] sm:w-[400px] bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl shadow-slate-200/60 border border-slate-100 dark:border-slate-800 z-50 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="font-black text-xl text-slate-900 dark:text-white leading-tight">Activity Feed</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Stay updated with Eco Rewards</p>
                </div>
                <button 
                  onClick={() => setIsOpen(false)} 
                  className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-600 rounded-full shadow-sm border border-slate-100 dark:border-slate-700 transition-all active:scale-95"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-4 space-y-6 scroll-smooth scrollbar-hide">
                {notifications.length === 0 ? (
                  <div className="py-20 text-center space-y-4">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-200 dark:text-slate-700">
                      <Bell size={40} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-base font-black text-slate-400 uppercase tracking-tighter">Quiet as a mouse</p>
                      <p className="text-[10px] text-slate-400 font-medium">No new notifications for you right now.</p>
                    </div>
                  </div>
                ) : (
                  groupNotifications(notifications).map(([group, items]) => (
                    <div key={group} className="space-y-3">
                      <div className="flex items-center gap-2 pl-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{group}</span>
                        <div className="h-[1px] flex-1 bg-slate-100 dark:bg-slate-800/50" />
                      </div>
                      <div className="space-y-2">
                        {items.map((n) => (
                          <motion.div 
                            key={n.id} 
                            whileHover={{ x: 4 }}
                            className={`p-4 rounded-2xl flex items-start gap-4 transition-all border-2 ${n.read ? 'opacity-80 bg-white border-transparent' : 'bg-emerald-50/20 border-emerald-500/5 shadow-sm'}`}
                          >
                            <div className={`p-2 rounded-xl shrink-0 ${n.read ? 'bg-slate-50' : 'bg-white shadow-sm'}`}>
                              {getIcon(n.type)}
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className={`text-sm font-bold truncate ${n.read ? 'text-slate-600' : 'text-slate-900 dark:text-white'}`}>{n.title}</p>
                                {!n.read && (
                                  <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 leading-relaxed font-medium line-clamp-2">{n.message}</p>
                              <div className="flex items-center gap-1.5 pt-1">
                                <Clock size={10} className="text-slate-300" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                  {n.created_at ? formatDistanceToNow(n.created_at.toMillis(), { addSuffix: true }) : 'Just now'}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="p-4 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-50 dark:border-slate-800 flex gap-2">
                <button 
                  onClick={clearAllNotifications}
                  disabled={notifications.length === 0}
                  className="flex-1 py-3 text-[10px] font-black text-slate-400 hover:text-red-500 transition-all uppercase tracking-widest flex items-center justify-center gap-1.5 rounded-xl hover:bg-red-50 disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  <Trash2 size={12} /> Clear Feed
                </button>
                <div className="w-[1px] h-4 bg-slate-200 self-center" />
                <button 
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-3 text-[10px] font-black text-slate-400 hover:text-emerald-600 transition-all uppercase tracking-widest flex items-center justify-center gap-1.5 rounded-xl hover:bg-emerald-50"
                >
                  Close <ChevronRight size={12} />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
