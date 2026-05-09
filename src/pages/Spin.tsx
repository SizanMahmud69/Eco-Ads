import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { SpinWheel } from '@/components/SpinWheel';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { SPIN_COOLDOWN } from '@/constants';
import { AdUnit } from '@/components/AdUnit';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, addDoc, query, where, orderBy, limit, onSnapshot, serverTimestamp, increment, doc, getDoc, updateDoc } from 'firebase/firestore';
import { History as HistoryIcon, Sparkles } from 'lucide-react';

import { useGameSettings } from '@/hooks/useGameSettings';

export default function Spin() {
  const { user, updateUser, updateActivity } = useAuth();
  const { settings } = useGameSettings();
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [history, setHistory] = useState<any[]>([]);
  const [segments, setSegments] = useState<any[]>([]);

  useEffect(() => {
    const min = settings.spin_points_min || 10;
    const max = settings.spin_points_max || 100;
    
    // Generate 8 segments based on range with vibrant colors
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#82E0AA'];
    const newSegments = [];
    const step = (max - min) / 7;
    const multiplier = user?.multiplier || 1;
    for (let i = 0; i < 8; i++) {
      const pts = Math.round((min + (step * i)) * multiplier);
      newSegments.push({
        points: pts,
        color: colors[i],
        label: pts.toString()
      });
    }
    setSegments(newSegments);
  }, [settings, user?.multiplier]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'history'),
      where('userId', '==', user.uid),
      where('type', '==', 'spin'),
      orderBy('created_at', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistory(data);
    }, (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'history');
      } catch (e) {
        console.error(e);
      }
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const calculateTimeLeft = () => {
      if (!user?.last_spin_at) return 0;
      
      let lastSpinTime: number;
      try {
        if (user.last_spin_at && typeof user.last_spin_at.toMillis === 'function') {
          lastSpinTime = user.last_spin_at.toMillis();
        } else if (user.last_spin_at instanceof Date) {
          lastSpinTime = user.last_spin_at.getTime();
        } else if (typeof user.last_spin_at === 'number') {
          lastSpinTime = user.last_spin_at;
        } else {
          lastSpinTime = new Date(user.last_spin_at).getTime();
        }
      } catch (e) {
        return 0;
      }

      if (isNaN(lastSpinTime)) return 0;

      const now = Date.now();
      const cooldownMinutes = settings.spin_cooldown || 60;
      const cooldownMs = cooldownMinutes * 60 * 1000;
      const diff = cooldownMs - (now - lastSpinTime);
      return Math.max(0, diff);
    };

    const updateTimer = () => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      return remaining;
    };

    updateTimer();
    const timer = setInterval(() => {
      const remaining = updateTimer();
      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [user?.last_spin_at, settings.spin_cooldown]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  };

  const dailyLimit = 3; // Enforce limit of 3
  const currentPlays = user?.daily_plays?.spin || 0;
  const canSpin = timeLeft <= 0 && currentPlays < dailyLimit;

  const handleSpinResult = async (points: number) => {
    if (!user) return;
    setLoading(true);
    try {
      if (currentPlays >= dailyLimit) {
        toast.error('Daily limit reached (3/3)');
        setLoading(false);
        return;
      }
      
      const historyRef = collection(db, 'history');
      await addDoc(historyRef, {
        userId: user.uid,
        type: 'spin',
        points: points,
        created_at: serverTimestamp()
      });

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        points: increment(points),
        last_spin_at: serverTimestamp(),
        'daily_plays.spin': increment(1)
      });
      
      await updateActivity();
      toast.success(`You won ${points} points!`);
    } catch (error: any) {
      console.error('Spin update error:', error);
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      toast.error('Points update failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <header className="text-center space-y-3">
        <div className="inline-flex items-center justify-center p-3 bg-emerald-50 rounded-2xl text-emerald-600 mb-2">
          <Sparkles size={32} />
        </div>
        <h1 className="text-4xl font-black tracking-tight text-slate-900">Spin & Win</h1>
        <p className="text-slate-500 font-medium">Try your luck and win big points every hour!</p>
      </header>

      <AdUnit code={settings.ad_banner_728x90} minimal hideLabel />

      <div className="flex justify-center py-4 flex-col items-center gap-4">
        <SpinWheel onSpin={handleSpinResult} disabled={!canSpin || loading} segments={segments.length > 0 ? segments : undefined} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <Card className="rounded-[2rem] border-slate-100 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-lg font-bold">Spin Rules</CardTitle>
            <CardDescription className="font-medium">Everything you need to know about the wheel.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">Points Range</span>
              <span className="font-black text-slate-900">{settings.spin_points_min || 10} - {settings.spin_points_max || 100} Points</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">Cooldown</span>
              <span className="font-black text-slate-900">{settings.spin_cooldown || 60} Minutes</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">Next Spin</span>
              <span className={`font-black ${canSpin ? 'text-emerald-500' : 'text-amber-500'}`}>
                {canSpin ? 'Available Now' : (user?.daily_plays?.spin || 0) >= (settings.daily_game_limit || 3) ? 'Daily Limit Reached' : formatTime(timeLeft)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">Daily Plays</span>
              <span className="font-black text-slate-900">{user?.daily_plays?.spin || 0} / {settings.daily_game_limit || 3}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-slate-100 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600">
              <HistoryIcon size={20} />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Recent Wins</CardTitle>
              <CardDescription className="font-medium">Your last 10 spin results</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/30">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest pl-6">Time</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest pr-6">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-slate-400 py-12 font-medium">
                      No history found. Start spinning!
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((item, idx) => (
                    <React.Fragment key={item.id}>
                      <TableRow className="hover:bg-slate-50/50 border-slate-50 transition-colors">
                        <TableCell className="text-slate-600 font-medium pl-6 py-4">
                          {item.created_at?.toMillis 
                            ? new Date(item.created_at.toMillis()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                            : 'Processing...'}
                        </TableCell>
                        <TableCell className="text-right font-black text-emerald-600 pr-6 py-4">
                          +{item.points}
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <AdUnit code={settings.ad_native_bottom} className="w-full" />
    </div>
  );
}
