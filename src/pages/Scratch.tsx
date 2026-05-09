import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { ScratchCard } from '@/components/ScratchCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { SCRATCH_COOLDOWN } from '@/constants';
import confetti from 'canvas-confetti';
import { AdUnit } from '@/components/AdUnit';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, addDoc, query, where, orderBy, limit, onSnapshot, serverTimestamp, increment, doc, getDoc, updateDoc } from 'firebase/firestore';
import { History as HistoryIcon } from 'lucide-react';

import { useGameSettings } from '@/hooks/useGameSettings';

export default function Scratch() {
  const { user, updateUser, updateActivity } = useAuth();
  const { settings } = useGameSettings();
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [history, setHistory] = useState<any[]>([]);

  const pointsRange = {
    min: settings.scratch_points_min || 5,
    max: settings.scratch_points_max || 50
  };

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'history'),
      where('userId', '==', user.uid),
      where('type', '==', 'scratch'),
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
      if (!user?.last_scratch_at) return 0;
      
      let lastScratchTime: number;
      try {
        if (user.last_scratch_at && typeof user.last_scratch_at.toMillis === 'function') {
          lastScratchTime = user.last_scratch_at.toMillis();
        } else if (user.last_scratch_at instanceof Date) {
          lastScratchTime = user.last_scratch_at.getTime();
        } else if (typeof user.last_scratch_at === 'number') {
          lastScratchTime = user.last_scratch_at;
        } else {
          lastScratchTime = new Date(user.last_scratch_at).getTime();
        }
      } catch (e) {
        return 0;
      }
      
      if (isNaN(lastScratchTime)) return 0;

      const now = Date.now();
      const cooldownMinutes = settings.scratch_cooldown || 30;
      const cooldownMs = cooldownMinutes * 60 * 1000;
      const diff = cooldownMs - (now - lastScratchTime);
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
      if (remaining <= 0) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [user?.last_scratch_at, settings.scratch_cooldown]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  };

  const dailyLimit = 3; // Enforce limit of 3
  const currentPlays = user?.daily_plays?.scratch || 0;
  const canScratch = timeLeft <= 0 && currentPlays < dailyLimit;

  const handleScratchResult = async (points: number) => {
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
        type: 'scratch',
        points: points,
        created_at: serverTimestamp()
      });

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        points: increment(points),
        last_scratch_at: serverTimestamp(),
        'daily_plays.scratch': increment(1)
      });
      // User requested animation: "paper cards red blue yellow green paper like top from bottom falling"
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.1 }, 
        colors: ['#FF6B6B', '#4ECDC4', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'],
        gravity: 0.8,
        scalar: 1.2,
        ticks: 300
      });
      await updateActivity();
      toast.success(`You won ${points} points!`);
    } catch (error: any) {
      console.error('Scratch update error:', error);
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      toast.error('Points update failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Scratch & Win</h1>
        <p className="text-slate-500">Scratch the card to reveal your prize!</p>
      </header>

      <AdUnit code={settings.ad_banner_728x90} minimal hideLabel />

      <div className="flex justify-center flex-col items-center gap-4">
        <ScratchCard onComplete={handleScratchResult} disabled={!canScratch || loading} minPoints={pointsRange.min} maxPoints={pointsRange.max} multiplier={user?.multiplier || 1} />
      </div>

      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Scratch Rules</CardTitle>
          <CardDescription>How to play and win.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-slate-600">Points Range</span>
            <span className="font-bold">{pointsRange.min} - {pointsRange.max} Points</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-slate-600">Cooldown</span>
            <span className="font-bold">{settings.scratch_cooldown || 30} Minutes</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-slate-600">Next Scratch</span>
            <span className={`font-bold ${canScratch ? 'text-green-500' : 'text-amber-500'}`}>
              {canScratch ? 'Available Now' : (user?.daily_plays?.scratch || 0) >= (settings.daily_game_limit || 3) ? 'Daily Limit Reached' : formatTime(timeLeft)}
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-slate-600">Daily Plays</span>
            <span className="font-bold">{user?.daily_plays?.scratch || 0} / {settings.daily_game_limit || 3}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader className="flex flex-row items-center gap-2">
          <HistoryIcon className="h-5 w-5 text-emerald-600" />
          <div>
            <CardTitle>Scratch History</CardTitle>
            <CardDescription>Your last 10 scratch results</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead className="text-right">Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-slate-500 py-8">
                    No history found. Start scratching to earn points!
                  </TableCell>
                </TableRow>
              ) : (
                history.map((item, idx) => (
                  <React.Fragment key={item.id}>
                    <TableRow>
                      <TableCell className="text-slate-600">
                        {item.created_at?.toMillis 
                          ? new Date(item.created_at.toMillis()).toLocaleString() 
                          : 'Processing...'}
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">
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

      <AdUnit code={settings.ad_native_bottom} />
    </div>
  );
}
