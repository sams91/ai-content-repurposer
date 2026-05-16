'use client';

import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, CheckCircle, RefreshCw, LogOut, Clock, Upload, Copy, RotateCw, Share2, Video, Play } from 'lucide-react';
import { supabase } from './supabase';
import VideoRecorder from '@/components/VideoRecorder';

export default function Home() {
  const [content, setContent] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<Record<string, any> | null>(null);
  const [user, setUser] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);
  const [textHistory, setTextHistory] = useState<any[]>([]);
  const [videoHistory, setVideoHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [activeHistoryTab, setActiveHistoryTab] = useState<'all' | 'text' | 'video'>('all');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isCopyingAll, setIsCopyingAll] = useState<boolean>(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<'text' | 'video'>('video');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) loadHistories();
  }, [user]);

  const loadHistories = async () => {
    if (!user) return;

    // Text history
    const { data: textData } = await supabase
      .from('content_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setTextHistory(textData || []);

    // Video history
    const { data: videoData } = await supabase
      .from('video_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setVideoHistory(videoData || []);
  };

  const handleAuth = async () => {
    setIsAuthLoading(true);
    try {
      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) alert(error.message);
        else alert("Check your email for confirmation link!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) alert(error.message);
      }
    } catch {
      alert("Something went wrong");
    }
    setIsAuthLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const showToast = (message: string, isError = false) => {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-6 right-6 px-6 py-3 rounded-2xl text-sm font-medium transition-all duration-300 z-50 ${
      isError ? 'bg-red-500/90' : 'bg-emerald-500/90'
    } text-white shadow-2xl border border-white/10`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 2500);
  };

  const handleRepurpose = async (inputContent?: string) => {
    const textToUse = inputContent || content;
    if (!textToUse.trim() || !user) return;
    
    setIsProcessing(true);
    setResult(null);
    setShareLink(null);

    try {
      const formData = new FormData();
      formData.append('content', textToUse);

      const response = await fetch('/api/repurpose', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setResult(data.outputs);
      setContent(textToUse);

      await supabase
        .from('content_history')
        .insert({
          user_id: user.id,
          original_content: data.originalContent || textToUse,
          outputs: data.outputs
        });

      loadHistories();
    } catch {
      showToast("Failed to generate content.", true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file || !user) return;

    setIsProcessing(true);
    setResult(null);
    setShareLink(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/repurpose', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setResult(data.outputs);
      setContent(data.originalContent);

      await supabase
        .from('content_history')
        .insert({
          user_id: user.id,
          original_content: data.originalContent,
          outputs: data.outputs
        });

      loadHistories();
    } catch {
      showToast("Failed to process file.", true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const copyToClipboard = async (text: any, label: string) => {
    const safeText = typeof text === 'string' ? text : JSON.stringify(text, null, 2);
    try {
      await navigator.clipboard.writeText(safeText.trim());
      showToast(`✅ Copied ${label}!`);
    } catch {
      showToast("Failed to copy. Please try again.", true);
    }
  };

  const copyAll = async () => {
    if (!result) return;
    
    setIsCopyingAll(true);
    let allText = '';

    Object.entries(result).forEach(([platform, text]) => {
      const displayName = platform === 'twitter' ? 'X' : platform.charAt(0).toUpperCase() + platform.slice(1);
      const safeText = typeof text === 'string' ? text : JSON.stringify(text, null, 2);
      allText += `${displayName.toUpperCase()}:\n${safeText}\n\n`;
    });

    try {
      await navigator.clipboard.writeText(allText.trim());
      showToast("✅ Copied all platforms to clipboard!");
    } catch {
      showToast("Failed to copy. Please try again.", true);
    }
    
    setIsCopyingAll(false);
  };

  const generateShareLink = async () => {
    if (!result || !user) return;

    try {
      const { data, error } = await supabase
        .from('shared_content')
        .insert({
          user_id: user.id,
          outputs: result,
          original_content: content
        })
        .select('id')
        .single();

      if (error) throw error;

      const link = `${window.location.origin}/share/${data.id}`;
      setShareLink(link);
      await navigator.clipboard.writeText(link);
      showToast("✅ Share link copied to clipboard!");
    } catch {
      showToast("Failed to create share link.", true);
    }
  };

  const regeneratePlatform = async (platform: string) => {
    if (!content.trim() || !user) return;
    
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('content', content);

      const response = await fetch('/api/repurpose', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      setResult(prev => ({
        ...prev,
        [platform]: data.outputs[platform]
      }));

    } catch {
      showToast("Failed to regenerate.", true);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none" 
           style={{ backgroundImage: "url('/space-bg.jpg')" }} />
      <div className="fixed inset-0 bg-black/70 pointer-events-none" />

      <nav className="border-b border-white/10 bg-zinc-950/95 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Sparkles className="w-8 h-8 text-violet-400" />
              <div className="absolute inset-0 bg-violet-400 blur-xl opacity-30 rounded-full" />
            </div>
            <h1 className="text-2xl font-bold tracking-tighter">ContentAmplifier</h1>
          </div>

          {user && (
            <div className="flex items-center gap-6 text-sm">
              <button 
                onClick={() => window.location.href = '/'} 
                className="hover:text-violet-400 transition"
              >
                Home
              </button>
              <button onClick={() => window.location.href = '/why-amplify'} className="hover:text-violet-400 transition">
                Why Amplify
              </button>
              <button onClick={() => window.location.href = '/pricing'} className="hover:text-violet-400 transition">
                Pricing
              </button>
              <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-2 hover:text-violet-400 transition">
                <Clock className="w-4 h-4" /> History
              </button>
              <span className="text-zinc-400">{user.email}</span>
              <button onClick={handleSignOut} className="flex items-center gap-2 text-zinc-400 hover:text-white transition">
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-16 relative">
        {!user ? (
          <div className="max-w-md mx-auto bg-zinc-900/90 border border-white/10 rounded-3xl p-10 backdrop-blur-sm">
            <h2 className="text-3xl font-bold text-center mb-8">
              {authMode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h2>
            <div className="space-y-6">
              <input 
                type="email" 
                placeholder="Email address" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-violet-500" 
              />
              <input 
                type="password" 
                placeholder="Password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-violet-500" 
              />

              <button 
                onClick={handleAuth} 
                disabled={isAuthLoading} 
                className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:brightness-110 py-4 rounded-2xl font-semibold transition disabled:opacity-70"
              >
                {isAuthLoading ? 'Processing...' : authMode === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>

              <p 
                onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')} 
                className="text-center text-sm text-zinc-400 hover:text-white cursor-pointer transition"
              >
                {authMode === 'signin' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex gap-8">
            <div className="flex-1">
              <div className="text-center mb-16">
                <h2 className="text-6xl font-bold tracking-tighter mb-6 bg-gradient-to-r from-white via-violet-200 to-white bg-clip-text text-transparent">
                  One piece of content.<br />Infinite possibilities.
                </h2>
                <p className="text-xl text-zinc-400">Amplify your reach across the digital universe</p>
              </div>

              {/* Mode Tabs */}
              <div className="flex justify-center mb-8">
                <div className="inline-flex bg-zinc-900 border border-white/10 rounded-3xl p-1">
                  <button
                    onClick={() => setActiveMode('text')}
                    className={`px-8 py-3 rounded-3xl flex items-center gap-2 transition-all ${activeMode === 'text' ? 'bg-white text-black font-medium' : 'hover:bg-white/10'}`}
                  >
                    📝 Text Mode
                  </button>
                  <button
                    onClick={() => setActiveMode('video')}
                    className={`px-8 py-3 rounded-3xl flex items-center gap-2 transition-all ${activeMode === 'video' ? 'bg-white text-black font-medium' : 'hover:bg-white/10'}`}
                  >
                    <Video className="w-5 h-5" /> Video Mode
                  </button>
                </div>
              </div>

              {/* Text Mode */}
              {activeMode === 'text' && (
                <div className="max-w-3xl mx-auto">
                  <div 
                    className={`border-2 border-dashed border-violet-500/30 rounded-3xl p-12 text-center transition-all ${isDragging ? 'border-violet-500 bg-violet-500/10' : 'border-white/20'}`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                  >
                    <Upload className="w-12 h-12 mx-auto mb-4 text-violet-400" />
                    <p className="text-lg mb-2">Drop a DOCX or TXT file here</p>
                    <p className="text-sm text-zinc-500 mb-6">or paste text below</p>

                    <input 
                      type="file" 
                      accept=".docx,.txt" 
                      onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])} 
                      className="hidden" 
                      id="file-upload" 
                    />
                    <label 
                      htmlFor="file-upload" 
                      className="cursor-pointer inline-block bg-zinc-900 hover:bg-zinc-800 border border-violet-500/50 px-6 py-3 rounded-2xl text-sm transition"
                    >
                      Select File
                    </label>
                  </div>

                  <div className="mt-6 bg-zinc-900/90 border border-white/10 rounded-3xl p-8">
                    <div className="flex justify-between text-sm text-zinc-500 mb-2">
                      <span>Input Content</span>
                      <span>{content.length} characters</span>
                    </div>
                    <textarea 
                      value={content} 
                      onChange={(e) => setContent(e.target.value)} 
                      placeholder="Or paste your content here..." 
                      className="w-full h-48 bg-zinc-950 border border-white/10 rounded-2xl p-6 text-lg placeholder-zinc-500 focus:outline-none focus:border-violet-500 resize-none" 
                    />

                    <button 
                      onClick={() => handleRepurpose()} 
                      disabled={isProcessing || !content.trim()} 
                      className="mt-6 w-full bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600 hover:brightness-110 disabled:bg-zinc-700 py-4 rounded-2xl font-semibold flex items-center justify-center gap-3 text-lg transition-all duration-300 shadow-lg shadow-violet-500/30"
                    >
                      {isProcessing ? (
                        <>Amplifying Across the Universe <RefreshCw className="w-5 h-5 animate-spin" /></>
                      ) : (
                        <>Amplify Content <ArrowRight className="w-5 h-5" /></>
                      )}
                    </button>
                  </div>

                  {result && (
                    <div className="mt-12">
                      <div className="flex justify-between items-center mb-8">
                        <h3 className="text-2xl font-semibold flex items-center gap-3">
                          <CheckCircle className="text-emerald-500" /> Amplified Content
                        </h3>
                        <div className="flex gap-3">
                          <button 
                            onClick={copyAll} 
                            disabled={isCopyingAll} 
                            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-5 py-2 rounded-2xl text-sm transition"
                          >
                            <Copy className="w-4 h-4" /> {isCopyingAll ? "Copying..." : "Copy All"}
                          </button>
                          <button 
                            onClick={generateShareLink} 
                            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-5 py-2 rounded-2xl text-sm transition"
                          >
                            <Share2 className="w-4 h-4" /> Share
                          </button>
                        </div>
                      </div>
                      
                      {shareLink && (
                        <div className="mb-8 p-4 bg-zinc-900 border border-violet-500/30 rounded-2xl text-sm">
                          Share Link: <span className="text-violet-400 font-mono break-all">{shareLink}</span>
                        </div>
                      )}

                      <div className="grid md:grid-cols-2 gap-6">
                        {Object.entries(result).map(([platform, text]) => {
                          const isX = platform === 'twitter';
                          const displayName = platform === 'twitter' ? 'X' : platform.charAt(0).toUpperCase() + platform.slice(1);
                          const safeText = typeof text === 'string' ? text : JSON.stringify(text, null, 2);

                          return (
                            <div key={platform} className="bg-zinc-900 border border-white/10 rounded-2xl p-6 group relative hover:border-violet-400/50 transition-all">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  {isX && (
                                    <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
                                      <span className="text-black font-black text-2xl leading-none">𝕏</span>
                                    </div>
                                  )}
                                  <p className="uppercase text-sm text-violet-400 tracking-widest font-medium">
                                    {displayName}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => regeneratePlatform(platform)} 
                                    className="opacity-0 group-hover:opacity-100 transition text-xs px-3 py-1 rounded-full hover:bg-zinc-800 flex items-center gap-1"
                                  >
                                    <RotateCw className="w-3 h-3" /> Regenerate
                                  </button>
                                  <button 
                                    onClick={() => copyToClipboard(text, displayName)} 
                                    className="opacity-0 group-hover:opacity-100 transition bg-zinc-800 hover:bg-zinc-700 text-xs px-4 py-1.5 rounded-full flex items-center gap-1.5"
                                  >
                                    📋 Copy
                                  </button>
                                </div>
                              </div>
                              <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
                                {safeText}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Video Mode */}
              {activeMode === 'video' && (
                <div className="max-w-4xl mx-auto">
                  <VideoRecorder />
                </div>
              )}
            </div>

            {/* Unified History Sidebar */}
            {showHistory && (
              <div className="w-96 bg-zinc-950 border-l border-white/10 p-6 overflow-auto h-screen sticky top-0">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold">History</h3>
                  <button onClick={() => setShowHistory(false)} className="text-zinc-400 hover:text-white">✕</button>
                </div>

                <div className="flex gap-2 mb-6 bg-zinc-900 p-1 rounded-2xl">
                  {(['all', 'text', 'video'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveHistoryTab(tab)}
                      className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                        activeHistoryTab === tab ? 'bg-violet-600 text-white' : 'hover:bg-white/5'
                      }`}
                    >
                      {tab === 'all' ? 'All' : tab === 'text' ? 'Text' : 'Videos'}
                    </button>
                  ))}
                </div>

                {/* Video History */}
                {(activeHistoryTab === 'all' || activeHistoryTab === 'video') && (
                  <div className="mb-10">
                    <h4 className="uppercase text-xs tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                      <Video className="w-4 h-4" /> Videos
                    </h4>
                    {videoHistory.length === 0 && <p className="text-zinc-500 py-8 text-center">No videos yet</p>}
                    {videoHistory.map((vid: any) => (
                      <div key={vid.id} className="bg-zinc-900 rounded-2xl overflow-hidden mb-6 group">
                        <div className="relative aspect-video bg-black">
                          <video src={vid.video_url} className="w-full h-full object-cover" controls />
                        </div>
                        <div className="p-4">
                          <p className="font-medium text-sm line-clamp-1">{vid.file_name}</p>
                          <p className="text-xs text-zinc-500 mt-1">
                            {new Date(vid.created_at).toLocaleDateString()}
                          </p>
                          {vid.transcription && (
                            <p className="text-xs text-zinc-400 mt-3 line-clamp-2">{vid.transcription}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Text History */}
                {(activeHistoryTab === 'all' || activeHistoryTab === 'text') && textHistory.length > 0 && (
                  <div>
                    <h4 className="uppercase text-xs tracking-widest text-zinc-500 mb-4">Text Content</h4>
                    {textHistory.map((item) => (
                      <div 
                        key={item.id} 
                        onClick={() => { 
                          setContent(item.original_content); 
                          setShowHistory(false); 
                          window.scrollTo({ top: 0, behavior: 'smooth' }); 
                        }}
                        className="bg-zinc-900 rounded-2xl p-5 mb-4 cursor-pointer hover:bg-zinc-800"
                      >
                        <p className="line-clamp-3 text-sm text-zinc-300">{item.original_content}</p>
                        <p className="text-xs text-zinc-500 mt-3">
                          {new Date(item.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {videoHistory.length === 0 && textHistory.length === 0 && (
                  <p className="text-center py-20 text-zinc-500">Your amplified content will appear here</p>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}