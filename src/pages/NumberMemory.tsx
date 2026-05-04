import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { Eye, Timer, CheckCircle2, Loader2, Sparkles, Brain, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, addDoc, increment, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { AdUnit } from '@/components/AdUnit';
import { useGameSettings } from '@/hooks/useGameSettings';

export default function NumberMemory() {
  const { user, updateUser } = useAuth();
  const { settings } = useGameSettings();
  const [level, setLevel] = useState(1);
  const [number, setNumber] = useState('');
  const [userInput, setUserInput] = useState('');
  const [gameState, setGameState] = useState<'start' | 'showing' | 'typing' | 'result'>('start');
  const [loading, setLoading] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);

  const rewardPoints = settings.number_memory_points || 10;
  const dailyLimit = settings.daily_game_limit || 3;

  const generateNumber = (lvl: number) => {
    let num = '';
    for (let i = 0; i < lvl + 2; i++) {
      num += Math.floor(Math.random() * 10).toString();
    }
    setNumber(num);
    setGameState('showing');
    setUserInput('');
  };

  useEffect(() => {
    if (gameState === 'showing') {
      const timer = setTimeout(() => {
        setGameState('typing');
      }, 3000 + (level * 500));
      return () => clearTimeout(timer);
    }
  }, [gameState, level]);

  const handleStart = () => {
    if ((user?.profile_health ?? 100) < 10) {
      toast.error("Low Health! Your profile health must be at least 10% to play. It will refill tomorrow.");
      return;
    }
    setLevel(1);
    setPointsEarned(0);
    generateNumber(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userInput === number) {
      if (level >= 10) {
        handleWin();
      } else {
        toast.success(`Level ${level} complete!`);
        setLevel(prev => prev + 1);
        generateNumber(level + 1);
      }
    } else {
      handleGameOver();
    }
  };

  const handleWin = async () => {
    setGameState('result');
    const finalPoints = rewardPoints * 2 * (user?.multiplier || 1);
    setPointsEarned(finalPoints);
    saveReward(finalPoints);
  };

  const handleGameOver = async () => {
    setGameState('result');
    if (user) {
      updateUser({
        profile_health: Math.max(0, (user.profile_health ?? 100) - 8)
      }).catch(console.error);
      toast.error("Memory failure! -8% Health");
    }
    const finalPoints = Math.floor((level - 1) * (rewardPoints / 2) * (user?.multiplier || 1));
    setPointsEarned(finalPoints);
    if (finalPoints > 0) {
      saveReward(finalPoints);
    }
  };

  const saveReward = async (points: number) => {
    setLoading(true);
    try {
      await addDoc(collection(db, 'history'), {
        userId: user?.uid,
        type: 'number_memory',
        points: points,
        description: `Number Memory: Reached Level ${level}`,
        created_at: serverTimestamp()
      });

      await updateUser({
        points: increment(points) as any,
        daily_plays: {
          ...user?.daily_plays,
          number_memory: (user?.daily_plays?.number_memory || 0) + 1
        }
      });

      if (points > rewardPoints) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#3b82f6', '#f59e0b', '#FF6B6B', '#4ECDC4']
        });
      }
    } catch (error) {
      console.error("Error saving reward:", error);
      toast.error('Failed to save reward');
    } finally {
      setLoading(false);
    }
  };

  const canPlay = (user?.daily_plays?.number_memory || 0) < dailyLimit;

  return (
    <div className="max-w-md mx-auto space-y-6 animate-in fade-in duration-500">
      <header className="text-center space-y-2">
        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400 shadow-lg">
          <Brain size={32} />
        </div>
        <h1 className="text-2xl font-bold">Number Memory</h1>
        <p className="text-slate-500 text-sm">Memorize the sequence of numbers to win points!</p>
        <div className="inline-block bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-xs font-bold text-slate-600 dark:text-slate-400">
          Daily Plays: {user?.daily_plays?.number_memory || 0} / {dailyLimit}
        </div>
      </header>

      <AdUnit code={settings.ad_banner_728x90} className="my-6" minimal hideLabel />

      <Card className="border-2 border-indigo-100 dark:border-indigo-900/30 shadow-xl overflow-hidden bg-white dark:bg-slate-900">
        <CardContent className="p-8 text-center space-y-8">
          {!canPlay && gameState === 'start' ? (
            <div className="space-y-4 py-8">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Daily Limit Reached</h2>
              <p className="text-slate-500 dark:text-slate-400">Come back tomorrow for more challenges!</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {gameState === 'start' && (
                <motion.div 
                  key="start"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6 py-6"
                >
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold">Ready to test your memory?</h2>
                    <p className="text-slate-400 text-sm italic">Numbers will appear for a few seconds. Type them back accurately.</p>
                  </div>
                  <Button 
                    onClick={handleStart} 
                    className="w-full h-14 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 rounded-2xl"
                  >
                    <Eye className="mr-2" />
                    START CHALLENGE
                  </Button>
                </motion.div>
              )}

              {gameState === 'showing' && (
                <motion.div 
                  key="showing"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  className="space-y-8 py-10"
                >
                  <div className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em]">Memorize this</div>
                  <div className="text-5xl font-black tracking-widest text-slate-900 dark:text-white break-all">
                    {number}
                  </div>
                  <div className="flex justify-center">
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden max-w-[200px]">
                      <motion.div 
                        initial={{ width: "100%" }}
                        animate={{ width: "0%" }}
                        transition={{ duration: (3 + (level * 0.5)), ease: "linear" }}
                        className="h-full bg-indigo-500"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {gameState === 'typing' && (
                <motion.div 
                  key="typing"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6 py-6"
                >
                  <div className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em]">What was the number?</div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                      value={userInput}
                      onChange={e => setUserInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="Type the number..."
                      className="h-16 text-center text-3xl font-black border-2 focus:border-indigo-500 rounded-2xl"
                      autoFocus
                      required
                    />
                    <Button 
                      type="submit" 
                      className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-bold text-lg"
                    >
                      SUBMIT
                    </Button>
                  </form>
                </motion.div>
              )}

              {gameState === 'result' && (
                <motion.div 
                  key="result"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6 py-6"
                >
                  <div className={`p-4 rounded-2xl ${userInput === number ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    <h2 className="text-2xl font-black mb-1">
                      {userInput === number ? 'Level Complete!' : 'Game Over!'}
                    </h2>
                    <p className="text-sm">Reached Level {level}</p>
                  </div>
                  
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Reward Earned</p>
                    <p className="text-4xl font-black text-indigo-600 dark:text-indigo-400">{pointsEarned} Points</p>
                  </div>

                  <Button 
                    onClick={() => setGameState('start')} 
                    className="w-full h-14 rounded-2xl font-bold bg-slate-900 hover:bg-slate-800"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="animate-spin mr-2" /> : <RefreshCw className="mr-2" />}
                    PLAY AGAIN
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current Level</p>
          <p className="text-xl font-black text-slate-700 dark:text-slate-300">{level}</p>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Difficulty</p>
          <p className="text-xl font-black text-slate-700 dark:text-slate-300">{level + 2} Digits</p>
        </div>
      </div>

      <div className="flex justify-center flex-col items-center gap-4 mt-8">
        <AdUnit code={settings.ad_native_bottom} className="w-full" />
      </div>
    </div>
  );
}
