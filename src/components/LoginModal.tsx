import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Lock, LogIn, ArrowRight, ShieldCheck } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [step, setStep] = useState<'identifier' | 'otp'>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep('identifier');
        setIdentifier('');
        setOtp(['', '', '', '', '', '']);
        setIsLoading(false);
      }, 300);
    }
  }, [isOpen]);

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) return;
    setIsLoading(true);
    // Simulate sending OTP
    setTimeout(() => {
      setIsLoading(false);
      setStep('otp');
    }, 1200);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length !== 6) return;
    
    setIsLoading(true);
    // Simulate verifying OTP
    setTimeout(() => {
      setIsLoading(false);
      onClose(); // Successfully verified and closed
    }, 1500);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const pastedData = value.slice(0, 6).split('');
      const newOtp = [...otp];
      for (let i = 0; i < pastedData.length; i++) {
        if (index + i < 6) newOtp[index + i] = pastedData[i];
      }
      setOtp(newOtp);
      // Focus the next empty input or the last one
      const nextIndex = Math.min(index + pastedData.length, 5);
      otpRefs.current[nextIndex]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      // Focus previous input on backspace if current is empty
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Animation variants
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 50 : -50,
      opacity: 0,
    }),
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={!isLoading ? onClose : undefined}
            className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-md"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-slate-900 border border-slate-700/50 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden pointer-events-auto relative"
            >
              {/* Decorative top gradient line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-red-500 to-blue-600" />

              <button
                onClick={!isLoading ? onClose : undefined}
                disabled={isLoading}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-8 relative min-h-[420px] flex flex-col">
                <AnimatePresence mode="wait" custom={step === 'identifier' ? -1 : 1}>
                  
                  {step === 'identifier' ? (
                    <motion.div
                      key="step-identifier"
                      custom={-1}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.3 }}
                      className="flex-1 flex flex-col"
                    >
                      <div className="text-center mb-8">
                        <div className="w-16 h-16 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(220,38,38,0.15)]">
                          <LogIn className="w-8 h-8 text-red-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">Admin Portal</h2>
                        <p className="text-sm text-slate-400 mt-2">Sign in with Email or Phone</p>
                      </div>

                      <form onSubmit={handleSendOtp} className="space-y-6 flex-1 flex flex-col">
                        <div className="space-y-1.5 flex-1">
                          <label className="text-xs font-medium text-slate-300 uppercase tracking-wider ml-1">Email or Phone Number</label>
                          <div className="relative">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                              type="text"
                              value={identifier}
                              onChange={(e) => setIdentifier(e.target.value)}
                              placeholder="admin@apec.com or +123456789"
                              required
                              disabled={isLoading}
                              className="w-full bg-slate-950/50 border border-slate-700 text-white rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all placeholder:text-slate-600 disabled:opacity-50"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={isLoading || !identifier}
                          className="w-full bg-red-600 hover:bg-red-500 text-white font-medium py-3.5 rounded-xl transition-colors relative overflow-hidden group flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          {isLoading ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              Send OTP
                              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </>
                          )}
                        </button>
                      </form>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="step-otp"
                      custom={1}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.3 }}
                      className="flex-1 flex flex-col"
                    >
                      <div className="text-center mb-8">
                        <div className="w-16 h-16 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
                          <ShieldCheck className="w-8 h-8 text-blue-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">Verification</h2>
                        <p className="text-sm text-slate-400 mt-2 px-4">
                          We sent a 6-digit code to <br/>
                          <span className="text-white font-medium">{identifier}</span>
                        </p>
                      </div>

                      <form onSubmit={handleVerifyOtp} className="space-y-8 flex-1 flex flex-col">
                        <div className="flex justify-center gap-2 sm:gap-3 flex-1 items-center">
                          {otp.map((digit, idx) => (
                            <input
                              key={idx}
                              ref={(el) => otpRefs.current[idx] = el}
                              type="text"
                              maxLength={6} // allow pasting full code
                              value={digit}
                              onChange={(e) => handleOtpChange(idx, e.target.value)}
                              onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                              disabled={isLoading}
                              className="w-10 h-12 sm:w-12 sm:h-14 bg-slate-950/50 border border-slate-700 rounded-xl text-center text-xl font-bold text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all disabled:opacity-50"
                            />
                          ))}
                        </div>

                        <div className="space-y-4">
                          <button
                            type="submit"
                            disabled={isLoading || otp.join('').length !== 6}
                            className="w-full bg-red-600 hover:bg-red-500 text-white font-medium py-3.5 rounded-xl transition-colors relative overflow-hidden group flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                          >
                            {isLoading ? (
                              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <>
                                Verify & Login
                                <LogIn className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                              </>
                            )}
                          </button>
                          
                          <div className="text-center">
                             <button 
                               type="button" 
                               disabled={isLoading}
                               className="text-xs text-slate-400 hover:text-red-400 transition-colors"
                               onClick={() => {
                                  // Mock resend
                                  setOtp(['', '', '', '', '', '']);
                                  otpRefs.current[0]?.focus();
                               }}
                             >
                               Didn't receive a code? Resend
                             </button>
                          </div>
                        </div>
                      </form>
                    </motion.div>
                  )}
                  
                </AnimatePresence>

                <div className="mt-8 text-center border-t border-slate-800 pt-4">
                   <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
                     <Lock className="w-3 h-3" /> Secure OTP Authentication
                   </p>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
