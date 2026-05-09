'use client';

import { useState, useEffect } from 'react';
import { Sparkles, LogOut } from 'lucide-react';
import { supabase } from '../supabase';

export default function Pricing() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user));
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <nav className="border-b border-white/10 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-violet-500" />
            <h1 className="text-2xl font-bold tracking-tight">ContentAmplifier</h1>
          </div>

          <div className="flex items-center gap-6">
            <button onClick={() => window.location.href = '/'} className="text-sm hover:text-violet-400 transition">
              Home
            </button>
            {user && (
              <button onClick={handleSignOut} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition">
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold tracking-tighter mb-6">Simple, Transparent Pricing</h1>
          <p className="text-xl text-zinc-400">Choose the plan that fits your needs</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Free Tier */}
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8">
            <h3 className="text-2xl font-semibold mb-2">Free</h3>
            <p className="text-4xl font-bold mb-6">$0<span className="text-sm font-normal text-zinc-400">/month</span></p>
            <ul className="space-y-4 mb-10 text-sm">
              <li>10 generations per month</li>
              <li>Basic platforms</li>
              <li>Good for testing</li>
            </ul>
            <button className="w-full py-4 border border-white/30 rounded-2xl font-semibold">Get Started Free</button>
          </div>

          {/* Pro Tier */}
          <div className="bg-gradient-to-b from-violet-600 to-fuchsia-600 border border-violet-400 rounded-3xl p-8 relative scale-105 shadow-2xl">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-violet-500 text-white text-xs px-6 py-1 rounded-full font-medium">MOST POPULAR</div>
            <h3 className="text-2xl font-semibold mb-2">Pro</h3>
            <p className="text-4xl font-bold mb-6">$13<span className="text-sm font-normal">/month</span></p>
            <ul className="space-y-4 mb-10 text-sm">
              <li>Unlimited generations</li>
              <li>All platforms</li>
              <li>Full history storage</li>
              <li>Priority support</li>
            </ul>
            <button className="w-full py-4 bg-white text-black rounded-2xl font-semibold hover:bg-zinc-100">Upgrade to Pro</button>
          </div>
        </div>

        <p className="text-center text-sm text-zinc-500 mt-12">Cancel anytime. No long-term contracts.</p>
      </div>
    </div>
  );
}