import * as React from 'react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { DEFAULT_CONFIG } from '@/constants';
import { Wallet, History, AlertCircle, Check } from 'lucide-react';

import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';

export default function Withdraw() {
  const { user, updateUser } = useAuth();
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [amountPoints, setAmountPoints] = useState('');
  const [method, setMethod] = useState('bKash');
  const [accountNumber, setAccountNumber] = useState('');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const amountBDT = amountPoints ? ((parseInt(amountPoints) || 0) / DEFAULT_CONFIG.pointsPerBDT).toFixed(2) : '0.00';

  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, 'withdrawals'),
        where('userId', '==', user.uid),
        orderBy('created_at', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setWithdrawals(data);
        
        if (data.length > 0) {
          const lastWithdrawal: any = data[0];
          if (lastWithdrawal.created_at) {
            const lastTime = lastWithdrawal.created_at.toMillis ? lastWithdrawal.created_at.toMillis() : new Date(lastWithdrawal.created_at).getTime();
            const cooldownMs = 24 * 60 * 60 * 1000;
            const now = Date.now();
            const diff = cooldownMs - (now - lastTime);
            if (diff > 0) setTimeLeft(diff);
          }
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'withdrawals');
      });

      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev === null || prev <= 1000) {
            clearInterval(timer);
            return null;
          }
          return prev - 1000;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft]);

  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const points = parseInt(amountPoints);
    if (points < DEFAULT_CONFIG.minWithdrawalPoints) {
      toast.error(`Minimum withdrawal is ${DEFAULT_CONFIG.minWithdrawalPoints} points`);
      return;
    }

    if (points > user.points) {
      toast.error('Insufficient points');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'withdrawals'), {
        userId: user.uid,
        username: user.username,
        email: user.email,
        amountPoints: points,
        amountBDT: parseFloat(amountBDT),
        method,
        accountNumber,
        status: 'pending',
        created_at: serverTimestamp()
      });

      await updateUser({
        points: user.points - points
      });

      toast.success('Withdrawal request submitted!');
      setAmountPoints('');
      setAccountNumber('');
      setTimeLeft(24 * 60 * 60 * 1000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'withdrawals');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Withdraw Points</h1>
        <p className="text-slate-500">Convert your hard-earned points into real money.</p>
      </header>

      <div className="grid grid-cols-3 gap-4">
        {[
          { id: 'bKash', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/8b/Bkash_logo.svg/512px-Bkash_logo.svg.png' },
          { id: 'Nagad', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Nagad_Logo.svg/512px-Nagad_Logo.svg.png' },
          { id: 'Rocket', logo: 'https://i.ibb.co/3WvK0rJ/rocket.png' }
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => setMethod(m.id)}
            className={`relative p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group ${method === m.id ? 'border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-500/10' : 'border-slate-100 bg-white hover:border-slate-200'}`}
          >
            <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center p-1 shadow-sm border border-slate-100 overflow-hidden">
              <img 
                src={m.logo} 
                alt={m.id} 
                className="w-full h-full object-contain" 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (m.id === 'bKash') target.src = 'https://www.logo.wine/a/logo/BKash/BKash-Icon-Logo.wine.svg';
                  else if (m.id === 'Nagad') target.src = 'https://www.logo.wine/a/logo/Nagad/Nagad-Logo.wine.svg';
                  else target.src = 'https://raw.githubusercontent.com/Sabbir-Hossain-7/BD-Payment-Gateway-Icons/main/rocket.png';
                }}
              />
            </div>
            <span className={`text-xs font-bold ${method === m.id ? 'text-emerald-700' : 'text-slate-500'}`}>{m.id}</span>
            {method === m.id && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-md">
                <Check size={14} />
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Withdrawal Form */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wallet className="text-primary" />
              <CardTitle>New Request</CardTitle>
            </div>
            <CardDescription>1000 Points = 1 BDT</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="points">Points to Withdraw</Label>
                <Input 
                  id="points" 
                  type="number" 
                  placeholder={`Min ${DEFAULT_CONFIG.minWithdrawalPoints}`} 
                  value={amountPoints}
                  onChange={(e) => setAmountPoints(e.target.value)}
                  required 
                />
                <p className="text-xs text-slate-500">You will receive: <span className="font-bold text-primary">৳ {amountBDT}</span></p>
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center p-1 shadow-sm border border-slate-200 overflow-hidden">
                    <img 
                      src={
                        method === 'bKash' ? 'https://upload.wikimedia.org/wikipedia/en/thumb/8/8b/Bkash_logo.svg/512px-Bkash_logo.svg.png' :
                        method === 'Nagad' ? 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Nagad_Logo.svg/512px-Nagad_Logo.svg.png' :
                        'https://i.ibb.co/3WvK0rJ/rocket.png'
                      } 
                      alt={method} 
                      className="w-full h-full object-contain" 
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (method === 'bKash') target.src = 'https://www.logo.wine/a/logo/BKash/BKash-Icon-Logo.wine.svg';
                        else if (method === 'Nagad') target.src = 'https://www.logo.wine/a/logo/Nagad/Nagad-Logo.wine.svg';
                        else target.src = 'https://raw.githubusercontent.com/Sabbir-Hossain-7/BD-Payment-Gateway-Icons/main/rocket.png';
                      }}
                    />
                  </div>
                  <span className="font-bold text-slate-700">{method}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="account">Account Number</Label>
                <Input 
                  id="account" 
                  placeholder="017XXXXXXXX" 
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  required 
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading || timeLeft !== null}>
                {loading ? 'Submitting...' : timeLeft !== null ? `Wait ${formatTime(timeLeft)}` : 'Withdraw Now'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Info Card */}
        <div className="space-y-4">
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4 flex gap-3">
              <AlertCircle className="text-amber-500 shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-bold mb-1">Important Note</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Minimum withdrawal is 5000 points.</li>
                  <li>Withdrawals are processed within 24-48 hours.</li>
                  <li>Ensure your account number is correct.</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <History className="text-slate-500" />
                <CardTitle className="text-lg">Recent History</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.slice(0, 5).map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-medium">৳ {w.amountBDT}</TableCell>
                      <TableCell>{w.method}</TableCell>
                      <TableCell>
                        <Badge variant={w.status === 'approved' ? 'default' : w.status === 'pending' ? 'secondary' : 'destructive'}>
                          {w.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {withdrawals.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-slate-400">No history found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
