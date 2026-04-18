import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { Type, RefreshCw, CheckCircle2, Loader2, Sparkles, Brain } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, addDoc, increment, doc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

const WORDS = [
  'PLANET', 'NATURE', 'ENERGY', 'FUTURE', 'RECYCLE', 
  'FOREST', 'GARDEN', 'ANIMAL', 'WATER', 'OCEAN',
  'CLIMATE', 'SOLAR', 'WIND', 'EARTH', 'GREEN'
];

export default function WordGuess() {
  const { user, updateUser } = useAuth();
  const [word, setWord] = useState('');
  const [scrambled, setScrambled] = useState('');
  const [userGuess, setUserGuess] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [solved, setSolved] = useState(false);
  const [rewardPoints, setRewardPoints] = useState(10);
  const [dailyLimit, setDailyLimit] = useState(3);

  useEffect(() => {
    const fetchPoints = async () => {
      try {
        const settingsSnap = await getDoc(doc(db, 'settings', 'game_points'));
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          setRewardPoints(data.word_guess_points || 10);
          setDailyLimit(data.daily_game_limit || 3);
        }
      } catch (error) {
        console.error("Error fetching points:", error);
      }
    };
    fetchPoints();
  }, []);

  const scrambleWord = (w: string) => {
    return w.split('').sort(() => Math.random() - 0.5).join('');
  };

  const nextWord = () => {
    const newWord = WORDS[Math.floor(Math.random() * WORDS.length)];
    setWord(newWord);
    setScrambled(scrambleWord(newWord));
    setUserGuess('');
    setSolved(false);
    setAttempts(0);
  };

  useEffect(() => {
    nextWord();
  }, []);

  const handleGuess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (solved) return;

    if (userGuess.toUpperCase() === word) {
      setSolved(true);
      setLoading(true);
      try {
        const reward = rewardPoints;
        const now = new Date().toISOString();
        
        await addDoc(collection(db, 'history'), {
          userId: user?.uid,
          type: 'word_guess',
          points: reward,
          description: `Word Guess: Correctly guessed "${word}"`,
          created_at: now
        });

        await updateUser({
          points: increment(reward) as any,
          daily_plays: {
            ...user?.daily_plays,
            word_guess: (user?.daily_plays?.word_guess || 0) + 1
          }
        });

        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#3b82f6', '#f59e0b', '#FF6B6B', '#4ECDC4']
        });

        toast.success(`Correct! You earned ${reward} points.`);
        setTimeout(nextWord, 2000);
      } catch (error) {
        console.error("Error saving word reward:", error);
        toast.error('Failed to save reward');
      } finally {
        setLoading(false);
      }
    } else {
      setAttempts(prev => prev + 1);
      toast.error('Wrong guess! Try again.');
      setUserGuess('');
    }
  };

  const canPlay = (user?.daily_plays?.word_guess || 0) < dailyLimit;

  return (
    <div className="max-w-md mx-auto space-y-6">
      <header className="text-center space-y-2">
        <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto text-purple-600 shadow-lg">
          <Brain size={32} />
        </div>
        <h1 className="text-2xl font-bold">Word Scramble</h1>
        <p className="text-slate-500 text-sm">Unscramble the word to earn {rewardPoints} points!</p>
        <div className="inline-block bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-600">
          Daily Plays: {user?.daily_plays?.word_guess || 0} / {dailyLimit}
        </div>
      </header>

      <Card className="border-2 border-purple-100 shadow-xl overflow-hidden">
        <CardContent className="p-8 space-y-8">
          {!canPlay ? (
            <div className="text-center space-y-4 py-10">
              <h2 className="text-xl font-bold text-slate-800">Daily Limit Reached</h2>
              <p className="text-slate-500">You've completed your 3 word scrambles for today. Come back tomorrow for more!</p>
            </div>
          ) : (
            <>
              <div className="text-center space-y-4">
                <div className="text-xs font-bold text-purple-500 uppercase tracking-widest">Scrambled Word</div>
                <motion.div 
                  key={scrambled}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-4xl font-black tracking-[0.3em] text-slate-800 bg-purple-50 p-6 rounded-2xl border-2 border-dashed border-purple-200"
                >
                  {scrambled}
                </motion.div>
              </div>

              <form onSubmit={handleGuess} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    value={userGuess}
                    onChange={e => setUserGuess(e.target.value)}
                    placeholder="Type your guess..."
                    className="h-14 text-center text-xl font-bold border-2 focus:border-purple-500 rounded-xl uppercase"
                    disabled={solved || loading}
                    autoFocus
                  />
                  <p className="text-[10px] text-center text-slate-400 font-medium">Attempts: {attempts}</p>
                </div>

                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={nextWord}
                    disabled={loading}
                    className="flex-1 h-12 rounded-xl"
                  >
                    <RefreshCw size={18} className="mr-2" />
                    Skip
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={solved || loading || !userGuess}
                    className="flex-[2] h-12 bg-purple-600 hover:bg-purple-700 rounded-xl font-bold"
                  >
                    {loading ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2" />}
                    {solved ? 'CORRECT!' : 'GUESS'}
                  </Button>
                </div>
              </form>
            </>
          )}
        </CardContent>
      </Card>

      <div className="bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-200 text-center">
        <p className="text-xs text-slate-500 italic">Hint: All words are related to nature and the environment.</p>
      </div>
    </div>
  );
}
