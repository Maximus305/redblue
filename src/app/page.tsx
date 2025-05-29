"use client"

import React, { useState } from 'react';
import { ChevronRight, AlertCircle } from 'lucide-react';

// Extend the Window interface to include Firebase
declare global {
  interface Window {
    firebase?: {
      firestore: () => {
        collection: (name: string) => {
          add: (data: any) => Promise<any>;
        };
        FieldValue: {
          serverTimestamp: () => any;
        };
      };
    };
  }
}

export default function PartykiteLanding() {
  const [expandedGame, setExpandedGame] = useState<number | null>(null);
  const [showEmailSignup, setShowEmailSignup] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null);

  const games = [
    {
      id: 1,
      title: "Who&apos;s the Spy",
      description: "The ultimate deception game where one player gets a different word and must blend in while figuring out the real word. Perfect for 4-10 players!",
      players: "4-10 players",
      duration: "10-15 min",
      difficulty: "Easy",
      emoji: "🕵️‍♂️",
      category: "MYSTERY",
      gradient: "from-purple-500 to-pink-500",
      rules: [
        "Each player gets a secret word, except the spy who gets a different word",
        "Take turns describing your word without saying it directly",
        "The spy must figure out the real word while staying hidden",
        "Vote to eliminate the suspected spy after discussion"
      ]
    },
    {
      id: 2,
      title: "Clone",
      description: "Work secretly with your clone partner to give matching answers without being too obvious. Can you stay hidden in plain sight?",
      players: "3-8 players",
      duration: "15-20 min", 
      difficulty: "Medium",
      emoji: "👯‍♀️",
      category: "TEAMWORK",
      gradient: "from-pink-500 to-orange-500",
      rules: [
        "Players are secretly paired as clones",
        "Everyone gets similar but slightly different prompts",
        "Give answers that subtly match your clone partner",
        "Other players try to identify the clone pairs"
      ]
    }
  ];

  const handleEmailSubmit = async (e: React.MouseEvent<HTMLButtonElement> | React.FormEvent) => {
    e.preventDefault();
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim()) || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      // Check if Firebase is available
      if (typeof window !== 'undefined' && window.firebase && window.firebase.firestore) {
        const db = window.firebase.firestore();
        
        // Add email to Firestore
        await db.collection('email_signups').add({
          email: email.trim(),
          timestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
          source: 'partykite-landing',
          userAgent: navigator.userAgent,
          createdAt: new Date().toISOString()
        });

        console.log('Email successfully saved to Firestore:', email.trim());
        setSubmitStatus('success');
        setEmail('');
      } else {
        throw new Error('Firebase not initialized');
      }
      
    } catch (error) {
      console.error('Error saving email to Firestore:', error);
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

  const toggleGameRules = (gameId: number) => {
    setExpandedGame(expandedGame === gameId ? null : gameId);
  };

  const scrollToGames = () => {
    const gamesSection = document.getElementById('games-section');
    if (gamesSection) {
      gamesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                  <path d="M12 2l2.09 6.26L20 12l-5.91 3.74L12 22l-2.09-6.26L4 12l5.91-3.74L12 2z"/>
                </svg>
              </div>
              <span className="text-2xl font-bold text-gray-900">Partykite</span>
            </div>
            
            <button 
              onClick={() => setShowEmailSignup(true)}
              className="bg-gray-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
            >
              Get Notified
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-32">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="mb-8">
            <span className="text-6xl">🎉</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black mb-8 leading-tight text-gray-900">
            ULTIMATE
            <br />
            PARTY GAMES
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
            Transform any gathering into an unforgettable experience with our collection of 
            <span className="text-gray-900 font-semibold"> interactive party games</span> 
            designed to break the ice and create lasting memories.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <button 
              onClick={() => setShowEmailSignup(true)}
              className="bg-gray-900 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-800 transition-colors flex items-center gap-3"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7"></path>
              </svg>
              Join the Party - Free
            </button>
            
            <button 
              onClick={scrollToGames}
              className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg font-bold text-lg hover:border-gray-900 hover:text-gray-900 transition-colors"
            >
              Explore Games
            </button>
          </div>
          
          {/* Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-black text-gray-900 mb-2">50+</div>
              <div className="text-gray-600 font-medium">Unique Games</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-black text-gray-900 mb-2">10K+</div>
              <div className="text-gray-600 font-medium">Happy Players</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-black text-gray-900 mb-2">100%</div>
              <div className="text-gray-600 font-medium">Fun Guaranteed</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Games Section */}
      <section id="games-section" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
              Featured Games
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get a sneak peek at some of our most popular games that will be available at launch
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {games.map((game) => (
              <div key={game.id} className="bg-gray-50 rounded-2xl p-8 border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-6">
                  <div className="bg-gray-900 w-16 h-16 rounded-xl flex items-center justify-center text-3xl">
                    {game.emoji}
                  </div>
                  <span className="text-sm font-bold text-gray-600 bg-gray-200 px-3 py-1 rounded-full">
                    {game.category}
                  </span>
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{game.title}</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {game.description}
                </p>
                
                <button 
                  onClick={() => toggleGameRules(game.id)}
                  className="flex items-center gap-2 text-gray-900 hover:text-gray-700 transition-colors font-semibold"
                >
                  <span>Learn How to Play</span>
                  <ChevronRight className={`w-5 h-5 transition-transform ${expandedGame === game.id ? 'rotate-90' : ''}`} />
                </button>
                
                {expandedGame === game.id && (
                  <div className="mt-6 p-6 bg-white rounded-xl border border-gray-200">
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <span className="text-2xl">{game.category === 'MYSTERY' ? '🎯' : '🤝'}</span>
                      Game Rules:
                    </h4>
                    <div className="space-y-3">
                      {game.rules.map((rule, ruleIndex) => (
                        <div key={ruleIndex} className="flex gap-3 items-start">
                          <div className="bg-gray-900 text-white text-sm w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                            {ruleIndex + 1}
                          </div>
                          <p className="text-gray-700 leading-relaxed">{rule}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
              Why Choose Partykite?
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-8 rounded-2xl bg-white border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-gray-900 rounded-xl flex items-center justify-center mx-auto mb-6 text-3xl">
                🎮
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Easy to Play</h3>
              <p className="text-gray-600 leading-relaxed">No complicated rules or setup. Jump right into the fun with games designed for everyone.</p>
            </div>
            
            <div className="text-center p-8 rounded-2xl bg-white border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-gray-900 rounded-xl flex items-center justify-center mx-auto mb-6 text-3xl">
                👥
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Perfect for Groups</h3>
              <p className="text-gray-600 leading-relaxed">Whether it&apos;s 4 friends or 20 party-goers, our games scale perfectly for any group size.</p>
            </div>
            
            <div className="text-center p-8 rounded-2xl bg-white border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-gray-900 rounded-xl flex items-center justify-center mx-auto mb-6 text-3xl">
                ⚡
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Instant Fun</h3>
              <p className="text-gray-600 leading-relaxed">Break the ice immediately and keep the energy high with games that guarantee laughter.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="bg-gray-50 rounded-2xl p-12 border border-gray-200">
            <div className="text-6xl mb-8">🚀</div>
            
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
              Ready to Party?
            </h2>
            
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Join thousands of party hosts who are already signed up for early access. 
              Be the first to experience the future of party games.
            </p>
            
            <div className="bg-gray-100 rounded-xl p-6 mb-8">
              <div className="text-lg font-semibold text-gray-900 mb-2">🎉 Launch Special</div>
              <div className="text-gray-600">Free access to all games for early supporters</div>
            </div>
            
            <button 
              onClick={() => setShowEmailSignup(true)}
              className="bg-gray-900 text-white px-12 py-5 rounded-lg font-bold text-xl hover:bg-gray-800 transition-colors"
            >
              Get Free Early Access
            </button>
            
            <p className="text-sm text-gray-500 mt-6">
              No spam, no fees. Just party games when we launch! 🎊
            </p>
          </div>
        </div>
      </section>

      {/* Email Signup Modal */}
      {showEmailSignup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative border border-gray-200">
            <button 
              onClick={handleModalClose}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 text-3xl font-light"
            >
              ×
            </button>
            
            {submitStatus === 'success' ? (
              <div className="text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
                  🎊
                </div>
                <h4 className="text-2xl font-bold text-gray-900 mb-4">Welcome to the Party!</h4>
                <p className="text-gray-600 mb-8 leading-relaxed">
                  You&apos;re all set! We&apos;ll send you exclusive updates and notify you the moment Partykite is ready to rock.
                </p>
                <button 
                  onClick={handleModalClose}
                  className="bg-gray-900 text-white px-8 py-4 rounded-lg font-bold hover:bg-gray-800 transition-colors"
                >
                  Let&apos;s Go! 🚀
                </button>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
                  🎉
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-3">Join the Party!</h3>
                <p className="text-gray-600 mb-8 leading-relaxed">Get exclusive early access and be the first to know when Partykite launches.</p>
                
                <div className="mb-6">
                  <input
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleEmailSubmit(e)}
                    placeholder="Enter your email address"
                    className="w-full px-6 py-4 border-2 border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-gray-900 transition-colors text-lg mb-6"
                  />
                  
                  {submitStatus === 'error' && (
                    <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg flex items-center gap-3">
                      <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                      <p className="text-red-700">Something went wrong. Please try again!</p>
                    </div>
                  )}

                  <button
                    onClick={handleEmailSubmit}
                    disabled={isSubmitting || !email.trim()}
                    className="w-full bg-gray-900 text-white px-6 py-4 rounded-lg font-bold text-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Joining the Party...
                      </>
                    ) : (
                      <>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7"></path>
                        </svg>
                        Get Early Access
                      </>
                    )}
                  </button>
                </div>
                
                <p className="text-sm text-gray-500 leading-relaxed">
                  🔒 We respect your privacy. Unsubscribe anytime.
                  <br />
                  Just party updates, we promise!
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
