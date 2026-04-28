import React, { useEffect, useRef, useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

interface AdUnitProps {
  code: string | undefined;
  className?: string;
  hideLabel?: boolean;
  minimal?: boolean;
  overlay?: boolean;
  stickyBottom?: boolean;
}

export const AdUnit: React.FC<AdUnitProps> = ({ 
  code, 
  className = "", 
  hideLabel = false, 
  minimal = false,
  overlay = false,
  stickyBottom = false
}) => {
  const adRef = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/:/g, '-'); // Generate unique ID for this instance
  const [isLoading, setIsLoading] = React.useState(true);
  const [isVisible, setIsVisible] = React.useState(true);
  const [showCloseButton, setShowCloseButton] = React.useState(false);
  const location = useLocation();
  const { isAdmin } = useAuth();
  const isAdminPanel = location.pathname.startsWith('/admin');
  
  // Interval to show sticky ad if it was closed (every 45-50s)
  useEffect(() => {
    if (!stickyBottom || !code || isAdmin) return;

    const showAd = () => {
      setIsVisible(true);
    };

    const intervalId = setInterval(showAd, 45000 + Math.random() * 5000); // 45-50 seconds randomly
    
    return () => clearInterval(intervalId);
  }, [stickyBottom, code, isAdmin]);

  // Close button timer for sticky ad
  useEffect(() => {
    if (stickyBottom && isVisible && !isAdmin) {
      setShowCloseButton(false);
      const timer = setTimeout(() => {
        setShowCloseButton(true);
      }, 10000); // 10 seconds
      
      return () => clearTimeout(timer);
    }
  }, [stickyBottom, isVisible, isAdmin]);
  
  const isVideoAd = typeof code === 'string' && (code.includes('instream') || code.includes('video'));
  
  const isFixedAd = typeof code === 'string' && (
    code.includes('at.effect') || 
    code.includes('socbar') || 
    code.includes('popunder') || 
    code.includes('clickadilla') ||
    isVideoAd ||
    overlay
  );

  useEffect(() => {
    if (!code || !isVisible || isAdminPanel || isAdmin) return;
    
    // Small delay to ensure DOM is ready especially inside AnimatePresence
    const timer = setTimeout(() => {
      if (!adRef.current) return;
      setIsLoading(false);

      // Clear previous ad
      adRef.current.innerHTML = '';

      // If it's a fixed ad (popunder, social bar), we render it safely
      if (isFixedAd) {
        try {
          // Robust injection using contextual fragment for better cross-network support
          const range = document.createRange();
          range.setStart(adRef.current, 0);
          const fragment = range.createContextualFragment(code);
          adRef.current.appendChild(fragment);
          
          // Re-execute scripts manually because fragments don't auto-execute <script> tags when appended to DOM
          const scripts = adRef.current.querySelectorAll('script');
          scripts.forEach(oldScript => {
            const newScript = document.createElement('script');
            // Copy all attributes
            Array.from(oldScript.attributes).forEach(attr => {
              newScript.setAttribute(attr.name, attr.value);
            });
            // Copy content
            newScript.innerHTML = oldScript.innerHTML;
            if (oldScript.src) {
              newScript.src = oldScript.src;
              newScript.async = true;
            }
            
            // Mark it so we can clean it up
            newScript.setAttribute('data-ad-uid', uid);
            
            // Standard ads often prefer body or head
            // For video/social bars, we use a more balanced approach
            if (oldScript.src) {
              // Network scripts usually need to be global
              document.head.appendChild(newScript);
            } else if (isVideoAd || code.includes('socbar')) {
              // Initialization scripts for video/bars usually need to stay near the container
              adRef.current?.appendChild(newScript);
            } else {
              document.body.appendChild(newScript);
            }
          });
        } catch (err) {
          console.warn("Fixed ad injection fallback:", err);
          if (adRef.current) {
            adRef.current.innerHTML = code;
          }
        }
        return;
      }

      // Create a truly isolated container for this specific ad
      const iframe = document.createElement('iframe');
      iframe.id = `ad-frame-${uid}`;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.style.overflow = 'hidden';
      iframe.style.display = 'block';
      iframe.scrolling = 'no';
      
      adRef.current.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { 
                  margin: 0; 
                  padding: 0; 
                  display: flex; 
                  flex-direction: column;
                  justify-content: center; 
                  align-items: center; 
                  min-height: auto; 
                  overflow: hidden; 
                  background: transparent;
                }
                iframe, img, ins, div { max-width: 100% !important; height: auto !important; margin: 0 auto !important; position: relative !important; top: 0 !important; }
                #ad-wrapper { width: 100%; display: flex; justify-content: center; align-items: center; min-height: 0; }
              </style>
            </head>
            <body>
              <div id="ad-wrapper">
                ${code}
              </div>
              <script>
                // Report size back to parent with unique ID
                function reportSize() {
                  const body = document.body;
                  const html = document.documentElement;
                  
                  // Try to get the actual content dimensions
                  const width = Math.max(body.scrollWidth, body.offsetWidth, html.clientWidth, html.scrollWidth, html.offsetWidth);
                  const height = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);
                  
                  if (height > 0) {
                    window.parent.postMessage({ 
                      type: 'AD_RESIZE', 
                      height: height, 
                      width: width,
                      id: 'ad-frame-${uid}' 
                    }, '*');
                  }
                }
                window.onload = reportSize;
                window.onresize = reportSize;
                
                // Poll for a bit as some ads load late
                let attempts = 0;
                const poll = setInterval(() => {
                  reportSize();
                  if (++attempts > 20) clearInterval(poll);
                }, 1000);
              </script>
            </body>
          </html>
        `);
        iframeDoc.close();
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      // Aggressive cleanup for fixed ads if they added global elements
      if (isFixedAd) {
        // Remove the specific scripts we injected to head
        const injectedScripts = document.querySelectorAll(`script[data-ad-uid="${uid}"]`);
        injectedScripts.forEach(s => s.remove());
        
        // Try to find and remove elements created by common ad networks
        const adElements = document.querySelectorAll(`[id*="${uid}"], [class*="${uid}"]`);
        adElements.forEach(el => el.remove());
      }
    };
  }, [code, uid, isFixedAd, isVisible, isAdminPanel, isAdmin]);

  // Handle iframe resize messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (data && data.type === 'AD_RESIZE' && data.id === `ad-frame-${uid}` && adRef.current) {
        const iframe = adRef.current.querySelector('iframe');
        if (iframe) {
          if (data.height) iframe.style.height = data.height + 'px';
          if (data.width && !isVideoAd) iframe.style.width = data.width + 'px';
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [uid, isVideoAd]);

  if (!code || !isVisible || isAdminPanel || isAdmin) {
    // Aggressively try to hide any global ad elements if in admin panel
    if (isAdminPanel || isAdmin) {
      const socialBars = document.querySelectorAll('[id^="at-social-bar"], .at-social-bar, [class*="social-bar"]');
      socialBars.forEach(el => (el as HTMLElement).style.display = 'none');
    }
    return null;
  }

  // Background/overlay types (scripts that handle their own UI)
  if (isFixedAd && !stickyBottom) {
    return (
      <div 
        ref={adRef} 
        className={overlay ? "fixed inset-0 pointer-events-none z-[9999]" : "hidden"} 
        aria-hidden="true" 
      />
    );
  }

  // Floating Bottom Overlay with entrance/exit
  if (stickyBottom) {
    return (
      <AnimatePresence>
        {isVisible && code && (
          <motion.div
            key="sticky-ad-overlay"
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 200, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 100, delay: 0.8 }}
            className="fixed bottom-24 left-0 right-0 z-[120] flex justify-center pointer-events-none px-4"
          >
            <div className="relative pointer-events-auto group max-w-full">
              <AnimatePresence>
                {showCloseButton && (
                  <>
                    <motion.button 
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsVisible(false);
                      }}
                      className="absolute -top-3 -right-3 bg-red-600 text-white rounded-full p-1.5 shadow-2xl hover:bg-red-700 active:scale-95 transition-all z-[130] border-2 border-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 backdrop-blur-md"
                      title="Close Ad"
                    >
                      <X size={14} strokeWidth={4} />
                    </motion.button>
                  </>
                )}
              </AnimatePresence>
              
              <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/20 dark:border-white/5 mx-auto w-fit max-w-[95vw] transition-all duration-300">
                <div 
                  ref={adRef} 
                  className={`flex justify-center transition-all duration-300 ad-content-isolated ${isVideoAd ? 'w-full min-h-[180px]' : 'w-fit h-fit min-h-[50px] min-w-[50px]'}`}
                />
              </div>
              
              {/* Permanent close hint for touch devices or if not hovering */}
              {showCloseButton && (
                <button 
                  onClick={() => setIsVisible(false)}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-900/80 backdrop-blur-md flex items-center justify-center sm:group-hover:hidden transition-opacity shadow-xl border border-white/20 z-[125]"
                >
                  <X size={12} className="text-white" strokeWidth={3} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <div className={`flex flex-col items-center w-full mx-auto animate-in fade-in zoom-in-95 duration-700 ${minimal ? '' : 'gap-2'} ${className}`}>
      {!hideLabel && (
        <div className="flex items-center gap-3 w-full px-4 mb-1 opacity-60 hover:opacity-100 transition-opacity">
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent" />
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40 animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">Sponsored Ad</span>
          </div>
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent" />
        </div>
      )}
      <div 
        className={`ad-container w-full flex justify-center items-center overflow-hidden transition-all duration-500 ${minimal ? '' : 'bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-[1.2rem] md:rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-3 hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700 transition-all'} relative`}
        style={{ maxWidth: '100%' }}
      >
        {isLoading && !minimal && !isFixedAd && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-50/10 backdrop-blur-[2px] z-10">
            <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-emerald-500 animate-spin" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading Ad...</span>
          </div>
        )}
        {/* Isolated div for ad script/iframe injection - React will never touch its contents after initial mount because it lacks children */}
        <div ref={adRef} className="w-full flex justify-center ad-content-isolated" />
      </div>
    </div>
  );
}

