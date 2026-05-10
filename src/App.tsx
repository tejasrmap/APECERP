import React, { useState } from 'react';
import { Zap, Construction, HardHat, Wrench, Settings, ArrowRight, ShieldCheck, Activity } from 'lucide-react';
import { motion } from 'motion/react';
import LoginModal from './components/LoginModal';

export default function App() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col relative overflow-hidden font-sans text-slate-200">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-red-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-800/10 rounded-full blur-[150px]" />
        
        {/* Animated grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 w-full p-4 sm:p-6 md:p-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-center sm:justify-start gap-3 sm:gap-4"
        >
          {/* Logo */}
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center overflow-hidden border-2 border-slate-800 shadow-[0_0_15px_rgba(220,38,38,0.3)] shrink-0">
             <img src="/logo.jpeg" alt="APEC Logo" className="w-full h-full object-contain p-1" onError={(e) => {
               // Fallback if image not uploaded yet
               const target = e.currentTarget;
               target.src = '/logo.png';
               target.onerror = () => {
                 target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%23dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>';
                 target.className = 'w-8 h-8 object-contain';
                 target.onerror = null;
               };
             }} />
          </div>
          <div className="flex flex-col text-center sm:text-left">
            <span className="font-bold text-xl sm:text-2xl text-white tracking-widest uppercase leading-tight">APEC</span>
            <span className="text-[8px] sm:text-[10px] text-red-500 font-bold tracking-[0.2em] uppercase leading-none">Power Solutions Pvt. Ltd</span>
          </div>
        </motion.div>

        <motion.div
           initial={{ opacity: 0, y: -20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.6, delay: 0.1 }}
           className="flex items-center gap-2 text-xs sm:text-sm text-slate-400 font-medium mt-2 sm:mt-0"
        >
          <a href="http://www.apecpowersolutions.com" target="_blank" rel="noopener noreferrer" className="hover:text-red-400 transition-colors flex items-center gap-2">
            Visit Official Website <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
          </a>
        </motion.div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-12 text-center mt-4 sm:mt-[-40px]">
        <div className="max-w-4xl w-full flex flex-col items-center gap-8 sm:gap-12">
          
          {/* Top Info */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex flex-col items-center space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-slate-800/50 border border-slate-700/50 w-fit mx-auto">
               <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-red-500"></span>
              </span>
              <span className="text-[10px] sm:text-xs font-medium text-slate-300 tracking-wider uppercase">System Alpha Build</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight px-2 sm:px-0">
              Next-Gen <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-700">ERP</span> <br/>
              Under Development
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed px-4 sm:px-0">
              We are currently engineering a centralized Enterprise Resource Planning platform to optimize project workflows, inventory, and operational tracking for APEC Power Solutions.
            </p>

            <div className="pt-4 sm:pt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full max-w-2xl mx-auto text-left px-2 sm:px-0">
              <div className="flex items-start gap-3 p-3 sm:p-4 rounded-xl bg-slate-800/30 border border-slate-800">
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-white">Secure Architecture</h3>
                  <p className="text-xs text-slate-500 mt-1">Implementing role-based access for engineering and administrative teams.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 sm:p-4 rounded-xl bg-slate-800/30 border border-slate-800">
                <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-white">Live Processing</h3>
                  <p className="text-xs text-slate-500 mt-1">Real-time data synchronization across all construction sites.</p>
                </div>
              </div>
            </div>
            
            <div className="pt-6 sm:pt-8 flex flex-col items-center gap-4">
              <button 
                onClick={() => setIsLoginOpen(true)}
                className="px-6 py-3 sm:px-8 sm:py-3.5 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-500 hover:text-red-400 font-medium text-xs sm:text-sm border border-red-500/20 hover:border-red-500/40 w-fit flex items-center justify-center gap-2 sm:gap-3 shadow-lg transition-all"
              >
                 <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> 
                 Admin Portal Login
              </button>

              <div className="flex items-center justify-center gap-2 bg-slate-900/80 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-slate-800 shadow-sm mt-2 sm:mt-4 max-w-[90vw]">
                <span className="flex h-1.5 w-1.5 sm:h-2 sm:w-2 relative shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-red-500"></span>
                </span>
                <p className="text-[9px] sm:text-xs text-slate-400 font-medium tracking-wider uppercase truncate sm:whitespace-normal">
                  ERP Development by <a href="https://www.gtinnox.site" target="_blank" rel="noopener noreferrer" className="text-red-500 font-bold hover:text-red-400 transition-colors">GT InnoX</a> in progress
                </p>
              </div>
            </div>
          </motion.div>

          {/* Visual/Animated Elements Centered Below */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="relative flex justify-center w-full mt-2 sm:mt-4"
          >
            <div className="relative w-full max-w-[200px] sm:max-w-[280px] aspect-square flex items-center justify-center">
              
              {/* Spinning outer rings */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-1 sm:inset-2 rounded-full border border-slate-700/50 border-t-red-500/30 border-r-blue-500/30"
              />
              <motion.div 
                animate={{ rotate: -360 }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                className="absolute inset-5 sm:inset-8 rounded-full border border-dashed border-slate-700/80"
              />
              
              {/* Center module */}
              <div className="relative z-10 w-28 h-28 sm:w-44 sm:h-44 rounded-full bg-slate-900 border border-slate-800 shadow-[0_0_40px_rgba(220,38,38,0.15)] flex flex-col items-center justify-center p-3 sm:p-6">
                 
                 <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                 >
                   <Construction className="w-8 h-8 sm:w-14 sm:h-14 text-red-500 mb-1 sm:mb-2" />
                 </motion.div>
                 
                 <div className="text-center">
                   <div className="text-lg sm:text-2xl font-mono font-bold text-white tracking-widest">72<span className="text-red-500 text-sm sm:text-lg">%</span></div>
                 </div>

                 {/* Minimal progress bar */}
                 <div className="absolute bottom-5 sm:bottom-8 w-12 sm:w-20 h-1 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: "0%" }}
                      animate={{ width: "72%" }}
                      transition={{ duration: 2, delay: 1, ease: "easeOut" }}
                      className="h-full bg-red-500"
                    />
                 </div>
              </div>

              {/* Floating utility nodes */}
              <motion.div 
                 animate={{ y: [0, 8, 0] }}
                 transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                 className="absolute top-2 right-2 sm:top-4 sm:right-4 w-8 h-8 sm:w-12 sm:h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shadow-lg"
              >
                <HardHat className="w-3 h-3 sm:w-5 sm:h-5 text-blue-400" />
              </motion.div>

              <motion.div 
                 animate={{ y: [0, -12, 0] }}
                 transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
                 className="absolute bottom-4 left-0 sm:bottom-6 sm:left-2 w-10 h-10 sm:w-14 sm:h-14 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shadow-lg"
              >
                <Wrench className="w-4 h-4 sm:w-6 sm:h-6 text-slate-400" />
              </motion.div>

            </div>
          </motion.div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 p-4 sm:p-10 text-center flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-4 border-t border-slate-800/50">
        <p className="text-[10px] sm:text-xs text-slate-500">
          &copy; {new Date().getFullYear()} APEC Power Solutions. All rights reserved.
        </p>
        <p className="text-[10px] sm:text-xs text-slate-600 font-mono hidden sm:block">
          SYSTEM_STATE: DEV_ACTIVE
        </p>
      </footer>

      {/* Login Modal Overlay */}
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />

    </div>
  );
}


