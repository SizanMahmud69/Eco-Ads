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

import confetti from 'canvas-confetti';

export default function WatchAds() {
  const { user, updateUser } = useAuth();
  const { settings } = useGameSettings();
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [videoAds, setVideoAds] = useState<any[]>([]);
  const [currentVideo, setCurrentVideo] = useState<any>(null);
  const [adStarted, setAdStarted] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [videoEnded, setVideoEnded] = useState(false);
  const [watchedTodayIds, setWatchedTodayIds] = useState<string[]>([]);

  const dailyLimit = settings.daily_game_limit || 10;
  const cooldownMinutes = settings.watch_ads_cooldown || 5;

  // Fetch watched video IDs for today
  useEffect(() => {
    if (!user) return;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, 'history'),
      where('userId', '==', user.uid),
      where('type', '==', 'watch_ads'),
      where('created_at', '>=', startOfDay)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ids = snapshot.docs.map(doc => doc.data().videoId).filter(id => !!id);
      setWatchedTodayIds(ids);
    }, (error) => {
      console.error("Error fetching today's watched videos:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch Video Ads from Admin collection
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'video_ads'), (snapshot) => {
      const ads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVideoAds(ads);
    }, (error) => {
      console.error("Error fetching video ads:", error);
      // No toast here to avoid spam, but we should handle it
    });
    return () => unsubscribe();
  }, []);

  // Cooldown timer countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'history'),
      where('userId', '==', user.uid),
      where('type', '==', 'watch_ads'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rawData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort in-memory to avoid index requirement
      const data = rawData.sort((a: any, b: any) => {
        const getTime = (val: any) => {
          if (!val) return 0;
          if (val.seconds !== undefined) return val.seconds * 1000;
          if (typeof val.toMillis === 'function') return val.toMillis();
          return new Date(val).getTime() || 0;
        };
        return getTime(b.created_at) - getTime(a.created_at);
      }).slice(0, 10);

      setHistory(data);
      
      if (data.length > 0) {
        const rawDate = (data[0] as any).created_at;
        let lastAdTime = 0;
        if (rawDate) {
          if (rawDate.seconds !== undefined) {
            lastAdTime = rawDate.seconds * 1000;
          } else if (typeof rawDate.toMillis === 'function') {
            lastAdTime = rawDate.toMillis();
          } else {
            lastAdTime = new Date(rawDate).getTime();
          }
        }
        
        const now = Date.now();
        const diff = now - lastAdTime;
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

  // Determine next video to watch sequentially
  useEffect(() => {
    if (videoAds.length === 0 || !user) return;
    
    // Simple sequential logic: get the last watched video ID from history
    const lastWatchedId = history[0]?.videoId;
    let nextIndex = 0;
    
    if (lastWatchedId) {
      const lastIndex = videoAds.findIndex(v => v.id === lastWatchedId);
      if (lastIndex !== -1) {
        nextIndex = (lastIndex + 1) % videoAds.length;
      }
    }
    
    setCurrentVideo(videoAds[nextIndex]);
  }, [videoAds, history, user]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    
    // YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
      const match = url.match(regExp);
      if (match && match[2]) {
        const id = match[2];
        return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
      }
      return url;
    }
    
    // Facebook
    if (url.includes('facebook.com')) {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&autoplay=1`;
    }
    
    return url;
  };

  // Handle selection of a specific video
  const handleSelectVideo = (video: any) => {
    if (watchedTodayIds.includes(video.id)) {
      toast.error("You have already watched this video today!");
      return;
    }

    if (cooldown > 0) {
      toast.error(`Please wait ${Math.floor(cooldown / 60)}m ${cooldown % 60}s before next video`);
      return;
    }
    
    if (currentPlays >= dailyLimit) {
      toast.error('You have reached your daily limit for video ads.');
      return;
    }

    setCurrentVideo(video);
    setAdStarted(true);
    setVideoEnded(false);
    setLoading(true);

    // Simulate video watching completion (30 seconds)
    const timeout = setTimeout(() => {
      setVideoEnded(true);
      setLoading(false);
    }, 30000);

    return () => clearTimeout(timeout);
  };

  const completeAd = async () => {
    if (!user || !currentVideo) return;
    try {
      const reward = Math.floor((currentVideo.points || 20) * (user.multiplier || 1));
      
      await addDoc(collection(db, 'history'), {
        userId: user.uid,
        type: 'watch_ads',
        points: reward,
        videoId: currentVideo.id,
        videoTitle: currentVideo.title,
        description: `Watched Video: ${currentVideo.title}`,
        created_at: serverTimestamp()
      });

      await updateUser({
        points: increment(reward) as any,
        daily_plays: {
          ...user.daily_plays,
          watch_ads: (user.daily_plays?.watch_ads || 0) + 1
        }
      });

      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.2 },
        colors: ['#FF6B6B', '#4ECDC4', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'],
        gravity: 0.8,
        scalar: 1.2,
        ticks: 300
      });

      toast.success(`Way to go! You earned ${reward} points.`);
      setAdStarted(false);
      setVideoEnded(false);
      setCurrentVideo(null);
    } catch (error) {
      console.error("Error saving ad reward:", error);
      toast.error('Failed to save reward');
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
        <p className="text-slate-500 font-medium max-w-xs mx-auto">Watch videos from the list below and earn rewards every {cooldownMinutes} minutes!</p>
        
        <div className="flex justify-center gap-3">
          <div className="bg-white px-4 py-2 rounded-2xl text-xs font-bold text-slate-600 border border-slate-100 shadow-sm flex items-center gap-2">
            <Clock size={14} className="text-indigo-500" />
            Cooldown: {cooldownMinutes}m
          </div>
          <div className="bg-white px-4 py-2 rounded-2xl text-xs font-bold text-slate-600 border border-slate-100 shadow-sm">
            Limits: {currentPlays} / {dailyLimit}
          </div>
        </div>
      </header>

      <AdUnit code={settings.ad_banner_728x90} minimal hideLabel />

      <AnimatePresence mode="wait">
        {adStarted && currentVideo ? (
          <motion.div 
            key="player"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
          >
            <Card className="rounded-[2.5rem] border-slate-100 shadow-2xl overflow-hidden">
              <CardContent className="p-6 md:p-10 text-center space-y-6">
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900">{currentVideo.title}</h3>
                  <p className="text-slate-500 text-sm font-medium">Watch the full video below to unlock your points.</p>
                </div>
                
                <div className="relative aspect-video w-full rounded-2xl bg-slate-900 overflow-hidden border border-white/10 shadow-2xl group">
                  <iframe 
                    src={getEmbedUrl(currentVideo.url)}
                    className="absolute inset-0 w-full h-full"
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                    title={currentVideo.title}
                  />
                </div>

                <div className="pt-4 space-y-4">
                  {videoEnded ? (
                    <Button 
                      onClick={completeAd}
                      className="w-full h-16 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <Sparkles size={24} />
                      CLAIM {Math.floor(currentVideo.points * (user?.multiplier || 1))} POINTS
                    </Button>
                  ) : (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-center gap-3">
                      <Loader2 className="animate-spin text-indigo-500" size={20} />
                      <span className="text-sm font-bold text-slate-600 uppercase tracking-widest">Watching video...</span>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed px-6">
                    Important: You must watch at least 30 seconds to claim points.
                  </p>
                  <Button variant="ghost" onClick={() => { setAdStarted(false); setCurrentVideo(null); }} className="text-slate-400 font-bold text-xs">
                    Cancel and go back
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div 
            key="list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {cooldown > 0 && (
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center gap-3 text-amber-700">
                <Clock className="animate-pulse" size={20} />
                <span className="text-sm font-bold">Next video available in: {Math.floor(cooldown / 60)}:{(cooldown % 60).toString().padStart(2, '0')}</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              {videoAds.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                  <Tv className="mx-auto text-slate-300 mb-4" size={48} />
                  <p className="text-slate-400 font-medium">No videos available at the moment.</p>
                </div>
              ) : (
                videoAds.map((video, index) => {
                  const isWatched = watchedTodayIds.includes(video.id);
                  return (
                    <motion.div
                      key={video.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`relative p-5 rounded-3xl border transition-all ${
                        cooldown > 0 || isWatched
                          ? 'bg-slate-50 border-slate-100 opacity-60' 
                          : 'bg-white border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 group'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                            cooldown > 0 || isWatched ? 'bg-slate-200 text-slate-400' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'
                          }`}>
                            <Play size={24} className={cooldown > 0 || isWatched ? '' : 'fill-current'} />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 line-clamp-1">{video.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-emerald-600 font-black text-xs">+{video.points} Pts</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                                {isWatched ? 'Watched Today' : `Video ${index + 1}`}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button 
                          disabled={cooldown > 0 || currentPlays >= dailyLimit || isWatched}
                          onClick={() => handleSelectVideo(video)}
                          variant={cooldown > 0 || isWatched ? "outline" : "default"}
                          className={`rounded-2xl font-bold h-11 px-6 ${
                            cooldown > 0 || isWatched ? 'border-slate-200 text-slate-400' : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/10'
                          }`}
                        >
                          {isWatched ? 'Watched' : cooldown > 0 ? 'Wait' : 'Watch Now'}
                        </Button>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
