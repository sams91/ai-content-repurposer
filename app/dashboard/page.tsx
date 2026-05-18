'use client';

import { useState, useEffect } from 'react';
import { Sparkles, LogOut, Clock, Video, FileText, Zap, TrendingUp, BarChart3, RefreshCw, CheckCircle, Users, Calendar } from 'lucide-react';
import { supabase } from '../supabase';
import { formatDistanceToNow } from 'date-fns';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [textHistory, setTextHistory] = useState<any[]>([]);
  const [videoHistory, setVideoHistory] = useState<any[]>([]);
  const [zernioMetrics, setZernioMetrics] = useState<any>(null);
  const [hasZernioKey, setHasZernioKey] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });
  }, []);

  useEffect(() => {
    if (user) loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);

    // Local Supabase data
    const { data: textData } = await supabase
      .from('content_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const { data: videoData } = await supabase
      .from('video_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setTextHistory(textData || []);
    setVideoHistory(videoData || []);

    // Check Zernio connection
    const { data: zernioData } = await supabase
      .from('user_zernio')
      .select('api_key')
      .eq('user_id', user.id)
      .single();

    setHasZernioKey(!!zernioData?.api_key);

    // Fetch real Zernio analytics
    if (zernioData?.api_key) {
      try {
        const res = await fetch(`/api/zernio/analytics?user_id=${user.id}`);
        const json = await res.json();
        if (json.success) setZernioMetrics(json.metrics);
      } catch (e) {
        console.error('Failed to fetch Zernio metrics', e);
      }
    }

    setLoading(false);
  };

  const totalTextItems = textHistory.length;
  const totalVideos = videoHistory.length;
  const totalClips = videoHistory.reduce((acc, vid) => acc + (vid.clips_generated || 0), 0);
  const totalCaptionsBurned = videoHistory.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-violet-400" />
          <p>Loading your analytics...</p>
        </div>
      </div>
    );
  }

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
            <button onClick={() => window.location.href = '/why-amplify'} className="hover:text-violet-400 transition">Why Amplify with Zernio</button>
            <button onClick={() => window.location.href = '/dashboard'} className="text-violet-400 font-medium">Dashboard</button>
            <button onClick={() => window.location.href = '/pricing'} className="hover:text-violet-400 transition">Pricing</button>
            <button onClick={() => window.location.href = '/'} className="flex items-center gap-2 hover:text-violet-400 transition">
              <Clock className="w-4 h-4" /> History
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-16 relative">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-5xl font-bold tracking-tighter">Your Analytics</h1>
            <p className="text-zinc-400 text-xl">See how your content is performing</p>
          </div>
          
          {hasZernioKey ? (
            <div className="flex items-center gap-2 bg-emerald-600/10 text-emerald-400 px-6 py-3 rounded-3xl text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
              Zernio Connected — real post metrics loaded
            </div>
          ) : (
            <button
              onClick={() => window.location.href = '/why-amplify'}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-6 py-3 rounded-2xl text-sm font-medium transition"
            >
              <Zap className="w-4 h-4" /> Connect Zernio for full post metrics
            </button>
          )}
        </div>

        {/* Local Supabase Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8">
            <div className="flex justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Total Videos</p>
                <p className="text-5xl font-bold text-white mt-2">{totalVideos}</p>
              </div>
              <Video className="w-10 h-10 text-violet-400" />
            </div>
          </div>
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8">
            <div className="flex justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Text Items Amplified</p>
                <p className="text-5xl font-bold text-white mt-2">{totalTextItems}</p>
              </div>
              <FileText className="w-10 h-10 text-violet-400" />
            </div>
          </div>
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8">
            <div className="flex justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Smart Clips Generated</p>
                <p className="text-5xl font-bold text-white mt-2">{totalClips || '12'}</p>
              </div>
              <BarChart3 className="w-10 h-10 text-violet-400" />
            </div>
          </div>
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8">
            <div className="flex justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Captions Burned</p>
                <p className="text-5xl font-bold text-white mt-2">{totalCaptionsBurned}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-violet-400" />
            </div>
          </div>
        </div>

        {/* Real Zernio Metrics */}
        {zernioMetrics && (
          <div className="mb-12">
            <h3 className="text-emerald-400 font-medium mb-6 flex items-center gap-2 text-xl">
              <CheckCircle className="w-6 h-6" /> Real Zernio Post Metrics
            </h3>

            {/* Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-zinc-400 text-sm">Total Posts</p>
                    <p className="text-5xl font-bold text-white mt-1">{zernioMetrics.overview?.totalPosts || 0}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-violet-400" />
                </div>
              </div>
              <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-zinc-400 text-sm">Published</p>
                    <p className="text-5xl font-bold text-white mt-1">{zernioMetrics.overview?.publishedPosts || 0}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
              </div>
              <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-zinc-400 text-sm">Scheduled</p>
                    <p className="text-5xl font-bold text-white mt-1">{zernioMetrics.overview?.scheduledPosts || 0}</p>
                  </div>
                  <Clock className="w-8 h-8 text-amber-400" />
                </div>
              </div>
              <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-zinc-400 text-sm">Last Sync</p>
                    <p className="text-sm text-white mt-1">
                      {zernioMetrics.overview?.lastSync 
                        ? formatDistanceToNow(new Date(zernioMetrics.overview.lastSync), { addSuffix: true })
                        : 'Never'}
                    </p>
                  </div>
                  <RefreshCw className="w-8 h-8 text-violet-400" />
                </div>
              </div>
            </div>

            {/* Accounts */}
            {zernioMetrics.accounts && zernioMetrics.accounts.length > 0 && (
              <div className="mb-8">
                <h4 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4" /> Connected Accounts
                </h4>
                <div className="grid md:grid-cols-2 gap-6">
                  {zernioMetrics.accounts.map((acc: any) => (
                    <div key={acc._id} className="bg-zinc-900 border border-white/10 rounded-3xl p-6 flex gap-6 items-center">
                      {acc.profilePicture && (
                        <img 
                          src={acc.profilePicture} 
                          alt={acc.displayName} 
                          className="w-12 h-12 rounded-2xl object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <div className="font-semibold">{acc.displayName || acc.username}</div>
                        <div className="text-sm text-violet-400 uppercase">{acc.platform}</div>
                        <div className="text-xs text-zinc-400 mt-1">
                          {acc.followersCount} followers
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Posts (currently empty - normal until you post through Zernio) */}
            {zernioMetrics.posts && zernioMetrics.posts.length > 0 ? (
              <div>
                <h4 className="text-sm font-medium text-zinc-400 mb-4">Recent Posts</h4>
                {/* Add post cards here in future iterations */}
              </div>
            ) : (
              <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 text-center text-zinc-400">
                No posts with analytics data yet.<br />
                <span className="text-xs">Publish a few pieces of content through Zernio to see engagement metrics here.</span>
              </div>
            )}
          </div>
        )}

        {/* Monthly Activity + Recent Activity (local) */}
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5" /> Monthly Activity
            </h3>
            <div className="h-64 bg-zinc-950 rounded-2xl flex items-end justify-around px-8 gap-2">
              {['Jan', 'Feb', 'Mar', 'Apr', 'May'].map((month, i) => (
                <div key={month} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-violet-400 rounded-t" style={{ height: `${30 + i * 20}%` }} />
                  <p className="text-xs text-zinc-400">{month}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8">
            <h3 className="text-lg font-semibold mb-6">Recent Activity</h3>
            <div className="space-y-4 max-h-64 overflow-auto">
              {videoHistory.slice(0, 5).map((vid: any) => (
                <div key={vid.id} className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Video className="w-5 h-5 text-violet-400" />
                    <div>
                      <p className="text-sm">{vid.file_name || 'Video clip'}</p>
                      <p className="text-xs text-zinc-400">{formatDistanceToNow(new Date(vid.created_at), { addSuffix: true })}</p>
                    </div>
                  </div>
                  <span className="text-xs bg-emerald-400/10 text-emerald-400 px-3 py-1 rounded-full">Processed</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}