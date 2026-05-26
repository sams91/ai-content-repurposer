'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Top nav - matches login and pricing */}
      <nav className="border-b border-white/10 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-violet-500" />
            <h1 className="text-2xl font-bold tracking-tight">ContentAmplifier</h1>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/why-amplify" className="hover:text-violet-400 transition">Why Amplify</Link>
            <Link href="/pricing" className="hover:text-violet-400 transition">Pricing</Link>
            <Link href="/auth/login" className="hover:text-violet-400 transition">Login</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="prose prose-invert max-w-none">
          <h1 className="text-4xl font-bold tracking-tight mb-8">Terms of Service</h1>

          <h2 className="text-2xl font-semibold mt-12 mb-4">1. Acceptance of Terms</h2>
          <p>Welcome to ContentAmplifier (the “Service”), operated by ContentAmplifier LLC (“we,” “us,” or “our”). By accessing or using the Service, you agree to be bound by these Terms of Service (“Terms”). If you do not agree, you may not use the Service.</p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">2. Description of Service</h2>
          <p>ContentAmplifier is an AI-powered content repurposing platform that helps creators turn one piece of content (text, video, or audio) into multiple platform-ready versions with smart clips, captions, and direct posting via Zernio.</p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">3. User Accounts</h2>
          <p>You must create an account to use most features. You are responsible for keeping your login credentials secure. You may not share your account or use another person’s account without permission.</p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">4. Free Trial and Subscriptions</h2>
          <ul className="list-disc pl-6 space-y-2 text-zinc-300">
            <li>New users receive a 14-day free trial with full access (no credit card required).</li>
            <li>After the trial ends, continued use requires a paid Pro subscription through Lemon Squeezy.</li>
            <li>You may cancel or pause your subscription at any time through your Lemon Squeezy account.</li>
            <li>We do not offer refunds for partial subscription periods unless required by law.</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-12 mb-4">5. Content and Intellectual Property</h2>
          <p>You retain ownership of the content you upload. By using the Service you grant us a limited, non-exclusive license to process, store, and display your content solely to provide the Service. All AI-generated outputs belong to you.</p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">6. Prohibited Conduct</h2>
          <p>You agree not to upload content that violates laws, attempt to reverse-engineer the AI models, use the Service for spam or illegal activities, or share your account/API keys.</p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">7. Termination</h2>
          <p>We may suspend or terminate your account at any time for violation of these Terms. You may cancel your subscription at any time.</p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">8. Disclaimers and Limitation of Liability</h2>
          <p>The Service is provided “as is.” We do not guarantee uninterrupted service or perfect results. To the maximum extent permitted by law, we are not liable for any indirect, incidental, or consequential damages.</p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">9. Changes to Terms</h2>
          <p>We may update these Terms and will notify you by posting the new version with an updated date. Your continued use constitutes acceptance.</p>

          <p className="mt-12 text-sm text-zinc-400">By using ContentAmplifier you acknowledge that you have read, understood, and agree to these Terms.</p>
        </div>
      </div>
    </div>
  );
}