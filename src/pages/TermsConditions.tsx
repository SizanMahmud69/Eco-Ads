import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, ArrowLeft, Gavel } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function TermsConditions() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)} 
          className="mb-6 flex items-center gap-2 text-slate-500 hover:text-emerald-600 transition-colors"
        >
          <ArrowLeft size={18} />
          Back
        </Button>

        <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden">
          <CardHeader className="bg-blue-600 text-white p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
              <FileText size={32} />
            </div>
            <CardTitle className="text-3xl font-black uppercase tracking-tight">Terms & Conditions</CardTitle>
            <p className="text-blue-100 mt-2 font-medium">Last updated: April 18, 2026</p>
          </CardHeader>
          <CardContent className="p-8 prose prose-slate max-w-none">
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8">
              <p className="text-blue-700 text-sm italic">
                By accessing or using Eco Ads, you agree to be bound by these terms. If you do not agree to any part of the terms, then you may not access the service.
              </p>
            </div>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2 border-blue-100 flex items-center gap-2">
                <Gavel className="text-blue-500" size={20} />
                User Conduct & Account Security
              </h2>
              <ul className="list-disc pl-6 text-slate-600 space-y-3">
                <li>You must be at least 18 years old to use this service.</li>
                <li>One person is allowed to have only ONE account. Multiple accounts will lead to permanent bans.</li>
                <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                <li>Any attempt to use VPN, Proxy, or auto-clickers will result in immediate termination of account and forfeiture of points.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2 border-blue-100 flex items-center gap-2">
                <Gavel className="text-blue-500" size={20} />
                Earnings & Points System
              </h2>
              <p className="text-slate-600 mb-4 leading-relaxed">
                Points are virtual currency within Eco Ads and have no value outside the platform. We reserve the right to modify the point value, earning rates, and minimum withdrawal limits at any time.
              </p>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-500">
                <p className="font-bold text-slate-700 mb-1">Notice:</p>
                Points earned through bugs, glitches, or unauthorized system manipulation will be removed.
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2 border-blue-100 flex items-center gap-2">
                <Gavel className="text-blue-500" size={20} />
                Withdrawal Policy
              </h2>
              <ul className="list-disc pl-6 text-slate-600 space-y-3">
                <li>Withdrawal requests are processed within 24-72 business hours.</li>
                <li>Admin verification is mandatory for all withdrawal requests.</li>
                <li>Providing incorrect payment details (bKash/Nagad/Rocket) is the user's responsibility.</li>
                <li>We reserve the right to hold any withdrawal if fraudulent activity is suspected.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2 border-blue-100 flex items-center gap-2">
                <Gavel className="text-blue-500" size={20} />
                Referral Program
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Our referral program rewards users for bringing new active members. "Self-referring" by creating multiple accounts is strictly prohibited. Referral bonuses are granted only when the referred user reaches the specified milestone (e.g., 1000 points).
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2 border-blue-100 flex items-center gap-2">
                <Gavel className="text-blue-500" size={20} />
                Termination of Service
              </h2>
              <p className="text-slate-600 leading-relaxed">
                We may terminate or suspend access to our service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2 border-blue-100 flex items-center gap-2">
                <Gavel className="text-blue-500" size={20} />
                Limitation of Liability
              </h2>
              <p className="text-slate-600 leading-relaxed italic">
                Eco Ads shall not be liable for any direct, indirect, incidental, or consequential damages resulting from the use or the inability to use the service or for cost of procurement of substitute goods and services.
              </p>
            </section>

            <div className="mt-12 pt-8 border-t border-slate-100 text-center">
              <p className="text-slate-400 text-sm">© 2026 Eco Ads Team. All rights reserved.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
