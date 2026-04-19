import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Leaf, Mail, Lock, User as UserIcon, UserPlus, CheckCircle2, XCircle } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, doc, onSnapshot } from 'firebase/firestore';
import { AdUnit } from '@/components/AdUnit';
import { useGameSettings } from '@/hooks/useGameSettings';

export default function Register() {
  const navigate = useNavigate();
  const { loginWithGoogle, registerWithEmail, user, loading } = useAuth();
  const { settings } = useGameSettings();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingReferral, setIsCheckingReferral] = useState(false);
  const [registrationsEnabled, setRegistrationsEnabled] = useState(true);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  React.useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'game_points'), (docSnap) => {
      if (docSnap.exists()) {
        setRegistrationsEnabled(docSnap.data().registrations_enabled !== false);
      }
    });
    return () => unsub();
  }, []);

  React.useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  // Check referral code
  useEffect(() => {
    const checkReferral = async () => {
      if (referralCode.length >= 6) {
        setIsCheckingReferral(true);
        try {
          const q = query(collection(db, 'users'), where('referral_code', '==', referralCode.toUpperCase()), limit(1));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const referrerData = querySnapshot.docs[0].data();
            setReferrerName(referrerData.username);
          } else {
            setReferrerName(null);
          }
        } catch (error) {
          console.error("Error checking referral:", error);
        } finally {
          setIsCheckingReferral(false);
        }
      } else {
        setReferrerName(null);
      }
    };

    const timeoutId = setTimeout(checkReferral, 500);
    return () => clearTimeout(timeoutId);
  }, [referralCode]);

  const handleGoogleSignUp = async () => {
    if (!registrationsEnabled) {
      toast.error('New registrations are currently disabled by admin.');
      return;
    }
    try {
      await loginWithGoogle();
      toast.success('Signed up with Google');
    } catch (error) {
      toast.error('Google sign up failed');
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registrationsEnabled) {
      toast.error('New registrations are currently disabled by admin.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (!agreedToTerms) {
      toast.error('Please agree to the Terms & Conditions');
      return;
    }
    setIsSubmitting(true);
    try {
      await registerWithEmail(email, password, username, referralCode.toUpperCase());
      toast.success('Account created successfully');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-emerald-50/30 p-4 py-12 gap-6">
      <AdUnit code={settings.ad_banner_728x90} minimal hideLabel />
      <Card className="w-full max-w-md border-b-4 border-emerald-500/20 shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-500/20 mb-4">
            <Leaf size={32} />
          </div>
          <CardTitle className="text-3xl font-bold text-slate-900">Create Account</CardTitle>
          <CardDescription className="text-slate-500">Start earning with Eco Ads today</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <form onSubmit={handleEmailRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-700 font-medium">Username</Label>
              <div className="relative group">
                <UserIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                <Input 
                  id="username" 
                  className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  placeholder="johndoe" 
                  required 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 font-medium">Email Address</Label>
              <div className="relative group">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                <Input 
                  id="email" 
                  type="email" 
                  className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="john@example.com" 
                  required 
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password" title="Password" className="text-slate-700 font-medium">Password</Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                  <Input 
                    id="password" 
                    type="password" 
                    className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" title="Confirm Password" className="text-slate-700 font-medium">Confirm</Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    required 
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="referralCode" className="text-slate-700 font-medium">Referral ID (Optional)</Label>
              <div className="relative group">
                <UserPlus className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                <Input 
                  id="referralCode" 
                  className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all uppercase"
                  value={referralCode} 
                  onChange={(e) => setReferralCode(e.target.value)} 
                  placeholder="ABC123XY" 
                />
                {isCheckingReferral && (
                  <div className="absolute right-3 top-3 h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                )}
              </div>
              {referrerName && (
                <div className="flex items-center gap-1.5 px-1 animate-in fade-in slide-in-from-top-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-xs text-emerald-600 font-medium">Referred by: {referrerName}</span>
                </div>
              )}
              {referralCode.length >= 6 && !referrerName && !isCheckingReferral && (
                <div className="flex items-center gap-1.5 px-1 animate-in fade-in slide-in-from-top-1">
                  <XCircle className="h-3.5 w-3.5 text-red-400" />
                  <span className="text-xs text-red-400 font-medium">Invalid Referral ID</span>
                </div>
              )}
            </div>
            <div className="flex items-start gap-2 pt-2 px-1">
              <div className="flex items-center h-5">
                <input
                  id="terms"
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  required
                />
              </div>
              <label htmlFor="terms" className="text-xs text-slate-500 leading-normal cursor-pointer">
                I agree to the <Link to="/terms-conditions" className="text-emerald-600 font-bold hover:underline">Terms of Service</Link> and <Link to="/privacy-policy" className="text-emerald-600 font-bold hover:underline">Privacy Policy</Link>
              </label>
            </div>
            <Button type="submit" className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]" disabled={isSubmitting || !agreedToTerms}>
              {isSubmitting ? 'Creating Account...' : 'Sign Up'}
            </Button>
          </form>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-4 text-slate-400 font-semibold tracking-wider">Or Join With</span>
            </div>
          </div>

          <Button 
            onClick={handleGoogleSignUp} 
            variant="outline"
            className="w-full h-12 font-bold text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-emerald-200 flex items-center justify-center gap-3 transition-all"
            disabled={loading}
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Sign up with Google
          </Button>

          <div className="text-center text-sm pt-2">
            <span className="text-slate-500">Already have an account? </span>
            <Link to="/login" className="text-emerald-600 font-bold hover:underline transition-all">Sign In</Link>
          </div>

          <div className="flex justify-center gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 pt-4 border-t border-slate-100">
            <Link to="/privacy-policy" className="hover:text-emerald-600 transition-colors">Privacy Policy</Link>
            <div className="w-1 h-1 rounded-full bg-slate-300 self-center" />
            <Link to="/terms-conditions" className="hover:text-emerald-600 transition-colors">Terms of Service</Link>
          </div>
          <div className="flex justify-center flex-col items-center gap-4 mt-6">
            <AdUnit code={settings.ad_banner_468x60} />
            <AdUnit code={settings.ad_square_300x250} />
          </div>
        </CardContent>
      </Card>
      <AdUnit code={settings.ad_native_bottom} className="max-w-md w-full" />
    </div>
  );
}
