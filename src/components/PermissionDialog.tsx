import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PermissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAllow: () => void;
  title: string;
  description: string;
  icon?: React.ReactNode;
}

export const PermissionDialog: React.FC<PermissionDialogProps> = ({
  isOpen,
  onClose,
  onAllow,
  title,
  description,
  icon = <Camera size={44} />
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <style>
            {`
              @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@1,600&display=swap');
              .whatsapp-style {
                font-family: 'Crimson Pro', serif;
                font-style: italic;
              }
            `}
          </style>
          
          {/* Backdrop - dark and blurred to match Android overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-[1px] z-[9999]"
          />
          
          {/* Dialog Container */}
          <div className="fixed inset-0 flex items-center justify-center z-[10000] p-6 pointer-events-none">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              className="bg-[#2D3236] w-full max-w-[320px] rounded-[1.2rem] shadow-2xl overflow-hidden pointer-events-auto border border-white/5"
            >
              <div className="p-8 text-center space-y-7">
                {/* Icon - WhatsApp Style Icon Color */}
                <div className="flex justify-center text-[#00D0B5]">
                  {icon}
                </div>

                <div className="space-y-1">
                  <h3 className="text-2xl text-white whatsapp-style leading-snug tracking-tight px-1">
                    {title}
                  </h3>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <Button
                    onClick={onAllow}
                    className="w-full h-14 rounded-xl bg-[#00D0B5] hover:bg-[#00B8A1] text-[#1a1c1e] font-black text-lg tracking-widest transition-all active:scale-95 shadow-md"
                  >
                    ALLOW
                  </Button>
                  <Button
                    onClick={onClose}
                    variant="ghost"
                    className="w-full h-14 rounded-xl bg-transparent hover:bg-white/5 text-[#00D0B5] font-black text-lg tracking-widest transition-all active:scale-95 border-2 border-white/5"
                  >
                    DON'T ALLOW
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
