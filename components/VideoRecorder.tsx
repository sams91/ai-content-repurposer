"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { RotateCcw, Copy } from 'lucide-react';

const MAX_SIZE_MB = 2048; // 2GB

interface PlatformResult {
  platform: string;
  title?: string;
  description?: string;
  caption?: string;
  hashtags?: string;
  text?: string;
}

export default function VideoRecorder() {
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isAmplifying, setIsAmplifying] = useState(false);
  const [results, setResults] = useState<PlatformResult[] | null>(null);
  const [transcription, setTranscription] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement>(null);

  // ==================== RECORDING ====================
  const startRecording = async () => {
    setError('');
    setRecordingTime(0);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: true
      });
      streamRef.current = stream;

      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        await liveVideoRef.current.play();
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
        if (liveVideoRef.current) liveVideoRef.current.srcObject = null;
      };

      mediaRecorder.start(1000); // Record in 1-second chunks
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setError('Failed to access camera or microphone. Please allow permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsRecording(false);
  };

  // ==================== UPLOAD ====================
  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

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
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setVideoBlob(file);

    if (sizeMB > 500) {
      const estMin = Math.round(sizeMB / 100);
      const estMax = Math.round(sizeMB / 50);
      setError(`Large file (${sizeMB.toFixed(1)} MB). Upload + processing may take ${estMin}–${estMax} minutes.`);
    }
  }, []);

  // ==================== AMPLIFY ====================
  const amplifyVideo = async () => {
    if (!videoBlob) return;

    setIsAmplifying(true);
    setError('');
    setResults(null);
    setTranscription('');

    try {
      const formData = new FormData();
      const fileName = selectedFile?.name || `recording-${Date.now()}.webm`;
      formData.append('video', videoBlob, fileName);

      const response = await fetch('/api/amplify-video', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Amplification failed');
      }

      setTranscription(data.transcription || 'No transcription available.');
      setResults(data.platforms || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to amplify video. Please try again.');
    } finally {
      setIsAmplifying(false);
    }
  };

  const resetAll = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setVideoBlob(null);
    setVideoUrl(null);
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

  // Cleanup on unmount
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
        <p className="text-zinc-400">Record or upload → Get optimized content for all platforms</p>
      </div>

      {/* Main Upload / Record Area */}
      <div className="border border-white/10 bg-zinc-950 rounded-3xl p-8">
        {/* Live Camera Preview */}
        <div className="relative aspect-video bg-black rounded-2xl overflow-hidden mb-6">
          <video
            ref={liveVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
            style={{ display: isRecording ? 'block' : 'none' }}
          />
          {isRecording && (
            <div className="absolute top-4 right-4 bg-black/80 px-4 py-1 rounded-full text-red-500 font-mono flex items-center gap-2">
              ● REC {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
            </div>
          )}
        </div>

        {/* Controls */}
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

        {/* Video Preview + Amplify Button */}
        {videoUrl && !isRecording && (
          <div className="space-y-6">
            <video src={videoUrl} controls className="w-full rounded-2xl bg-black" />
            
            <button
              onClick={amplifyVideo}
              disabled={isAmplifying}
              className="w-full py-6 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-3xl text-xl font-semibold disabled:opacity-70 flex items-center justify-center gap-3"
            >
              {isAmplifying ? (
                <>⚡ Amplifying Video... (this may take a few minutes)</>
              ) : (
                <>✨ Amplify Video for All Platforms</>
              )}
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

      {/* Status Messages */}
      {isAmplifying && (
        <div className="bg-zinc-900 border border-violet-500/30 p-8 rounded-3xl text-center">
          <div className="animate-pulse text-5xl mb-4">⏳</div>
          <p className="text-xl font-medium">Processing your video...</p>
          <p className="text-zinc-400 mt-3">
            Transcription + platform optimization in progress.<br />
            This usually takes 1–8 minutes.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-950 border border-red-500/50 p-6 rounded-3xl text-red-300">
          {error}
        </div>
      )}

      {/* Results */}
      {results && results.length > 0 && (
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-bold">Amplification Complete</h2>
            <button
              onClick={copyAllResults}
              className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-2xl"
            >
              <Copy size={18} /> Copy All Results
            </button>
          </div>

          {transcription && (
            <div className="bg-zinc-900 rounded-3xl p-8">
              <h3 className="text-xl font-semibold mb-4">📝 Full Transcription</h3>
              <p className="text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-96 overflow-auto">
                {transcription}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {results.map((result, index) => (
              <div key={index} className="bg-zinc-900 rounded-3xl p-8 border border-white/10">
                <div className="flex justify-between mb-6">
                  <h3 className="text-2xl font-bold text-violet-400">{result.platform}</h3>
                  <button
                    onClick={() => copyPlatform(result)}
                    className="px-5 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm"
                  >
                    Copy
                  </button>
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
        </div>
      )}
    </div>
  );
}