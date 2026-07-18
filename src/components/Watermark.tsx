import React from 'react';

export default function Watermark() {
  return (
    <>
      {/* 1. Ambient Background Canvas Watermark */}
      <div 
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none select-none z-[1] overflow-hidden opacity-[0.035] dark:opacity-[0.04] flex flex-wrap content-start justify-around gap-x-16 gap-y-20 p-8 transform -rotate-12 scale-125"
      >
        {Array.from({ length: 48 }).map((_, index) => (
          <div 
            key={index} 
            className="text-xs font-black tracking-[0.25em] text-slate-400 dark:text-cyan-300 uppercase whitespace-nowrap"
          >
            MADE BY GT INNOX LLP
          </div>
        ))}
      </div>

      {/* 2. Floating On-Screen Glass Badge */}
      <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-5 z-[60] pointer-events-none select-none">
        <div className="glass-card px-3 py-1.5 rounded-full border border-cyan-500/20 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.4)] flex items-center gap-2 transition-all duration-300 hover:border-cyan-500/40">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          <span className="text-[10px] sm:text-[11px] font-medium tracking-wide text-slate-300">
            Made by <span className="font-bold text-cyan-400">GT INNOX LLP</span>
          </span>
        </div>
      </div>

      {/* 3. Print Watermark (Paper Output) */}
      <div aria-hidden="true" className="hidden print:block fixed bottom-0 left-0 right-0 p-4 text-center border-t border-slate-300 text-[10px] text-slate-500 uppercase tracking-widest font-bold bg-white">
        APEC ERP System — Made by GT INNOX LLP — Confidential Report
      </div>
    </>
  );
}
