// app/share/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/app/supabase';
import { Copy, Check } from 'lucide-react';

interface SharedContent {
  id: string;
  original_content: string;
  outputs: any;
  created_at: string;
}

export default function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const [content, setContent] = useState<SharedContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);

  const platformNames: Record<string, string> = {
    linkedin: "LinkedIn",
    twitter: "X (Twitter)",
    instagram: "Instagram",
    youtube: "YouTube",
    rumble: "Rumble",
    threads: "Threads",
    newsletter: "Newsletter",
    email: "Email",
    odysee: "Odysee",
  };

  useEffect(() => {
    async function fetchSharedContent() {
      try {
        const { id } = await params;

        const { data, error: supabaseError } = await supabase
          .from('shared_content')           // ← Correct table name
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (supabaseError) {
          console.error('Supabase error:', supabaseError);
          setError('This shared link is invalid or has expired.');
          return;
        }

        if (!data) {
          setError('Content not found or link has expired.');
          return;
        }

        setContent(data);
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Something went wrong loading this content.');
      } finally {
        setLoading(false);
      }
    }

    fetchSharedContent();
  }, [params]);

  const copyToClipboard = async (text: string, platform: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPlatform(platform);
      alert(`✅ Copied ${platformNames[platform] || platform}`);
      setTimeout(() => setCopiedPlatform(null), 2000);
    } catch {
      alert('Failed to copy');
    }
  };

  const copyAll = async () => {
    if (!content?.outputs) return;

    let allText = '';
    Object.entries(content.outputs).forEach(([platform, text]) => {
      const displayName = platform === 'twitter' ? 'X' : platform.charAt(0).toUpperCase() + platform.slice(1);
      const safeText = typeof text === 'string' ? text : JSON.stringify(text, null, 2);
      allText += `${displayName.toUpperCase()}:\n\n${safeText}\n\n---\n\n`;
    });

    try {
      await navigator.clipboard.writeText(allText);
      alert('✅ All platforms copied!');
    } catch {
      alert('Failed to copy all');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-white/20 border-t-white rounded-full mx-auto mb-4" />
          <p>Loading shared content...</p>
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <h1 className="text-3xl font-bold mb-4">Link Expired or Invalid</h1>
          <p className="text-gray-400">{error || 'This shared content is no longer available.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="max-w-4xl mx-auto px-6 pt-12">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">ContentAmplifier — Shared</h1>
            <p className="text-gray-500 mt-2">
              Generated on {new Date(content.created_at).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={copyAll}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-5 py-3 rounded-xl transition"
          >
            <Copy className="w-5 h-5" />
            Copy All
          </button>
        </div>

        <div className="space-y-10">
          {Object.entries(content.outputs || {}).map(([key, text]) => {
            if (!text) return null;
            const safeText = typeof text === 'string' ? text : JSON.stringify(text, null, 2);

            return (
              <div key={key} className="bg-zinc-950 border border-white/10 rounded-2xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold">
                    {platformNames[key] || key}
                  </h2>
                  <button
                    onClick={() => copyToClipboard(safeText, key)}
                    className="flex items-center gap-2 text-sm bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg transition"
                  >
                    {copiedPlatform === key ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    {copiedPlatform === key ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <div className="whitespace-pre-wrap text-gray-300 leading-relaxed text-[15px]">
                  {safeText}
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center text-gray-500 text-sm mt-16">
          Shared via ContentAmplifier
        </div>
      </div>
    </div>
  );
}