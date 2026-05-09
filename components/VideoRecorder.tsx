// components/VideoRecorder.tsx
'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/app/supabase';
import { Video, Square, Upload } from 'lucide-react';

export default function VideoRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'video/mp4' });
        await uploadVideo(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert("Camera access denied or not available.");
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const uploadVideo = async (blob: Blob) => {
    setIsUploading(true);
    const fileName = `video-${Date.now()}.mp4`;

    try {
      const { data, error } = await supabase.storage
        .from('videos')                    // We'll create this bucket
        .upload(fileName, blob, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const publicUrl = supabase.storage.from('videos').getPublicUrl(fileName).data.publicUrl;
      setVideoUrl(publicUrl);
      alert("Video uploaded successfully!");
      
    } catch (err) {
      console.error(err);
      alert("Failed to upload video.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="mt-8 p-6 bg-zinc-900 border border-white/10 rounded-3xl">
      <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Video className="w-5 h-5" /> Record Video
      </h3>

      <div className="flex gap-3">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="flex-1 bg-red-600 hover:bg-red-700 py-4 rounded-2xl font-medium flex items-center justify-center gap-2"
          >
            <Video className="w-5 h-5" />
            Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="flex-1 bg-zinc-700 hover:bg-red-600 py-4 rounded-2xl font-medium flex items-center justify-center gap-2"
          >
            <Square className="w-5 h-5" />
            Stop Recording
          </button>
        )}

        {videoUrl && (
          <button
            onClick={() => window.open(videoUrl, '_blank')}
            className="px-6 bg-emerald-600 hover:bg-emerald-700 rounded-2xl flex items-center gap-2"
          >
            <Upload className="w-5 h-5" /> View
          </button>
        )}
      </div>

      {isRecording && <p className="text-red-500 mt-3">● Recording in progress...</p>}
      {isUploading && <p className="text-yellow-500 mt-3">Uploading video...</p>}
    </div>
  );
}