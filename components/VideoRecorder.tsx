// components/VideoRecorder.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/app/supabase';
import { Video, Square, Upload, RotateCcw, UploadCloud, Sparkles } from 'lucide-react';

export default function VideoRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAmplifying, setIsAmplifying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState('');
  const [amplifiedResult, setAmplifiedResult] = useState<any>(null);

  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const recordedVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    setError('');
    setRecordingTime(0);

    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: true 
      });
      
      streamRef.current = stream;

      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        liveVideoRef.current.muted = true;
        liveVideoRef.current.playsInline = true;
        await liveVideoRef.current.play();
      }

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setVideoBlob(blob);
        setVideoUrl(url);
        
        if (liveVideoRef.current) liveVideoRef.current.srcObject = null;
        setIsRecording(false);
      };

      mediaRecorder.start(500);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      setError('Failed to start recording: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleFileSelect = (file: File) => {
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setVideoBlob(file);
  };

  const uploadVideo = async () => {
    if (!videoBlob) return;
    setIsUploading(true);
    try {
      const fileName = `video-${Date.now()}.webm`;
      const { error } = await supabase.storage.from('videos').upload(fileName, videoBlob);
      if (error) throw error;
      alert('✅ Video uploaded successfully!');
    } catch (err: any) {
      setError('Upload failed: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const amplifyVideo = async () => {
    if (!videoBlob) return;

    setIsAmplifying(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('video', videoBlob);

      const response = await fetch('/api/amplify-video', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Amplification failed');

      setAmplifiedResult(data);
      alert('✅ Video amplified successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to amplify video');
    } finally {
      setIsAmplifying(false);
    }
  };

  const resetRecorder = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    
    setVideoBlob(null);
    setVideoUrl(null);
    setIsRecording(false);
    setRecordingTime(0);
    setError('');
    setAmplifiedResult(null);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mt-8 p-6 bg-zinc-900 border border-white/10 rounded-3xl">
      <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Video className="w-5 h-5 text-red-500" /> Video Studio
      </h3>

      <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 mb-6">
        <video
          ref={liveVideoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
          style={{ display: isRecording ? 'block' : 'none' }}
        />

        {videoUrl && !isRecording && (
          <video
            ref={recordedVideoRef}
            src={videoUrl}
            controls
            className="w-full h-full object-contain bg-zinc-950"
          />
        )}

        {!isRecording && !videoUrl && (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
            <div className="text-center">
              <Video className="w-16 h-16 mx-auto mb-4 opacity-40" />
              <p className="text-lg">Ready to create content</p>
            </div>
          </div>
        )}

        {isRecording && (
          <div className="absolute top-4 right-4 bg-black/80 text-red-500 px-4 py-1 rounded-full font-mono">
            ● REC {formatTime(recordingTime)}
          </div>
        )}
      </div>

      {error && <p className="text-red-500 text-center mb-4">{error}</p>}

      <div className="flex flex-col gap-3">
        {!isRecording && !videoUrl && (
          <>
            <button 
              onClick={startRecording} 
              className="w-full py-4 bg-red-600 hover:bg-red-700 rounded-2xl text-lg font-medium"
            >
              Start Recording
            </button>

            <label className="cursor-pointer block">
              <div className="border-2 border-dashed border-white/30 hover:border-violet-500 py-8 rounded-2xl text-center">
                <UploadCloud className="w-10 h-10 mx-auto mb-3" />
                <p className="font-medium">Upload Existing Video</p>
                <p className="text-sm text-zinc-500">MP4, MOV, WebM supported</p>
                <input 
                  type="file" 
                  accept="video/*" 
                  onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])} 
                  className="hidden" 
                />
              </div>
            </label>
          </>
        )}

        {isRecording && (
          <button 
            onClick={stopRecording} 
            className="w-full py-4 bg-red-600 hover:bg-red-700 rounded-2xl text-lg font-medium"
          >
            <Square className="w-5 h-5 inline mr-2" /> Stop Recording
          </button>
        )}

        {videoUrl && !isRecording && (
          <div className="flex gap-3">
            <button 
              onClick={amplifyVideo} 
              disabled={isAmplifying}
              className="flex-1 py-4 bg-violet-600 hover:bg-violet-700 rounded-2xl font-medium flex items-center justify-center gap-3 disabled:opacity-70 text-lg"
            >
              <Sparkles className="w-5 h-5" />
              {isAmplifying ? 'Amplifying...' : 'Amplify Video'}
            </button>
            <button 
              onClick={uploadVideo} 
              disabled={isUploading}
              className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 rounded-2xl font-medium disabled:opacity-70"
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>
            <button 
              onClick={resetRecorder} 
              className="px-8 py-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Amplified Results Section */}
      {amplifiedResult && (
        <div className="mt-12">
          <h3 className="text-2xl font-semibold mb-6 flex items-center gap-3">
            <Sparkles className="text-violet-400" /> Amplified Content
          </h3>
          <pre className="bg-zinc-950 p-6 rounded-2xl text-sm overflow-auto max-h-96">
            {JSON.stringify(amplifiedResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}