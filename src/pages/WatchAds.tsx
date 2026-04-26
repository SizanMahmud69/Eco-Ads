import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Play, Loader2, Sparkles, Tv, History as HistoryIcon, Clock } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, addDoc, increment, serverTimestamp, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { AdUnit } from '@/components/AdUnit';
import { useGameSettings } from '@/hooks/useGameSettings';

export default function WatchAds() {
  const { user, updateUser } = useAuth();
  const { settings } = useGameSettings();
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [adStarted, setAdStarted] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const adContainerRef = useRef<HTMLDivElement>(null);

  const rewardPoints = settings.watch_ads_points || 20;
  const dailyLimit = settings.daily_game_limit || 10;
  const cooldownMinutes = settings.watch_ads_cooldown || 5;

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'history'),
      where('userId', '==', user.uid),
      where('type', '==', 'watch_ads'),
      orderBy('created_at', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistory(data);
      
      if (data.length > 0) {
        const rawDate = (data[0] as any).created_at;
        let lastAd = 0;
        if (rawDate) {
          if (rawDate.seconds !== undefined) {
            lastAd = rawDate.seconds * 1000;
          } else if (typeof rawDate.toMillis === 'function') {
            lastAd = rawDate.toMillis();
          } else {
            lastAd = new Date(rawDate).getTime();
          }
        }
        
        const now = Date.now();
        const diff = now - lastAd;
        const cooldownMs = cooldownMinutes * 60 * 1000;
        if (diff < cooldownMs) {
          setCooldown(Math.ceil((cooldownMs - diff) / 1000));
        }
      }
    }, (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'history');
      } catch (e) {
        console.error(e);
      }
    });

    return () => unsubscribe();
  }, [user, cooldownMinutes]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleWatchAd = () => {
    if (cooldown > 0) {
      toast.error(`Please wait ${Math.floor(cooldown / 60)}m ${cooldown % 60}s before next video`);
      return;
    }
    
    if (!settings.clickadilla_instream) {
      toast.error('No video ads available at the moment.');
      return;
    }

    setAdStarted(true);
    setLoading(true);

    // We simulate ad completion after 32 seconds (typical video ad duration)
    const timer = setTimeout(() => {
      completeAd();
    }, 32000);

    return () => clearTimeout(timer);
  };

  // Video Ad Injection Effect - Executes only when adStarted is true and container is ready
  useEffect(() => {
    if (adStarted && settings.clickadilla_instream && adContainerRef.current) {
      const container = adContainerRef.current;
      container.innerHTML = '';
      
      try {
        const range = document.createRange();
        range.setStart(container, 0);
        const fragment = range.createContextualFragment(settings.clickadilla_instream);
        container.appendChild(fragment);
        
        // Execute scripts manually
        const scripts = container.querySelectorAll('script');
        scripts.forEach(oldScript => {
          const newScript = document.createElement('script');
          Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
          newScript.innerHTML = oldScript.innerHTML;
          if (oldScript.src) {
            newScript.src = oldScript.src;
            newScript.async = true;
          }
          newScript.setAttribute('data-video-ad', 'true');
          
          // Clickadilla and major ad networks often need scripts in the body or head to initialize correctly
          // but we keep a copy in the container if it's a specific UI-binding script
          if (oldScript.src) {
            document.body.appendChild(newScript);
          } else {
            container.appendChild(newScript);
          }
        });

        return () => {
          document.querySelectorAll('script[data-video-ad="true"]').forEach(s => s.remove());
        };
      } catch (err) {
        console.error("Ad injection failed:", err);
      }
    }
  }, [adStarted, settings.clickadilla_instream]);

  const completeAd = async () => {
    if (!user) return;
    try {
      const reward = Math.floor(rewardPoints * (user.multiplier || 1));
      
      await addDoc(collection(db, 'history'), {
        userId: user.uid,
        type: 'watch_ads',
        points: reward,
        description: 'Watch Ads: Video ad completed',
        created_at: serverTimestamp()
      });

      await updateUser({
        points: increment(reward) as any,
        daily_plays: {
          ...user.daily_plays,
          watch_ads: (user.daily_plays?.watch_ads || 0) + 1
        }
      });

      toast.success(`Congratulations! You earned ${reward} points.`);
    } catch (error) {
      console.error("Error saving ad reward:", error);
      toast.error('Failed to save reward');
    } finally {
      setAdStarted(false);
      setLoading(false);
    }
  };

  const currentPlays = user?.daily_plays?.watch_ads || 0;
  const canPlay = currentPlays < dailyLimit;

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      <header className="text-center space-y-3">
        <div className="w-20 h-20 bg-indigo-100 rounded-[2.5rem] flex items-center justify-center mx-auto text-indigo-600 shadow-xl shadow-indigo-500/10 rotate-3">
          <Tv size={40} className="-rotate-3" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-950">Watch & Earn</h1>
        <p className="text-slate-500 font-medium max-w-xs mx-auto">Watch high-quality video ads and earn big points every few minutes!</p>
        
        <div className="flex justify-center gap-3">
          <div className="bg-white px-4 py-2 rounded-2xl text-xs font-bold text-slate-600 border border-slate-100 shadow-sm">
            Daily Limits: {currentPlays} / {dailyLimit}
          </div>
          <div className="bg-emerald-50 px-4 py-2 rounded-2xl text-xs font-bold text-emerald-600 border border-emerald-100 shadow-sm">
            +{rewardPoints} Pts / Video
          </div>
        </div>
      </header>

      <AdUnit code={settings.ad_banner_728x90} minimal hideLabel />

      <Card className="rounded-[2.5rem] border-slate-100 shadow-2xl shadow-indigo-500/5 overflow-hidden">
        <CardContent className="p-8 md:p-12 text-center space-y-8">
          <AnimatePresence mode="wait">
            {!canPlay ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="py-10 space-y-4"
              >
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400 mb-2">
                  <Tv size={32} />
                </div>
                <h2 className="text-2xl font-black text-slate-900">Daily Goal Reached!</h2>
                <p className="text-slate-500 font-medium">You've reached your daily limit for video ads. Come back tomorrow for more rewards!</p>
              </motion.div>
            ) : adStarted ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-12 space-y-6"
              >
                <div className="relative w-24 h-24 mx-auto">
                  <div className="absolute inset-0 border-4 border-indigo-100 rounded-full" />
                  <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Tv size={32} className="text-indigo-600" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-slate-900">Ad in Progress...</h3>
                  <p className="text-slate-500 text-sm font-medium">Please do not close this page until the video finishes.</p>
                </div>
                {/* Clickadilla in-stream video container */}
                <div 
                  id="clickadilla-instream-target" 
                  ref={adContainerRef}
                  className="min-h-[300px] w-full rounded-2xl bg-slate-900 flex items-center justify-center overflow-hidden border border-white/10 mt-4 shadow-inner relative"
                >
                  <div className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] animate-pulse flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-indigo-500" size={32} />
                    <span>Loading Video Experience...</span>
                  </div>
                </div>
                <div className="pt-4 px-6">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                    If the video doesn't play, please wait 30 seconds for your reward or try refreshing the page.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8 py-6"
              >
                <div className="relative group max-w-[280px] mx-auto aspect-video cursor-pointer" onClick={handleWatchAd}>
                  <div className="absolute inset-0 bg-indigo-600 rounded-3xl rotate-1 group-hover:rotate-2 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-slate-950 rounded-3xl -rotate-1 group-hover:-rotate-2 transition-transform duration-500 flex flex-col items-center justify-center overflow-hidden border border-white/10 shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent" />
                    <Play size={48} className="text-white fill-white relative z-10 filter drop-shadow-xl" />
                    <div className="absolute bottom-4 left-0 right-0 text-center">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Unlock Rewards</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Button 
                    size="lg" 
                    onClick={handleWatchAd}
                    disabled={loading || cooldown > 0}
                    className="w-full max-w-xs h-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"
                  >
                    {cooldown > 0 ? (
                      <span className="flex items-center gap-2">
                        <Clock size={20} />
                        WAIT {Math.floor(cooldown / 60)}:{(cooldown % 60).toString().padStart(2, '0')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Tv size={20} />
                        WATCH VIDEO AD
                      </span>
                    )}
                  </Button>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                    Available: {dailyLimit - currentPlays} More Today
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-[2rem] border-slate-100 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
              <Sparkles size={20} />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Earnings Tip</CardTitle>
              <CardDescription className="text-xs font-medium">Maximize your rewards</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-slate-600 font-medium">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5" />
                Wait for the full video to finish to get points.
              </li>
              <li className="flex items-start gap-2 text-sm text-slate-600 font-medium">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5" />
                Videos reset every {cooldownMinutes} minutes.
              </li>
              <li className="flex items-start gap-2 text-sm text-slate-600 font-medium">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5" />
                Premium users get 2x points per video!
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-slate-100 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600">
              <HistoryIcon size={20} />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Recent History</CardTitle>
              <CardDescription className="text-xs font-medium">Your last 10 video rewards</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-50">
              {history.length === 0 ? (
                <div className="p-10 text-center text-slate-400 font-medium text-sm">No video history yet</div>
              ) : (
                history.map((item) => (
                  <div key={item.id} className="p-4 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900">Video Completed</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        {item.created_at?.toMillis 
                          ? new Date(item.created_at.toMillis()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                          : 'Processing...'}
                      </span>
                    </div>
                    <span className="text-emerald-600 font-black">+{item.points} Pts</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <AdUnit code={settings.ad_native_bottom} className="w-full" />
    </div>
  );
}
