import React, { useState } from 'react';
import { Play, Users, Clock, Star, ChevronRight } from 'lucide-react';

export default function PartykiteLanding() {
  const [expandedGame, setExpandedGame] = useState(null);

  const games = [
    {
      id: 1,
      title: "Who's the spy",
      description: "One player gets a different word. Find the spy before they find you!",
      players: "4-10 players",
      duration: "10-15 min",
      difficulty: "Easy",
      image: "🕵️‍♂️",
      rules: [
        "Each player receives a secret word, except one player who gets a different word (the spy)",
        "Players take turns describing their word without saying it directly",
        "The spy must figure out the real word while blending in",
        "After discussion, vote to eliminate the suspected spy",
        "Spy wins if they guess the word or avoid elimination"
      ]
    },
    {
      id: 2,
      title: "Clone",
      description: "Spot the differences and find your perfect match!",
      players: "3-8 players",
      duration: "15-20 min", 
      difficulty: "Medium",
      image: "🚗",
      rules: [
        "Players are secretly assigned into pairs (clones)",
        "Everyone receives similar but slightly different prompts",
        "Give answers that match your clone without being obvious",
        "Other players try to identify the clone pairs",
        "Clones win points for staying hidden while matching answers"
      ]
    }
  ];

  const toggleGameRules = (gameId) => {
    setExpandedGame(expandedGame === gameId ? null : gameId);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <button className="p-2">
            <div className="w-6 h-5 flex flex-col justify-between">
              <div className="w-full h-0.5 bg-gray-600 rounded"></div>
              <div className="w-full h-0.5 bg-gray-600 rounded"></div>
              <div className="w-full h-0.5 bg-gray-600 rounded"></div>
            </div>
          </button>
          <div className="w-6 h-6 text-gray-600">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
              <path d="M12 2l2.09 6.26L20 12l-5.91 3.74L12 22l-2.09-6.26L4 12l5.91-3.74L12 2z"/>
            </svg>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Hero Title */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-6 tracking-tight">
            PARTY GAMES
          </h1>
        </div>

        {/* Games Grid */}
        <div className="space-y-6">
          {games.map((game, index) => (
            <div key={game.id} className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Game Header */}
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-2xl font-medium text-gray-900 mb-2">{game.title}</h2>
                
                {/* Game Image/Icon Area */}
                <div className="bg-gray-50 rounded-2xl p-8 mb-4 text-center">
                  <div className="text-6xl mb-4">{game.image}</div>
                </div>
              </div>

              {/* Game Footer */}
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="text-sm font-medium text-gray-500">
                  GAME {String(index + 1).padStart(2, '0')}
                </div>
                <button 
                  onClick={() => toggleGameRules(game.id)}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ChevronRight className={`w-4 h-4 transition-transform ${expandedGame === game.id ? 'rotate-90' : ''}`} />
                </button>
              </div>

              {/* Expandable Rules */}
              {expandedGame === game.id && (
                <div className="border-t border-gray-100 p-6 bg-gray-50">
                  <h3 className="font-medium text-gray-900 mb-4">How to Play:</h3>
                  <div className="space-y-3">
                    {game.rules.map((rule, ruleIndex) => (
                      <div key={ruleIndex} className="flex gap-3">
                        <div className="bg-gray-900 text-white text-sm w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          {ruleIndex + 1}
                        </div>
                        <p className="text-gray-700 text-sm leading-relaxed">{rule}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-12 bg-white rounded-3xl shadow-sm border border-gray-200 p-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Coming Soon - Summer 2025
          </h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Get ready for the ultimate party game experience with Partykite.
          </p>
          <button className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-medium hover:bg-gray-800 transition-colors inline-flex items-center justify-center gap-2">
            <Play className="w-5 h-5" />
            Get Notified
          </button>
        </div>
      </div>
    </div>
  );
}
