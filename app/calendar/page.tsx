'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Clock, LogOut, Calendar as CalendarIcon, List, Send, Plus, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getUnifiedHistory, loadScheduledPosts } from '../supabase';
import { formatDistanceToNow } from 'date-fns';

const supabase = createClient();

export default function CalendarPage() {
  const [user, setUser] = useState<any>(null);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'calendar' | 'history' | 'scheduled'>('history');
  const [activeHistoryTab, setActiveHistoryTab] = useState<'all' | 'text' | 'video' | 'audio'>('all');
  const [historySearch, setHistorySearch] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedZernioAccount, setSelectedZernioAccount] = useState<string>('');
  const [zernioAccounts, setZernioAccounts] = useState<any[]>([]);

  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      loadHistories();
      loadScheduled();
      loadZernioAccounts();
    }
  }, [user]);

  const loadHistories = async () => {
    if (!user) return;
    const items = await getUnifiedHistory(user.id);
    setHistoryItems(items);
  };

  const loadScheduled = async () => {
    if (!user) return;
    const posts = await loadScheduledPosts(user.id);
    setScheduledPosts(posts);
  };

  const loadZernioAccounts = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/zernio/accounts?user_id=${user.id}`);
      const data = await res.json();
      if (data.accounts) setZernioAccounts(data.accounts);
    } catch (e) {}
  };

  const filteredHistory = historyItems.filter(item => {
    const searchTerm = historySearch.toLowerCase();
    const matchesSearch = (item.original_content || item.file_name || '').toLowerCase().includes(searchTerm);
    if (activeHistoryTab === 'all') return matchesSearch;
    return matchesSearch && item.type === activeHistoryTab;
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  // Calendar grid helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth };
  };

  const renderCalendarGrid = () => {
    const { firstDay, daysInMonth } = getDaysInMonth(currentMonth);
    const days = [];
    const today = new Date();

    // Previous month padding
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`pad-${i}`} className="h-24 bg-zinc-950 border border-white/5" />);
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayScheduled = scheduledPosts.filter(p => p.scheduled_at.startsWith(dateStr));
      
      const isToday = today.getDate() === day && 
                      today.getMonth() === currentMonth.getMonth() && 
                      today.getFullYear() === currentMonth.getFullYear();

      days.push(
        <div 
          key={day}
          onClick={() => {
            setSelectedDate(dateStr);
            setShowAddModal(true);
          }}
          className={`h-24 border border-white/10 p-2 cursor-pointer hover:bg-zinc-800 transition-all flex flex-col ${isToday ? 'bg-violet-500/10 border-violet-400' : ''}`}
        >
          <div className="flex justify-between text-xs">
            <span className={`font-medium ${isToday ? 'text-violet-400' : ''}`}>{day}</span>
            {dayScheduled.length > 0 && (
              <span className="bg-emerald-500 text-[10px] px-1.5 rounded-full text-white flex items-center">{dayScheduled.length}</span>
            )}
          </div>
          <div className="flex-1 text-[10px] overflow-hidden">
            {dayScheduled.slice(0, 2).map((post: any, i: number) => (
              <div key={i} className="truncate text-emerald-400 text-[10px] mt-1">
                {post.history_item?.file_name || post.history_item?.original_content?.substring(0, 20) || 'Scheduled'}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none" 
           style={{ backgroundImage: "url('/space-bg.jpg')" }} />
      <div className="fixed inset-0 bg-black/70 pointer-events-none" />

      {/* Identical Nav Bar as Home Page */}
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
              <button onClick={() => window.location.href = '/calendar'} className="text-violet-400 font-medium flex items-center gap-1">
                <Clock className="w-4 h-4" /> Calendar
              </button>
              <button onClick={() => window.location.href = '/'} className="flex items-center gap-2 hover:text-violet-400 transition">
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

      <main className="max-w-6xl mx-auto px-6 py-8 relative">
        <div className="flex items-center gap-3 mb-8">
          <CalendarIcon className="w-8 h-8 text-violet-400" />
          <h1 className="text-4xl font-bold tracking-tighter">Content Calendar</h1>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 mb-8">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-8 py-4 text-sm font-medium transition-colors ${
              activeTab === 'calendar' ? 'border-b-2 border-violet-400 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-8 py-4 text-sm font-medium transition-colors ${
              activeTab === 'history' ? 'border-b-2 border-violet-400 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Content History
          </button>
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`px-8 py-4 text-sm font-medium transition-colors ${
              activeTab === 'scheduled' ? 'border-b-2 border-violet-400 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Scheduled Posts
          </button>
        </div>

        {/* Calendar Tab */}
        {activeTab === 'calendar' && (
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6">
            {/* Month header */}
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-2 hover:bg-white/10 rounded-2xl">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-2xl font-semibold">
                {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h2>
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-2 hover:bg-white/10 rounded-2xl">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-px bg-zinc-800 rounded-3xl mb-px">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="bg-zinc-900 text-center py-3 text-xs font-medium text-zinc-400">{day}</div>
              ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 gap-px bg-zinc-800 rounded-3xl overflow-hidden">
              {renderCalendarGrid()}
            </div>
          </div>
        )}

        {/* Content History Tab */}
        {activeTab === 'history' && (
          <div>
            <div className="flex gap-2 mb-6 bg-zinc-900 p-1 rounded-3xl inline-flex">
              {(['all', 'text', 'video', 'audio'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveHistoryTab(tab)}
                  className={`px-6 py-2.5 rounded-3xl text-sm font-medium transition-all ${
                    activeHistoryTab === tab ? 'bg-violet-600 text-white' : 'hover:bg-white/5 text-zinc-400'
                  }`}
                >
                  {tab === 'all' ? 'All' : tab === 'text' ? 'Text' : tab === 'video' ? 'Videos' : 'Audio'}
                </button>
              ))}
            </div>

            <div className="relative mb-6">
              <input
                type="text"
                placeholder="Search history..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-3xl pl-11 py-3 text-sm focus:outline-none focus:border-violet-400"
              />
            </div>

            <div className="grid gap-6">
              {filteredHistory.length === 0 ? (
                <p className="text-zinc-500 py-12 text-center">Your amplified content will appear here</p>
              ) : (
                filteredHistory.map((item) => (
                  <div key={item.id} className="bg-zinc-900 border border-white/10 rounded-3xl p-6 flex gap-6">
                    <div className="flex-1">
                      <p className="font-medium">{item.file_name || item.original_content?.substring(0, 60) || 'Content item'}</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="text-xs px-4 py-1 bg-zinc-800 rounded-full self-start">
                      {item.type}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Scheduled Posts Tab */}
        {activeTab === 'scheduled' && (
          <div className="space-y-6">
            {scheduledPosts.map((post) => (
              <div key={post.id} className="bg-zinc-900 border border-white/10 rounded-3xl p-6 flex justify-between items-center">
                <div>
                  <p className="font-medium">{post.history_item?.file_name || 'Scheduled content'}</p>
                  <p className="text-xs text-zinc-500">{new Date(post.scheduled_at).toLocaleString()}</p>
                </div>
                <div className="text-emerald-400 text-sm">Pending</div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add to Calendar Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-3xl p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold mb-6">Add to Calendar</h3>
            <div className="mb-6">
              <label className="block text-sm text-zinc-400 mb-2">Date</label>
              <input type="text" value={selectedDate} readOnly className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-4 py-3" />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Zernio Account</label>
              <select
                value={selectedZernioAccount}
                onChange={(e) => setSelectedZernioAccount(e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-4 py-3"
              >
                <option value="">Select account...</option>
                {zernioAccounts.map(acc => (
                  <option key={acc._id} value={acc._id}>
                    {acc.platform} — {acc.name || acc.username}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 border border-white/20 rounded-2xl">Cancel</button>
              <button onClick={() => { /* schedule logic */ setShowAddModal(false); }} className="flex-1 py-4 bg-violet-600 rounded-2xl font-semibold">Schedule Post</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}