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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <nav className="bg-white border-b-2 border-black">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <img
                src="/partykitelogo.png"
                alt="PartyKite Logo"
                className="w-12 h-12"
              />
              <span className="text-3xl font-black" style={{ fontFamily: 'var(--font-barrio)' }}>
                PARTYKITE
              </span>
            </div>

            <button
              onClick={() => setShowEmailSignup(true)}
              className="bg-black text-white px-8 py-4 rounded-full font-black text-lg hover:bg-yellow-400 hover:text-black transition-colors"
            >
              JOIN WAITLIST
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-yellow-400 py-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-7xl md:text-9xl font-black mb-8" style={{ fontFamily: 'var(--font-barrio)', lineHeight: 0.9 }}>
            PARTY
            <br />
            GAMES
            <br />
            EVOLVED
          </h1>

          <p className="text-2xl md:text-3xl font-bold mb-12 max-w-3xl mx-auto" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
            The platform that turns strangers into friends through interactive party games
          </p>

          <button
            onClick={() => setShowEmailSignup(true)}
            className="bg-black text-white px-12 py-6 rounded-full font-black text-2xl hover:scale-105 transition-transform"
          >
            GET EARLY ACCESS
          </button>
        </div>
      </section>

      {/* What is PartyKite Section */}
      <section className="bg-white py-24 px-6 border-b-2 border-black">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-6xl md:text-7xl font-black text-center mb-16" style={{ fontFamily: 'var(--font-barrio)' }}>
            WHAT IS PARTYKITE?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-yellow-400 rounded-3xl p-8 border-2 border-black">
              <div className="text-6xl mb-6">🎮</div>
              <h3 className="text-3xl font-black mb-4">INSTANT PLAY</h3>
              <p className="text-xl font-semibold leading-relaxed">
                Scan a code. Start playing. No downloads, no accounts, no BS.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-black text-white rounded-3xl p-8 border-2 border-black">
              <div className="text-6xl mb-6">👥</div>
              <h3 className="text-3xl font-black mb-4 text-yellow-400">REAL CONNECTIONS</h3>
              <p className="text-xl font-semibold leading-relaxed">
                Games designed to break the ice and create genuine moments.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-yellow-400 rounded-3xl p-8 border-2 border-black">
              <div className="text-6xl mb-6">⚡</div>
              <h3 className="text-3xl font-black mb-4">ALWAYS FRESH</h3>
              <p className="text-xl font-semibold leading-relaxed">
                New games every week. Never run out of ways to have fun.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-yellow-400 py-24 px-6 border-b-2 border-black">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-6xl md:text-7xl font-black text-center mb-20" style={{ fontFamily: 'var(--font-barrio)' }}>
            HOW IT WORKS
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-32 h-32 bg-black rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-6xl font-black text-yellow-400">1</span>
              </div>
              <h3 className="text-3xl font-black mb-4">PICK A GAME</h3>
              <p className="text-xl font-semibold leading-relaxed">
                Choose from dozens of party games
              </p>
            </div>

            <div className="text-center">
              <div className="w-32 h-32 bg-black rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-6xl font-black text-yellow-400">2</span>
              </div>
              <h3 className="text-3xl font-black mb-4">SHARE THE CODE</h3>
              <p className="text-xl font-semibold leading-relaxed">
                Everyone scans the QR code to join
              </p>
            </div>

            <div className="text-center">
              <div className="w-32 h-32 bg-black rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-6xl font-black text-yellow-400">3</span>
              </div>
              <h3 className="text-3xl font-black mb-4">PLAY & LAUGH</h3>
              <p className="text-xl font-semibold leading-relaxed">
                Watch the magic happen
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white py-24 px-6 border-b-2 border-black">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-7xl font-black mb-4">10K+</div>
              <div className="text-xl font-bold">ON WAITLIST</div>
            </div>
            <div className="text-center">
              <div className="text-7xl font-black mb-4">50+</div>
              <div className="text-xl font-bold">GAMES</div>
            </div>
            <div className="text-center">
              <div className="text-7xl font-black mb-4">100%</div>
              <div className="text-xl font-bold">FUN</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-black text-white py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-6xl md:text-7xl font-black mb-8 text-yellow-400" style={{ fontFamily: 'var(--font-barrio)' }}>
            READY TO PARTY?
          </h2>

          <p className="text-2xl font-bold mb-12 leading-relaxed">
            Join thousands on the waitlist. Get free lifetime access when we launch.
          </p>

          <div className="bg-yellow-400 text-black rounded-3xl p-8 mb-12 border-2 border-yellow-400">
            <div className="text-3xl font-black mb-2">🎉 LAUNCH SPECIAL</div>
            <div className="text-xl font-bold">Free lifetime access for early supporters</div>
          </div>

          <button
            onClick={() => setShowEmailSignup(true)}
            className="bg-yellow-400 text-black px-12 py-6 rounded-full font-black text-2xl hover:scale-105 transition-transform"
          >
            JOIN THE WAITLIST
          </button>

          <p className="text-sm font-semibold mt-8 text-gray-400">
            No spam. No credit card. Just party games.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t-2 border-black py-12 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <img
              src="/partykitelogo.png"
              alt="PartyKite Logo"
              className="w-10 h-10"
            />
            <span className="text-2xl font-black" style={{ fontFamily: 'var(--font-barrio)' }}>
              PARTYKITE
            </span>
          </div>
          <p className="text-sm font-semibold text-gray-600">
            © 2025 PartyKite. Making every gathering unforgettable.
          </p>
        </div>
      </footer>

      {/* Email Signup Modal */}
      {showEmailSignup && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative border-4 border-black">
            <button
              onClick={handleModalClose}
              className="absolute top-6 right-6 text-black hover:text-gray-600 text-3xl font-black"
            >
              ×
            </button>

            {submitStatus === 'success' ? (
              <div className="text-center">
                <div className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6 text-5xl border-4 border-black">
                  🎊
                </div>
                <h4 className="text-4xl font-black mb-4">YOU&apos;RE IN!</h4>
                <p className="text-xl font-semibold mb-8 leading-relaxed">
                  Welcome to PartyKite. We&apos;ll send you early access when we launch.
                </p>
                <button
                  onClick={handleModalClose}
                  className="bg-black text-white px-8 py-4 rounded-full font-black hover:bg-yellow-400 hover:text-black transition-colors"
                >
                  LET&apos;S GO! 🚀
                </button>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6 text-5xl border-4 border-black">
                  🎉
                </div>
                <h3 className="text-4xl font-black mb-3">JOIN WAITLIST</h3>
                <p className="text-lg font-semibold mb-8 leading-relaxed">
                  Be first to experience the future of party games
                </p>

                <div className="mb-6">
                  <input
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleEmailSubmit(e)}
                    placeholder="your@email.com"
                    className="w-full px-6 py-4 border-4 border-black rounded-2xl text-black font-semibold text-lg mb-6 focus:outline-none focus:border-yellow-400"
                  />

                  {submitStatus === 'error' && (
                    <div className="mb-6 p-4 bg-red-100 border-4 border-red-600 rounded-2xl flex items-center gap-3">
                      <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                      <p className="text-red-600 font-bold">Oops! Please try again.</p>
                    </div>
                  )}

                  <button
                    onClick={handleEmailSubmit}
                    disabled={isSubmitting || !email.trim()}
                    className="w-full bg-black text-white px-6 py-4 rounded-full font-black text-lg hover:bg-yellow-400 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        JOINING...
                      </>
                    ) : (
                      <>
                        GET EARLY ACCESS
                      </>
                    )}
                  </button>
                </div>

                <p className="text-sm font-semibold text-gray-600 leading-relaxed">
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
