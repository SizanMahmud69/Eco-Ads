import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Copy, Share2, Award, UserCheck, Zap } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

import { useGameSettings } from '@/hooks/useGameSettings';

export default function Refer() {
  const { user } = useAuth();
  const { settings } = useGameSettings();
  const [referrals, setReferrals] = useState<any[]>([]);
  const referralCode = user?.referral_code || 'LOADING...';

  useEffect(() => {
    if (!user?.referral_code) return;

    const q = query(
      collection(db, 'users'),
      where('referred_by', '==', user.referral_code)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReferrals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    return () => unsubscribe();
  }, [user?.referral_code]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralCode);
    toast.success('Referral code copied!');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Refer & Earn</h1>
        <p className="text-slate-500">Invite friends and get {settings.referral_bonus || 500} points when they reach 1000 points!</p>
      </header>

      <div className="grid gap-6">
        <Card className="bg-emerald-600 text-white border-none">
          <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <Users size={32} />
            </div>
            <div className="space-y-1">
              <p className="text-emerald-100 font-medium">Your Referral Code</p>
              <h2 className="text-4xl font-black tracking-widest">{referralCode}</h2>
            </div>
            <Button 
              onClick={copyToClipboard}
              variant="secondary" 
              className="w-full max-w-xs font-bold gap-2"
            >
              <Copy size={18} />
              Copy Code
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                <Users size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Referrals</p>
                <p className="text-2xl font-bold">{user?.referrals_count || referrals.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                <Award size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500">Referral Bonus</p>
                <p className="text-2xl font-bold">{user?.referral_bonus_earned || 0} Points</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <UserCheck className="text-emerald-600" size={20} />
            Your Referrals
          </h2>
          <Card>
            <CardContent className="p-0">
              {referrals.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  You haven't referred anyone yet.
                </div>
              ) : (
                <div className="divide-y">
                  {referrals.map((ref) => (
                    <div key={ref.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold">
                          {ref.username.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold flex items-center gap-1">
                            {ref.username}
                            {ref.is_premium && <Zap size={10} className="text-amber-500 fill-amber-500" />}
                          </p>
                          <p className="text-[10px] text-slate-400">Joined {new Date(ref.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex flex-col items-end">
                          <p className="text-xs font-bold text-emerald-600">{ref.points || 0} / 1000 pts</p>
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 transition-all duration-500" 
                              style={{ width: `${Math.min(((ref.points || 0) / 1000) * 100, 100)}%` }}
                            />
                          </div>
                          {ref.referral_milestone_rewarded && (
                            <span className="text-[9px] text-emerald-600 font-bold mt-1">Bonus Claimed!</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">How it works</h2>
          <div className="space-y-4">
            <Step number="1" title="Share your code" description="Send your unique referral code to your friends." />
            <Step number="2" title="They sign up" description="Your friends use your code during registration." />
            <Step number="3" title="Earn Bonus" description={`Get ${settings.referral_bonus || 500} bonus points when your friend reaches 1000 points!`} />
          </div>
        </section>
      </div>
    </div>
  );
}

const Step = ({ number, title, description }: any) => (
  <div className="flex gap-4">
    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold flex-shrink-0">
      {number}
    </div>
    <div>
      <h3 className="font-bold">{title}</h3>
      <p className="text-sm text-slate-500">{description}</p>
    </div>
  </div>
);
