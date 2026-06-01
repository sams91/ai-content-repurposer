'use client';

import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, CheckCircle, RefreshCw, LogOut, Clock, Upload, Copy, RotateCw, Share2, Video, Play, Zap, Send, HelpCircle, Trash2, Search, Download, Mic } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getUnifiedHistory, UnifiedHistoryItem, ZernioAccount, SmartClip, needsToSubscribe } from './supabase';
import VideoRecorder from '@/components/VideoRecorder';
import AudioProcessor from '@/components/AudioProcessor';
import { formatDistanceToNow } from 'date-fns';
import type { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient();

export default function Home() {
  const router = useRouter();

  const platforms = [
    { value: 'TikTok', label: 'TikTok / Reels (9:16)' },
    { value: 'YouTube', label: 'YouTube / Shorts (16:9)' },
    { value: 'Instagram', label: 'Instagram (1:1)' },
    { value: 'LinkedIn', label: 'LinkedIn (16:9)' },
    { value: 'X', label: 'X (Twitter)' },
    { value: 'Rumble', label: 'Rumble (16:9)' },
    { value: 'Threads', label: 'Threads (1:1)' },
    { value: 'ShortsReels', label: 'Shorts / Reels (9:16)' },
  ];

  const [content, setContent] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isAuthLoadingState, setIsAuthLoadingState] = useState<boolean>(false);
  const [historyItems, setHistoryItems] = useState<UnifiedHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [activeHistoryTab, setActiveHistoryTab] = useState<'all' | 'text' | 'video' | 'audio'>('all');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isCopyingAll, setIsCopyingAll] = useState<boolean>(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<'text' | 'video' | 'audio'>('video');

  const [showZernioKeyModal, setShowZernioKeyModal] = useState(false);
  const [zernioApiKeyInput, setZernioApiKeyInput] = useState('');

  const [showZernioHelpModal, setShowZernioHelpModal] = useState(false);

  const [textConnectedAccounts, setTextConnectedAccounts] = useState<ZernioAccount[]>([]);
  const [showTextZernioModal, setShowTextZernioModal] = useState(false);
  const [selectedTextAccountId, setSelectedTextAccountId] = useState('');

  const [historySearch, setHistorySearch] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewVideo, setPreviewVideo] = useState<{ url: string; name: string; isAudio?: boolean } | null>(null);

  const [generatingClipsFor, setGeneratingClipsFor] = useState<string | null>(null);
  const [clipModal, setClipModal] = useState<{ id: string; clips: SmartClip[]; type: 'video' | 'audio' } | null>(null);

  const [burningCaptionsFor, setBurningCaptionsFor] = useState<string | null>(null);
  const [generatingThumbnailFor, setGeneratingThumbnailFor] = useState<string | null>(null);

  const loadHistories = async () => {
    if (!user) return;
    const items = await getUnifiedHistory(user.id);
    setHistoryItems(items);
  };

  const refreshHistory = () => {
    if (user) loadHistories();
  };

  const handleAmplifySuccess = () => {
    refreshHistory();
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setIsAuthLoading(false);

      if (session?.user) {
        const needsSubscribe = await needsToSubscribe(session.user.id);
        if (needsSubscribe) {
          router.push('/pricing');
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      setIsAuthLoading(false);

      if (session?.user) {
        const needsSubscribe = await needsToSubscribe(session.user.id);
        if (needsSubscribe) {
          router.push('/pricing');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    if (user) {
      loadHistories();
    }
  }, [user]);

  const deleteHistoryItem = async (id: string, type: 'text' | 'video' | 'audio') => {
    if (!user || !confirm(`Delete this ${type} item forever?`)) return;
    setDeletingId(id);
    const table = type === 'text' ? 'content_history' : 'video_history';
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
      showToast('Delete failed', true);
    } else {
      showToast('Item deleted');
      loadHistories();
    }
    setDeletingId(null);
  };

  const optimizeAndDownload = async (videoUrl: string, platform: string, fileName: string) => {
    try {
      const response = await fetch('/api/optimize-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl, platform, originalFileName: fileName }),
      });
      if (!response.ok) throw new Error('Optimize failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName.split('.')[0]}-${platform.toLowerCase()}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Downloaded optimized for ${platform}!`);
    } catch {
      showToast('Download failed', true);
    }
  };

  const generateSmartClips = async (url: string, id: string, fileName: string, transcription?: string, type: 'video' | 'audio' = 'video') => {
    setGeneratingClipsFor(id);
    try {
      const response = await fetch('/api/smart-clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          videoUrl: url, 
          videoId: id, 
          fileName, 
          userId: user!.id,
          transcription: transcription || '',
          type
        }),
      });
      const data = await response.json();
      if (data.clips) {
        setClipModal({ id, clips: data.clips, type });
      } else {
        showToast(data.error || 'Failed to generate clips', true);
      }
    } catch {
      showToast('Smart Clipping failed', true);
    } finally {
      setGeneratingClipsFor(null);
    }
  };

  const burnCaptions = async (clipUrl: string, clipDuration: number, clipFilename: string, captionText?: string) => {
    setBurningCaptionsFor(clipFilename);
    try {
      const response = await fetch('/api/burn-captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          videoUrl: clipUrl, 
          filename: clipFilename,
          text: captionText || '' 
        }),
      });
      const data = await response.json();
      if (data.captionedUrl) {
        const res = await fetch(data.captionedUrl);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${clipFilename.split('.')[0] || 'clip'}-with-captions.mp4`;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`✅ ${clipDuration}s clip with burned captions downloaded!`);
      } else {
        showToast(data.error || 'Burn failed', true);
      }
    } catch {
      showToast('Burn-in Captions failed', true);
    } finally {
      setBurningCaptionsFor(null);
    }
  };

  const generateThumbnail = async (clipUrl: string, clipFilename: string) => {
    setGeneratingThumbnailFor(clipFilename);
    try {
      const response = await fetch('/api/generate-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: clipUrl, filename: clipFilename }),
      });
      const data = await response.json();
      if (data.thumbnailUrl) {
        const res = await fetch(data.thumbnailUrl);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${clipFilename.split('.')[0] || 'clip'}-thumbnail.jpg`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('✅ Thumbnail downloaded!');
      } else {
        showToast(data.error || 'Thumbnail failed', true);
      }
    } catch {
      showToast('Thumbnail failed', true);
    } finally {
      setGeneratingThumbnailFor(null);
    }
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
      alert('✅ Zernio API key saved successfully!');
      setShowZernioKeyModal(false);
      setZernioApiKeyInput('');
    }
  };

  const fetchTextConnectedAccounts = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/zernio/accounts?user_id=${user.id}`);
      const data = await res.json();
      if (data.accounts) setTextConnectedAccounts(data.accounts);
    } catch (e) {
      console.error("Failed to fetch accounts", e);
    }
  };

  const postTextToZernio = async () => {
    if (!user || !selectedTextAccountId || !result) return;

    const selectedAccount = textConnectedAccounts.find(a => a._id === selectedTextAccountId);
    if (!selectedAccount) return;

    const firstPlatformKey = Object.keys(result.outputs || result)[0];
    const postContent = (result.outputs || result)[firstPlatformKey];

    try {
      const res = await fetch('/api/zernio/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform_id: selectedAccount._id,
          platform: selectedAccount.platform,
          content: postContent,
          user_id: user.id,
        }),
      });

      const json = await res.json();
      if (json.success) {
        alert(json.message);
        setShowTextZernioModal(false);
        setSelectedTextAccountId('');
      } else {
        alert('Error: ' + json.error);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to call Zernio');
    }
  };

  const handleAuth = async () => {
    setIsAuthLoadingState(true);
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
    setIsAuthLoadingState(false);
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
      setResult(data);
      setContent(textToUse);

      await supabase
        .from('content_history')
        .insert({
          user_id: user.id,
          original_content: data.originalContent || textToUse,
          outputs: data.outputs
        });

      loadHistories();
    } catch (err: any) {
      console.error(err);
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
      setResult(data);
      setContent(data.originalContent);

      await supabase
        .from('content_history')
        .insert({
          user_id: user.id,
          original_content: data.originalContent,
          outputs: data.outputs
        });

      loadHistories();
    } catch (err: any) {
      console.error(err);
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

  const copyToClipboard = async (text: string | any, label: string) => {
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

    const platformsData = result.outputs || result;
    Object.entries(platformsData).forEach(([platform, text]) => {
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
          outputs: result.outputs || result,
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

  const startOverText = () => {
    setContent('');
    setResult(null);
    setShareLink(null);
    showToast('Started fresh! Ready for new content.');
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
        outputs: {
          ...(prev.outputs || prev),
          [platform]: data.outputs[platform]
        }
      }));

    } catch {
      showToast("Failed to regenerate.", true);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredText = historyItems.filter(item => item.type === 'text' && 
    (item.original_content || '').toLowerCase().includes(historySearch.toLowerCase())
  );

  const filteredVideoItems = historyItems.filter(item => item.type === 'video' &&
    (item.file_name || '').toLowerCase().includes(historySearch.toLowerCase())
  );

  const filteredAudioItems = historyItems.filter(item => item.type === 'audio' &&
    (item.file_name || '').toLowerCase().includes(historySearch.toLowerCase())
  );

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
              <button onClick={() => window.location.href = '/'} className="hover:text-violet-400 transition">Home</button>
              <button onClick={() => window.location.href = '/why-amplify'} className="hover:text-violet-400 transition">Why Amplify with Zernio</button>
              <button onClick={() => window.location.href = '/dashboard'} className="hover:text-violet-400 transition">Dashboard</button>
              <button onClick={() => window.location.href = '/pricing'} className="hover:text-violet-400 transition">Pricing</button>
              <button onClick={() => window.location.href = '/calendar'} className="hover:text-violet-400 transition flex items-center gap-1">
                <Clock className="w-4 h-4" /> Calendar
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
        {isAuthLoading ? (
          <div className="min-h-[60vh] flex items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-violet-400" />
          </div>
        ) : !user ? (
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
                disabled={isAuthLoadingState} 
                className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:brightness-110 py-4 rounded-2xl font-semibold transition disabled:opacity-70"
              >
                {isAuthLoadingState ? 'Processing...' : authMode === 'signin' ? 'Sign In' : 'Sign Up'}
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
                  <button
                    onClick={() => setActiveMode('audio')}
                    className={`px-8 py-3 rounded-3xl flex items-center gap-2 transition-all ${activeMode === 'audio' ? 'bg-white text-black font-medium' : 'hover:bg-white/10'}`}
                  >
                    <Mic className="w-5 h-5" /> Audio Mode
                  </button>
                </div>
              </div>

              {/* TEXT MODE */}
              {activeMode === 'text' && (
                <div className="max-w-3xl mx-auto">
                  <div 
                    className={`border-2 border-dashed transition-all rounded-3xl p-8 bg-zinc-900/90 border-white/10 ${isDragging ? 'border-violet-500 bg-violet-500/10' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                  >
                    <div className="text-center mb-6">
                      <Upload className="w-10 h-10 mx-auto mb-3 text-violet-400" />
                      <p className="text-lg font-medium">Drop DOCX or TXT here</p>
                      <p className="text-sm text-zinc-400">or paste your content below</p>
                    </div>

                    <textarea 
                      value={content} 
                      onChange={(e) => setContent(e.target.value)} 
                      placeholder="Start typing or drop a file directly into this box..." 
                      className="w-full h-64 bg-zinc-950 border border-white/10 rounded-2xl p-6 text-lg placeholder-zinc-500 focus:outline-none focus:border-violet-500 resize-none"
                    />

                    <div className="flex justify-between items-center mt-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-400">{content.length} characters</span>
                        <input 
                          type="file" 
                          accept=".docx,.txt" 
                          onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])} 
                          className="hidden" 
                          id="file-upload" 
                        />
                        <label 
                          htmlFor="file-upload" 
                          className="cursor-pointer flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition"
                        >
                          <Upload className="w-4 h-4" /> Select File
                        </label>
                      </div>

                      <button 
                        onClick={() => handleRepurpose()} 
                        disabled={isProcessing || !content.trim()} 
                        className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600 hover:brightness-110 disabled:bg-zinc-700 px-8 py-3 rounded-2xl font-semibold flex items-center justify-center gap-3 transition-all shadow-lg shadow-violet-500/30"
                      >
                        {isProcessing ? (
                          <>Amplifying <RefreshCw className="w-4 h-4 animate-spin" /></>
                        ) : (
                          <>Amplify Content <ArrowRight className="w-4 h-4" /></>
                        )}
                      </button>
                    </div>
                  </div>

                  {result && (
                    <div className="mt-12">
                      <div className="flex justify-between items-center mb-8">
                        <h3 className="text-2xl font-semibold flex items-center gap-3">
                          <CheckCircle className="text-emerald-500" /> Amplified Content
                        </h3>
                        <div className="flex gap-3">
                          <button onClick={copyAll} disabled={isCopyingAll} className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-5 py-2 rounded-2xl text-sm transition">
                            <Copy className="w-4 h-4" /> {isCopyingAll ? "Copying..." : "Copy All"}
                          </button>
                          <button onClick={generateShareLink} className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-5 py-2 rounded-2xl text-sm transition">
                            <Share2 className="w-4 h-4" /> Share
                          </button>
                          <button
                            onClick={() => {
                              fetchTextConnectedAccounts();
                              setShowTextZernioModal(true);
                            }}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-5 py-2 rounded-2xl text-sm font-semibold"
                          >
                            <Send className="w-4 h-4" /> Post with Zernio
                          </button>
                          <button
                            onClick={startOverText}
                            className="flex items-center gap-2 bg-zinc-800 hover:bg-red-600/20 hover:text-red-400 px-5 py-2 rounded-2xl text-sm transition"
                          >
                            <Trash2 className="w-4 h-4" /> Start Over
                          </button>
                        </div>
                      </div>

                      {shareLink && (
                        <div className="mb-8 p-4 bg-zinc-900 border border-violet-500/30 rounded-2xl text-sm">
                          Share Link: <span className="text-violet-400 font-mono break-all">{shareLink}</span>
                        </div>
                      )}

                      {/* Platforms */}
                      <div className="grid md:grid-cols-2 gap-6">
                        {Object.entries(result.outputs || result).map(([platform, text]) => {
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

                      {/* CLIPIDEAS SECTION */}
                      {(result.clipIdeas || result.outputs?.clipIdeas) && (result.clipIdeas || result.outputs?.clipIdeas).length > 0 && (
                        <div className="mt-12 bg-zinc-900 border border-white/10 rounded-3xl p-6">
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="font-semibold">Smart Clip Ideas</h4>
                          </div>
                          <div className="space-y-2 text-sm">
                            {(result.clipIdeas || result.outputs?.clipIdeas).map((clip: any, i: number) => (
                              <div key={i} className="bg-zinc-950 p-3 rounded-2xl flex justify-between items-center">
                                <div>
                                  <span className="font-mono text-emerald-400">{clip.start || clip.duration}s</span>
                                  <span className="ml-3 text-zinc-300">{clip.reason}</span>
                                </div>
                                <button onClick={() => copyToClipboard(`${clip.start || clip.duration}s: ${clip.reason}`, 'Clip Idea')} className="text-xs px-3 py-1 bg-zinc-800 rounded-full">Copy</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {showTextZernioModal && (
                        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                          <div className="bg-zinc-900 rounded-3xl p-8 max-w-md w-full mx-4">
                            <h3 className="text-2xl font-bold mb-6">Post to Zernio</h3>
                            <div className="space-y-6">
                              <div>
                                <label className="block text-sm text-zinc-400 mb-1">Connected Account</label>
                                <select
                                  value={selectedTextAccountId}
                                  onChange={(e) => setSelectedTextAccountId(e.target.value)}
                                  className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-4 py-3 focus:outline-none"
                                >
                                  <option value="">Select account...</option>
                                  {textConnectedAccounts.map((acc) => (
                                    <option key={acc._id} value={acc._id}>
                                      {acc.platform.toUpperCase()} — {acc.name || acc.username || acc._id}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="flex gap-3 pt-4">
                                <button onClick={() => setShowTextZernioModal(false)} className="flex-1 py-4 border border-white/20 rounded-2xl hover:bg-white/5">Cancel</button>
                                <button onClick={postTextToZernio} disabled={!selectedTextAccountId} className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 rounded-2xl font-semibold disabled:opacity-50">Post Now</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* VIDEO MODE */}
              {activeMode === 'video' && (
                <div className="max-w-4xl mx-auto">
                  <VideoRecorder user={user} onAmplifySuccess={handleAmplifySuccess} />
                </div>
              )}

              {/* AUDIO MODE */}
              {activeMode === 'audio' && (
                <div className="max-w-4xl mx-auto">
                  <AudioProcessor user={user} onAmplifySuccess={handleAmplifySuccess} />
                </div>
              )}
            </div>

            {/* History sidebar */}
            {showHistory && (
              <div className="w-96 bg-zinc-950 border-l border-white/10 p-6 overflow-auto h-screen sticky top-0">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold flex items-center gap-2">
                    <Clock className="w-5 h-5" /> History
                  </h3>
                  <button onClick={() => setShowHistory(false)} className="text-zinc-400 hover:text-white">✕</button>
                </div>

                <div className="relative mb-6">
                  <Search className="absolute left-4 top-3.5 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search history..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-3xl pl-11 py-3 text-sm focus:outline-none focus:border-violet-400"
                  />
                </div>

                <div className="flex gap-2 mb-6 bg-zinc-900 p-1 rounded-3xl">
                  {(['all', 'text', 'video', 'audio'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveHistoryTab(tab)}
                      className={`flex-1 py-3 rounded-3xl text-sm font-medium transition-all ${
                        activeHistoryTab === tab ? 'bg-violet-600 text-white' : 'hover:bg-white/5'
                      }`}
                    >
                      {tab === 'all' ? 'All' : tab === 'text' ? 'Text' : tab === 'video' ? 'Videos' : 'Audio'}
                    </button>
                  ))}
                </div>

                {(activeHistoryTab === 'all' || activeHistoryTab === 'video') && (
                  <div className="mb-10">
                    <h4 className="uppercase text-xs tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                      <Video className="w-4 h-4" /> Videos
                    </h4>
                    {filteredVideoItems.length === 0 && historyItems.length > 0 && (
                      <p className="text-zinc-500 py-8 text-center">No matching videos</p>
                    )}
                    {filteredVideoItems.map((vid) => (
                      <div key={vid.id} className="bg-zinc-900 rounded-3xl overflow-hidden mb-6 group">
                        <div 
                          className="relative aspect-video bg-black cursor-pointer"
                          onClick={() => setPreviewVideo({ url: vid.video_url!, name: vid.file_name || 'Video' })}
                        >
                          <img 
                            src={vid.thumbnail_url || vid.video_url} 
                            alt="" 
                            className="w-full h-full object-cover" 
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/30 transition-all">
                            <Play className="w-12 h-12 text-white drop-shadow-lg" />
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-sm line-clamp-1">{vid.file_name || 'Recorded video'}</p>
                              <p className="text-xs text-zinc-500">
                                {formatDistanceToNow(new Date(vid.created_at), { addSuffix: true })}
                              </p>
                            </div>
                            <button 
                              onClick={() => deleteHistoryItem(vid.id, 'video')} 
                              disabled={deletingId === vid.id}
                              className="text-red-400 hover:text-red-500 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          {vid.transcription && (
                            <p className="text-xs text-zinc-400 mt-3 line-clamp-2">{vid.transcription}</p>
                          )}

                          <div className="mt-4">
                            <label className="block text-xs text-zinc-400 mb-1 flex items-center gap-1">
                              <Download className="w-3 h-3" /> Download formatted for…
                            </label>
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  optimizeAndDownload(vid.video_url!, e.target.value, vid.file_name || 'video');
                                  e.target.value = '';
                                }
                              }}
                              style={{ colorScheme: 'dark' }}
                              className="w-full bg-zinc-900 text-white border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-violet-400 transition-colors"
                            >
                              <option value="">Choose platform…</option>
                              {platforms.map((p) => (
                                <option key={p.value} value={p.value}>
                                  {p.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <button
                            onClick={() => generateSmartClips(vid.video_url!, vid.id, vid.file_name!, vid.transcription, 'video')}
                            disabled={generatingClipsFor === vid.id}
                            className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-xs py-3 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                          >
                            {generatingClipsFor === vid.id ? (
                              <>Generating clips <RefreshCw className="w-3 h-3 animate-spin" /></>
                            ) : (
                              <>✂️ Smart Clips (15/30/60s hooks)</>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {(activeHistoryTab === 'all' || activeHistoryTab === 'audio') && (
                  <div className="mb-10">
                    <h4 className="uppercase text-xs tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                      <Mic className="w-4 h-4" /> Audio
                    </h4>
                    {filteredAudioItems.length === 0 && historyItems.length > 0 && (
                      <p className="text-zinc-500 py-8 text-center">No matching audio files</p>
                    )}
                    {filteredAudioItems.map((aud) => (
                      <div key={aud.id} className="bg-zinc-900 rounded-3xl overflow-hidden mb-6 group">
                        <div className="p-4 bg-black">
                          <audio 
                            controls 
                            className="w-full"
                            src={aud.video_url}
                          />
                        </div>
                        <div className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-sm line-clamp-1">{aud.file_name || 'Recorded audio'}</p>
                              <p className="text-xs text-zinc-500">
                                {formatDistanceToNow(new Date(aud.created_at), { addSuffix: true })}
                              </p>
                            </div>
                            <button 
                              onClick={() => deleteHistoryItem(aud.id, 'audio')} 
                              disabled={deletingId === aud.id}
                              className="text-red-400 hover:text-red-500 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          {aud.transcription && (
                            <p className="text-xs text-zinc-400 mt-3 line-clamp-2">{aud.transcription}</p>
                          )}

                          <button
                            onClick={() => generateSmartClips(aud.video_url!, aud.id, aud.file_name!, aud.transcription, 'audio')}
                            disabled={generatingClipsFor === aud.id}
                            className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-xs py-3 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                          >
                            {generatingClipsFor === aud.id ? (
                              <>Generating clips <RefreshCw className="w-3 h-3 animate-spin" /></>
                            ) : (
                              <>✂️ Smart Clips (15/30/60s hooks)</>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {(activeHistoryTab === 'all' || activeHistoryTab === 'text') && (
                  <div>
                    <h4 className="uppercase text-xs tracking-widest text-zinc-500 mb-4">Text Content</h4>
                    {filteredText.length === 0 && historyItems.length > 0 && (
                      <p className="text-zinc-500 py-8 text-center">No matching text</p>
                    )}
                    {filteredText.map((item) => (
                      <div 
                        key={item.id} 
                        onClick={() => { 
                          setContent(item.original_content!); 
                          setShowHistory(false); 
                          window.scrollTo({ top: 0, behavior: 'smooth' }); 
                        }}
                        className="bg-zinc-900 rounded-3xl p-5 mb-4 cursor-pointer hover:bg-zinc-800 group relative"
                      >
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteHistoryItem(item.id, 'text');
                          }}
                          className="absolute top-4 right-4 text-red-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <p className="line-clamp-3 text-sm text-zinc-300">{item.original_content}</p>
                        <p className="text-xs text-zinc-500 mt-3">
                          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {filteredText.length === 0 && filteredVideoItems.length === 0 && filteredAudioItems.length === 0 && historyItems.length === 0 && (
                  <p className="text-center py-20 text-zinc-500">Your amplified content will appear here</p>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals unchanged */}
      {showZernioKeyModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-3xl p-8 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">Zernio Setup</h3>
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

      {previewVideo && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[9999] p-4"
          onClick={() => setPreviewVideo(null)}
        >
          <div 
            className="max-w-4xl w-full mx-auto bg-zinc-950 rounded-3xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {previewVideo.isAudio ? (
              <audio controls autoPlay className="w-full p-8" src={previewVideo.url} />
            ) : (
              <video 
                controls 
                autoPlay 
                className="w-full aspect-video" 
                src={previewVideo.url} 
              />
            )}
            <div className="p-6 flex justify-between items-center">
              <p className="text-white/70">{previewVideo.name}</p>
              <button 
                onClick={() => setPreviewVideo(null)}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-2xl text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {clipModal && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[10000] p-4"
          onClick={() => setClipModal(null)}
        >
          <div 
            className="max-w-3xl w-full mx-auto bg-zinc-950 rounded-3xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-xl font-bold">
                Smart Clips for this {clipModal.type}
              </h3>
              <button onClick={() => setClipModal(null)} className="text-zinc-400 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-6 max-h-[70vh] overflow-auto">
              {clipModal.clips.map((clip: SmartClip, i: number) => (
                <div key={i} className="flex gap-4 bg-zinc-900 rounded-3xl p-4">
                  <div className="flex-1">
                    {clipModal.type === 'video' ? (
                      <video controls className="w-full rounded-2xl" src={clip.url} />
                    ) : (
                      <audio controls className="w-full" src={clip.url} />
                    )}
                  </div>
                  <div className="w-48 flex flex-col justify-between gap-3">
                    <div>
                      <div className="text-emerald-400 text-sm font-medium">{clip.duration}s hook</div>
                      <p className="text-xs text-zinc-400 line-clamp-4 mt-2">{clip.reason}</p>
                    </div>

                    {clipModal.type === 'video' && (
                      <>
                        <button
                          onClick={() => burnCaptions(clip.url, clip.duration, clip.filename, clip.transcription)}
                          disabled={burningCaptionsFor === clip.filename}
                          className="bg-violet-600 hover:bg-violet-700 py-3 rounded-2xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {burningCaptionsFor === clip.filename ? (
                            <>Burning captions <RefreshCw className="w-3 h-3 animate-spin" /></>
                          ) : (
                            <>🔥 Burn Captions</>
                          )}
                        </button>

                        <button
                          onClick={() => generateThumbnail(clip.url, clip.filename)}
                          disabled={generatingThumbnailFor === clip.filename}
                          className="bg-amber-600 hover:bg-amber-700 py-3 rounded-2xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {generatingThumbnailFor === clip.filename ? (
                            <>Extracting thumbnail <RefreshCw className="w-3 h-3 animate-spin" /></>
                          ) : (
                            <>🖼️ Thumbnail</>
                          )}
                        </button>
                      </>
                    )}

                    <button
                      onClick={async () => {
                        try {
                          const response = await fetch(clip.url);
                          const blob = await response.blob();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = clip.filename;
                          a.click();
                          URL.revokeObjectURL(url);
                          showToast(`Downloaded ${clip.duration}s clip!`);
                        } catch {
                          showToast('Download failed', true);
                        }
                      }}
                      className="bg-white/10 hover:bg-white/20 py-3 rounded-2xl text-sm flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" /> Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}