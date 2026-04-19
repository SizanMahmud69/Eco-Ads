import React, { useEffect, useRef } from 'react';

interface AdUnitProps {
  code: string | undefined;
  className?: string;
  hideLabel?: boolean;
  minimal?: boolean;
}

export const AdUnit: React.FC<AdUnitProps> = ({ code, className = "", hideLabel = false, minimal = false }) => {
  const adRef = useRef<HTMLDivElement>(null);
  const isFixedAd = code?.includes('at.effect') || code?.includes('socbar') || code?.includes('popunder');

  useEffect(() => {
    if (!code || !adRef.current) return;

    // Clear previous ad
    adRef.current.innerHTML = '';

    try {
      // Use range to properly parse and execute scripts in the HTML string
      const range = document.createRange();
      range.setStart(adRef.current, 0);
      const fragment = range.createContextualFragment(code);
      adRef.current.appendChild(fragment);
    } catch (err) {
      console.error('Error rendering ad unit:', err);
      // Fallback to basic innerHTML if range fails
      adRef.current.innerHTML = code;
    }
  }, [code]);

  if (!code) return null;

  // If it's a background or overlay ad (like Social Bar or Popunder), render it invisible
  if (isFixedAd) {
    return <div ref={adRef} className="hidden" aria-hidden="true" />;
  }

  return (
    <div className={`flex flex-col items-center w-full mx-auto ${minimal ? '' : 'gap-1.5'} ${className}`}>
      {!hideLabel && (
        <div className="flex items-center gap-2 w-full px-4 mb-1">
          <div className="h-[1px] flex-1 bg-slate-100" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-300">Sponsored Ad</span>
          <div className="h-[1px] flex-1 bg-slate-100" />
        </div>
      )}
      <div 
        ref={adRef} 
        className={`ad-container w-full flex justify-center items-center overflow-hidden ${minimal ? '' : 'bg-slate-50/50 rounded-2xl border border-slate-100/50 p-2 min-h-[50px]'}`}
        style={{ maxWidth: '100%' }}
      />
    </div>
  );
};
