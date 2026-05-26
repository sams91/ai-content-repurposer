'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Check, ArrowRight, Clock, UserPlus, X } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [showTrialSignup, setShowTrialSignup] = useState(false);
  const [trialEmail, setTrialEmail] = useState('');
  const [trialPassword, setTrialPassword] = useState('');
  const [trialLoading, setTrialLoading] = useState(false);
  const [trialMessage, setTrialMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dismissedBanner, setDismissedBanner] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const messageParam = searchParams.get('message');
  const CHECKOUT_URL = 'https://contentamplifier.lemonsqueezy.com/checkout/buy/5155307f-61ba-440e-b0cd-80ef5c6bcc33';

  // Show expired banner unless dismissed
  const isTrialExpired = messageParam === 'trial_expired' && !dismissedBanner;

  const handleStartFreeTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trialEmail || !trialPassword) return;

    setTrialLoading(true);
    setTrialMessage(null);

    const supabase = createClient();

    // Sign up new user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: trialEmail,
      password: trialPassword,
      options: {
        emailRedirectTo: `${window.location.origin}`,
      },
    });

    if (signUpError) {
      setTrialMessage({ type: 'error', text: signUpError.message });
      setTrialLoading(false);
      return;
    }

    // Grant 14-day trial
    if (signUpData.user) {
      await (await import('@/app/supabase')).grantTrialAccess(signUpData.user.id);
      setTrialMessage({ type: 'success', text: '✅ 14-day trial started! Redirecting to login...' });
      setTimeout(() => {
        router.push('/auth/login');
      }, 1200);
    }

    setTrialLoading(false);
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
            <Link href="/auth/login" className="hover:text-violet-400 transition">Login</Link>
          </div>
        </div>
      </nav>

      {/* TRIAL EXPIRED BANNER */}
      {isTrialExpired && (
        <div className="bg-red-500/10 border-b border-red-500/30 py-4">
          <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-red-400" />
              <div>
                <p className="font-semibold text-red-400">Your 14-day free trial has ended</p>
                <p className="text-sm text-red-300">Upgrade to Pro now to keep full access.</p>
              </div>
            </div>
            <button
              onClick={() => setDismissedBanner(true)}
              className="text-red-400 hover:text-red-300 transition flex items-center gap-1 text-sm"
            >
              <X className="w-4 h-4" /> Dismiss
            </button>
          </div>
        </div>
      )}

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
          {/* Free Trial Card — HIDDEN after first trial expires */}
          {!isTrialExpired && (
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

                {!showTrialSignup ? (
                  <button
                    onClick={() => setShowTrialSignup(true)}
                    className="w-full py-4 bg-white text-black rounded-3xl font-semibold text-lg flex items-center justify-center gap-2 hover:bg-zinc-100 transition"
                  >
                    <UserPlus className="w-5 h-5" />
                    Start 14-Day Free Trial →
                  </button>
                ) : (
                  <form onSubmit={handleStartFreeTrial} className="space-y-4">
                    <input
                      type="email"
                      value={trialEmail}
                      onChange={(e) => setTrialEmail(e.target.value)}
                      placeholder="you@email.com"
                      required
                      className="w-full bg-zinc-950 border border-white/10 rounded-3xl px-6 py-4 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                    />
                    <input
                      type="password"
                      value={trialPassword}
                      onChange={(e) => setTrialPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full bg-zinc-950 border border-white/10 rounded-3xl px-6 py-4 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                    />
                    <button
                      type="submit"
                      disabled={trialLoading}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-3xl font-semibold text-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                    >
                      {trialLoading ? (
                        <>
                          <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                          Creating account...
                        </>
                      ) : (
                        'Create Account & Start Trial'
                      )}
                    </button>
                    {trialMessage && (
                      <p className={`text-center text-sm ${trialMessage.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {trialMessage.text}
                      </p>
                    )}
                  </form>
                )}
              </div>
              
              <p className="text-center text-xs text-zinc-500 mt-6">No card required • Cancel anytime</p>
            </div>
          )}

          {/* Expired Trial Card — shown only after first trial ends */}
          {isTrialExpired && (
            <div className="bg-zinc-900 border border-red-400/30 rounded-3xl p-8 flex flex-col">
              <div className="flex-1">
                <h3 className="text-2xl font-semibold mb-2 text-red-400">Trial Expired</h3>
                <p className="text-5xl font-bold mb-1">$0</p>
                <p className="text-zinc-400 mb-8">Your free trial has ended</p>
                
                <ul className="space-y-4 mb-12">
                  <li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-400 mt-0.5" /> Unlimited generations</li>
                  <li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-400 mt-0.5" /> All platforms + smart clips</li>
                  <li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-400 mt-0.5" /> Full history & calendar</li>
                  <li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-400 mt-0.5" /> Zernio auto-posting</li>
                  <li className="flex items-start gap-3"><Check className="w-5 h-5 text-emerald-400 mt-0.5" /> Burn-in captions & downloads</li>
                </ul>

                <div className="w-full py-4 bg-zinc-800 text-zinc-400 rounded-3xl font-semibold text-lg flex items-center justify-center gap-2">
                  Trial period completed
                </div>
              </div>
              
              <p className="text-center text-xs text-zinc-500 mt-6">Upgrade to Pro below to continue</p>
            </div>
          )}

          {/* Pro Card — always visible and active */}
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
              <p className="text-emerald-400 text-sm font-medium mb-8">✅ Full access forever</p>
              
              <ul className="space-y-4 mb-12 text-sm">
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-white mt-0.5" /> Everything in the trial</li>
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-white mt-0.5" /> No limits ever</li>
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-white mt-0.5" /> Priority AI processing</li>
                <li className="flex items-start gap-3"><Check className="w-5 h-5 text-white mt-0.5" /> Early access to new features</li>
              </ul>
            </div>

            <button
              onClick={() => window.open(CHECKOUT_URL, '_blank')}
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
    </div>
  );
}