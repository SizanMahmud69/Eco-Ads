import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Disc, Eraser, ListChecks, ArrowRight, Pickaxe, Calculator, Brain, ShieldCheck, Palette, QrCode, Zap } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

export default function Eco() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h1 className="text-2xl font-bold">Eco Activities</h1>
        <p className="text-slate-500">Choose an activity to start earning points.</p>
      </header>

      <div className="grid gap-4">
        <ActivityLink 
          to="/eco-scanner" 
          icon={<QrCode className="text-emerald-500" />} 
          title="Eco Scanner" 
          description="Scan and identify ecological items to earn points."
          isPremium
        />
        <ActivityLink 
          to="/spin" 
          icon={<Disc className="text-blue-500" />} 
          title="Spin & Win" 
          description="Try your luck and win up to 50 points every 24 hours."
        />
        <ActivityLink 
          to="/scratch" 
          icon={<Eraser className="text-purple-500" />} 
          title="Scratch Card" 
          description="Scratch the card to reveal your prize every hour."
        />
        <ActivityLink 
          to="/mining" 
          icon={<Pickaxe className="text-emerald-500" />} 
          title="Eco Mining" 
          description="Start mining and earn points passively over time."
          isPremium
        />
        <ActivityLink 
          to="/tasks" 
          icon={<ListChecks className="text-green-500" />} 
          title="Daily Tasks" 
          description="Complete simple tasks to earn guaranteed points."
        />
        <ActivityLink 
          to="/math-quiz" 
          icon={<Calculator className="text-orange-500" />} 
          title="Math Challenge" 
          description="Solve math problems to earn points for every correct answer."
          isPremium
        />
        <ActivityLink 
          to="/word-guess" 
          icon={<Brain className="text-pink-500" />} 
          title="Word Scramble" 
          description="Unscramble the letters to find the correct word."
        />
        <ActivityLink 
          to="/captcha" 
          icon={<ShieldCheck className="text-cyan-500" />} 
          title="Secure Captcha" 
          description="Solve simple captchas to earn quick points."
          isPremium
        />
        <ActivityLink 
          to="/color-match" 
          icon={<Palette className="text-pink-500" />} 
          title="Color Match" 
          description="Match the colors correctly to test your vision and earn points."
          isPremium
        />
      </div>
    </div>
  );
}

const ActivityLink = ({ to, icon, title, description, isPremium }: any) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    if (isPremium && !user?.is_premium) {
      e.preventDefault();
      toast.info('This is a Premium game. Please upgrade to play!', {
        icon: '💎'
      });
      navigate('/upgrade');
    }
  };

  return (
    <Link to={to} onClick={handleClick}>
      <Card className="hover:border-emerald-500/50 transition-all active:scale-[0.98] relative">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center">
            {icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold">{title}</h3>
              {isPremium && (
                <div className="flex items-center gap-1 bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full text-[8px] font-black border border-amber-500/20">
                  <Zap size={8} className="fill-amber-500" />
                  PREMIUM
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
          <ArrowRight size={18} className="text-slate-300" />
        </CardContent>
      </Card>
    </Link>
  );
};
