import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Leaf, Mail, Lock } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { loginWithGoogle, loginWithEmail, user, loading, isAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (user) {
      if (isAdmin) {
        navigate('/admin');
      } else {
        navigate('/');
      }
    }
  }, [user, isAdmin, navigate]);

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      toast.success('Signed in with Google');
    } catch (error) {
      toast.error('Google login failed');
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await loginWithEmail(email, password);
      toast.success('Login successful');
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-emerald-50/30 p-4">
      <Card className="w-full max-w-md border-b-4 border-emerald-500/20 shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-500/20 mb-4">
            <Leaf size={32} />
          </div>
          <CardTitle className="text-3xl font-bold text-slate-900">Sign In</CardTitle>
          <CardDescription className="text-slate-500">Welcome back to Eco Ads</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <form onSubmit={handleEmailLogin} className="space-y-4">
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
            <Button type="submit" className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]" disabled={isSubmitting}>
              {isSubmitting ? 'Verifying...' : 'Sign In'}
            </Button>
          </form>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-4 text-slate-400 font-semibold tracking-wider">Or Continue With</span>
            </div>
          </div>

          <Button 
            onClick={handleGoogleLogin} 
            variant="outline"
            className="w-full h-12 font-bold text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-emerald-200 flex items-center justify-center gap-3 transition-all"
            disabled={loading}
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Sign in with Google
          </Button>

          <div className="text-center text-sm pt-2">
            <span className="text-slate-500">Don't have an account? </span>
            <Link to="/register" className="text-emerald-600 font-bold hover:underline transition-all">Sign Up</Link>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 pb-6">
          <Link to="/admin-login" className="text-xs text-slate-400 hover:text-emerald-600 transition-colors font-medium">Admin Access</Link>
        </CardFooter>
      </Card>
    </div>
  );
}
