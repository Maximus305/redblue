"use client"
import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { List } from 'phosphor-react';
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
  const [isScrolled, setIsScrolled] = useState<boolean>(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    <div className="min-h-screen" style={{ backgroundColor: '#FFFFFF', fontFamily: 'Helvetica, Arial, sans-serif' }}>
      {/* Header */}
      <nav
        className="sticky top-0 z-50 transition-all duration-300"
        style={{
          backgroundColor: isScrolled ? '#000000' : 'transparent',
          borderBottom: isScrolled ? '1px solid rgba(255,255,255,0.1)' : 'none'
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center relative">
            {/* Left - Menu Icon */}
            <button>
              <List
                size={32}
                weight="bold"
                color={isScrolled ? '#FFFFFF' : '#000000'}
                className="transition-colors duration-300"
              />
            </button>

            {/* Center - Logo */}
            <img
              src="/partykitetextlogo.png"
              alt="PartyKite"
              className="h-8 absolute left-1/2 transform -translate-x-1/2"
            />

            {/* Right - Download text */}
            <button
              className="bg-white text-black px-4 py-2 rounded-full text-sm font-semibold hover:bg-gray-200 transition-all duration-300"
              style={{
                opacity: isScrolled ? 1 : 0,
                visibility: isScrolled ? 'visible' : 'hidden'
              }}
            >
              DOWNLOAD
            </button>
          </div>
        </div>
      </nav>

      {/* Sub-header */}
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold text-black">Let&apos;s party</span>
          <span className="text-lg text-gray-500">3+ players</span>
        </div>
      </div>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center px-6 py-8 relative overflow-hidden"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px)',
          backgroundSize: '30px 30px'
        }}>
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left side - Text content */}
          <div className="text-left">
            <h1 style={{
              fontSize: 'clamp(60px, 12vw, 140px)',
              fontWeight: 400,
              lineHeight: 0.95,
              letterSpacing: '-0.02em',
              marginBottom: '48px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              color: '#000000'
            }}>
              LET&apos;S PLAY <span className="font-archivo-black" style={{ fontSize: '1.3em' }}>TONIGHT</span>
            </h1>

            <p style={{
              fontSize: '20px',
              fontWeight: 400,
              color: '#666666',
              marginBottom: '48px',
              lineHeight: 1.5,
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
              This is the board game that is completely inside of your phone.
            </p>

            <div className="flex gap-4 flex-wrap">
              <button
                onClick={() => setShowEmailSignup(true)}
                className="bg-black text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-gray-800 transition-colors inline-flex items-center gap-3"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                GET ON APP STORE
              </button>
              <button
                onClick={() => setShowEmailSignup(true)}
                className="bg-black text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-gray-800 transition-colors inline-flex items-center gap-3"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                  <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                </svg>
                GET ON PLAY STORE
              </button>
            </div>
          </div>

          {/* Right side - iPhone mockup */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative" style={{ width: '280px', height: '570px' }}>
              {/* iPhone frame */}
              <div className="absolute inset-0 bg-black rounded-[3rem] shadow-2xl p-2.5">
                <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden relative">
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-black rounded-b-3xl z-10"></div>

                  {/* Screenshot */}
                  <img
                    src="/screenshot.jpg"
                    alt="App Screenshot"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How Easy Section */}
      <section className="min-h-screen py-20 px-6 bg-black text-white flex items-center">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left - Text */}
            <div>
              <h2 className="text-7xl font-bold mb-8">Just scan and play</h2>
              <p className="text-3xl text-gray-400 leading-relaxed">
                No apps to download. No accounts to create. Just scan the QR code and start playing instantly.
              </p>
            </div>

            {/* Right - Visual */}
            <div className="flex justify-center">
              <div className="relative">
                {/* QR Code placeholder */}
                <div className="w-96 h-96 bg-white rounded-3xl flex items-center justify-center shadow-2xl">
                  <div className="w-72 h-72 bg-black rounded-2xl flex items-center justify-center">
                    <svg width="200" height="200" viewBox="0 0 200 200" fill="white">
                      <rect x="0" y="0" width="80" height="80" />
                      <rect x="120" y="0" width="80" height="80" />
                      <rect x="0" y="120" width="80" height="80" />
                      <rect x="30" y="30" width="20" height="20" fill="black" />
                      <rect x="150" y="30" width="20" height="20" fill="black" />
                      <rect x="30" y="150" width="20" height="20" fill="black" />
                    </svg>
                  </div>
                </div>

                {/* Phone icon pointing to QR */}
                <div className="absolute -right-16 top-1/2 transform -translate-y-1/2">
                  <svg width="100" height="100" viewBox="0 0 24 24" fill="white" opacity="0.3">
                    <path d="M17 1H7c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zm0 18H7V5h10v14z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WTS Game Feature */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="flex justify-between items-center mb-16">
            <h3 className="text-3xl font-bold text-black">Let&apos;s party</h3>
            <span className="text-xl text-gray-500">3+ players</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left - Game info */}
            <div>
              <h2 className="text-6xl font-bold mb-6">WHO&apos;S THE SPY</h2>
              <p className="text-2xl text-gray-600 mb-8">
                Find the spy among your friends before time runs out. A game of deception and deduction.
              </p>
              <div className="flex gap-4 text-lg">
                <span className="bg-black text-white px-6 py-3 rounded-full">3+ players</span>
                <span className="bg-black text-white px-6 py-3 rounded-full">5-10 min</span>
              </div>
            </div>

            {/* Right - Game screenshot */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative" style={{ width: '280px', height: '570px' }}>
                <div className="absolute inset-0 bg-black rounded-[3rem] shadow-2xl p-2.5">
                  <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden relative">
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-black rounded-b-3xl z-10"></div>
                    <img
                      src="/screenshot.jpg"
                      alt="Who's The Spy"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Clone Game */}
      <section className="py-20 px-6 bg-black text-white">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="flex justify-between items-center mb-16">
            <h3 className="text-3xl font-bold text-white">Let&apos;s party</h3>
            <span className="text-xl text-gray-500">3+ players</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left - Game screenshot */}
            <div className="flex justify-center lg:justify-start">
              <div className="relative" style={{ width: '280px', height: '570px' }}>
                <div className="absolute inset-0 bg-white rounded-[3rem] shadow-2xl p-2.5">
                  <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden relative">
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-black rounded-b-3xl z-10"></div>
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <span className="text-6xl">👥</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right - Game info */}
            <div>
              <h2 className="text-6xl font-bold mb-6">CLONE</h2>
              <p className="text-2xl text-gray-400 mb-8">
                More games coming soon. Stay tuned!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white border-t border-zinc-800 py-8 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm text-gray-500">
            © 2025 PartyKite. All rights reserved.
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
                  className="bg-purple-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-purple-700 transition-colors"
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
                    className="w-full bg-purple-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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
