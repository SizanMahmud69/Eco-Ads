import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { Bell, Clock, CheckCircle, Info, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'alert';
  read: boolean;
  created_at: any;
}

export const NotificationCenter: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    }, (error) => {
      console.error("Notification listener error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Periodic check for game availability
  useEffect(() => {
    if (!user) return;

    const checkAvailability = () => {
      const now = Date.now();
      const lastSpin = user.last_spin_at ? new Date(user.last_spin_at).getTime() : 0;
      const lastScratch = user.last_scratch_at ? new Date(user.last_scratch_at).getTime() : 0;
      
      // Cooldowns (1 hour each)
      const hourInMs = 60 * 60 * 1000;
      
      if (lastSpin > 0 && (now - lastSpin) >= hourInMs) {
        // Only notify if we haven't already notified about this specific availability
        // For simplicity in this demo, we check if a notification exists within the last hour
        sendLocalNotification('Spin & Win is Ready!', 'Your hourly spin is now available. Try your luck!', 'success');
      }

      if (lastScratch > 0 && (now - lastScratch) >= hourInMs) {
        sendLocalNotification('Scratch Card is Ready!', 'Get your guaranteed points now!', 'success');
      }
    };

    const sendLocalNotification = async (title: string, message: string, type: 'info' | 'success' | 'alert') => {
      // Basic spam prevention: check if same title was sent recently
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

    const interval = setInterval(checkAvailability, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [user, notifications]);

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    for (const n of unread) {
      const ref = doc(db, 'notifications', n.id);
      await updateDoc(ref, { read: true });
    }
  };

  const deleteNotification = async (id: string) => {
    // For demo simplicity, we just mark as read or we could delete
    const ref = doc(db, 'notifications', id);
    await updateDoc(ref, { read: true });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="text-emerald-500" size={16} />;
      case 'alert': return <Info className="text-amber-500" size={16} />;
      default: return <Info className="text-blue-500" size={16} />;
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) markAllAsRead();
        }}
        className="relative p-2.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-5 h-5 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white animate-pulse">
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
              className="fixed inset-0 z-40 bg-black/5 backdrop-blur-sm sm:hidden"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute right-0 mt-3 w-[calc(100vw-2rem)] sm:w-96 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-100 dark:border-slate-800 z-50 overflow-hidden"
            >
              <div className="p-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] rounded-full font-black uppercase tracking-tighter">
                      {unreadCount} New
                    </span>
                  )}
                </h3>
                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto p-2 scrollbar-hide">
                {notifications.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                      <Bell size={32} />
                    </div>
                    <p className="text-sm text-slate-400 font-bold">All caught up!</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {notifications.map((n) => (
                      <div 
                        key={n.id} 
                        className={`p-4 rounded-2xl flex items-start gap-3 transition-colors ${n.read ? 'opacity-60 bg-white' : 'bg-emerald-50/30'}`}
                      >
                        <div className="mt-1">{getIcon(n.type)}</div>
                        <div className="flex-1 space-y-1">
                          <p className={`text-sm font-black ${n.read ? 'text-slate-500' : 'text-slate-900'}`}>{n.title}</p>
                          <p className="text-xs text-slate-500 leading-relaxed">{n.message}</p>
                          <div className="flex items-center gap-1.5 pt-1">
                            <Clock size={10} className="text-slate-300" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                              {n.created_at ? formatDistanceToNow(n.created_at.toMillis(), { addSuffix: true }) : 'Just now'}
                            </span>
                          </div>
                        </div>
                        {!n.read && (
                          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-2" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-4 bg-slate-50/50 border-t border-slate-50">
                <button className="w-full py-2.5 text-xs font-black text-slate-400 hover:text-emerald-600 transition-all uppercase tracking-widest flex items-center justify-center gap-1 group">
                  Clear Notifications <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
