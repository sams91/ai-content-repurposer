'use client';

import { useState } from 'react';
import { supabase } from '@/app/supabase';
import Link from 'next/link';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        setMessage({ type: 'success', text: '✅ Logged in successfully! Redirecting...' });
        // Hard reload guarantees middleware sees the new session cookie
        setTimeout(() => {
          window.location.href = '/';
        }, 300);
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}`,
        },
      });

      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        setMessage({ type: 'success', text: '✅ Account created! Check your email to confirm (or sign in if email confirmation is disabled).' });
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">
      <div className="max-w-md w-full px-6">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-zinc-400">
            {isLogin
              ? 'Sign in to access ContentAmplifier Pro'
              : 'Sign up for ContentAmplifier Pro'}
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
            {loading
              ? 'Processing...'
              : isLogin
                ? 'Sign In'
                : 'Create Account'}
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

        <div className="flex justify-center gap-2 mt-8">
          <button
            onClick={() => {
              setIsLogin(true);
              setMessage(null);
            }}
            className={`px-6 py-2 rounded-3xl text-sm font-medium transition ${
              isLogin
                ? 'bg-white text-zinc-950'
                : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setIsLogin(false);
              setMessage(null);
            }}
            className={`px-6 py-2 rounded-3xl text-sm font-medium transition ${
              !isLogin
                ? 'bg-white text-zinc-950'
                : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        <p className="text-center text-xs text-zinc-500 mt-12">
          By signing in you agree to our{' '}
          <Link href="/pricing" className="underline">
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