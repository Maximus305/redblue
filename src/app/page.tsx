"use client"
import React, { useState } from 'react';
import { AlertCircle, Sparkles, Users, Zap } from 'lucide-react';
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function PartykiteLanding() {
  const [showEmailSignup, setShowEmailSignup] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null);

  const handleEmailSubmit = async (e: React.MouseEvent<HTMLButtonElement> | React.FormEvent) => {
    e.preventDefault();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim()) || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      await addDoc(collection(db, 'email_signups'), {
        email: email.trim(),
        timestamp: serverTimestamp(),
        source: 'partykite-landing',
        userAgent: navigator.userAgent,
        createdAt: new Date().toISOString()
      });

      setSubmitStatus('success');
      setEmail('');

    } catch (error) {
      console.error('Error saving email:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (submitStatus === 'error') {
      setSubmitStatus(null);
    }
  };

  const handleModalClose = () => {
    setShowEmailSignup(false);
    setSubmitStatus(null);
    setEmail('');
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Header */}
      <nav className="relative z-10 border-b border-white/10 backdrop-blur-sm bg-black/50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 rounded-xl flex items-center justify-center text-2xl font-black">
                P
              </div>
              <span className="text-3xl font-black bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 text-transparent bg-clip-text">
                PartyKite
              </span>
            </div>

            <button
              onClick={() => setShowEmailSignup(true)}
              className="bg-white text-black px-6 py-3 rounded-full font-bold hover:bg-yellow-400 transition-all hover:scale-105"
            >
              Join Waitlist
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32 px-6">
        <div className="max-w-6xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-3 mb-8">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <span className="text-sm font-bold text-white">The Future of Party Games</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-6xl md:text-8xl font-black mb-8 leading-tight">
            <span className="bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 text-transparent bg-clip-text">
              Turn Any Gathering
            </span>
            <br />
            <span className="text-white">
              Into Pure Magic
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed">
            PartyKite is the <span className="text-white font-bold">ultimate platform</span> for
            interactive party games that break the ice, spark laughter, and create unforgettable moments.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <button
              onClick={() => setShowEmailSignup(true)}
              className="group bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 text-white px-10 py-5 rounded-full font-black text-lg hover:scale-105 transition-all shadow-2xl shadow-pink-500/50 flex items-center gap-3"
            >
              <Zap className="w-6 h-6 group-hover:rotate-12 transition-transform" />
              Get Early Access
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto pt-8 border-t border-white/10">
            <div>
              <div className="text-4xl font-black bg-gradient-to-r from-yellow-400 to-pink-500 text-transparent bg-clip-text mb-2">
                10K+
              </div>
              <div className="text-gray-500 font-medium text-sm">Players Waiting</div>
            </div>
            <div>
              <div className="text-4xl font-black bg-gradient-to-r from-pink-500 to-purple-600 text-transparent bg-clip-text mb-2">
                50+
              </div>
              <div className="text-gray-500 font-medium text-sm">Unique Games</div>
            </div>
            <div>
              <div className="text-4xl font-black bg-gradient-to-r from-purple-600 to-yellow-400 text-transparent bg-clip-text mb-2">
                100%
              </div>
              <div className="text-gray-500 font-medium text-sm">Pure Fun</div>
            </div>
          </div>
        </div>
      </section>

      {/* What is PartyKite Section */}
      <section className="relative z-10 py-32 px-6 bg-gradient-to-b from-black via-purple-950/20 to-black">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-black mb-6">
              <span className="bg-gradient-to-r from-yellow-400 to-pink-500 text-transparent bg-clip-text">
                What is PartyKite?
              </span>
            </h2>
            <p className="text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
              More than just games. It's a <span className="text-white font-bold">social experience platform</span> designed
              to transform strangers into friends and friends into family.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 to-pink-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all"></div>
              <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 hover:border-white/30 transition-all">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-pink-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-black text-white mb-4">Connection First</h3>
                <p className="text-gray-400 leading-relaxed">
                  Every game is designed to spark genuine connections, break down walls, and create moments
                  that matter.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-purple-600/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all"></div>
              <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 hover:border-white/30 transition-all">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-black text-white mb-4">Instant Impact</h3>
                <p className="text-gray-400 leading-relaxed">
                  No complicated setup. No boring tutorials. Just scan a code and dive into the fun
                  within seconds.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-yellow-400/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all"></div>
              <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 hover:border-white/30 transition-all">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-yellow-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-black text-white mb-4">Always Fresh</h3>
                <p className="text-gray-400 leading-relaxed">
                  New games added constantly. From classic favorites to brand new experiences you've
                  never seen before.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative z-10 py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-black mb-6 text-white">
              Ridiculously Simple
            </h2>
            <p className="text-2xl text-gray-400">
              Three steps to the best party ever
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl font-black text-white">
                1
              </div>
              <h3 className="text-2xl font-black text-white mb-4">Create a Room</h3>
              <p className="text-gray-400 leading-relaxed">
                Pick your game and get an instant join code. No account needed.
              </p>
            </div>

            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl font-black text-white">
                2
              </div>
              <h3 className="text-2xl font-black text-white mb-4">Share the Code</h3>
              <p className="text-gray-400 leading-relaxed">
                Everyone scans the QR code or enters the room code on their phone.
              </p>
            </div>

            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-600 to-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl font-black text-white">
                3
              </div>
              <h3 className="text-2xl font-black text-white mb-4">Play & Laugh</h3>
              <p className="text-gray-400 leading-relaxed">
                Watch the magic happen as strangers become friends through play.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative z-10 py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 via-pink-500/20 to-purple-600/20 rounded-3xl blur-3xl"></div>
            <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-12 md:p-16 text-center">
              <div className="text-6xl mb-8">🎉</div>

              <h2 className="text-4xl md:text-5xl font-black mb-6">
                <span className="bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 text-transparent bg-clip-text">
                  Be Part of Something Special
                </span>
              </h2>

              <p className="text-xl text-gray-400 mb-10 leading-relaxed max-w-2xl mx-auto">
                Join thousands already on the waitlist. Get exclusive early access,
                shape the future of PartyKite, and never miss a party moment again.
              </p>

              <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-10 max-w-md mx-auto">
                <div className="flex items-center justify-center gap-3 text-yellow-400 mb-2">
                  <Sparkles className="w-5 h-5" />
                  <span className="font-bold">Launch Special</span>
                </div>
                <div className="text-white text-lg">Free lifetime access for early supporters</div>
              </div>

              <button
                onClick={() => setShowEmailSignup(true)}
                className="group bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 text-white px-12 py-6 rounded-full font-black text-xl hover:scale-105 transition-all shadow-2xl shadow-pink-500/50 inline-flex items-center gap-3"
              >
                <Zap className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                Join the Waitlist - Free Forever
              </button>

              <p className="text-sm text-gray-500 mt-8">
                🔒 No spam, no credit card. Just party vibes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-12 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 rounded-xl flex items-center justify-center text-xl font-black">
              P
            </div>
            <span className="text-2xl font-black bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 text-transparent bg-clip-text">
              PartyKite
            </span>
          </div>
          <p className="text-gray-500 text-sm">
            © 2025 PartyKite. Making every gathering unforgettable.
          </p>
        </div>
      </footer>

      {/* Email Signup Modal */}
      {showEmailSignup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center p-4 z-50">
          <div className="relative max-w-md w-full">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 via-pink-500/20 to-purple-600/20 rounded-3xl blur-2xl"></div>
            <div className="relative bg-black border border-white/20 rounded-3xl shadow-2xl p-8">
              <button
                onClick={handleModalClose}
                className="absolute top-6 right-6 text-gray-400 hover:text-white text-3xl font-light transition-colors"
              >
                ×
              </button>

              {submitStatus === 'success' ? (
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
                    🎊
                  </div>
                  <h4 className="text-3xl font-black text-white mb-4">You&apos;re In!</h4>
                  <p className="text-gray-400 mb-8 leading-relaxed">
                    Welcome to the PartyKite family. We&apos;ll send you exclusive updates and early access when we launch.
                  </p>
                  <button
                    onClick={handleModalClose}
                    className="bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 text-white px-8 py-4 rounded-full font-bold hover:scale-105 transition-all"
                  >
                    Let&apos;s Party! 🚀
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
                    🎉
                  </div>
                  <h3 className="text-3xl font-black text-white mb-3">Join the Waitlist</h3>
                  <p className="text-gray-400 mb-8 leading-relaxed">
                    Be the first to experience the future of party games.
                  </p>

                  <div className="mb-6">
                    <input
                      type="email"
                      value={email}
                      onChange={handleEmailChange}
                      onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleEmailSubmit(e)}
                      placeholder="your@email.com"
                      className="w-full px-6 py-4 bg-white/10 border-2 border-white/20 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-white/40 transition-colors text-lg mb-6"
                    />

                    {submitStatus === 'error' && (
                      <div className="mb-6 p-4 bg-red-500/10 border-2 border-red-500/20 rounded-2xl flex items-center gap-3">
                        <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
                        <p className="text-red-400">Oops! Please try again.</p>
                      </div>
                    )}

                    <button
                      onClick={handleEmailSubmit}
                      disabled={isSubmitting || !email.trim()}
                      className="w-full bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 text-white px-6 py-4 rounded-full font-bold text-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all flex items-center justify-center gap-3"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Joining...
                        </>
                      ) : (
                        <>
                          <Zap className="w-6 h-6" />
                          Get Early Access
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-sm text-gray-500 leading-relaxed">
                    🔒 Your privacy matters. Unsubscribe anytime.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}
