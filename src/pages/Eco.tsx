import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Disc, Eraser, ListChecks, ArrowRight, Pickaxe, Calculator, Brain, ShieldCheck, Palette, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Eco() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h1 className="text-2xl font-bold">Eco Activities</h1>
        <p className="text-slate-500">Choose an activity to start earning points.</p>
      </header>

      <div className="grid gap-4">
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
        />
      </div>
    </div>
  );
}

const ActivityLink = ({ to, icon, title, description }: any) => (
  <Link to={to}>
    <Card className="hover:border-emerald-500/50 transition-all active:scale-[0.98]">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-bold">{title}</h3>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        <ArrowRight size={18} className="text-slate-300" />
      </CardContent>
    </Card>
  </Link>
);
