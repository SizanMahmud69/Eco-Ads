import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { ShieldCheck, RefreshCw, CheckCircle2, Loader2, Sparkles, Lock } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, addDoc, increment, doc, getDoc } from 'firebase/firestore';
import { motion } from 'motion/react';

export default function Captcha() {
  const { user, updateUser } = useAuth();
  const [captcha, setCaptcha] = useState('');
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [solvedCount, setSolvedCount] = useState(0);
  const [rewardPoints, setRewardPoints] = useState(5);
  const [dailyLimit, setDailyLimit] = useState(3);

  useEffect(() => {
    const fetchPoints = async () => {
      try {
        const settingsSnap = await getDoc(doc(db, 'settings', 'game_points'));
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          setRewardPoints(data.captcha_points || 5);
          setDailyLimit(data.daily_game_limit || 3);
        }
      } catch (error) {
        console.error("Error fetching points:", error);
      }
    };
    fetchPoints();
  }, []);

  const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptcha(result);
    setUserInput('');
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userInput.toUpperCase() === captcha) {
      setLoading(true);
      try {
        const reward = rewardPoints;
        const now = new Date().toISOString();
        
        await addDoc(collection(db, 'history'), {
          userId: user?.uid,
          type: 'captcha',
          points: reward,
          description: `Captcha: Solved captcha successfully`,
          created_at: now
        });

        await updateUser({
          points: increment(reward) as any,
          daily_plays: {
            ...user?.daily_plays,
            captcha: (user?.daily_plays?.captcha || 0) + 1
          }
        });

        setSolvedCount(prev => prev + 1);
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#3b82f6', '#f59e0b', '#FF6B6B', '#4ECDC4']
        });
        toast.success(`Correct! +${reward} points`);
        generateCaptcha();
      } catch (error) {
        console.error("Error saving captcha reward:", error);
        toast.error('Failed to save reward');
      } finally {
        setLoading(false);
      }
    } else {
      toast.error('Incorrect captcha. Try again.');
      generateCaptcha();
    }
  };

  const canPlay = (user?.daily_plays?.captcha || 0) < dailyLimit;

  return (
    <div className="max-w-md mx-auto space-y-6">
      <header className="text-center space-y-2">
        <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto text-emerald-600 shadow-lg">
          <ShieldCheck size={32} />
        </div>
        <h1 className="text-2xl font-bold">Secure Captcha</h1>
        <p className="text-slate-500 text-sm">Solve captchas to prove you're human and earn points!</p>
        <div className="inline-block bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-600">
          Daily Plays: {user?.daily_plays?.captcha || 0} / {dailyLimit}
        </div>
      </header>

      <Card className="border-2 border-emerald-100 shadow-xl overflow-hidden">
        <CardContent className="p-8 space-y-8">
          {!canPlay ? (
            <div className="text-center space-y-4 py-10">
              <h2 className="text-xl font-bold text-slate-800">Daily Limit Reached</h2>
              <p className="text-slate-500">You've completed your 3 captchas for today. Come back tomorrow for more!</p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Verification Code</span>
                <div className="bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                  <span className="text-[10px] font-bold text-emerald-700">Solved: {solvedCount}</span>
                </div>
              </div>

              <div className="relative group">
                <motion.div 
                  key={captcha}
                  initial={{ opacity: 0, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  className="bg-slate-900 p-10 rounded-2xl flex items-center justify-center relative overflow-hidden select-none"
                >
                  {/* Background Noise Patterns */}
                  <div className="absolute inset-0 opacity-30 pointer-events-none">
                    {Array.from({ length: 40 }).map((_, i) => (
                      <div 
                        key={i} 
                        className="absolute bg-white rounded-full" 
                        style={{
                          width: Math.random() * 3 + 'px',
                          height: Math.random() * 3 + 'px',
                          left: Math.random() * 100 + '%',
                          top: Math.random() * 100 + '%',
                          opacity: Math.random() * 0.5 + 0.2
                        }}
                      />
                    ))}
                    {/* Random lines for distortion */}
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div 
                        key={`line-${i}`}
                        className="absolute bg-white/20"
                        style={{
                          width: Math.random() * 100 + '%',
                          height: '1px',
                          left: '0',
                          top: Math.random() * 100 + '%',
                          transform: `rotate(${Math.random() * 20 - 10}deg)`
                        }}
                      />
                    ))}
                  </div>
                  
                  <div className="flex gap-2 relative z-10">
                    {captcha.split('').map((char, i) => (
                      <motion.span
                        key={i}
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="text-4xl font-black text-white italic drop-shadow-lg inline-block"
                        style={{
                          transform: `rotate(${Math.random() * 30 - 15}deg) translateY(${Math.random() * 10 - 5}px)`,
                          fontFamily: i % 2 === 0 ? 'serif' : 'sans-serif',
                          filter: `blur(${Math.random() * 0.5}px)`
                        }}
                      >
                        {char}
                      </motion.span>
                    ))}
                  </div>
                </motion.div>
                
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  onClick={generateCaptcha}
                  className="absolute top-2 right-2 text-white/50 hover:text-white hover:bg-white/10"
                >
                  <RefreshCw size={18} />
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  value={userInput}
                  onChange={e => setUserInput(e.target.value)}
                  placeholder="Enter the code above"
                  className="h-14 text-center text-xl font-bold border-2 focus:border-emerald-500 rounded-xl uppercase"
                  disabled={loading}
                  autoFocus
                />
                <Button 
                  type="submit" 
                  disabled={loading || !userInput}
                  className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold text-lg shadow-lg shadow-emerald-500/20"
                >
                  {loading ? <Loader2 className="animate-spin mr-2" /> : <Lock className="mr-2" size={18} />}
                  VERIFY & CLAIM
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>

      <div className="text-center">
        <p className="text-xs text-slate-400">Each correct captcha earns you <span className="text-emerald-500 font-bold">{rewardPoints} points</span>.</p>
      </div>
    </div>
  );
}
