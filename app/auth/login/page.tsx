'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Sparkles, Clock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/';
  const messageParam = searchParams.get('message');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (messageParam === 'trial_expired') {
      setMessage({ type: 'error', text: 'Your 14-day trial has ended. Please upgrade or start a new trial on the pricing page.' });
    }
  }, [messageParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: '✅ Logged in successfully! Redirecting to dashboard...' });
      router.replace(redirectTo);
      router.refresh();
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">
      {/* Top nav */}
      <nav className="border-b border-white/10 bg-zinc-950/90 backdrop-blur-md fixed top-0 left-0 right-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-violet-500" />
            <h1 className="text-2xl font-bold tracking-tight">ContentAmplifier</h1>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/why-amplify" className="hover:text-violet-400 transition">Why Amplify</Link>
            <Link href="/pricing" className="hover:text-violet-400 transition">Pricing</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-md w-full px-6 mt-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 text-violet-400 text-sm font-medium px-6 py-2 rounded-3xl mb-6">
            <Clock className="w-4 h-4" />
            14-DAY FREE TRIAL — NO CARD REQUIRED
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Welcome back
          </h1>
          <p className="text-zinc-400">
            Sign in to access ContentAmplifier Pro
          </p>
          <p className="text-sm text-zinc-400 mt-6 max-w-xs mx-auto">
            New here? Click “Start 14-Day Free Trial” on the pricing page to create your account instantly and get full access.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              required
              className="w-full bg-zinc-900 border border-white/10 rounded-3xl px-6 py-4 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full bg-zinc-900 border border-white/10 rounded-3xl px-6 py-4 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-violet-600 hover:bg-violet-500 transition rounded-3xl font-semibold text-lg disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {message && (
          <p
            className={`mt-6 text-center text-sm ${
              message.type === 'success' ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {message.text}
          </p>
        )}

        <p className="text-center text-xs text-zinc-500 mt-12">
          By signing in you agree to our{' '}
          <Link href="/terms" className="underline hover:text-violet-400">
            Terms
          </Link>
        </p>
        <div className="text-center mt-8">
          <Link
            href="/pricing"
            className="text-violet-400 hover:text-violet-300 text-sm"
          >
            ← Back to Pricing
          </Link>
        </div>
      </div>
    </div>
  );
}