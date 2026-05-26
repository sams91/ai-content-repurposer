'use client';

import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, LogOut, Zap, CheckCircle, Calendar, Send, Shield, Gift, HelpCircle, Mic, Video, FileText, Upload, Type, Play, Music } from 'lucide-react';
import { supabase } from '../supabase';
import Link from 'next/link';

export default function WhyAmplify() {
  const [user, setUser] = useState<any>(null);
  const [showZernioKeyModal, setShowZernioKeyModal] = useState(false);
  const [zernioApiKeyInput, setZernioApiKeyInput] = useState('');
  const [showZernioHelpModal, setShowZernioHelpModal] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user));
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const saveZernioKey = async () => {
    if (!user || !zernioApiKeyInput.trim()) {
      alert('Please enter your Zernio API key');
      return;
    }

    const { error } = await supabase
      .from('user_zernio')
      .upsert({ 
        user_id: user.id, 
        api_key: zernioApiKeyInput.trim() 
      });

    if (error) {
      alert('Error saving key: ' + error.message);
    } else {
      alert('✅ Zernio API key saved successfully! You can now post directly from the app.');
      setShowZernioKeyModal(false);
      setZernioApiKeyInput('');
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Background */}
      <div className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none" 
           style={{ backgroundImage: "url('/space-bg.jpg')" }} />
      <div className="fixed inset-0 bg-black/70 pointer-events-none" />

      <nav className="border-b border-white/10 bg-zinc-950/95 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-violet-400" />
            <h1 className="text-2xl font-bold tracking-tighter">ContentAmplifier</h1>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <button onClick={() => window.location.href = '/'} className="hover:text-violet-400 transition">Home</button>
            <button onClick={() => window.location.href = '/why-amplify'} className="text-violet-400 font-medium">Why Amplify with Zernio</button>
            <button onClick={() => window.location.href = '/pricing'} className="hover:text-violet-400 transition">Pricing</button>
            <button onClick={() => window.location.href = '/auth/login'} className="hover:text-violet-400 transition">Login</button>
            {user && (
              <button onClick={handleSignOut} className="flex items-center gap-2 text-zinc-400 hover:text-white transition">
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-20 relative">
        {/* NEW HERO SECTION WITH YOUR DEMO VIDEO */}
        <div className="grid md:grid-cols-2 gap-16 items-center mb-20">
          <div>
            <div className="inline-flex items-center gap-2 bg-emerald-600/10 text-emerald-400 px-6 py-2 rounded-3xl text-sm font-medium mb-6">
              <Gift className="w-4 h-4" /> First 2 social accounts FREE forever
            </div>
            <h1 className="text-7xl font-bold tracking-tighter leading-none mb-6">
              One piece of content.<br />Infinite reach.
            </h1>
            <p className="text-2xl text-zinc-300 mb-10 max-w-lg">
              Turn any text, video, or audio into perfectly formatted posts for every platform — then post with one click through Zernio.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/pricing"
                className="flex-1 md:flex-none bg-white text-black hover:bg-white/90 transition px-10 py-6 rounded-3xl text-2xl font-semibold flex items-center justify-center gap-3 shadow-2xl shadow-violet-500/30"
              >
                Start 14-Day Free Trial
                <ArrowRight className="w-6 h-6" />
              </Link>
              <Link
                href="/auth/login"
                className="flex-1 md:flex-none border border-white/30 hover:border-white/60 transition px-10 py-6 rounded-3xl text-2xl font-semibold flex items-center justify-center"
              >
                Login
              </Link>
            </div>
          </div>

          {/* Hero Video with fixed overlay position */}
          <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
            <video
              src="/hero-demo.mp4"
              controls
              autoPlay
              muted
              loop
              playsInline
              className="w-full aspect-video object-cover"
            />
            {/* FIXED: Moved to top-right so it never covers controls */}
            <div className="absolute top-6 right-6 bg-black/70 text-white px-5 py-2 rounded-3xl text-sm font-medium flex items-center gap-2 backdrop-blur-md">
              <Play className="w-4 h-4" />
              Watch how it works
            </div>
          </div>
        </div>

        {/* ORIGINAL CONTENT STARTS HERE - EVERYTHING YOU HAD IS PRESERVED */}
        {/* Mode highlights */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <div className="flex items-center gap-4 bg-zinc-900 border border-white/10 rounded-3xl p-6">
            <FileText className="w-10 h-10 text-violet-400" />
            <div>
              <h4 className="font-semibold">Text Mode</h4>
              <p className="text-sm text-zinc-400">
                Type or paste directly in the app, upload or drag &amp; drop → we repurpose it instantly into perfectly optimized posts for 8 different platforms
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-zinc-900 border border-white/10 rounded-3xl p-6">
            <Video className="w-10 h-10 text-violet-400" />
            <div>
              <h4 className="font-semibold">Video Mode</h4>
              <p className="text-sm text-zinc-400">
                Record directly in the app or upload your video → we turn it into Smart Clips with hooks, platform-formatted videos with text, and burned captions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-zinc-900 border border-white/10 rounded-3xl p-6">
            <Mic className="w-10 h-10 text-violet-400" />
            <div>
              <h4 className="font-semibold">Audio Mode</h4>
              <p className="text-sm text-zinc-400">
                Record podcast/voiceover directly in the app or upload your audio → we transform it into show notes, chapters, clips &amp; ready-to-post text
              </p>
            </div>
          </div>
        </div>

        {/* One-Click Posting & Smart Scheduling */}
        <div className="bg-gradient-to-br from-violet-900/20 to-transparent border border-violet-400/20 rounded-3xl p-10 mb-16 text-center">
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-3 bg-violet-600/10 text-violet-400 px-6 py-3 rounded-3xl">
              <Send className="w-5 h-5" />
              <span className="font-semibold">ONE-CLICK POSTING + SMART CALENDAR</span>
            </div>
          </div>
          <h2 className="text-4xl font-bold tracking-tighter mb-4">Post to Every Platform. On Autopilot.</h2>
          <p className="text-xl text-zinc-300 max-w-2xl mx-auto leading-relaxed">
            Imagine creating once — then with a single click inside ContentAmplifier, your perfectly optimized Text, Video, or Audio content is instantly posted to ALL your connected Zernio accounts.<br /><br />
            No tab-switching. No copy-pasting. No guesswork.<br /><br />
            Our built-in Content Calendar + AI scheduling engine lets you plan weeks ahead. It analyzes your past performance, platform peak times, and audience behavior — then automatically posts at the exact moments your content will explode.<br /><br />
            <span className="text-emerald-400 font-medium">This is the unfair advantage top creators use to dominate their niche while they sleep.</span>
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span>Instant cross-posting</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span>AI-optimized timing</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span>Full calendar view</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span>Works for Text • Video • Audio</span>
            </div>
          </div>
        </div>

        {/* 3 Big Feature Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 text-center">
            <Zap className="w-12 h-12 mx-auto mb-6 text-violet-400" />
            <h3 className="text-xl font-semibold mb-3">Instant Cross-Posting</h3>
            <p className="text-zinc-400">
              Your optimized video (platform-formatted), audio, or text + perfect captions, hashtags, and titles are sent together in one click to LinkedIn, TikTok, X, Instagram, YouTube, Rumble, Threads, and more.
            </p>
          </div>

          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-6 text-violet-400" />
            <h3 className="text-xl font-semibold mb-3">Schedule Future Posts</h3>
            <p className="text-zinc-400">
              Plan your entire content calendar inside Zernio. Set it and forget it — we handle the rest. Works for Text, Video, and Audio.
            </p>
          </div>

          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 text-center">
            <Shield className="w-12 h-12 mx-auto mb-6 text-violet-400" />
            <h3 className="text-xl font-semibold mb-3">Secure &amp; Private</h3>
            <p className="text-zinc-400">
              Your API key is stored encrypted in Supabase. Only you control your accounts.
            </p>
          </div>
        </div>

        {/* Supported File Types */}
        <div className="bg-zinc-900 border border-white/10 rounded-3xl p-10 mb-20">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Upload className="w-8 h-8 text-violet-400" />
              <h3 className="text-2xl font-semibold">Supported File Types</h3>
            </div>
            <p className="text-sm text-zinc-400 max-w-xs text-right">
              Create directly inside ContentAmplifier or upload files you made elsewhere. Unsupported formats will be rejected immediately with a clear error.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Text */}
            <div className="group bg-zinc-950 border border-white/10 hover:border-violet-400/50 transition-all rounded-3xl p-8 text-center">
              <div className="w-12 h-12 mx-auto mb-6 bg-violet-500/10 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                📝
              </div>
              <h4 className="font-semibold text-violet-400 mb-2">TEXT</h4>
              <p className="text-zinc-300 text-lg">.txt • .docx</p>
              <p className="text-xs text-zinc-500 mt-1">Type, paste, or upload</p>
            </div>

            {/* Video */}
            <div className="group bg-zinc-950 border border-white/10 hover:border-violet-400/50 transition-all rounded-3xl p-8 text-center">
              <div className="w-12 h-12 mx-auto mb-6 bg-violet-500/10 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                🎥
              </div>
              <h4 className="font-semibold text-violet-400 mb-2">VIDEO</h4>
              <p className="text-zinc-300 text-lg">.mp4 • .mov • .webm • .avi • .mkv</p>
              <p className="text-xs text-zinc-500 mt-1">Record or upload</p>
            </div>

            {/* Audio */}
            <div className="group bg-zinc-950 border border-white/10 hover:border-violet-400/50 transition-all rounded-3xl p-8 text-center">
              <div className="w-12 h-12 mx-auto mb-6 bg-violet-500/10 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                🎙️
              </div>
              <h4 className="font-semibold text-violet-400 mb-2">AUDIO</h4>
              <p className="text-zinc-300 text-lg">.mp3 • .wav • .m4a • .ogg • .aac • .webm</p>
              <p className="text-xs text-zinc-500 mt-1">Record or upload</p>
            </div>
          </div>
        </div>

        {/* Final CTA Box */}
        <div className="bg-gradient-to-br from-zinc-900 to-black border border-white/10 rounded-3xl p-12 text-center max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold tracking-tighter mb-6">Ready to amplify everything?</h2>
          <p className="text-xl text-zinc-400 mb-10">
            The first two social accounts are completely free for life.<br />
            No credit card required.
          </p>
          
          <button
            onClick={() => setShowZernioKeyModal(true)}
            className="inline-flex items-center gap-3 bg-white text-black hover:bg-white/90 transition px-10 py-6 rounded-3xl text-xl font-semibold shadow-2xl shadow-violet-500/30"
          >
            <Zap className="w-7 h-7" />
            Connect Zernio Now
          </button>

          <div className="flex justify-center gap-8 text-sm mt-10">
            <button
              onClick={() => setShowZernioHelpModal(true)}
              className="flex items-center gap-2 text-violet-400 hover:text-violet-300 transition"
            >
              <HelpCircle size={16} /> How to set up
            </button>
            <a
              href="https://docs.zernio.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-violet-400 hover:text-violet-300 transition"
            >
              📖 Zernio Docs &amp; FAQ
            </a>
          </div>

          <p className="text-xs text-zinc-500 mt-8">Takes 30 seconds • Works with all your existing Zernio accounts</p>
        </div>

        {/* Zernio API Key Modal */}
        {showZernioKeyModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-zinc-900 rounded-3xl p-8 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">Connect Zernio</h3>
                <button 
                  onClick={() => setShowZernioHelpModal(true)}
                  className="flex items-center gap-1 text-violet-400 hover:text-violet-300 text-sm"
                >
                  <HelpCircle size={16} /> How to set up
                </button>
              </div>
              
              <p className="text-zinc-400 mb-6 text-sm">Paste your Zernio API key below</p>
              
              <input 
                type="password"
                value={zernioApiKeyInput}
                onChange={(e) => setZernioApiKeyInput(e.target.value)}
                placeholder="sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-6 py-4 mb-6 focus:outline-none focus:border-violet-400"
              />

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowZernioKeyModal(false)} 
                  className="flex-1 py-4 border border-white/20 rounded-2xl hover:bg-white/5"
                >
                  Cancel
                </button>
                <button 
                  onClick={saveZernioKey} 
                  className="flex-1 py-4 bg-violet-600 hover:bg-violet-700 rounded-2xl font-semibold"
                >
                  Save Key
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Zernio Instructions Modal */}
        {showZernioHelpModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-zinc-900 rounded-3xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">How to connect Zernio (3 easy steps)</h3>
                <button onClick={() => setShowZernioHelpModal(false)} className="text-zinc-400 hover:text-white">✕</button>
              </div>

              <div className="space-y-8">
                <div className="flex gap-6">
                  <div className="w-8 h-8 bg-violet-600 text-white rounded-2xl flex items-center justify-center font-bold flex-shrink-0">1</div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-2">Create a free Zernio account</h4>
                    <p className="text-zinc-400">Go to <a href="https://zernio.com" target="_blank" className="text-violet-400 hover:underline">zernio.com</a> and sign up (the first 2 social accounts are completely free).</p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="w-8 h-8 bg-violet-600 text-white rounded-2xl flex items-center justify-center font-bold flex-shrink-0">2</div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-2">Copy your API key from Zernio</h4>
                    <p className="text-zinc-400 mb-3">In the Zernio dashboard go to <strong>Settings → API Keys</strong>, copy the full key (it starts with <code className="bg-zinc-800 px-1 rounded">sk_</code>).</p>
                    <p className="text-emerald-400 font-medium mb-3">Then paste it in the box below and click “Save Key”:</p>
                    <div className="bg-zinc-950 border border-white/10 rounded-2xl p-6 text-center">
                      <div className="inline-block bg-zinc-900 border border-violet-400/30 rounded-xl px-6 py-4 text-sm text-zinc-300">
                        sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
                      </div>
                      <div className="mt-4 text-xs text-violet-400">↑ Paste your full key here</div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="w-8 h-8 bg-violet-600 text-white rounded-2xl flex items-center justify-center font-bold flex-shrink-0">3</div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-2">Connect your social accounts in Zernio</h4>
                    <p className="text-zinc-400">In Zernio click “Add account” and connect the platforms you want to post to (LinkedIn, TikTok, Instagram, etc.).</p>
                    <p className="text-emerald-400 mt-4 text-sm">Come back here and click “Connect Zernio Now” — we’ll automatically show your accounts and publish instantly.</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-10">
                <button 
                  onClick={() => setShowZernioHelpModal(false)}
                  className="flex-1 py-4 border border-white/20 rounded-2xl hover:bg-white/5"
                >
                  Got it
                </button>
                <button 
                  onClick={() => {
                    setShowZernioHelpModal(false);
                    setShowZernioKeyModal(true);
                  }}
                  className="flex-1 py-4 bg-violet-600 hover:bg-violet-700 rounded-2xl font-semibold"
                >
                  Paste my key now
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}