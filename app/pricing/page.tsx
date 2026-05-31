'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Check, ArrowRight, Clock, LogIn } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { grantTrialAccess, hasActiveAccess } from '../supabase';
import type { User } from '@supabase/supabase-js';

const supabase = createClient();

export default function Pricing() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">Loading pricing...</div>}>
      <PricingContent />
    </Suspense>
  );
}

function PricingContent() {
  const [user, setUser] = useState<User | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const getCheckoutUrl = (userId: string) => {
    const base = 'https://contentamplifier.lemonsqueezy.com/checkout/buy/5155307f-61ba-440e-b0cd-80ef5c6bcc33';
    return `${base}?checkout[metadata][user_id]=${encodeURIComponent(userId)}`;
  };

  const handleFreeTrial = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    await grantTrialAccess(user.id);
    window.location.href = '/';
  };

  const handlePaidCheckout = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    const checkoutUrl = getCheckoutUrl(user.id);
    window.open(checkoutUrl, '_blank');
    // Immediate trial until webhook confirms paid status
    await grantTrialAccess(user.id);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Top nav - matches your app style */}
      <nav className="border-b border-white/10 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-violet-500" />
            <h1 className="text-2xl font-bold tracking-tight">ContentAmplifier</h1>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/why-amplify" className="hover:text-violet-400 transition">Why Amplify</Link>
            <Link href="/" className="hover:text-violet-400 transition">Home</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 text-violet-400 text-sm font-medium px-6 py-2 rounded-3xl mb-6">
            <Clock className="w-4 h-4" />
            14-DAY FREE TRIAL — NO CARD REQUIRED
          </div>
          <h1 className="text-6xl font-bold tracking-tighter mb-6">
            Simple pricing.<br />Powerful results.
          </h1>
          <p className="text-xl text-zinc-400 max-w-md mx-auto">
            Repurpose unlimited videos, audio, and text. Cancel anytime.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-zinc-900 rounded-3xl p-1 flex items-center">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-8 py-3 rounded-3xl text-sm font-semibold transition ${
                billingCycle === 'monthly' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-8 py-3 rounded-3xl text-sm font-semibold transition flex items-center gap-2 ${
                billingCycle === 'annual' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Annual
              <span className="bg-emerald-500 text-[10px] px-2 py-px rounded-full text-white font-medium">
                SAVE 15%
              </span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Free Trial Card */}
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 flex flex-col">
            <div className="flex-1">
              <h3 className="text-2xl font-semibold mb-2">14-Day Free Trial</h3>
              <p className="text-5xl font-bold mb-1">$0</p>
              <p className="text-zinc-400 mb-8">for 14 days, then choose monthly or annual</p>
              
              <ul className="space-y-4 mb-12">
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-400 mt-0.5" /> Unlimited generations</li>
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-400 mt-0.5" /> All platforms + smart clips</li>
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-400 mt-0.5" /> Full history & calendar</li>
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-400 mt-0.5" /> Zernio auto-posting</li>
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-400 mt-0.5" /> Burn-in captions & downloads</li>
              </ul>
            </div>
            
            <button
              onClick={handleFreeTrial}
              className="w-full py-4 bg-white text-black rounded-3xl font-semibold text-lg flex items-center justify-center gap-2 hover:bg-zinc-100 transition"
            >
              Start 14-Day Free Trial →
            </button>
            <p className="text-center text-xs text-zinc-500 mt-6">No card required • Cancel anytime</p>
          </div>

          {/* Pro Card */}
          <div className="bg-gradient-to-b from-violet-600 to-fuchsia-600 border border-violet-400 rounded-3xl p-8 relative flex flex-col shadow-2xl scale-[1.03]">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white text-violet-600 text-xs font-bold px-6 py-1 rounded-3xl">
              MOST POPULAR
            </div>
            
            <div className="flex-1">
              <h3 className="text-2xl font-semibold mb-2">Pro</h3>
              <p className="text-5xl font-bold mb-1">
                ${billingCycle === 'monthly' ? '15' : '153'}
                <span className="text-xl font-normal">/{billingCycle}</span>
              </p>
              {billingCycle === 'annual' && (
                <p className="text-emerald-300 text-sm mb-6">Billed annually • Best value</p>
              )}
              <p className="text-emerald-400 text-sm font-medium mb-8">✅ 14-day free trial included on both plans</p>
              
              <ul className="space-y-4 mb-12 text-sm">
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-white mt-0.5" /> Everything in the trial</li>
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-white mt-0.5" /> No limits ever</li>
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-white mt-0.5" /> Priority AI processing</li>
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-white mt-0.5" /> Early access to new features</li>
              </ul>
            </div>
            <button
              onClick={handlePaidCheckout}
              className="w-full py-4 bg-white text-black rounded-3xl font-semibold text-lg flex items-center justify-center gap-2 hover:bg-zinc-100 transition"
            >
              Subscribe {billingCycle === 'monthly' ? 'Monthly' : 'Annually'} — ${billingCycle === 'monthly' ? '15' : '153'} →
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-zinc-500 mt-12">
          Secure checkout powered by Lemon Squeezy • Test mode is on • Cancel or pause anytime
        </p>
      </div>

      {/* Login Required Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-3xl max-w-md w-full mx-4 p-8 text-center">
            <LogIn className="w-12 h-12 mx-auto text-violet-400 mb-4" />
            <h3 className="text-2xl font-semibold mb-2">Sign in to continue</h3>
            <p className="text-zinc-400 mb-8">You need to be logged in to start your free trial or subscribe.</p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowLoginModal(false)}
                className="flex-1 py-4 border border-white/20 rounded-3xl"
              >
                Cancel
              </button>
              <button
                onClick={() => { window.location.href = '/'; setShowLoginModal(false); }}
                className="flex-1 py-4 bg-white text-black rounded-3xl font-semibold"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}