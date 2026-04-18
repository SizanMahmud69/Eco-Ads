import * as React from 'react';
import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface ScratchCardProps {
  onComplete: (points: number) => void;
  disabled?: boolean;
  minPoints?: number;
  maxPoints?: number;
}

export const ScratchCard: React.FC<ScratchCardProps> = ({ onComplete, disabled, minPoints = 5, maxPoints = 50 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScratched, setIsScratched] = useState(false);
  const [points] = useState(() => Math.floor(Math.random() * (maxPoints - minPoints + 1)) + minPoints);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill with gray
    ctx.fillStyle = '#C0C0C0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add watermark pattern
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.font = '10px sans-serif';
    const text = 'Eco Ads 🌿';
    const spacingX = 60;
    const spacingY = 30;
    
    for (let y = 0; y < canvas.height; y += spacingY) {
      for (let x = 0; x < canvas.width; x += spacingX) {
        ctx.save();
        ctx.translate(x + (y % (spacingY * 2) ? 30 : 0), y);
        ctx.rotate(-Math.PI / 6);
        ctx.fillText(text, 0, 0);
        ctx.restore();
      }
    }

    // Add some texture
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let i = 0; i < 100; i++) {
      ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
    }

    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#808080';
    ctx.textAlign = 'center';
    ctx.fillText('SCRATCH HERE', canvas.width / 2, canvas.height / 2 + 7);
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const scratch = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas || isScratched) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();

    // Check percentage
    checkScratchPercentage();
  };

  const checkScratchPercentage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let transparentPixels = 0;

    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] === 0) transparentPixels++;
    }

    const percentage = (transparentPixels / (canvas.width * canvas.height)) * 100;
    if (percentage > 50 && !isScratched) {
      setIsScratched(true);
      onComplete(points);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    setIsDrawing(true);
    const pos = getPos(e);
    scratch(pos.x, pos.y);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || disabled) return;
    const pos = getPos(e);
    scratch(pos.x, pos.y);
  };

  const handleMouseUp = () => setIsDrawing(false);

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-2xl shadow-xl">
      <div className="relative w-64 h-40 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border-2 border-dashed border-slate-300">
        <div className="text-center">
          <p className="text-sm text-slate-500 font-medium">You Won</p>
          <p className="text-4xl font-black text-primary">{points} Points</p>
        </div>
        
        <canvas
          ref={canvasRef}
          width={256}
          height={160}
          className="absolute inset-0 cursor-crosshair touch-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={(e) => {
            if (disabled) return;
            setIsDrawing(true);
            const pos = getPos(e);
            scratch(pos.x, pos.y);
          }}
          onTouchMove={(e) => {
            if (!isDrawing || disabled) return;
            const pos = getPos(e);
            scratch(pos.x, pos.y);
          }}
          onTouchEnd={handleMouseUp}
        />
      </div>
      
      {isScratched && (
        <p className="text-green-600 font-bold animate-bounce">
          Congratulations! Points added to your wallet.
        </p>
      )}
      
      {disabled && !isScratched && (
        <p className="text-red-500 text-sm">Cooldown active. Try again later.</p>
      )}
    </div>
  );
};
