'use client';

import { useState } from 'react';
import { supabase } from '@/app/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('✅ Magic link sent to your email! Check your inbox.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">
      <div className="max-w-md w-full px-6">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight mb-3">Welcome back</h1>
          <p className="text-zinc-400">Sign in to access ContentAmplifier Pro</p>
        </div>

        <form onSubmit={handleMagicLink} className="space-y-6">
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-violet-600 hover:bg-violet-500 transition rounded-3xl font-semibold text-lg disabled:opacity-50"
          >
            {loading ? 'Sending magic link...' : 'Send Magic Link'}
          </button>
        </form>

        {message && (
          <p className="mt-6 text-center text-sm text-emerald-400">{message}</p>
        )}

        <p className="text-center text-xs text-zinc-500 mt-12">
          By signing in you agree to our{' '}
          <Link href="/pricing" className="underline">Terms</Link>
        </p>

        <div className="text-center mt-8">
          <Link href="/pricing" className="text-violet-400 hover:text-violet-300 text-sm">
            ← Back to Pricing
          </Link>
        </div>
      </div>
    </div>
  );
}