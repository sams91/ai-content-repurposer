'use client';

import { useState, useEffect } from 'react';
import { CalendarIcon, Clock, Filter, FileText, Video, Mic, Plus, Trash2, X, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, Home, Info, BarChart3, CreditCard, Sparkles } from 'lucide-react';
import { supabase, getUnifiedHistory, loadScheduledPosts, saveScheduledPost, deleteScheduledPost, getItemType } from '../supabase';
import { format, formatDistanceToNow, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';

export default function CalendarPage() {
  const [user, setUser] = useState<any>(null);
  const [contentItems, setContentItems] = useState<any[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'calendar' | 'content' | 'scheduled'>('calendar');
  const [activeFilter, setActiveFilter] = useState<'all' | 'text' | 'video' | 'audio'>('all');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([]);
  const [scheduledAt, setScheduledAt] = useState('');
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      loadContent();
      loadScheduled();
    }
  }, [user]);

  const loadContent = async () => {
    const items = await getUnifiedHistory(user.id);
    setContentItems(items);
  };

  const loadScheduled = async () => {
    const posts = await loadScheduledPosts(user.id);
    setScheduledPosts(posts);
  };

  const fetchConnectedAccounts = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/zernio/accounts?user_id=${user.id}`);
      const data = await res.json();
      if (data.accounts) setConnectedAccounts(data.accounts);
    } catch (e) {
      console.error("Failed to fetch accounts", e);
    }
  };

  const showToast = (message: string, error = false) => {
    setToast({ message, error });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSchedule = async () => {
    if (!selectedItem || !selectedAccountId || !scheduledAt) {
      showToast('Please select a Zernio account and date/time', true);
      return;
    }

    const selectedAccount = connectedAccounts.find(a => a._id === selectedAccountId);
    if (!selectedAccount) return;

    try {
      const scheduledDate = new Date(scheduledAt);
      await saveScheduledPost({
        user_id: user.id,
        history_item: { ...selectedItem, zernio_account_id: selectedAccountId },
        scheduled_at: scheduledDate.toISOString(),
        platform: selectedAccount.platform,
      });
      showToast(`✅ Scheduled for ${format(scheduledDate, 'MMM dd, yyyy HH:mm')}`);
      setShowScheduleModal(false);
      setSelectedItem(null);
      setSelectedAccountId('');
      setScheduledAt('');
      await loadScheduled();
      setActiveTab('scheduled');
    } catch (e) {
      showToast('Failed to schedule post', true);
    }
  };

  const filteredContent = activeFilter === 'all' 
    ? contentItems 
    : contentItems.filter(item => item.type === activeFilter);

  const getTypeIcon = (type: string) => {
    if (type === 'text') return <FileText className="w-5 h-5 text-blue-400" />;
    if (type === 'audio') return <Mic className="w-5 h-5 text-purple-400" />;
    return <Video className="w-5 h-5 text-green-400" />;
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getScheduledForDay = (day: Date) => {
    return scheduledPosts.filter(post => isSameDay(new Date(post.scheduled_at), day));
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* IDENTICAL NAV BAR FROM HOME PAGE */}
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

              <span className="text-zinc-400">{user.email}</span>
              <button onClick={() => window.location.href = '/'} className="flex items-center gap-2 text-zinc-400 hover:text-white transition">
                Sign out
              </button>
            </div>
          )}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <CalendarIcon className="w-10 h-10 text-blue-400" />
            <h1 className="text-5xl font-bold tracking-tighter">Content Calendar</h1>
          </div>
        </div>

        <div className="flex border-b border-zinc-800 mb-8">
          <button onClick={() => setActiveTab('calendar')} className={`px-8 py-4 text-lg font-medium transition-colors ${activeTab === 'calendar' ? 'border-b-4 border-blue-500 text-white' : 'text-zinc-400 hover:text-white'}`}>Calendar</button>
          <button onClick={() => setActiveTab('content')} className={`px-8 py-4 text-lg font-medium transition-colors ${activeTab === 'content' ? 'border-b-4 border-blue-500 text-white' : 'text-zinc-400 hover:text-white'}`}>Content History</button>
          <button onClick={() => setActiveTab('scheduled')} className={`px-8 py-4 text-lg font-medium transition-colors ${activeTab === 'scheduled' ? 'border-b-4 border-blue-500 text-white' : 'text-zinc-400 hover:text-white'}`}>Scheduled Posts</button>
        </div>

        {/* CALENDAR VIEW TAB */}
        {activeTab === 'calendar' && (
          <div className="bg-zinc-900 rounded-3xl p-8">
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-3 hover:bg-zinc-800 rounded-2xl"><ChevronLeft className="w-6 h-6" /></button>
              <h2 className="text-3xl font-semibold">{format(currentMonth, 'MMMM yyyy')}</h2>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-3 hover:bg-zinc-800 rounded-2xl"><ChevronRight className="w-6 h-6" /></button>
            </div>

            <div className="grid grid-cols-7 gap-px text-center text-zinc-400 text-sm mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-px bg-zinc-800 rounded-3xl overflow-hidden">
              {days.map((day, i) => {
                const dayPosts = getScheduledForDay(day);
                return (
                  <div key={i} className={`min-h-[160px] p-3 bg-zinc-900 hover:bg-zinc-800 transition-colors flex flex-col ${!isSameMonth(day, currentMonth) ? 'opacity-30' : ''}`}>
                    <div className="text-right text-sm mb-2">{format(day, 'd')}</div>
                    <div className="flex-1 space-y-1 overflow-auto">
                      {dayPosts.length > 0 ? (
                        dayPosts.map((post: any) => (
                          <div key={post.id} className="text-xs bg-blue-900/30 text-blue-300 px-2 py-1 rounded-xl line-clamp-2">
                            {format(new Date(post.scheduled_at), 'HH:mm')} – {post.history_item?.title || post.platform}
                          </div>
                        ))
                      ) : (
                        <div className="text-[10px] text-zinc-500 text-center mt-6">—</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CONTENT HISTORY TAB */}
        {activeTab === 'content' && (
          <>
            <div className="flex gap-2 mb-6">
              {(['all', 'text', 'video', 'audio'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-5 py-2 rounded-2xl text-sm flex items-center gap-2 transition-all ${activeFilter === f ? 'bg-blue-600 text-white' : 'bg-zinc-900 hover:bg-zinc-800'}`}
                >
                  {f === 'all' && <Filter className="w-4 h-4" />}
                  {f === 'text' && <FileText className="w-4 h-4" />}
                  {f === 'video' && <Video className="w-4 h-4" />}
                  {f === 'audio' && <Mic className="w-4 h-4" />}
                  {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredContent.map(item => (
                <div key={item.id} className="bg-zinc-900 rounded-3xl p-6 hover:bg-zinc-800 transition-all group">
                  <div className="flex items-center gap-3 mb-4">
                    {getTypeIcon(item.type)}
                    <span className="font-medium capitalize">{item.type}</span>
                    <span className="text-xs text-zinc-500 ml-auto">{formatDistanceToNow(new Date(item.created_at))} ago</span>
                  </div>
                  <div className="font-semibold text-lg mb-2 line-clamp-2">
                    {item.type === 'text' 
                      ? (item.original_content || item.title || 'Untitled Text')
                      : (item.title || item.original_filename || item.file_name || 'Untitled')}
                  </div>
                  {item.video_url && (
                    <div className="aspect-video bg-black rounded-2xl mb-4 flex items-center justify-center overflow-hidden">
                      {item.type === 'audio' ? (
                        <Mic className="w-12 h-12 text-purple-400" />
                      ) : (
                        <video src={item.video_url} className="w-full h-full object-cover" muted />
                      )}
                    </div>
                  )}
                  <button
                    onClick={() => { setSelectedItem(item); setShowScheduleModal(true); }}
                    className="w-full mt-4 bg-white text-black py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:scale-105 transition-transform"
                  >
                    <Plus className="w-5 h-5" />
                    Add to Calendar
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* SCHEDULED POSTS TAB (clean production version) */}
        {activeTab === 'scheduled' && (
          <div className="space-y-4">
            {scheduledPosts.length === 0 ? (
              <div className="bg-zinc-900 rounded-3xl p-12 text-center">
                <Clock className="w-16 h-16 mx-auto text-zinc-600 mb-4" />
                <p className="text-zinc-400">No scheduled posts yet</p>
              </div>
            ) : (
              scheduledPosts.map(post => (
                <div key={post.id} className="bg-zinc-900 rounded-3xl p-6 flex items-center gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono bg-zinc-800 px-3 py-1 rounded-2xl">{post.platform}</span>
                      <span className="text-xs text-zinc-500">{format(new Date(post.scheduled_at), 'MMM dd, yyyy • HH:mm')}</span>
                      {post.status === 'pending' && <span className="text-amber-400 text-xs flex items-center gap-1"><Clock className="w-3 h-3" />Pending</span>}
                      {post.status === 'posted' && <span className="text-green-400 text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3" />Posted</span>}
                    </div>
                    <p className="mt-2 text-lg font-medium line-clamp-1">
                      {post.history_item.title || post.history_item.file_name || post.history_item.original_filename || 'Scheduled content'}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteScheduledPost(post.id).then(() => loadScheduled())}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="w-6 h-6" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Schedule Modal – clean production version */}
        {showScheduleModal && selectedItem && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-zinc-900 rounded-3xl w-full max-w-lg mx-4 p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Schedule Post</h2>
                <button onClick={() => setShowScheduleModal(false)}><X className="w-6 h-6" /></button>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Zernio Connected Account</label>
                  <select 
                    value={selectedAccountId} 
                    onChange={e => setSelectedAccountId(e.target.value)} 
                    onFocus={fetchConnectedAccounts}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-4 text-white"
                  >
                    <option value="">Select account...</option>
                    {connectedAccounts.map(acc => (
                      <option key={acc._id} value={acc._id}>
                        {acc.platform.toUpperCase()} — {acc.name || acc.username || acc._id}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Schedule date &amp; time</label>
                  <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-4 text-white" />
                </div>

                <button onClick={handleSchedule} disabled={!selectedAccountId || !scheduledAt} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 py-5 rounded-2xl text-lg font-semibold transition-colors">
                  Schedule Post
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className={`fixed bottom-6 right-6 px-8 py-4 rounded-3xl flex items-center gap-3 shadow-2xl ${toast.error ? 'bg-red-600' : 'bg-emerald-600'}`}>
            {toast.error ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
            <span className="font-medium">{toast.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}