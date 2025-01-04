"use client"
import React, { useState, useEffect } from 'react';

const AgentNav = () => {
  const [time, setTime] = useState('00:00:00');
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const agents = [
    { id: '01', name: 'TIM', path: '/agent/01', clearance: 'good' },
    { id: '02', name: 'LILY', path: '/agent/02', clearance: 'good' },
    { id: '03', name: 'MARK', path: '/agent/03', clearance: 'good' },
    { id: '04', name: 'ANESSA', path: '/agent/04', clearance: 'good' },
    { id: '05', name: 'MAX', path: '/agent/05', clearance: 'good' }
  ];

  return (
    <div className="min-h-screen bg-zinc-100 overflow-hidden font-mono">
      {/* Background Elements */}
      <div className="fixed inset-0">
        {/* Geometric Pattern */}
        <div className="absolute inset-0">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="absolute w-full h-px bg-black/5"
              style={{ top: `${i * 10}%`, transform: `rotate(${i * 5}deg)` }}
            />
          ))}
        </div>
        {/* Diagonal Sections */}
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-zinc-200/50 transform rotate-15" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-zinc-200/50 transform -rotate-15" />
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Top Bar */}
        <div className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-sm border-b border-black/10">
          <div className="max-w-4xl mx-auto h-full px-8 flex items-center justify-between">
            <div className="text-sm">SYS.TIME: {time}</div>
            <div className="text-sm tracking-widest">CLEARANCE_VERIFIED</div>
          </div>
        </div>

        {/* Main Section */}
        <div className="pt-32">
          {/* Title */}
          <div className="text-center mb-16">
            <h1 className="text-8xl font-bold tracking-tighter relative inline-block">
              <span className="absolute -inset-8 bg-blue-500/10 blur-2xl rounded-full" />
              <span className="relative">NEXUS</span>
            </h1>
          </div>

          {/* Agents List */}
          <div className="max-w-4xl mx-auto px-8">
            <div className="space-y-6">
              {agents.map((agent, index) => (
                <a
                  key={index}
                  href={agent.path}
                  className="block group"
                >
                  <div className="relative bg-white rounded-sm overflow-hidden
                                transform transition-all duration-300 group-hover:scale-[1.02]
                                group-hover:shadow-[0_0_30px_rgba(0,0,0,0.1)]">
                    {/* Dramatic Background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent 
                                  opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {/* Main Content */}
                    <div className="relative p-8 flex items-center justify-between">
                      {/* Left Section */}
                      <div className="flex items-center space-x-12">
                        {/* Agent Number with Decorative Elements */}
                        <div className="relative">
                          <div className="absolute -inset-4 bg-blue-500/5 rounded-sm transform rotate-45
                                        scale-0 group-hover:scale-100 transition-transform duration-300" />
                          <div className="text-5xl font-bold relative">{agent.id}</div>
                        </div>
                        
                        {/* Agent Name */}
                        <div className="text-2xl tracking-widest">{agent.name}</div>
                      </div>

                      {/* Right Section */}
                      <div className="flex items-center space-x-8">
                        <div className="text-sm tracking-wider opacity-0 group-hover:opacity-100 
                                      transition-all duration-300">
                          {agent.clearance}_CLASS
                        </div>
                        <div className="w-8 h-8 border-2 border-black/10 transform rotate-45
                                      group-hover:border-blue-500/50 transition-colors duration-300" />
                      </div>
                    </div>

                    {/* Progress Bars */}
                    <div className="absolute bottom-0 left-0 right-0 flex">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex-1 h-1 bg-black/5">
                          <div className="h-full bg-blue-500 transform -translate-x-full 
                                        group-hover:translate-x-0 transition-transform duration-700"
                               style={{ transitionDelay: `${i * 100}ms` }} />
                        </div>
                      ))}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-sm border-t border-black/10">
          <div className="max-w-4xl mx-auto h-full px-8 flex items-center justify-between">
            <div className="text-sm">QUANTUM_MATRIX:ACTIVE</div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-sm">READY</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentNav;