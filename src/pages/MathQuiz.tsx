import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { Calculator, Timer, CheckCircle2, XCircle, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, addDoc, increment, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { AdUnit } from '@/components/AdUnit';

import { useGameSettings } from '@/hooks/useGameSettings';

export default function MathQuiz() {
  const { user, updateUser } = useAuth();
  const { settings } = useGameSettings();
  const [problem, setProblem] = useState({ a: 0, b: 0, op: '+', answer: 0 });
  const [userAnswer, setUserAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(15);
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<'correct' | 'wrong' | null>(null);

  const rewardPoints = settings.math_quiz_points || 2;
  const dailyLimit = settings.daily_game_limit || 3;

  const generateProblem = () => {
    const ops = ['+', '-', '*'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a, b, answer;

    if (op === '+') {
      a = Math.floor(Math.random() * 50) + 1;
      b = Math.floor(Math.random() * 50) + 1;
      answer = a + b;
    } else if (op === '-') {
      a = Math.floor(Math.random() * 50) + 20;
      b = Math.floor(Math.random() * a);
      answer = a - b;
    } else {
      a = Math.floor(Math.random() * 12) + 1;
      b = Math.floor(Math.random() * 12) + 1;
      answer = a * b;
    }

    setProblem({ a, b, op, answer });
    setTimeLeft(15);
    setUserAnswer('');
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
    setLastResult(null);
    generateProblem();
  };

  const handleGameOver = async () => {
    setIsPlaying(false);
    if (score > 0) {
      setLoading(true);
      try {
        const reward = score * rewardPoints * (user?.multiplier || 1);
        
        await addDoc(collection(db, 'history'), {
          userId: user?.uid,
          type: 'math_quiz',
          points: reward,
          description: `Math Quiz: ${score} correct answers`,
          created_at: serverTimestamp()
        });

        await updateUser({
          points: increment(reward) as any,
          daily_plays: {
            ...user?.daily_plays,
            math_quiz: (user?.daily_plays?.math_quiz || 0) + 1
          }
        });

        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#3b82f6', '#f59e0b', '#FF6B6B', '#4ECDC4']
        });

        toast.success(`Game Over! You earned ${reward} points.`);
      } catch (error) {
        console.error("Error saving quiz reward:", error);
        toast.error('Failed to save reward');
      } finally {
        setLoading(false);
      }
    } else {
      toast.info("Game Over! Try to get some correct answers next time.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPlaying) return;

    if (parseInt(userAnswer) === problem.answer) {
      setScore(prev => prev + 1);
      setLastResult('correct');
      generateProblem();
    } else {
      setLastResult('wrong');
      // Decrease health on wrong answer
      if (user) {
        updateUser({
          profile_health: Math.max(0, (user.profile_health ?? 100) - 5)
        }).catch(console.error);
      }
      handleGameOver();
    }
  };

  const canPlay = (user?.daily_plays?.math_quiz || 0) < dailyLimit;

  return (
    <div className="max-w-md mx-auto space-y-6">
      <header className="text-center space-y-2">
        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto text-blue-600 shadow-lg">
          <Calculator size={32} />
        </div>
        <h1 className="text-2xl font-bold">Math Challenge</h1>
        <p className="text-slate-500 text-sm">Solve as many problems as you can! {rewardPoints} points per answer.</p>
        <div className="inline-block bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-600">
          Daily Plays: {user?.daily_plays?.math_quiz || 0} / {dailyLimit}
        </div>
      </header>

      <AdUnit code={settings.ad_banner_728x90} className="my-6" minimal hideLabel />

      {!isPlaying ? (
        <Card className="border-2 border-blue-100 shadow-xl overflow-hidden">
          <CardContent className="p-8 text-center space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-bold">Ready to test your brain?</h2>
              <p className="text-slate-400 text-sm">You have 15 seconds for each problem. One wrong answer ends the game.</p>
              {!canPlay && <p className="text-red-500 font-bold">Daily limit reached! Come back tomorrow.</p>}
            </div>
            <Button 
              onClick={startGame} 
              className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 rounded-2xl"
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
          className="space-y-4"
        >
          <div className="flex justify-between items-center px-2">
            <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full border border-blue-100">
              <Timer size={18} className="text-blue-600" />
              <span className={`font-mono font-bold ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-blue-700'}`}>
                {timeLeft}s
              </span>
            </div>
            <div className="bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
              <span className="text-emerald-700 font-bold">Score: {score}</span>
            </div>
          </div>

          <Card className="border-2 border-blue-200 shadow-2xl overflow-hidden relative">
            <AnimatePresence mode="wait">
              {lastResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute top-4 right-4"
                >
                  {lastResult === 'correct' ? (
                    <CheckCircle2 className="text-emerald-500" size={32} />
                  ) : (
                    <XCircle className="text-red-500" size={32} />
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <CardContent className="p-10 space-y-8">
              <div className="text-center">
                <motion.div 
                  key={`${problem.a}-${problem.b}`}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="text-5xl font-black tracking-widest text-slate-800"
                >
                  {problem.a} {problem.op} {problem.b} = ?
                </motion.div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  type="number"
                  value={userAnswer}
                  onChange={e => setUserAnswer(e.target.value)}
                  placeholder="Enter answer..."
                  className="h-16 text-center text-2xl font-bold border-2 focus:border-blue-500 rounded-2xl"
                  autoFocus
                />
                <Button type="submit" className="w-full h-14 bg-slate-900 hover:bg-black text-lg font-bold rounded-2xl">
                  SUBMIT
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}
      <div className="flex justify-center items-center flex-col gap-4 mt-8">
        <AdUnit code={settings.ad_square_300x250 || settings.clickadilla_native} />
      </div>
    </div>
  );
}
