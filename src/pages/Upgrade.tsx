import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, Zap, Award, Loader2, X, Smartphone, CreditCard } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { toast } from 'sonner';
import { AdUnit } from '@/components/AdUnit';
import { useGameSettings } from '@/hooks/useGameSettings';

export default function Upgrade() {
  const { user } = useAuth();
  const { settings } = useGameSettings();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Payment Form State
  const [method, setMethod] = useState('bKash');
  const [transactionId, setTransactionId] = useState('');
  const [senderNumber, setSenderNumber] = useState('');
  const [paymentSettings, setPaymentSettings] = useState<any>({});

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'game_points'), (snapshot) => {
      if (snapshot.exists()) {
        setPaymentSettings(snapshot.data());
      }
    });

    const unsubscribe = onSnapshot(collection(db, 'plans'), (snapshot) => {
      setPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'plans');
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleUpgradeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedPlan) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'premium_requests'), {
        userId: user.uid,
        username: user.username,
        email: user.email,
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        multiplier: selectedPlan.multiplier || 1,
        durationDays: selectedPlan.duration_days || 30,
        method,
        transactionId,
        senderNumber,
        amount: selectedPlan.price,
        status: 'pending',
        created_at: serverTimestamp()
      });

      toast.success('Upgrade request submitted! Admin will review your payment.');
      setSelectedPlan(null);
      setTransactionId('');
      setSenderNumber('');
    } catch (error) {
      toast.error('Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Go Premium</h1>
        <p className="text-slate-500">Unlock your full earning potential with Eco Ads Premium.</p>
      </header>

      <AdUnit code={settings.ad_banner_728x90} className="my-6" minimal hideLabel />

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-emerald-600" size={40} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan, idx) => (
            <React.Fragment key={plan.id}>
              <Card className={`relative overflow-hidden transition-all hover:shadow-xl ${plan.multiplier > 1 ? 'border-emerald-500 shadow-emerald-500/10' : ''}`}>
                {plan.multiplier > 1 && (
                  <div className="absolute top-0 right-0 p-4">
                    <Zap className="text-emerald-500 fill-emerald-500" size={24} />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.duration_days} Days Access</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">৳{plan.price}</span>
                    <span className="text-slate-500">/{plan.duration_days}d</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    <Feature item={`${plan.multiplier}x Points on all activities`} />
                    {plan.features.map((feature: string, fIdx: number) => (
                      <li key={fIdx} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                          <Check size={12} className="text-emerald-600" />
                        </div>
                        <span className="text-sm text-slate-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    onClick={() => setSelectedPlan(plan)}
                    disabled={user?.is_premium}
                    className={`w-full h-12 font-bold ${plan.multiplier > 1 ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-800 hover:bg-slate-900'}`}
                  >
                    {user?.is_premium ? 'Current Plan' : 'Upgrade Now'}
                  </Button>
                </CardContent>
              </Card>
            </React.Fragment>
          ))}
        </div>
      )}

      <div className="flex justify-center mt-10">
        <AdUnit code={settings.ad_native_bottom} className="w-full" />
      </div>

      {/* Payment Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-md bg-white shadow-2xl animate-in zoom-in-95 duration-300">
            <CardHeader className="relative border-b">
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-4 top-4 rounded-full"
                onClick={() => setSelectedPlan(null)}
              >
                <X size={20} />
              </Button>
              <CardTitle>Complete Payment</CardTitle>
              <CardDescription>Pay ৳{selectedPlan.price} for {selectedPlan.name} plan</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleUpgradeRequest} className="space-y-6">
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 space-y-2">
                  <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Payment Instructions</p>
                  <p className="text-sm text-emerald-700">
                    Send <span className="font-bold">৳{selectedPlan.price}</span> to our official number:
                  </p>
                  <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-emerald-200">
                    <span className="font-mono font-bold text-lg">
                      {paymentSettings[`${method.toLowerCase()}_number`] || 'Not set'}
                    </span>
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">Personal</Badge>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Method</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {['bKash', 'Nagad', 'Rocket'].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMethod(m)}
                          className={`py-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${method === m ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 hover:border-slate-200'}`}
                        >
                          <Smartphone size={18} />
                          <span className="text-xs font-bold">{m}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sender">Your Number</Label>
                    <Input 
                      id="sender" 
                      placeholder="01XXXXXXXXX" 
                      value={senderNumber}
                      onChange={(e) => setSenderNumber(e.target.value)}
                      required 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="trx">Transaction ID</Label>
                    <Input 
                      id="trx" 
                      placeholder="TRX12345678" 
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      required 
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 font-bold" disabled={submitting}>
                  {submitting ? <Loader2 className="animate-spin mr-2" /> : 'SUBMIT PAYMENT'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {plans.length === 0 && !loading && (
        <div className="text-center py-20">
          <p className="text-slate-400">No plans available at the moment.</p>
        </div>
      )}
    </div>
  );
}

const Feature = ({ item }: { item: string }) => (
  <li className="flex items-center gap-3">
    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
      <Check size={12} className="text-emerald-600" />
    </div>
    <span className="text-sm text-slate-700">{item}</span>
  </li>
);

const Badge = ({ children, className }: any) => (
  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${className}`}>
    {children}
  </span>
);
