"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { RotateCcw, Copy, Square, Send, Download } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const MAX_SIZE_MB = 2048;

interface PlatformResult {
  platform: string;
  title?: string;
  description?: string;
  caption?: string;
  hashtags?: string;
  text?: string;
}

interface ConnectedAccount {
  _id: string;
  platform: string;
  name?: string;
  username?: string;
}

export default function VideoRecorder({ onAmplifySuccess }: { onAmplifySuccess?: () => void }) {
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoPublicUrl, setVideoPublicUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isAmplifying, setIsAmplifying] = useState(false);
  const [results, setResults] = useState<PlatformResult[] | null>(null);
  const [transcription, setTranscription] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [showZernioModal, setShowZernioModal] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState('');

  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setCurrentUser(session?.user || null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const startRecording = async () => {
    console.log("🎥 startRecording called");
    setError('');
    setRecordingTime(0);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
      streamRef.current = stream;
      console.log("✅ Camera stream obtained");

      setIsRecording(true);
      await new Promise(resolve => setTimeout(resolve, 10));

      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        await liveVideoRef.current.play();
        console.log("✅ Live video started playing");
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setVideoBlob(blob);
        setSelectedFile(null);
        console.log("✅ Recording stopped, blob created");
      };

      mediaRecorder.start(1000);
      console.log("✅ Recording started");
      timerRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
    } catch (err: any) {
      console.error("❌ Camera error:", err);
      setError('Failed to access camera/microphone.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    setIsRecording(false);
  };

  const triggerFileUpload = () => fileInputRef.current?.click();

  const handleFileSelect = useCallback((file: File) => {
    setError('');
    setResults(null);
    setTranscription('');
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_SIZE_MB) {
      setError(`Video file is too large (max 2GB)`);
      return;
    }
    setSelectedFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setVideoBlob(file);
  }, []);

  const amplifyVideo = async () => {
    if (!videoBlob || !currentUser) {
      setError(!currentUser ? "Please log in to amplify videos" : "No video selected");
      return;
    }

    console.log("🚀 amplifyVideo called");
    setIsAmplifying(true);
    setError('');
    setResults(null);
    setTranscription('');

    try {
      const formData = new FormData();
      const fileName = selectedFile?.name || `recording-${Date.now()}.webm`;
      formData.append('video', videoBlob, fileName);
      formData.append('user_id', currentUser.id);

      const response = await fetch('/api/amplify-video', { method: 'POST', body: formData });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed');

      setTranscription(data.transcription || 'No transcription available.');
      setResults(data.platforms || []);
      setVideoPublicUrl(data.video_url || null);

      onAmplifySuccess?.();
    } catch (err: any) {
      console.error("❌ Amplify error:", err);
      setError(err.message || 'Failed to amplify video');
    } finally {
      setIsAmplifying(false);
    }
  };

  const fetchConnectedAccounts = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/zernio/accounts?user_id=${currentUser.id}`);
      const data = await res.json();
      if (data.accounts) setConnectedAccounts(data.accounts);
    } catch (e) {
      console.error("Failed to fetch accounts", e);
    }
  };

  const postToZernio = async () => {
    if (!currentUser || !selectedAccountId) {
      alert('Please select an account');
      return;
    }

    const selectedAccount = connectedAccounts.find(a => a._id === selectedAccountId);
    if (!selectedAccount) return;

    const firstResult = results?.[0];
    const postContent = firstResult?.caption || firstResult?.text || transcription || 'Amplified content from ContentAmplifier';

    try {
      const res = await fetch('/api/zernio/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform_id: selectedAccount._id,
          platform: selectedAccount.platform,
          content: postContent,
          title: firstResult?.title,
          caption: firstResult?.caption,
          hashtags: firstResult?.hashtags,
          video_url: videoPublicUrl,
          user_id: currentUser.id,
        }),
      });

      const json = await res.json();
      if (json.success) {
        alert(json.message);
        setShowZernioModal(false);
        setSelectedAccountId('');
      } else {
        alert('Error: ' + json.error);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to call Zernio');
    }
  };

  // FIXED: Blob-based download forces actual file save (no full-screen video player)
  const optimizeAndDownload = async (platform: string) => {
    if (!videoPublicUrl) return;
    setIsOptimizing(true);
    try {
      const res = await fetch('/api/optimize-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_url: videoPublicUrl,
          platform: platform.toLowerCase(),
          user_id: currentUser.id,
        }),
      });

      const data = await res.json();
      if (data.success && data.optimized_url) {
        // Fetch as blob → force download
        const fileRes = await fetch(data.optimized_url);
        const blob = await fileRes.blob();
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `optimized-${platform}.mp4`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up blob URL
        URL.revokeObjectURL(blobUrl);

        alert(data.message || `✅ Optimized for ${platform.toUpperCase()}`);
      } else {
        alert('Optimization failed');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to optimize video');
    } finally {
      setIsOptimizing(false);
      setShowDownloadDropdown(false);
    }
  };

  const resetAll = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    setVideoBlob(null);
    setVideoUrl(null);
    setVideoPublicUrl(null);
    setSelectedFile(null);
    setResults(null);
    setTranscription('');
    setError('');
    setRecordingTime(0);
    setIsRecording(false);
  };

  const copyAllResults = () => {
    if (!results || results.length === 0) return;
    let text = "VIDEO AMPLIFICATION RESULTS\n\n";
    if (transcription) text += `TRANSCRIPTION:\n${transcription}\n\n`;
    results.forEach(r => {
      text += `${r.platform}\n`;
      if (r.title) text += `Title: ${r.title}\n`;
      if (r.description) text += `Description: ${r.description}\n`;
      if (r.caption) text += `Caption: ${r.caption}\n`;
      if (r.hashtags) text += `Hashtags: ${r.hashtags}\n`;
      text += "\n";
    });
    navigator.clipboard.writeText(text);
    alert("✅ All results copied to clipboard!");
  };

  const copyPlatform = (result: PlatformResult) => {
    const text = `${result.platform}\nTitle: ${result.title || ''}\nDescription: ${result.description || ''}\nCaption: ${result.caption || ''}\nHashtags: ${result.hashtags || ''}`;
    navigator.clipboard.writeText(text);
    alert(`✅ Copied ${result.platform}`);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">Video Amplifier</h1>
        <p className="text-zinc-400">Record or upload → Optimized content for all platforms</p>
        <p className="text-emerald-400 text-sm mt-2">Your video is formatted for the chosen platform only when you click Post with Zernio (or Download).</p>
      </div>

      <div className="border border-white/10 bg-zinc-950 rounded-3xl p-8">
        {/* LIVE PREVIEW */}
        <div className={`relative aspect-video bg-black rounded-2xl overflow-hidden mb-6 ${isRecording ? 'block' : 'hidden'}`}>
          <video
            ref={liveVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          {isRecording && (
            <>
              <div className="absolute top-4 right-4 bg-black/80 px-4 py-1 rounded-full text-red-500 font-mono flex items-center gap-2">
                ● REC {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
              </div>
              <button
                onClick={stopRecording}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-red-600 hover:bg-red-700 text-white px-12 py-5 rounded-3xl text-2xl font-bold flex items-center gap-4 shadow-2xl border-4 border-white/20"
              >
                <Square size={32} className="fill-current" /> STOP RECORDING
              </button>
            </>
          )}
        </div>

        {/* RECORDED / UPLOADED VIDEO */}
        {videoUrl && !isRecording && (
          <div className="relative aspect-video bg-black rounded-2xl overflow-hidden mb-6">
            <video
              src={videoUrl}
              controls
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Initial controls */}
        {!videoUrl && !isRecording && (
          <div className="flex flex-col items-center gap-4 py-12">
            <button
              onClick={startRecording}
              className="w-full max-w-md py-6 bg-red-600 hover:bg-red-700 rounded-3xl text-xl font-semibold flex items-center justify-center gap-3"
            >
              🎥 Start Recording
            </button>
            <div className="text-zinc-500 my-2">— or —</div>
            <button
              onClick={triggerFileUpload}
              className="w-full max-w-md py-6 bg-violet-600 hover:bg-violet-700 rounded-3xl text-xl font-semibold flex items-center justify-center gap-3"
            >
              📤 Upload Video File
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
        />

        {/* Amplify & Reset */}
        {videoUrl && !isRecording && (
          <div className="space-y-6">
            <button
              onClick={amplifyVideo}
              disabled={isAmplifying}
              className="w-full py-6 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-3xl text-xl font-semibold disabled:opacity-70"
            >
              {isAmplifying ? '⚡ Amplifying Video...' : '✨ Amplify Video for All Platforms'}
            </button>
            <button
              onClick={resetAll}
              className="w-full py-4 border border-white/20 rounded-2xl hover:bg-white/5 flex items-center justify-center gap-2"
            >
              <RotateCcw size={18} /> Start Over
            </button>
          </div>
        )}
      </div>

      {error && <div className="bg-red-950 border border-red-500/50 p-6 rounded-3xl text-red-300">{error}</div>}

      {/* Results */}
      {results && results.length > 0 && (
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-bold">✅ Amplification Complete!</h2>
            <div className="flex gap-3">
              <button onClick={copyAllResults} className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-2xl">
                <Copy size={18} /> Copy All Results
              </button>

              {/* Download dropdown - individual platforms only */}
              <div className="relative">
                <button
                  onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
                  disabled={isOptimizing}
                  className="flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 rounded-2xl font-semibold disabled:opacity-70"
                >
                  <Download size={18} />
                  {isOptimizing ? 'Optimizing...' : 'Download'}
                </button>

                {showDownloadDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-zinc-900 border border-white/10 rounded-2xl shadow-xl z-50 py-2">
                    <div className="px-4 py-2 text-xs text-zinc-400 border-b border-white/10">
                      Video will be formatted on-demand for the selected platform.
                    </div>
                    {['linkedin', 'youtube', 'tiktok', 'instagram', 'threads', 'rumble'].map((plat) => (
                      <button
                        key={plat}
                        onClick={() => optimizeAndDownload(plat)}
                        className="w-full text-left px-6 py-3 hover:bg-white/10 flex justify-between items-center text-sm"
                      >
                        <span className="capitalize">{plat}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  fetchConnectedAccounts();
                  setShowZernioModal(true);
                }}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-2xl font-semibold"
              >
                <Send size={18} /> Post with Zernio
              </button>
            </div>
          </div>

          {transcription && (
            <div className="bg-zinc-900 rounded-3xl p-8">
              <h3 className="text-xl font-semibold mb-4">📝 Full Transcription</h3>
              <p className="text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-96 overflow-auto">{transcription}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {results.map((result, index) => (
              <div key={index} className="bg-zinc-900 rounded-3xl p-8 border border-white/10">
                <div className="flex justify-between mb-6">
                  <h3 className="text-2xl font-bold text-violet-400">{result.platform}</h3>
                  <button onClick={() => copyPlatform(result)} className="px-5 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm">Copy</button>
                </div>

                {result.title && (
                  <div className="mb-6">
                    <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Title</p>
                    <p className="font-medium">{result.title}</p>
                  </div>
                )}
                {result.description && (
                  <div className="mb-6">
                    <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Description</p>
                    <p className="text-zinc-300">{result.description}</p>
                  </div>
                )}
                {(result.caption || result.text) && (
                  <div className="mb-6">
                    <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Caption</p>
                    <p className="text-zinc-300">{result.caption || result.text}</p>
                  </div>
                )}
                {result.hashtags && (
                  <div>
                    <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Hashtags</p>
                    <p className="text-violet-400 font-mono">{result.hashtags}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Zernio modal */}
          {showZernioModal && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
              <div className="bg-zinc-900 rounded-3xl p-8 max-w-md w-full mx-4">
                <h3 className="text-2xl font-bold mb-6">Post to Zernio</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Connected Account</label>
                    <select
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-4 py-3 focus:outline-none"
                    >
                      <option value="">Select account...</option>
                      {connectedAccounts.map((acc) => (
                        <option key={acc._id} value={acc._id}>
                          {acc.platform.toUpperCase()} — {acc.name || acc.username || acc._id}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button onClick={() => setShowZernioModal(false)} className="flex-1 py-4 border border-white/20 rounded-2xl hover:bg-white/5">Cancel</button>
                    <button onClick={postToZernio} disabled={!selectedAccountId} className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 rounded-2xl font-semibold disabled:opacity-50">Post Now</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}