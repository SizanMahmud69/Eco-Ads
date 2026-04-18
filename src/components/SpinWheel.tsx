import * as React from 'react';
import { useState, useRef } from 'react';
import { motion, useAnimation, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface SpinWheelProps {
  onSpin: (points: number) => void;
  disabled?: boolean;
  segments?: { points: number; color: string; label: string }[];
}

const DEFAULT_SEGMENTS = [
  { points: 10, color: '#FF6B6B', label: '10' },
  { points: 20, color: '#4ECDC4', label: '20' },
  { points: 30, color: '#45B7D1', label: '30' },
  { points: 40, color: '#FFA07A', label: '40' },
  { points: 50, color: '#98D8C8', label: '50' },
  { points: 75, color: '#F7DC6F', label: '75' },
  { points: 100, color: '#BB8FCE', label: '100' },
  { points: 15, color: '#82E0AA', label: '15' },
];

export const SpinWheel: React.FC<SpinWheelProps> = ({ onSpin, disabled, segments = DEFAULT_SEGMENTS }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);
  const controls = useAnimation();
  const pointerControls = useAnimation();
  const currentRotation = useRef(0);

  const handleSpin = async () => {
    if (isSpinning || disabled) return;

    setIsSpinning(true);
    setWinner(null);
    
    // Random segment
    const segmentIndex = Math.floor(Math.random() * segments.length);
    const segmentAngle = 360 / segments.length;
    
    // Calculate rotation to land on the segment
    const extraSpins = 10; // More spins for excitement
    const targetRotation = currentRotation.current + (360 * extraSpins) + (360 - (segmentIndex * segmentAngle + segmentAngle / 2));
    
    // Animate the wheel
    await controls.start({
      rotate: targetRotation,
      transition: { 
        duration: 6, 
        ease: [0.15, 0, 0.05, 1] 
      }
    });

    currentRotation.current = targetRotation;
    const points = segments[segmentIndex].points;
    setWinner(points);
    
    // Visual feedback
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      colors: segments.map(s => s.color)
    });

    // Pulse the pointer
    await pointerControls.start({
      scale: [1, 1.4, 1],
      rotate: [0, -25, 0],
      transition: { duration: 0.2 }
    });

    onSpin(points);
    setIsSpinning(false);
  };

  return (
    <div className="flex flex-col items-center gap-8 p-6 sm:p-10 bg-white rounded-[3rem] shadow-[0_30px_60px_-12px_rgba(0,0,0,0.15)] border border-slate-50 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500" />
      
      <div className="relative">
        {/* Outer Glow */}
        <AnimatePresence>
          {winner !== null && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1.2 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute -inset-10 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-400 opacity-20 blur-3xl z-0"
            />
          )}
        </AnimatePresence>

        <div className="relative w-64 h-64 sm:w-80 sm:h-80 z-10">
          {/* Outer Ring Decoration */}
          <div className="absolute -inset-5 rounded-full border-[16px] border-slate-50 shadow-[inset_0_4px_8px_rgba(0,0,0,0.05),0_10px_20px_rgba(0,0,0,0.1)] flex items-center justify-center">
            {/* Decorative lights on the ring */}
            {[...Array(24)].map((_, i) => (
              <motion.div 
                key={i}
                animate={{ 
                  opacity: [0.3, 1, 0.3],
                  scale: [1, 1.2, 1]
                }}
                transition={{ 
                  duration: 1.5, 
                  repeat: Infinity, 
                  delay: i * 0.1 
                }}
                className={`absolute w-2 h-2 rounded-full ${i % 2 === 0 ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]' : 'bg-white shadow-[0_0_8px_#fff]'}`}
                style={{ transform: `rotate(${i * 15}deg) translateY(-158px)` }}
              />
            ))}
          </div>
          
          <motion.div
            animate={controls}
            className="w-full h-full rounded-full border-[10px] border-slate-900 relative overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.3)]"
            style={{
              backgroundImage: `conic-gradient(
                ${segments.map((s, i) => `${s.color} ${i * (360 / segments.length)}deg ${(i + 1) * (360 / segments.length)}deg`).join(', ')}
              )`
            }}
          >
            {/* Shiny Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-black/30 via-transparent to-white/30 pointer-events-none" />
            
            {segments.map((s, i) => {
              const segmentAngle = 360 / segments.length;
              const angle = i * segmentAngle + segmentAngle / 2;
              return (
                <div 
                  key={i}
                  className="absolute top-1/2 left-1/2 w-full h-full flex items-start justify-center pt-6 sm:pt-8"
                  style={{ 
                    transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                    transformOrigin: 'center center'
                  }}
                >
                  <motion.span 
                    animate={winner === s.points ? { scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] } : {}}
                    className="text-white font-black text-lg sm:text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] select-none inline-block"
                    style={{ transform: 'rotate(0deg)' }}
                  >
                    {s.label}
                  </motion.span>
                </div>
              );
            })}
            
            {/* Center Hub */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-full shadow-[0_10px_20px_rgba(0,0,0,0.2)] z-10 border-4 border-slate-900 flex items-center justify-center">
                <div className="w-5 h-5 bg-gradient-to-br from-slate-700 to-slate-900 rounded-full animate-pulse shadow-inner" />
              </div>
            </div>
          </motion.div>

          {/* Pointer */}
          <motion.div 
            animate={pointerControls}
            className="absolute -top-8 left-1/2 -translate-x-1/2 w-12 h-14 z-30 drop-shadow-[0_10px_15px_rgba(0,0,0,0.3)]"
          >
            <div 
              className="w-full h-full bg-gradient-to-b from-red-500 to-red-700 relative" 
              style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }}
            >
              <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white/40 rounded-full blur-[1px]" />
            </div>
          </motion.div>
        </div>
      </div>

      <div className="w-full space-y-6 text-center">
        <AnimatePresence mode="wait">
          {winner !== null ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: -20 }}
              className="flex flex-col items-center justify-center gap-1"
            >
              <div className="flex items-center gap-2 text-emerald-600 font-black text-3xl tracking-tight">
                <Sparkles className="text-amber-500 animate-bounce" />
                +{winner} POINTS!
                <Sparkles className="text-amber-500 animate-bounce" />
              </div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Added to your balance</p>
            </motion.div>
          ) : (
            <div className="h-12" /> // Fixed height spacer
          )}
        </AnimatePresence>

        <Button 
          onClick={handleSpin} 
          disabled={isSpinning || disabled}
          className={`
            w-full max-w-xs h-16 text-xl font-black rounded-2xl shadow-2xl transition-all active:scale-95 uppercase tracking-wider
            ${isSpinning ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 hover:bg-black text-white shadow-slate-900/20'}
          `}
        >
          {isSpinning ? (
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin" />
              SPINNING...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-amber-400" />
              SPIN NOW
            </div>
          )}
        </Button>
      </div>
    </div>
  );
};
