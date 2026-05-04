import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, RefreshCw, Send, CheckCircle2, LogOut, ShieldCheck, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';

export default function VerifyEmail() {
  const { user, loading, logout, verifyOTP, resendOTP } = useAuth();
  const navigate = useNavigate();
  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true });
    }
    if (user?.is_verified) {
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const pastedData = value.slice(0, 6).split('');
      const newOtp = [...otp];
      pastedData.forEach((char, i) => {
        if (i + index < 6) newOtp[i + index] = char;
      });
      setOtp(newOtp);
      // Focus last filled input
      const nextIndex = Math.min(index + pastedData.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value !== '' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) {
      toast.error('Please enter the full 6-digit code');
      return;
    }

    setIsVerifying(true);
    try {
      const success = await verifyOTP(code);
      if (success) {
        toast.success('Account verified successfully!');
        navigate('/', { replace: true });
      } else {
        toast.error('Invalid verification code. Please try again.');
        // Reset OTP inputs on failure
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      toast.error('Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await resendOTP();
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0c] p-4 relative overflow-hidden font-sans">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] animate-pulse delay-1000" />
      </div>
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-3xl shadow-2xl overflow-hidden rounded-[2.5rem]">
          <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500" />
          
          <CardHeader className="text-center pb-2 pt-10">
            <motion.div 
              animate={{ 
                rotateY: [0, 180, 360],
              }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              className="mx-auto w-24 h-24 bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 rounded-[2rem] flex items-center justify-center text-emerald-500 mb-8 border border-emerald-500/20 shadow-[inset_0_2px_10px_rgba(255,255,255,0.05)] relative"
            >
              <KeyRound size={48} className="drop-shadow-glow" />
              <div className="absolute -top-2 -right-2 bg-emerald-500 text-slate-900 rounded-full p-1.5 shadow-lg">
                <ShieldCheck size={16} />
              </div>
            </motion.div>
            
            <CardTitle className="text-3xl font-black text-white tracking-tight mb-2">Verify Email</CardTitle>
            <CardDescription className="text-slate-400 text-sm px-6">
              A 6-digit security code has been sent to your inbox <br/>
              <span className="text-emerald-400 font-bold bg-emerald-400/10 px-2 py-0.5 rounded-lg mt-2 inline-block">
                {user?.email}
              </span>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8 pt-6 pb-10">
            <form onSubmit={handleVerify} className="space-y-8">
              <div className="flex justify-between gap-2 px-2">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { inputRefs.current[idx] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="w-12 h-14 bg-slate-800/80 border-2 border-slate-700 text-white text-2xl font-black text-center rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all outline-none"
                  />
                ))}
              </div>

              <div className="space-y-4">
                <Button 
                  type="submit"
                  disabled={isVerifying || otp.join('').length < 6}
                  className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg rounded-[1.5rem] shadow-xl shadow-emerald-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isVerifying ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-6 h-6" />
                      Verify Account
                    </>
                  )}
                </Button>

                <div className="flex flex-col items-center gap-4">
                  <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-slate-800 to-transparent" />
                  <p className="text-xs text-slate-500 font-medium tracking-wide">
                    Didn't receive the code?
                  </p>
                  <Button 
                    type="button"
                    variant="ghost"
                    onClick={handleResend}
                    disabled={isResending}
                    className="h-10 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/5 font-bold rounded-xl flex items-center justify-center gap-2 transition-all px-6"
                  >
                    {isResending ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4 translate-y-[1px]" />
                        Resend Code
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-6 border-t border-slate-800/50 pt-8 pb-10 bg-slate-900/60 transition-all">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-red-400 transition-colors group"
            >
              <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Sign Out & Restart
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-[2px] bg-slate-800 rounded-full" />
              <span className="text-[10px] text-slate-600 uppercase tracking-[0.4em] font-black italic">
                Secure OTP System
              </span>
              <div className="w-8 h-[2px] bg-slate-800 rounded-full" />
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
