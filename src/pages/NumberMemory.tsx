import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { Brain, Timer, CheckCircle2, XCircle, Loader2, Sparkles, Eye } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, increment, doc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

export default function NumberMemory() {
  const { user, updateUser } = useAuth();
  const [number, setNumber] = useState('');
  const [userInput, setUserInput] = useState('');
  const [phase, setPhase] = useState<'idle' | 'memorize' | 'input'>('idle');
  const [level, setLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(3);
  const [loading, setLoading] = useState(false);
  const [rewardPoints, setRewardPoints] = useState(10);
  const [dailyLimit, setDailyLimit] = useState(3);

  useEffect(() => {
    const fetchPoints = async () => {
      try {
        const settingsSnap = await getDoc(doc(db, 'settings', 'game_points'));
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          setRewardPoints(data.number_memory_points || 10);
          setDailyLimit(data.daily_game_limit || 3);
        }
      } catch (error) {
        console.error("Error fetching points:", error);
      }
    };
    fetchPoints();
  }, []);

  const generateNumber = () => {
    let result = '';
    const length = level + 2;
    for (let i = 0; i < length; i++) {
      result += Math.floor(Math.random() * 10).toString();
    }
    setNumber(result);
    setPhase('memorize');
    setTimeLeft(3 + Math.floor(level / 2));
    setUserInput('');
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (phase === 'memorize' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && phase === 'memorize') {
      setPhase('input');
    }
    return () => clearInterval(timer);
  }, [phase, timeLeft]);

  const startGame = () => {
    setLevel(1);
    generateNumber();
  };

  const handleGameOver = async () => {
    setPhase('idle');
    if (level > 1) {
      setLoading(true);
      try {
        const totalReward = (level - 1) * rewardPoints;
        const now = new Date().toISOString();
        
        await addDoc(collection(db, 'history'), {
          userId: user?.uid,
          type: 'number_memory',
          points: totalReward,
          description: `Number Memory: Reached level ${level}`,
          created_at: now
        });

        await updateUser({
          points: increment(totalReward) as any,
          daily_plays: {
            ...user?.daily_plays,
            number_memory: (user?.daily_plays?.number_memory || 0) + 1
          }
        });

        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#3b82f6', '#f59e0b', '#FF6B6B', '#4ECDC4']
        });

        toast.success(`Game Over! You reached Level ${level} and earned ${totalReward} points.`);
      } catch (error) {
        console.error("Error saving reward:", error);
        toast.error('Failed to save reward');
      } finally {
        setLoading(false);
      }
    } else {
      toast.info("Game Over! Try again.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userInput === number) {
      toast.success('Correct!');
      setLevel(prev => prev + 1);
      setTimeout(generateNumber, 1000);
    } else {
      handleGameOver();
    }
  };

  const canPlay = (user?.daily_plays?.number_memory || 0) < dailyLimit;

  return (
    <div className="max-w-md mx-auto space-y-6">
      <header className="text-center space-y-2">
        <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto text-indigo-600 shadow-lg">
          <Eye size={32} />
        </div>
        <h1 className="text-2xl font-bold">Number Memory</h1>
        <p className="text-slate-500 text-sm">Memorize the sequence and type it back! {rewardPoints} points per level.</p>
        <div className="inline-block bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-600">
          Daily Plays: {user?.daily_plays?.number_memory || 0} / {dailyLimit}
        </div>
      </header>

      {phase === 'idle' ? (
        <Card className="border-2 border-indigo-100 shadow-xl overflow-hidden">
          <CardContent className="p-8 text-center space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-bold">Test your memory!</h2>
              <p className="text-slate-400 text-sm">The numbers get longer each level. How far can you go?</p>
              {!canPlay && <p className="text-red-500 font-bold">Daily limit reached! Come back tomorrow.</p>}
            </div>
            <Button 
              onClick={startGame} 
              className="w-full h-14 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 rounded-2xl"
              disabled={loading || !canPlay}
            >
              {loading ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2" />}
              {canPlay ? 'START CHALLENGE' : 'LIMIT REACHED'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="space-y-6"
        >
          <div className="flex justify-between items-center px-2">
            <div className="bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100">
              <span className="text-indigo-700 font-bold">Level: {level}</span>
            </div>
            {phase === 'memorize' && (
              <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 rounded-full border border-amber-100">
                <Timer size={18} className="text-amber-600" />
                <span className="font-mono font-bold text-amber-700">{timeLeft}s</span>
              </div>
            )}
          </div>

          <Card className="border-2 border-indigo-200 shadow-2xl overflow-hidden">
            <CardContent className="p-12 text-center">
              <AnimatePresence mode="wait">
                {phase === 'memorize' ? (
                  <motion.div 
                    key={number}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.5, opacity: 0 }}
                    className="text-5xl font-black tracking-[0.2em] text-indigo-600"
                  >
                    {number}
                  </motion.div>
                ) : (
                  <motion.form 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    onSubmit={handleSubmit} 
                    className="space-y-6"
                  >
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">What was the number?</p>
                      <Input
                        type="number"
                        value={userInput}
                        onChange={e => setUserInput(e.target.value)}
                        className="h-16 text-center text-3xl font-black border-2 focus:border-indigo-500 rounded-2xl"
                        autoFocus
                      />
                    </div>
                    <Button type="submit" className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-lg font-bold rounded-2xl">
                      SUBMIT
                    </Button>
                  </motion.form>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
