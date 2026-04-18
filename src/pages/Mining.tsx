import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Pickaxe, Timer, Zap, History as HistoryIcon, Award } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, addDoc, query, where, orderBy, limit, onSnapshot, serverTimestamp, doc, deleteDoc, getDocs, updateDoc, increment } from 'firebase/firestore';

export default function Mining() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [activeSession, setActiveSession] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'mining_sessions'),
      where('userId', '==', user.uid),
      where('status', 'in', ['active', 'completed']),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setActiveSession({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setActiveSession(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'mining_sessions');
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!activeSession) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const end = new Date(activeSession.end_at).getTime();
      const start = new Date(activeSession.start_at).getTime();
      const total = end - start;
      const remaining = Math.max(0, end - now);
      
      setTimeLeft(remaining);
      setProgress(((total - remaining) / total) * 100);

      if (remaining <= 0 && activeSession.status === 'active') {
        // Update status to completed in Firestore
        const sessionRef = doc(db, 'mining_sessions', activeSession.id);
        updateDoc(sessionRef, { status: 'completed' }).catch(console.error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  const startMining = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const duration = 4 * 60 * 60 * 1000; // 4 hours
      const points = Math.floor(20 * (user?.multiplier || 1));
      const start = new Date();
      const end = new Date(start.getTime() + duration);

      await addDoc(collection(db, 'mining_sessions'), {
        userId: user.uid,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        points_to_claim: points,
        status: 'active'
      });

      toast.success('Mining started! Come back in 4 hours to claim your points.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'mining_sessions');
      toast.error('Failed to start mining');
    } finally {
      setLoading(false);
    }
  };

  const claimPoints = async () => {
    if (!user || !activeSession) return;
    setLoading(true);
    try {
      const points = activeSession.points_to_claim;
      
      await addDoc(collection(db, 'history'), {
        userId: user.uid,
        type: 'task',
        points: points,
        created_at: serverTimestamp(),
        description: 'Mining Reward'
      });

      await updateUser({
        points: increment(points) as any
      });

      await deleteDoc(doc(db, 'mining_sessions', activeSession.id));
      
      toast.success(`Claimed ${points} points!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `mining_sessions/${activeSession.id}`);
      toast.error('Failed to claim points');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  if (!user?.is_premium) {
    return (
      <div className="space-y-8 text-center py-12 animate-in fade-in duration-500">
        <div className="mx-auto w-24 h-24 bg-amber-50 rounded-3xl flex items-center justify-center text-amber-500 mb-6 shadow-inner">
          <Zap size={48} className="fill-amber-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Premium Required</h1>
          <p className="text-slate-500 max-w-xs mx-auto">
            Eco Mining is a premium feature. Upgrade your account to start earning points passively.
          </p>
        </div>
        <Button 
          onClick={() => navigate('/upgrade')}
          className="bg-emerald-600 hover:bg-emerald-700 h-14 px-10 font-bold text-lg rounded-2xl shadow-lg shadow-emerald-500/20"
        >
          UPGRADE NOW
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-500/20 mb-4">
          <Pickaxe size={32} className={activeSession?.status === 'active' ? 'animate-bounce' : ''} />
        </div>
        <h1 className="text-3xl font-bold">Eco Mining</h1>
        <p className="text-slate-500">Start your mining rig and earn points while you sleep.</p>
      </header>

      <Card className="max-w-md mx-auto overflow-hidden border-b-4 border-emerald-500/20">
        <CardContent className="p-8 space-y-6">
          {!activeSession ? (
            <div className="text-center space-y-6">
              <div className="space-y-2">
                <p className="text-slate-500 font-medium">Mining Power</p>
                <p className="text-4xl font-black text-emerald-600">{(5 * (user?.multiplier || 1)).toFixed(1)} Pts/Hr</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-slate-400">Duration</p>
                  <p className="font-bold">4 Hours</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-slate-400">Total Reward</p>
                  <p className="font-bold">{Math.floor(20 * (user?.multiplier || 1))} Points</p>
                </div>
              </div>
              <Button 
                onClick={startMining} 
                disabled={loading}
                className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-lg font-bold shadow-lg shadow-emerald-500/20"
              >
                START MINING
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-500">
                    {activeSession.status === 'active' ? 'Mining in progress...' : 'Mining complete!'}
                  </p>
                  <p className="text-2xl font-bold">
                    {activeSession.status === 'active' ? formatTime(timeLeft) : 'Ready to Claim'}
                  </p>
                </div>
                <Zap className={`text-amber-500 ${activeSession.status === 'active' ? 'animate-pulse' : ''}`} />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-400">
                  <span>{Math.floor(progress)}%</span>
                  <span>100%</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-1000" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {activeSession.status === 'completed' ? (
                <Button 
                  onClick={claimPoints} 
                  disabled={loading}
                  className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-lg font-bold animate-bounce"
                >
                  CLAIM {activeSession.points_to_claim} POINTS
                </Button>
              ) : (
                <Button disabled className="w-full h-14 bg-slate-200 text-slate-500 font-bold">
                  MINING...
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <section className="max-w-md mx-auto space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Award className="text-amber-500" size={20} />
          Mining Benefits
        </h2>
        <div className="grid gap-3">
          <Benefit title="Passive Income" description="Earn points without any active tasks." />
          <Benefit title="Premium Boost" description="Premium users get 2x mining speed." />
          <Benefit title="Safe & Secure" description="No battery drain or device heating." />
        </div>
      </section>
    </div>
  );
}

const Benefit = ({ title, description }: any) => (
  <div className="p-4 bg-white rounded-xl border border-slate-100 flex gap-4">
    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
      <Zap size={18} />
    </div>
    <div>
      <h3 className="font-bold text-sm">{title}</h3>
      <p className="text-xs text-slate-500">{description}</p>
    </div>
  </div>
);
