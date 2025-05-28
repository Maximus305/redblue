import React, { useState } from 'react';
import { Play, Users, Clock, Star, ChevronRight, Mail, Check, AlertCircle } from 'lucide-react';

export default function PartykiteLanding() {
  const [expandedGame, setExpandedGame] = useState(null);
  const [showEmailSignup, setShowEmailSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' or 'error'

  const games = [
    {
      id: 1,
      title: "Who's the Spy",
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

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim()) || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      // Simulate API call - replace with your actual endpoint
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          timestamp: new Date().toISOString(),
          source: 'partykite-landing',
          userAgent: navigator.userAgent
        }),
      });

      if (response.ok) {
        setSubmitStatus('success');
        setEmail('');
        console.log('Email successfully saved:', email);
      } else {
        throw new Error('Failed to subscribe');
      }
      
    } catch (error) {
      console.error('Error saving email:', error);
      
      // For demo purposes, we'll simulate success after a delay
      // Remove this in production and handle the actual error
      setTimeout(() => {
        setSubmitStatus('success');
        setEmail('');
      }, 1000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailChange = (e) => {
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

  const toggleGameRules = (gameId) => {
    setExpandedGame(expandedGame === gameId ? null : gameId);
  };

  const scrollToGames = () => {
    const gamesSection = document.getElementById('games-section');
    if (gamesSection) {
      gamesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 overflow-x-hidden">
      {/* Floating Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 bg-purple-500 opacity-10 rounded-full animate-bounce" style={{animationDelay: '0s', animationDuration: '6s'}}></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-pink-500 opacity-10 rounded-full animate-bounce" style={{animationDelay: '2s', animationDuration: '6s'}}></div>
        <div className="absolute bottom-40 left-1/4 w-20 h-20 bg-orange-500 opacity-10 rounded-full animate-bounce" style={{animationDelay: '4s', animationDuration: '6s'}}></div>
        <div className="absolute bottom-20 right-1/3 w-28 h-28 bg-blue-500 opacity-10 rounded-full animate-bounce" style={{animationDelay: '1s', animationDuration: '6s'}}></div>
      </div>

      {/* Header */}
      <nav className="relative z-10 bg-white/80 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                  <path d="M12 2l2.09 6.26L20 12l-5.91 3.74L12 22l-2.09-6.26L4 12l5.91-3.74L12 2z"/>
                </svg>
              </div>
              <span className="text-2xl font-bold text-gray-900">Partykite</span>
            </div>
            
            <button 
              onClick={() => setShowEmailSignup(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-full font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300 animate-pulse"
            >
              Get Early Access
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="animate-bounce mb-8" style={{animationDuration: '3s'}}>
            <span className="text-6xl">🎉</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black mb-8 leading-tight">
            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">ULTIMATE</span>
            <br />
            <span className="text-gray-900">PARTY GAMES</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
            Transform any gathering into an unforgettable experience with our collection of 
            <span className="text-purple-600 font-semibold"> interactive party games</span> 
            designed to break the ice and create lasting memories.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <button 
              onClick={() => setShowEmailSignup(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-full font-bold text-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-3"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7"></path>
              </svg>
              Join the Party - Free
            </button>
            
            <button 
              onClick={scrollToGames}
              className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-full font-bold text-lg hover:border-purple-500 hover:text-purple-500 transition-all duration-300"
            >
              Explore Games
            </button>
          </div>
          
          {/* Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-black text-purple-500 mb-2">50+</div>
              <div className="text-gray-600 font-medium">Unique Games</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-black text-pink-500 mb-2">10K+</div>
              <div className="text-gray-600 font-medium">Happy Players</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-black text-orange-500 mb-2">100%</div>
              <div className="text-gray-600 font-medium">Fun Guaranteed</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Games Section */}
      <section id="games-section" className="relative z-10 py-20">
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
              <div key={game.id} className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 border border-white/50 hover:transform hover:-translate-y-2 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between mb-6">
                  <div className={`bg-gradient-to-r ${game.gradient} w-16 h-16 rounded-2xl flex items-center justify-center text-3xl`}>
                    {game.emoji}
                  </div>
                  <span className={`text-sm font-bold ${game.category === 'MYSTERY' ? 'text-purple-600 bg-purple-100' : 'text-pink-600 bg-pink-100'} px-3 py-1 rounded-full`}>
                    {game.category}
                  </span>
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{game.title}</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {game.description}
                </p>
                
                <button 
                  onClick={() => toggleGameRules(game.id)}
                  className={`flex items-center gap-2 ${game.category === 'MYSTERY' ? 'text-purple-600 hover:text-pink-600' : 'text-pink-600 hover:text-orange-600'} transition-colors font-semibold`}
                >
                  <span>Learn How to Play</span>
                  <ChevronRight className={`w-5 h-5 transition-transform ${expandedGame === game.id ? 'rotate-90' : ''}`} />
                </button>
                
                {expandedGame === game.id && (
                  <div className="mt-6 p-6 bg-gray-50 rounded-2xl">
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <span className="text-2xl">{game.category === 'MYSTERY' ? '🎯' : '🤝'}</span>
                      Game Rules:
                    </h4>
                    <div className="space-y-3">
                      {game.rules.map((rule, ruleIndex) => (
                        <div key={ruleIndex} className="flex gap-3 items-start">
                          <div className={`${game.category === 'MYSTERY' ? 'bg-purple-500' : 'bg-pink-500'} text-white text-sm w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 font-bold`}>
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
      <section className="relative z-10 py-20 bg-white/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
              Why Choose Partykite?
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-8 rounded-3xl bg-white/50 backdrop-blur-sm border border-white/50 hover:shadow-lg transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl">
                🎮
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Easy to Play</h3>
              <p className="text-gray-600 leading-relaxed">No complicated rules or setup. Jump right into the fun with games designed for everyone.</p>
            </div>
            
            <div className="text-center p-8 rounded-3xl bg-white/50 backdrop-blur-sm border border-white/50 hover:shadow-lg transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl">
                👥
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Perfect for Groups</h3>
              <p className="text-gray-600 leading-relaxed">Whether it's 4 friends or 20 party-goers, our games scale perfectly for any group size.</p>
            </div>
            
            <div className="text-center p-8 rounded-3xl bg-white/50 backdrop-blur-sm border border-white/50 hover:shadow-lg transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl">
                ⚡
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Instant Fun</h3>
              <p className="text-gray-600 leading-relaxed">Break the ice immediately and keep the energy high with games that guarantee laughter.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="bg-white/80 backdrop-blur-md rounded-3xl p-12 border border-white/50 shadow-2xl">
            <div className="text-6xl mb-8 animate-bounce" style={{animationDuration: '3s'}}>🚀</div>
            
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
              Ready to Party?
            </h2>
            
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Join thousands of party hosts who are already signed up for early access. 
              Be the first to experience the future of party games.
            </p>
            
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl p-6 mb-8">
              <div className="text-lg font-semibold text-gray-900 mb-2">🎉 Launch Special</div>
              <div className="text-gray-600">Free access to all games for early supporters</div>
            </div>
            
            <button 
              onClick={() => setShowEmailSignup(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-12 py-5 rounded-full font-bold text-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 animate-pulse"
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
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative border border-white/20">
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
                  You're all set! We'll send you exclusive updates and notify you the moment Partykite is ready to rock.
                </p>
                <button 
                  onClick={handleModalClose}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-2xl font-bold hover:shadow-lg transition-all duration-300"
                >
                  Let's Go! 🚀
                </button>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
                  🎉
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-3">Join the Party!</h3>
                <p className="text-gray-600 mb-8 leading-relaxed">Get exclusive early access and be the first to know when Partykite launches.</p>
                
                <div className="mb-6">
                  <input
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    onKeyPress={(e) => e.key === 'Enter' && handleEmailSubmit(e)}
                    placeholder="Enter your email address"
                    className="w-full px-6 py-4 border-2 border-gray-200 rounded-2xl text-gray-900 placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors text-lg mb-6"
                  />
                  
                  {submitStatus === 'error' && (
                    <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-2xl flex items-center gap-3">
                      <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                      <p className="text-red-700">Something went wrong. Please try again!</p>
                    </div>
                  )}

                  <button
                    onClick={handleEmailSubmit}
                    disabled={isSubmitting || !email.trim()}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-4 rounded-2xl font-bold text-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-3"
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
