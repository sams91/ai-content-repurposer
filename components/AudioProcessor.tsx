"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, Upload, Play, RefreshCw, Copy, Send, Download, Trash2, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

const supabase = createClient();

const MAX_SIZE_MB = 500;

export default function AudioProcessor({ user, onAmplifySuccess }: { user: User | null; onAmplifySuccess?: () => void }) {
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [podcastOutputs, setPodcastOutputs] = useState<any>(null);
  const [transcription, setTranscription] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([]);
  const [showZernioModal, setShowZernioModal] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState('');

  const [generatingClips, setGeneratingClips] = useState(false);
  const [clipModal, setClipModal] = useState<any>(null);
  const [isCopyingAll, setIsCopyingAll] = useState(false);

  const [audioPublicUrl, setAudioPublicUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    setError('');
    setRecordingTime(0);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 } 
      });
      streamRef.current = stream;
      setIsRecording(true);

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setAudioBlob(blob);
        setSelectedFile(null);
        if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000);
      timerRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
    } catch (err: any) {
      setError('Failed to access microphone. Please allow permissions.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
  };

  const triggerFileUpload = () => fileInputRef.current?.click();

  const handleFileSelect = useCallback((file: File) => {
    setError('');
    setPodcastOutputs(null);
    setTranscription('');

    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_SIZE_MB) {
      setError(`File too large (max ${MAX_SIZE_MB}MB)`);
      return;
    }
    if (!file.type.startsWith('audio/')) {
      setError('Please upload a valid audio file');
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setAudioBlob(file);
  }, []);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const amplifyAudio = async () => {
    if (!audioBlob || !user) {
      setError(!user ? "Please log in" : "No audio selected");
      return;
    }

    setIsProcessing(true);
    setError('');
    setPodcastOutputs(null);

    try {
      const formData = new FormData();
      const fileName = selectedFile?.name || `recording-${Date.now()}.webm`;
      formData.append('audio', audioBlob, fileName);
      formData.append('user_id', user.id);

      const response = await fetch('/api/amplify-audio', { method: 'POST', body: formData });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed');

      setTranscription(data.transcription || '');
      setPodcastOutputs({
        transcription: data.transcription,
        showNotes: data.showNotes,
        chapters: data.chapters,
        keyQuotes: data.keyQuotes,
        clipIdeas: data.clipIdeas,
        platforms: data.platforms,
      });
      setAudioPublicUrl(data.audio_url || null);

      onAmplifySuccess?.();
    } catch (err: any) {
      setError(err.message || 'Failed to amplify audio');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyAllPlatforms = async () => {
    if (!podcastOutputs?.platforms) return;
    setIsCopyingAll(true);

    let allText = "PODCAST CONTENT\n\n";
    if (transcription) allText += `TRANSCRIPTION:\n${transcription}\n\n`;
    if (podcastOutputs.showNotes) allText += `SHOW NOTES:\n${podcastOutputs.showNotes}\n\n`;
    if (podcastOutputs.keyQuotes?.length) allText += `KEY QUOTES:\n${podcastOutputs.keyQuotes.join('\n')}\n\n`;

    Object.entries(podcastOutputs.platforms).forEach(([platform, content]) => {
      allText += `${platform.toUpperCase()}:\n`;
      if (typeof content === 'string') {
        allText += content + '\n\n';
      } else if (content && typeof content === 'object') {
        Object.entries(content).forEach(([key, value]) => {
          allText += `${key}: ${value}\n`;
        });
        allText += '\n';
      }
    });

    try {
      await navigator.clipboard.writeText(allText.trim());
      alert('✅ Copied all platform content!');
    } catch {
      alert('Failed to copy');
    }
    setIsCopyingAll(false);
  };

  const fetchConnectedAccounts = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/zernio/accounts?user_id=${user.id}`);
      const data = await res.json();
      if (data.accounts) setConnectedAccounts(data.accounts);
    } catch (e) {}
  };

  const postToZernio = async () => {
    if (!user || !selectedAccountId || !podcastOutputs) return;
    const selectedAccount = connectedAccounts.find(a => a._id === selectedAccountId);
    if (!selectedAccount) return;

    const postContent = podcastOutputs.showNotes || transcription || 'Amplified podcast content';

    try {
      const res = await fetch('/api/zernio/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform_id: selectedAccount._id,
          platform: selectedAccount.platform,
          content: postContent,
          user_id: user.id,
          media_urls: audioPublicUrl ? [audioPublicUrl] : [],
          audio_url: audioPublicUrl
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
    } catch {
      alert('Failed to post to Zernio');
    }
  };

  const generateSmartClips = async () => {
    if (!podcastOutputs?.clipIdeas?.length) {
      alert("No clip ideas available yet.");
      return;
    }
    setGeneratingClips(true);
    setClipModal({
      clips: podcastOutputs.clipIdeas,
      transcription: transcription,
    });
    setGeneratingClips(false);
  };

  const resetAll = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    if (timerRef.current) clearInterval(timerRef.current);

    setAudioBlob(null);
    setAudioUrl(null);
    setSelectedFile(null);
    setPodcastOutputs(null);
    setTranscription('');
    setError('');
    setRecordingTime(0);
    setIsRecording(false);
    setAudioPublicUrl(null);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert(`✅ Copied ${label}`);
    } catch {
      alert("Failed to copy");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Mic className="w-8 h-8 text-violet-400" />
          <h2 className="text-3xl font-bold tracking-tight">Audio Mode</h2>
        </div>
        <p className="text-zinc-400">Record or upload podcasts & voiceovers. Get show notes, chapters, quotes & clips.</p>
      </div>

      {!audioUrl && (
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 text-center">
            <div className="mb-6">
              <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4 ${isRecording ? 'bg-red-500/20 animate-pulse' : 'bg-zinc-800'}`}>
                <Mic className={`w-10 h-10 ${isRecording ? 'text-red-500' : 'text-violet-400'}`} />
              </div>
              <h3 className="text-xl font-semibold mb-1">Record Live Audio</h3>
              <p className="text-sm text-zinc-400">Voiceovers, podcast intros, or quick ideas</p>
            </div>

            {isRecording ? (
              <div className="space-y-4">
                <div className="text-4xl font-mono font-bold text-red-500">{formatTime(recordingTime)}</div>
                <button onClick={stopRecording} className="flex items-center justify-center gap-3 mx-auto bg-red-600 hover:bg-red-700 px-10 py-4 rounded-2xl font-semibold text-lg">
                  <Square className="w-5 h-5" /> Stop Recording
                </button>
              </div>
            ) : (
              <button onClick={startRecording} className="flex items-center justify-center gap-3 mx-auto bg-white text-black hover:bg-white/90 px-10 py-4 rounded-2xl font-semibold text-lg">
                <Mic className="w-5 h-5" /> Start Recording
              </button>
            )}
          </div>

          <div
            className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer bg-zinc-900/90 ${isDragging ? 'border-violet-500 bg-violet-500/10' : 'border-white/20'}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={triggerFileUpload}
          >
            <Upload className="w-10 h-10 mx-auto mb-3 text-violet-400" />
            <p className="text-xl font-semibold mb-1">Drop your podcast or audio file here</p>
            <p className="text-sm text-zinc-400">or click to browse • up to {MAX_SIZE_MB}MB</p>
            <input ref={fileInputRef} type="file" accept="audio/*" onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])} className="hidden" />
          </div>
        </div>
      )}

      {audioUrl && (
        <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-sm text-zinc-400">Ready to amplify</p>
              <p className="font-medium">{selectedFile?.name || 'Live Recording'}</p>
            </div>
            <button onClick={resetAll} className="text-sm flex items-center gap-1 text-zinc-400 hover:text-white">
              <Trash2 className="w-4 h-4" /> Start Over
            </button>
          </div>

          <audio controls src={audioUrl} className="w-full mb-6 rounded-xl" />

          <button
            onClick={amplifyAudio}
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:brightness-110 disabled:opacity-70 py-4 rounded-2xl font-semibold text-lg flex items-center justify-center gap-3"
          >
            {isProcessing ? <>Processing <RefreshCw className="w-5 h-5 animate-spin" /></> : <>Amplify Podcast <Mic className="w-5 h-5" /></>}
          </button>
          {error && <p className="text-red-400 text-sm mt-3 text-center">{error}</p>}
        </div>
      )}

      {podcastOutputs && (
        <div className="space-y-8 mt-8">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-semibold">Podcast Content Ready</h3>
            <div className="flex gap-3">
              <button onClick={copyAllPlatforms} disabled={isCopyingAll} className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-5 py-2 rounded-2xl text-sm">
                <Copy className="w-4 h-4" /> {isCopyingAll ? "Copying..." : "Copy All Platforms"}
              </button>
              <button onClick={() => { fetchConnectedAccounts(); setShowZernioModal(true); }} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-5 py-2 rounded-2xl text-sm font-semibold">
                <Send className="w-4 h-4" /> Post with Zernio
              </button>
              <button onClick={resetAll} className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-5 py-2 rounded-2xl text-sm">
                <Trash2 className="w-4 h-4" /> New Audio
              </button>
            </div>
          </div>

          {transcription && (
            <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6">
              <div className="flex justify-between mb-3">
                <h4 className="font-semibold flex items-center gap-2"><Clock className="w-4 h-4" /> Full Transcription</h4>
                <button onClick={() => copyToClipboard(transcription, 'Transcription')} className="text-xs px-3 py-1 bg-zinc-800 rounded-full flex items-center gap-1">
                  <Copy className="w-3 h-3" /> Copy
                </button>
              </div>
              <p className="text-sm text-zinc-300 whitespace-pre-wrap max-h-64 overflow-auto">{transcription}</p>
            </div>
          )}

          {podcastOutputs.showNotes && (
            <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6">
              <div className="flex justify-between mb-3">
                <h4 className="font-semibold">Show Notes</h4>
                <button onClick={() => copyToClipboard(podcastOutputs.showNotes!, 'Show Notes')} className="text-xs px-3 py-1 bg-zinc-800 rounded-full flex items-center gap-1">
                  <Copy className="w-3 h-3" /> Copy
                </button>
              </div>
              <p className="text-sm text-zinc-300 whitespace-pre-wrap">{podcastOutputs.showNotes}</p>
            </div>
          )}

          {podcastOutputs.keyQuotes && podcastOutputs.keyQuotes.length > 0 && (
            <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6">
              <h4 className="font-semibold mb-4">Key Quotes</h4>
              <div className="space-y-2">
                {podcastOutputs.keyQuotes.map((quote, i) => (
                  <div key={i} className="bg-zinc-950 p-4 rounded-2xl text-sm italic border-l-2 border-emerald-500 flex justify-between items-start">
                    <span>“{quote}”</span>
                    <button onClick={() => copyToClipboard(quote, 'Quote')} className="text-xs ml-4 text-zinc-400 hover:text-white">Copy</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {podcastOutputs.chapters && podcastOutputs.chapters.length > 0 && (
            <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6">
              <h4 className="font-semibold mb-4">Chapters</h4>
              <div className="space-y-3">
                {podcastOutputs.chapters.map((ch, i) => (
                  <div key={i} className="flex gap-4 text-sm border-l-2 border-violet-500 pl-4">
                    <div className="font-mono text-violet-400 w-16 flex-shrink-0">{ch.time}</div>
                    <div>
                      <div className="font-medium">{ch.title}</div>
                      {ch.summary && <div className="text-zinc-400 text-xs mt-0.5">{ch.summary}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {podcastOutputs.clipIdeas && podcastOutputs.clipIdeas.length > 0 && (
            <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold">Smart Clip Ideas</h4>
                <button onClick={generateSmartClips} disabled={generatingClips} className="text-sm bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-2xl">
                  {generatingClips ? "Loading..." : "View Smart Clips"}
                </button>
              </div>
              <div className="space-y-2 text-sm">
                {podcastOutputs.clipIdeas.map((clip, i) => (
                  <div key={i} className="bg-zinc-950 p-3 rounded-2xl flex justify-between items-center">
                    <div>
                      <span className="font-mono text-emerald-400">{clip.start}s – {clip.end}s</span>
                      <span className="ml-3 text-zinc-300">{clip.reason}</span>
                    </div>
                    <button onClick={() => copyToClipboard(`${clip.start}s - ${clip.end}s: ${clip.reason}`, 'Clip Idea')} className="text-xs px-3 py-1 bg-zinc-800 rounded-full">Copy</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {podcastOutputs.platforms && Object.keys(podcastOutputs.platforms).length > 0 && (
            <div>
              <h4 className="font-semibold mb-4">Platform-Optimized Content</h4>
              <div className="grid md:grid-cols-2 gap-4">
                {Object.entries(podcastOutputs.platforms).map(([platform, content]) => (
                  <div key={platform} className="bg-zinc-900 border border-white/10 rounded-3xl p-5">
                    <div className="flex justify-between mb-3">
                      <p className="uppercase text-xs tracking-widest text-violet-400 font-medium">{platform}</p>
                      <button onClick={() => copyToClipboard(typeof content === 'string' ? content : JSON.stringify(content, null, 2), platform)} className="text-xs px-3 py-1 bg-zinc-800 rounded-full flex items-center gap-1">
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                    </div>
                    <div className="text-sm text-zinc-300 whitespace-pre-wrap">
                      {typeof content === 'string' ? content : 
                        Object.entries(content).map(([k, v]) => (
                          <div key={k} className="mb-1"><span className="text-zinc-400">{k}:</span> {String(v)}</div>
                        ))
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showZernioModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-3xl p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold mb-6">Post to Zernio</h3>
            <select value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)} className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-4 py-3 mb-6">
              <option value="">Select account...</option>
              {connectedAccounts.map(acc => <option key={acc._id} value={acc._id}>{acc.platform.toUpperCase()} — {acc.name || acc.username}</option>)}
            </select>
            <div className="flex gap-3">
              <button onClick={() => setShowZernioModal(false)} className="flex-1 py-3 border border-white/20 rounded-2xl">Cancel</button>
              <button onClick={postToZernio} disabled={!selectedAccountId} className="flex-1 py-3 bg-emerald-600 rounded-2xl font-semibold disabled:opacity-50">Post Now</button>
            </div>
          </div>
        </div>
      )}

      {clipModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4" onClick={() => setClipModal(null)}>
          <div className="bg-zinc-950 rounded-3xl max-w-2xl w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">Smart Audio Clips</h3>
            <div className="space-y-3 max-h-[60vh] overflow-auto">
              {clipModal.clips?.map((clip: any, i: number) => (
                <div key={i} className="bg-zinc-900 p-4 rounded-2xl">
                  <div className="font-mono text-emerald-400">{clip.start}s – {clip.end}s</div>
                  <p className="text-sm mt-1">{clip.reason}</p>
                  <button onClick={() => copyToClipboard(`${clip.start}s - ${clip.end}s`, 'Clip Range')} className="mt-2 text-xs bg-zinc-800 px-3 py-1 rounded">Copy Timestamp</button>
                </div>
              ))}
            </div>
            <button onClick={() => setClipModal(null)} className="mt-6 w-full py-3 bg-white/10 rounded-2xl">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}