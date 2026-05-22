'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Calendar, Plus, Trash2, RefreshCw, Send, Play, Mic, Video as VideoIcon, ArrowLeft, Clock } from 'lucide-react';
import { supabase } from '../supabase';
import { getUnifiedHistory } from '../supabase';
import { formatDistanceToNow } from 'date-fns';

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

interface HistoryItem {
  id: string;
  type: 'text' | 'video' | 'audio';
  original_content?: string;
  file_name?: string;
  video_url?: string;
  transcription?: string;
  created_at: string;
  outputs?: any;
}

interface ScheduledPost {
  id: string;
  historyItem: HistoryItem;
  scheduledAt: string;
  platform: string;
  createdAt: string;
}

export default function CalendarPage() {
  const [user, setUser] = useState<any>(null);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [activeTab, setActiveTab] = useState<'history' | 'scheduled'>('history');
  const [activeHistoryFilter, setActiveHistoryFilter] = useState<'all' | 'text' | 'video' | 'audio'>('all');
  const [historySearch, setHistorySearch] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [itemToSchedule, setItemToSchedule] = useState<HistoryItem | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [textConnectedAccounts, setTextConnectedAccounts] = useState<any[]>([]);

  const log = (msg: string, data?: any) => console.log(`[Calendar] ${msg}`, data || '');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadHistory = async () => {
    if (!user) return;
    setIsLoading(true);
    setError('');
    log('Loading unified history...');

    try {
      const items = await getUnifiedHistory(user.id);
      setHistoryItems(items);
      log('History loaded', { count: items.length });
    } catch (err: any) {
      console.error(err);
      setError('Failed to load history. Check Supabase connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadScheduledPosts = () => {
    const saved = localStorage.getItem('scheduledPosts');
    if (saved) {
      const parsed: ScheduledPost[] = JSON.parse(saved);
      const future = parsed.filter(p => new Date(p.scheduledAt) > new Date());
      setScheduledPosts(future.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()));
      log('Loaded scheduled posts', { count: future.length });
    } else {
      setScheduledPosts([]);
    }
  };

  const saveScheduledPosts = (posts: ScheduledPost[]) => {
    localStorage.setItem('scheduledPosts', JSON.stringify(posts));
    log('Saved scheduled posts', { count: posts.length });
  };

  useEffect(() => {
    if (user) loadHistory();
  }, [user]);

  useEffect(() => {
    if (activeTab === 'scheduled') loadScheduledPosts();
  }, [activeTab]);

  const filteredHistory = historyItems.filter(item => {
    if (historySearch) {
      const term = historySearch.toLowerCase();
      return (item.type === 'text' ? item.original_content : item.file_name || '').toLowerCase().includes(term);
    }
    if (activeHistoryFilter === 'all') return true;
    return item.type === activeHistoryFilter;
  });

  const openScheduleModal = (item: HistoryItem) => {
    setItemToSchedule(item);
    setScheduleDate('');
    setScheduleTime('');
    setSelectedPlatform('');
    setShowScheduleModal(true);
    log('Schedule modal opened for', item.id);
  };

  const fetchConnectedAccounts = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/zernio/accounts?user_id=${user.id}`);
      const data = await res.json();
      if (data.accounts) setTextConnectedAccounts(data.accounts);
      log('Fetched Zernio accounts', { count: data.accounts?.length || 0 });
    } catch (e) {
      console.error("Failed to fetch Zernio accounts", e);
    }
  };

  const handleScheduleSubmit = () => {
    if (!itemToSchedule || !scheduleDate || !scheduleTime || !selectedPlatform) {
      alert('Please fill in date, time, and platform');
      return;
    }

    const scheduledAt = `${scheduleDate}T${scheduleTime}`;
    const newPost: ScheduledPost = {
      id: `sched_${Date.now()}`,
      historyItem: itemToSchedule,
      scheduledAt,
      platform: selectedPlatform,
      createdAt: new Date().toISOString(),
    };

    const updated = [...scheduledPosts, newPost];
    setScheduledPosts(updated);
    saveScheduledPosts(updated);

    setShowScheduleModal(false);
    setActiveTab('scheduled');

    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#10b981;color:white;padding:16px 24px;border-radius:16px;box-shadow:0 10px 15px -3px rgb(0 0 0 / 0.3);z-index:9999;';
    toast.textContent = `✅ Scheduled for ${new Date(scheduledAt).toLocaleString()} on ${selectedPlatform}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  };

  const deleteScheduledPost = (id: string) => {
    const updated = scheduledPosts.filter(p => p.id !== id);
    setScheduledPosts(updated);
    saveScheduledPosts(updated);
  };

  const postNowToZernio = async (post: ScheduledPost) => {
    if (!user || !post.historyItem) return;

    await fetchConnectedAccounts();

    if (textConnectedAccounts.length === 0) {
      alert('No Zernio accounts connected yet. Go to main page → Post with Zernio to connect.');
      return;
    }

    const account = textConnectedAccounts[0]; // use first connected account (you can expand to a selector later)

    try {
      const res = await fetch('/api/zernio/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform_id: account._id,
          platform: account.platform || post.platform,
          content: post.historyItem.type === 'text' 
            ? post.historyItem.original_content 
            : post.historyItem.file_name || 'Amplified content',
          video_url: post.historyItem.video_url,
          user_id: user.id,
        }),
      });

      const json = await res.json();
      if (json.success) {
        alert(`🚀 Successfully posted to ${post.platform} via Zernio!`);
        deleteScheduledPost(post.id);
      } else {
        alert('Zernio error: ' + (json.error || 'Unknown error'));
      }
    } catch (e) {
      console.error(e);
      alert('Failed to post to Zernio');
    }
  };

  const manualRefresh = () => {
    log('Manual refresh triggered');
    if (activeTab === 'history') loadHistory();
    else loadScheduledPosts();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Sign in to access Content Calendar</h1>
          <button onClick={() => window.location.href = '/'} className="bg-violet-600 hover:bg-violet-700 px-8 py-4 rounded-3xl">Go Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-auto">
      {/* Space background */}
      <div className="fixed inset-0 bg-[url('/space-bg.jpg')] bg-cover bg-center pointer-events-none" />
      <div className="fixed inset-0 bg-black/70 pointer-events-none" />

      {/* Top nav */}
      <nav className="border-b border-white/10 bg-zinc-950/95 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-violet-500 rounded-2xl flex items-center justify-center text-white text-xl font-bold">✦</div>
            <h1 className="text-2xl font-bold tracking-tighter">ContentAmplifier</h1>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <button onClick={() => window.location.href = '/'} className="flex items-center gap-2 hover:text-violet-400 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Home
            </button>
            <button onClick={manualRefresh} className="flex items-center gap-2 hover:text-violet-400 transition-colors">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12 relative z-10">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-5xl font-bold tracking-tighter">Content Calendar</h1>
            <p className="text-zinc-400">Schedule & manage amplified content</p>
          </div>

          <div className="flex bg-zinc-900 border border-white/10 rounded-3xl p-1">
            <button
              onClick={() => setActiveTab('history')}
              className={`px-8 py-3 rounded-3xl font-medium transition-all ${activeTab === 'history' ? 'bg-white text-black' : 'hover:bg-white/10'}`}
            >
              Content History
            </button>
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`px-8 py-3 rounded-3xl font-medium transition-all ${activeTab === 'scheduled' ? 'bg-white text-black' : 'hover:bg-white/10'}`}
            >
              Scheduled Posts
            </button>
          </div>
        </div>

        {activeTab === 'history' && (
          <div>
            <div className="flex bg-zinc-900 border border-white/10 rounded-3xl p-1 w-fit mb-6">
              {(['all', 'text', 'video', 'audio'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveHistoryFilter(tab)}
                  className={`px-8 py-3 rounded-3xl text-sm font-medium transition-all ${activeHistoryFilter === tab ? 'bg-violet-600 text-white' : 'hover:bg-white/10'}`}
                >
                  {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            <div className="relative mb-8">
              <input
                type="text"
                placeholder="Search history..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-3xl pl-12 py-4 text-sm focus:outline-none focus:border-violet-400"
              />
            </div>

            {isLoading && <p className="text-center py-12 text-zinc-400">Loading history...</p>}
            {error && <p className="text-red-400 text-center py-12">{error}</p>}

            {!isLoading && !error && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredHistory.map((item) => (
                  <div key={item.id} className="bg-zinc-900 border border-white/10 rounded-3xl p-6 hover:border-violet-400 transition-all">
                    <div className="flex items-center gap-3 mb-4">
                      {item.type === 'text' && <span className="text-3xl">📝</span>}
                      {item.type === 'video' && <VideoIcon className="w-7 h-7 text-violet-400" />}
                      {item.type === 'audio' && <Mic className="w-7 h-7 text-violet-400" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {item.type === 'text' ? (item.original_content || '').slice(0, 60) + '...' : item.file_name}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {new Date(item.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {item.transcription && (
                      <p className="text-xs text-zinc-400 line-clamp-3 mb-6">{item.transcription}</p>
                    )}

                    <button
                      onClick={() => openScheduleModal(item)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 py-4 rounded-3xl text-sm font-semibold flex items-center justify-center gap-2"
                    >
                      <Calendar className="w-4 h-4" />
                      Add to Calendar
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && filteredHistory.length === 0 && (
              <p className="text-center py-12 text-zinc-400">No matching items found</p>
            )}
          </div>
        )}

        {activeTab === 'scheduled' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <Calendar className="w-6 h-6" /> Upcoming Posts
              </h2>
              <button onClick={loadScheduledPosts} className="flex items-center gap-2 text-zinc-400 hover:text-white">
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
            </div>

            {scheduledPosts.length === 0 ? (
              <div className="bg-zinc-900 border border-white/10 rounded-3xl p-12 text-center">
                <p className="text-zinc-400">No scheduled posts yet</p>
                <p className="text-sm mt-2">Go to Content History and click “Add to Calendar”</p>
              </div>
            ) : (
              <div className="space-y-6">
                {scheduledPosts.map((post) => (
                  <div key={post.id} className="bg-zinc-900 border border-white/10 rounded-3xl p-6 flex items-center gap-6">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {post.historyItem.type === 'text' && <span className="text-3xl">📝</span>}
                          {post.historyItem.type === 'video' && <VideoIcon className="w-6 h-6" />}
                          {post.historyItem.type === 'audio' && <Mic className="w-6 h-6" />}
                          <div>
                            <p className="font-semibold">{post.platform}</p>
                            <p className="text-emerald-400 text-sm">
                              {new Date(post.scheduledAt).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <button onClick={() => deleteScheduledPost(post.id)} className="text-red-400 hover:text-red-500">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      <p className="mt-4 text-xs text-zinc-400 line-clamp-2">
                        {post.historyItem.type === 'text' ? post.historyItem.original_content : post.historyItem.file_name}
                      </p>
                    </div>
                    <button
                      onClick={() => postNowToZernio(post)}
                      className="bg-emerald-600 hover:bg-emerald-700 px-6 py-3 rounded-3xl text-sm font-semibold flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" /> Post Now
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Schedule Modal – FIXED date/time visibility */}
      {showScheduleModal && itemToSchedule && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]">
          <div className="bg-zinc-900 rounded-3xl p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold mb-6">Schedule Post</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Date</label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-3xl px-5 py-4 text-white placeholder:text-zinc-400 focus:outline-none focus:border-violet-400"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Time</label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-3xl px-5 py-4 text-white placeholder:text-zinc-400 focus:outline-none focus:border-violet-400"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Platform</label>
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-3xl px-5 py-4 text-white focus:outline-none focus:border-violet-400"
                >
                  <option value="">Select platform...</option>
                  {platforms.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowScheduleModal(false)} className="flex-1 py-4 border border-white/20 rounded-3xl hover:bg-white/5">Cancel</button>
                <button onClick={handleScheduleSubmit} className="flex-1 py-4 bg-violet-600 hover:bg-violet-700 rounded-3xl font-semibold">Schedule Post</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}