import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { Palette, Timer, CheckCircle2, XCircle, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, increment, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

import { useGameSettings } from '@/hooks/useGameSettings';

const COLORS = [
  { name: 'RED', value: '#ef4444' },
  { name: 'BLUE', value: '#3b82f6' },
  { name: 'GREEN', value: '#22c55e' },
  { name: 'YELLOW', value: '#eab308' },
  { name: 'PURPLE', value: '#a855f7' },
  { name: 'ORANGE', value: '#f97316' },
];

export default function ColorMatch() {
  const { user, updateUser } = useAuth();
  const { settings } = useGameSettings();
  const [target, setTarget] = useState({ text: '', color: '' });
  const [options, setOptions] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(10);
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  const rewardPoints = settings.color_match_points || 5;
  const dailyLimit = settings.daily_game_limit || 3;

  const generateRound = () => {
    const textIdx = Math.floor(Math.random() * COLORS.length);
    const colorIdx = Math.floor(Math.random() * COLORS.length);
    
    setTarget({
      text: COLORS[textIdx].name,
      color: COLORS[colorIdx].value
    });

    // Options are the color values
    const shuffled = [...COLORS].sort(() => Math.random() - 0.5);
    setOptions(shuffled.map(c => c.value));
    setTimeLeft(10);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isPlaying) {
      handleGameOver();
    }
    return () => clearInterval(timer);
  }, [isPlaying, timeLeft]);

  const startGame = () => {
    setIsPlaying(true);
    setScore(0);
    generateRound();
  };

  const handleGameOver = async () => {
    setIsPlaying(false);
    if (score > 0) {
      setLoading(true);
      try {
        const totalReward = Math.floor(score * rewardPoints * (user?.multiplier || 1));
        
        await addDoc(collection(db, 'history'), {
          userId: user?.uid,
          type: 'color_match',
          points: totalReward,
          description: `Color Match: ${score} correct rounds`,
          created_at: serverTimestamp()
        });

        await updateUser({
          points: increment(totalReward) as any,
          daily_plays: {
            ...user?.daily_plays,
            color_match: (user?.daily_plays?.color_match || 0) + 1
          }
        });

        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#3b82f6', '#f59e0b', '#FF6B6B', '#4ECDC4']
        });

        toast.success(`Game Over! You earned ${totalReward} points.`);
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

  const handleChoice = (colorValue: string) => {
    if (!isPlaying) return;

    if (colorValue === target.color) {
      setScore(prev => prev + 1);
      generateRound();
    } else {
      handleGameOver();
    }
  };

  const canPlay = (user?.daily_plays?.color_match || 0) < dailyLimit;

  return (
    <div className="max-w-md mx-auto space-y-6">
      <header className="text-center space-y-2">
        <div className="w-16 h-16 bg-pink-100 rounded-2xl flex items-center justify-center mx-auto text-pink-600 shadow-lg">
          <Palette size={32} />
        </div>
        <h1 className="text-2xl font-bold">Color Match</h1>
        <p className="text-slate-500 text-sm">Pick the color of the text, not the word! {rewardPoints} points per round.</p>
        <div className="inline-block bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-600">
          Daily Plays: {user?.daily_plays?.color_match || 0} / {dailyLimit}
        </div>
      </header>

      {!isPlaying ? (
        <Card className="border-2 border-pink-100 shadow-xl overflow-hidden">
          <CardContent className="p-8 text-center space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-bold">Focus is key!</h2>
              <p className="text-slate-400 text-sm">You have 10 seconds for each round. One mistake and it's over.</p>
              {!canPlay && <p className="text-red-500 font-bold">Daily limit reached! Come back tomorrow.</p>}
            </div>
            <Button 
              onClick={startGame} 
              className="w-full h-14 text-lg font-bold bg-pink-600 hover:bg-pink-700 shadow-lg shadow-pink-500/20 rounded-2xl"
              disabled={loading || !canPlay}
            >
              {loading ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2" />}
              {canPlay ? 'START GAME' : 'LIMIT REACHED'}
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
            <div className="flex items-center gap-2 bg-pink-50 px-4 py-2 rounded-full border border-pink-100">
              <Timer size={18} className="text-pink-600" />
              <span className={`font-mono font-bold ${timeLeft <= 3 ? 'text-red-500 animate-pulse' : 'text-pink-700'}`}>
                {timeLeft}s
              </span>
            </div>
            <div className="bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
              <span className="text-emerald-700 font-bold">Score: {score}</span>
            </div>
          </div>

          <Card className="border-2 border-pink-200 shadow-2xl overflow-hidden">
            <CardContent className="p-12 text-center">
              <motion.div 
                key={target.text + target.color}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-6xl font-black tracking-tighter"
                style={{ color: target.color }}
              >
                {target.text}
              </motion.div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-3 gap-4">
            {options.map((color, idx) => (
              <motion.button
                key={idx}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleChoice(color)}
                className="h-20 rounded-2xl shadow-md border-4 border-white"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
