"use client"
import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
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
    <div className="min-h-screen bg-zinc-50 font-mono">
      {/* Header */}
      <nav className="bg-white border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <img
                src="/partykitelogo.png"
                alt="PartyKite"
                className="w-10 h-10"
              />
              <span className="text-xl font-bold tracking-tight">PARTYKITE</span>
            </div>

            <button
              onClick={() => setShowEmailSignup(true)}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-md text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              JOIN WAITLIST
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
            Interactive Party Games
            <br />
            <span className="text-blue-600">For Real Connections</span>
          </h1>

          <p className="text-xl text-zinc-600 mb-10 max-w-2xl mx-auto">
            PartyKite is a platform that brings people together through interactive games.
            No downloads. No accounts. Just scan and play.
          </p>

          <button
            onClick={() => setShowEmailSignup(true)}
            className="bg-blue-600 text-white px-8 py-4 rounded-md text-lg font-semibold hover:bg-blue-700 transition-colors inline-block"
          >
            Get Early Access
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6 bg-white border-y border-zinc-200">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">What is PartyKite?</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📱</span>
              </div>
              <h3 className="text-lg font-bold mb-2">Instant Play</h3>
              <p className="text-zinc-600 text-sm">
                Scan a QR code and start playing. No apps to download or accounts to create.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">👥</span>
              </div>
              <h3 className="text-lg font-bold mb-2">Real Connections</h3>
              <p className="text-zinc-600 text-sm">
                Games designed to break the ice and create genuine moments between people.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🎮</span>
              </div>
              <h3 className="text-lg font-bold mb-2">Always Fresh</h3>
              <p className="text-zinc-600 text-sm">
                New games added regularly. From classic party games to unique experiences.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>

          <div className="space-y-8">
            <div className="flex gap-6 items-start">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Create a Room</h3>
                <p className="text-zinc-600">
                  Pick your game and get an instant room code. Share it with your group.
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Everyone Joins</h3>
                <p className="text-zinc-600">
                  Players scan the QR code or enter the room code on their phones. No app needed.
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Play & Connect</h3>
                <p className="text-zinc-600">
                  Start playing immediately. Watch strangers become friends.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6 bg-white border-y border-zinc-200">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">10K+</div>
              <div className="text-sm text-zinc-600 uppercase tracking-wide">On Waitlist</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">50+</div>
              <div className="text-sm text-zinc-600 uppercase tracking-wide">Games</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">100%</div>
              <div className="text-sm text-zinc-600 uppercase tracking-wide">Fun</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Join?</h2>
          <p className="text-xl text-zinc-600 mb-8">
            Get free lifetime access when we launch. Join thousands already on the waitlist.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <div className="font-bold text-blue-900 mb-1">🎉 Launch Special</div>
            <div className="text-sm text-blue-700">Free lifetime access for early supporters</div>
          </div>

          <button
            onClick={() => setShowEmailSignup(true)}
            className="bg-blue-600 text-white px-8 py-4 rounded-md text-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Join the Waitlist
          </button>

          <p className="text-xs text-zinc-500 mt-6">
            No spam. No credit card required.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-zinc-200 py-8 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-3">
            <img
              src="/partykitelogo.png"
              alt="PartyKite"
              className="w-8 h-8"
            />
            <span className="text-sm font-bold">PARTYKITE</span>
          </div>
          <p className="text-xs text-zinc-500">
            © 2025 PartyKite. Making every gathering unforgettable.
          </p>
        </div>
      </footer>

      {/* Email Modal */}
      {showEmailSignup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 relative">
            <button
              onClick={handleModalClose}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 text-2xl font-light"
            >
              ×
            </button>

            {submitStatus === 'success' ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">✓</span>
                </div>
                <h4 className="text-2xl font-bold mb-3">You&apos;re In!</h4>
                <p className="text-zinc-600 mb-6">
                  We&apos;ll send you early access when we launch.
                </p>
                <button
                  onClick={handleModalClose}
                  className="bg-blue-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-blue-700 transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📧</span>
                </div>
                <h3 className="text-2xl font-bold mb-2">Join Waitlist</h3>
                <p className="text-zinc-600 mb-6 text-sm">
                  Be first to experience the future of party games
                </p>

                <div className="mb-6">
                  <input
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleEmailSubmit(e)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                  />

                  {submitStatus === 'error' && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-sm">
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                      <p className="text-red-700">Something went wrong. Please try again.</p>
                    </div>
                  )}

                  <button
                    onClick={handleEmailSubmit}
                    disabled={isSubmitting || !email.trim()}
                    className="w-full bg-blue-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Joining...
                      </>
                    ) : (
                      'Get Early Access'
                    )}
                  </button>
                </div>

                <p className="text-xs text-zinc-500">
                  🔒 Unsubscribe anytime. No spam.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
