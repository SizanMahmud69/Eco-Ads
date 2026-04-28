import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useAuth } from '@/lib/AuthContext';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { doc, setDoc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Camera, QrCode, History, Trophy, AlertCircle, CheckCircle2, X, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AdUnit } from '@/components/AdUnit';
import { useGameSettings } from '@/hooks/useGameSettings';
import { PermissionDialog } from '@/components/PermissionDialog';
import { useCameraPermission } from '@/hooks/usePermission';
import confetti from 'canvas-confetti';

export default function EcoScanner() {
  const { user, updateUser } = useAuth();
  const { settings } = useGameSettings();
  const [scanning, setScanning] = useState(false);
  const [reward, setReward] = useState<number | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { 
    status: camStatus, 
    showDialog, 
    setShowDialog, 
    handleAllow, 
    handleDeny,
    requestPermission 
  } = useCameraPermission();
  
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  const startScanner = async () => {
    if (isProcessing) return;
    
    if ((user?.profile_health ?? 100) < 10) {
      toast.error("Low Health! Your profile health must be at least 10% to scan. It will refill tomorrow.");
      return;
    }
    
    // Check our custom permission status first
    if (camStatus !== 'granted') {
      const alreadyChecked = await requestPermission();
      if (!alreadyChecked) return; // Dialog is now showing
    }

    // Explicitly check for mediaDevices support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error("Your browser does not support camera access.");
      return;
    }
    
    // Set a flag that we're about to request permission/start camera
    // This helps InitRoute know that a reload might be coming from here
    sessionStorage.setItem('scannerReloadPending', 'true');
    
    setIsInitializing(true);
    setScanning(true);
    
    // Wait for the DOM element to be available
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode("reader");
        html5QrCodeRef.current = html5QrCode;

        const config = { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        };

        try {
          await html5QrCode.start(
            { facingMode: "environment" }, 
            config,
            onScanSuccess,
            onScanFailure
          );
          // Only clear if successful
          sessionStorage.removeItem('scannerReloadPending');
        } catch (firstErr) {
          console.warn("Failed to start with environment camera, trying user camera", firstErr);
          try {
            await html5QrCode.start(
              { facingMode: "user" }, // Try front camera as fallback
              config,
              onScanSuccess,
              onScanFailure
            );
            sessionStorage.removeItem('scannerReloadPending');
          } catch (secondErr) {
            console.error("Failed to start any camera", secondErr);
            sessionStorage.removeItem('scannerReloadPending');
            toast.error("Could not start any camera. Please check your permissions.");
            setScanning(false);
          }
        }
        setIsInitializing(false);
      } catch (err: any) {
        console.error("Camera start error:", err);
        sessionStorage.removeItem('scannerReloadPending');
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          toast.error("Camera permission denied. Please enable camera access in your browser settings.");
        } else {
          toast.error("Could not start camera. Please ensure permissions are granted.");
        }
        setScanning(false);
        setIsInitializing(false);
      }
    }, 100);
  };

  const stopScanner = async () => {
    sessionStorage.removeItem('scannerReloadPending');
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.error("Failed to stop scanner", err);
      }
    }
    setScanning(false);
    setIsInitializing(false);
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
    };
  }, []);

  async function onScanSuccess(decodedText: string) {
    if (!user || isProcessing) return;
    
    setIsProcessing(true);
    const trimmedCode = decodedText.trim();
    
    await stopScanner();

    try {
      // 1. Check daily limit (max 5 scans per day)
      const today = new Date().toISOString().split('T')[0];
      const historyRef = collection(db, 'history');
      const q = query(
        historyRef, 
        where('userId', '==', user.uid),
        where('type', '==', 'Eco Scan'),
        where('timestamp', '>=', today)
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.size >= 5) {
        toast.error("Daily limit reached! You can scan max 5 codes per day.");
        setIsProcessing(false);
        return;
      }

      // 2. Create a more robust unique ID for the code
      const codeId = btoa(unescape(encodeURIComponent(trimmedCode)))
        .replace(/\//g, '_')
        .replace(/\+/g, '-')
        .replace(/=/g, '');
      
      const codeRef = doc(db, 'scanned_codes', codeId);
      const codeSnap = await getDoc(codeRef);

      if (codeSnap.exists()) {
        // Decrease health for "mistake" (scanning same code)
        await updateUser({
          profile_health: Math.max(0, (user.profile_health ?? 100) - 2)
        });
        toast.error("This code has already been scanned! -2% Health");
        setIsProcessing(false);
        return;
      }

      const points = Math.floor(Math.random() * 41) + 10;
      
      await Promise.all([
        setDoc(codeRef, {
          scannedBy: user.uid,
          scannedAt: serverTimestamp(),
          codeContent: trimmedCode
        }),
        updateUser({ points: (user.points || 0) + points }),
        addDoc(collection(db, 'history'), {
          userId: user.uid,
          type: 'Eco Scan',
          points: points,
          timestamp: new Date().toISOString(),
          created_at: serverTimestamp(),
          details: `Scanned code: ${trimmedCode.substring(0, 15)}...`
        })
      ]);

      setReward(points);
      
      // User requested animation: "paper cards red blue yellow green paper like top from bottom falling"
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.1 }, // Start from top
        colors: ['#FF6B6B', '#4ECDC4', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'],
        gravity: 0.8,
        scalar: 1.2,
        ticks: 300
      });

      toast.success(`Success! You earned ${points} points.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'scanned_codes');
      toast.error("Failed to process scan.");
    } finally {
      setIsProcessing(false);
    }
  }

  function onScanFailure(error: any) {
    // Standard failure for frames without codes
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <PermissionDialog 
        isOpen={showDialog}
        onClose={handleDeny}
        onAllow={async () => {
          const granted = await handleAllow();
          if (granted) {
            // Give a tiny moment for state to sync and dialog to fade
            setTimeout(() => startScanner(), 300);
          }
        }}
        title="Allow Eco Ads to access your camera?"
        description="Permission is required to scan codes and earn points."
      />

      <header className="text-center space-y-2">
        <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto text-emerald-600 mb-4">
          <QrCode size={32} />
        </div>
        <h1 className="text-3xl font-black text-slate-900">Eco Scanner</h1>
        <p className="text-slate-500 font-medium">Scan barcodes from bottles to earn points!</p>
      </header>

      <AdUnit code={settings.ad_banner_728x90} className="my-4" />

      <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden bg-white border-b-[6px] border-emerald-500/10">
        <CardContent className="p-8 space-y-6">
          {!scanning && !reward && (
            <div className="text-center space-y-6 py-8">
              {camStatus === 'denied' && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm space-y-2 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-center gap-2 font-bold">
                    <AlertCircle size={18} />
                    <span>Camera Access Blocked</span>
                  </div>
                  <p className="text-xs">
                    Please click the <b>Lock</b> icon in your browser address bar and set Camera to <b>Allow</b>, then refresh the page.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2 border-red-200 text-red-600 hover:bg-red-100"
                    onClick={() => window.open(window.location.href, '_blank')}
                  >
                    Open in New Tab
                  </Button>
                </div>
              )}
              
              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                <div className="flex items-center justify-center gap-3 text-emerald-600 font-bold">
                  <Trophy size={20} />
                  <span>Earn 10-50 Points per Scan</span>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Find any cold drink bottle or product with a Barcode or QR Code. 
                  Each unique code can only be scanned once!
                </p>
              </div>
              <Button 
                onClick={startScanner}
                size="lg"
                className="w-full h-16 rounded-2xl text-lg font-black gap-3 shadow-xl shadow-emerald-500/20"
              >
                <Camera size={24} />
                START SCANNING
              </Button>
              <p className="text-[10px] text-slate-400 font-medium">
                Camera not opening? Try opening the app in a new tab or check browser permissions.
              </p>
            </div>
          )}

          {scanning && (
            <div className="space-y-4 relative">
              <div className="relative aspect-square w-full max-w-[350px] mx-auto overflow-hidden rounded-3xl border-4 border-emerald-500/20 bg-black">
                <div id="reader" className="w-full h-full"></div>
                {(isInitializing || isProcessing) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white font-bold z-20">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="mb-2"
                    >
                      <QrCode size={32} className="text-emerald-400" />
                    </motion.div>
                    <span>{isProcessing ? "Processing Scan..." : "Initializing Camera..."}</span>
                  </div>
                )}
                {/* Scanner Overlay UI */}
                <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
                   <div className="w-full h-full border-2 border-emerald-500 relative">
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400" />
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400" />
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400" />
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400" />
                      <motion.div 
                        animate={{ top: ['0%', '100%', '0%'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"
                      />
                   </div>
                </div>
              </div>
              <Button 
                variant="destructive" 
                onClick={stopScanner}
                className="w-full h-12 rounded-xl font-bold gap-2"
              >
                <X size={20} />
                Stop Scanner
              </Button>
            </div>
          )}

          <AnimatePresence>
            {reward && (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="text-center space-y-8 py-10 relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-50 to-white border border-emerald-100/50"
              >
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full -ml-16 -mb-16 blur-3xl" />
                
                <motion.div 
                  initial={{ rotate: -10, scale: 0.8 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 10 }}
                  className="w-24 h-24 bg-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto text-white shadow-2xl shadow-emerald-500/40 relative z-10"
                >
                  <Trophy size={48} className="drop-shadow-lg" />
                </motion.div>
                
                <div className="space-y-3 relative z-10">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <h2 className="text-5xl font-black text-slate-900 tracking-tighter">
                      <span className="text-emerald-500">+{reward}</span> Points!
                    </h2>
                  </motion.div>
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-slate-500 font-bold uppercase tracking-widest text-xs"
                  >
                    Product Scanned Successfully
                  </motion.p>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="px-6"
                >
                  <Button 
                    onClick={() => setReward(null)}
                    className="w-full h-16 rounded-2xl font-black text-lg gap-3 bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 active:scale-95 transition-all"
                  >
                    <Camera size={20} />
                    SCAN ANOTHER CODE
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-none shadow-lg bg-white rounded-3xl border-b-[4px] border-blue-500/10">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
              <History size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Unique Codes Only</p>
              <p className="text-sm font-black text-slate-700">One scan per product</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-lg bg-white rounded-3xl border-b-[4px] border-amber-500/10">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Fair Play</p>
              <p className="text-sm font-black text-slate-700">Abuse leads to ban</p>
            </div>
          </CardContent>
        </Card>
      </div>
      <AdUnit code={settings.ad_native_bottom} className="mt-6" />
    </div>
  );
}
