import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { AdUnit } from '@/components/AdUnit';
import { useGameSettings } from '@/hooks/useGameSettings';

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const { settings } = useGameSettings();

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

        <AdUnit code={settings.ad_banner_728x90} className="mb-8" />

        <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden">
          <CardHeader className="bg-emerald-600 text-white p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
              <Shield size={32} />
            </div>
            <CardTitle className="text-3xl font-black uppercase tracking-tight">Privacy Policy</CardTitle>
            <p className="text-emerald-100 mt-2 font-medium">Last updated: April 18, 2026</p>
          </CardHeader>
          <CardContent className="p-8 prose prose-slate max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2 border-emerald-100 flex items-center gap-2">
                <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
                Introduction
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Welcome to Eco Ads. Your privacy is critically important to us. This Privacy Policy describes how we collect, use, process, and disclose your information, including personal information, in conjunction with your access to and use of our application.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2 border-emerald-100 flex items-center gap-2">
                <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
                Information We Collect
              </h2>
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h3 className="font-bold text-slate-700 mb-2">Account Information</h3>
                  <p className="text-sm text-slate-600">When you register, we collect your email address, username, and authentication identifier (via Google or Email). This is used strictly for account management and security.</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h3 className="font-bold text-slate-700 mb-2">Usage Data</h3>
                  <p className="text-sm text-slate-600">We track your points, task completion, game plays, and referral activities to ensure the ecosystem functions correctly and rewards are granted accurately.</p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2 border-emerald-100 flex items-center gap-2">
                <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
                How We Use Your Information
              </h2>
              <ul className="list-disc pl-6 text-slate-600 space-y-2">
                <li>To provide, maintain, and improve our services.</li>
                <li>To process rewards and withdrawal requests.</li>
                <li>To prevent fraud, abuse, and unauthorized access.</li>
                <li>To communicate with you regarding your account and updates.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2 border-emerald-100 flex items-center gap-2">
                <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
                Data Security
              </h2>
              <p className="text-slate-600 leading-relaxed">
                We implement industry-standard security measures to protect your data. Your information is stored on secure servers and access is limited to authorized personnel only. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2 border-emerald-100 flex items-center gap-2">
                <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
                Cookies and Tracking
              </h2>
              <p className="text-slate-600 leading-relaxed">
                We use authentication cookies to keep you logged in. These are essential for the operation of the application. We may also use local storage to store preferences and improve load times.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2 border-emerald-100 flex items-center gap-2">
                <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
                Your Rights
              </h2>
              <p className="text-slate-600 leading-relaxed">
                You have the right to access, correct, or delete your personal information. If you wish to delete your account or have any questions about your data, please contact us through the official support channels.
              </p>
            </section>

            <div className="mt-12 pt-8 border-t border-slate-100 text-center space-y-8">
              <AdUnit code={settings.ad_native_bottom} />
              <p className="text-slate-400 text-sm">© 2026 Eco Ads Team. All rights reserved.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
