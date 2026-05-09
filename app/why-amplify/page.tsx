'use client';

import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, LogOut } from 'lucide-react';
import { supabase } from '../supabase';

export default function WhyAmplify() {
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
        <h1 className="text-6xl font-bold tracking-tighter mb-8 text-center">Why Amplify Your Content?</h1>

        <div className="prose prose-invert max-w-none">
          <p className="text-xl text-zinc-400 text-center mb-16">
            In today's digital world, creating great content once and using it everywhere is the smartest way to grow.
          </p>

          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-semibold mb-4">What Does "Amplify" Mean?</h3>
              <p className="text-zinc-400">
                Amplify means taking one piece of content (a blog post, video script, notes, etc.) and automatically turning it into perfectly optimized versions for LinkedIn, X, Instagram, YouTube, Rumble, and more.
              </p>
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-4">What is SEO?</h3>
              <p className="text-zinc-400">
                SEO (Search Engine Optimization) is the practice of making your content easier for people to find on Google, YouTube, and other search engines. Our AI helps make your content more discoverable.
              </p>
            </div>
          </div>

          <div className="mt-16">
            <h3 className="text-2xl font-semibold mb-6 text-center">The Benefits</h3>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
                <p className="font-medium mb-3">Save Time</p>
                <p className="text-sm text-zinc-400">Create once, post everywhere — no need to rewrite for each platform.</p>
              </div>
              <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
                <p className="font-medium mb-3">Reach More People</p>
                <p className="text-sm text-zinc-400">Each platform has different audiences. Optimized content gets better engagement.</p>
              </div>
              <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
                <p className="font-medium mb-3">Grow Faster</p>
                <p className="text-sm text-zinc-400">Consistent presence across platforms builds your brand quicker.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}