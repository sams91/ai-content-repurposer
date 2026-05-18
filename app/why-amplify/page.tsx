'use client';

import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, LogOut, Zap, CheckCircle, Calendar, Send, Shield, Gift, HelpCircle } from 'lucide-react';
import { supabase } from '../supabase';

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
            {user && (
              <button onClick={handleSignOut} className="flex items-center gap-2 text-zinc-400 hover:text-white transition">
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-20 relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-emerald-600/10 text-emerald-400 px-6 py-2 rounded-3xl text-sm font-medium mb-6">
            <Gift className="w-4 h-4" /> First 2 accounts FREE for life
          </div>
          <h1 className="text-6xl font-bold tracking-tighter mb-6">Why Amplify with Zernio?</h1>
          <p className="text-2xl text-zinc-400 max-w-2xl mx-auto">
            One-click posting. Video + perfect text. Zero extra work.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 text-center">
            <Zap className="w-12 h-12 mx-auto mb-6 text-violet-400" />
            <h3 className="text-xl font-semibold mb-3">Instant Cross-Posting</h3>
            <p className="text-zinc-400">Your optimized video + platform-specific caption, hashtags, and title are sent together in one click to LinkedIn, TikTok, X, Instagram, YouTube, and more.</p>
          </div>
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-6 text-violet-400" />
            <h3 className="text-xl font-semibold mb-3">Schedule Future Posts</h3>
            <p className="text-zinc-400">Plan your entire content calendar inside Zernio. Set it and forget it — we handle the rest.</p>
          </div>
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 text-center">
            <Shield className="w-12 h-12 mx-auto mb-6 text-violet-400" />
            <h3 className="text-xl font-semibold mb-3">Secure &amp; Private</h3>
            <p className="text-zinc-400">Your API key is stored encrypted in Supabase. Only you control your accounts.</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-zinc-900 to-black border border-white/10 rounded-3xl p-12 text-center max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold tracking-tighter mb-6">Ready to amplify?</h2>
          <p className="text-xl text-zinc-400 mb-10">The first two social accounts are completely free for life. No credit card required.</p>
          
          <button
            onClick={() => setShowZernioKeyModal(true)}
            className="inline-flex items-center gap-3 bg-white text-black hover:bg-white/90 transition px-10 py-6 rounded-3xl text-xl font-semibold shadow-2xl shadow-violet-500/30"
          >
            <Zap className="w-7 h-7" />
            Connect Zernio Now
          </button>
          
          <p className="text-xs text-zinc-500 mt-8">Takes 30 seconds • Works with all your existing Zernio accounts</p>
        </div>

        {/* Connect Zernio Modal with full How-to-Set-Up button */}
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
                  Connect Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Full 3-step help modal */}
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
                    <p className="text-zinc-400 mb-3">In the Zernio dashboard go to <strong>API Keys</strong>, copy the full key (it starts with <code className="bg-zinc-800 px-1 rounded">sk_</code>).</p>
                    <p className="text-emerald-400 font-medium mb-3">Then paste it in the box below and click “Connect Now”:</p>
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
                    <p className="text-emerald-400 mt-4 text-sm">Come back here and click “Post with Zernio” — we’ll automatically show your accounts in a nice dropdown and publish instantly.</p>
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

              <p className="text-center text-xs text-zinc-500 mt-6">
                This integration is powered by Zernio. If you upgrade to a paid Zernio plan later, it helps support the continued development of ContentAmplifier at no extra cost to you.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}