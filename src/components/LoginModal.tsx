import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Lock, LogIn, ArrowRight, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<'credentials' | 'otp' | 'success'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('credentials');
      setEmail('');
      setPassword('');
      setOtp(['', '', '', '', '', '']);
      setIsLoading(false);
      setErrorMsg('');
    }
  }, [isOpen]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    setErrorMsg('');

    // Simulate API call for checking credentials
    setTimeout(() => {
      setIsLoading(false);
      // HARDCODED MOCK VALIDATION
      if (email === 'admin@apec.com' && password === 'password123') {
        setStep('otp');
      } else {
        setErrorMsg('Invalid email or password.');
      }
    }, 1200);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length !== 6) return;
    
    setIsLoading(true);
    setErrorMsg('');

    // Simulate verifying OTP
    setTimeout(() => {
      setIsLoading(false);
      // HARDCODED MOCK VALIDATION
      if (otpCode === '123456') {
        setStep('success');
        
        // Wait 2 seconds for the success animation, then navigate
        setTimeout(() => {
          localStorage.setItem('isAuthenticated', 'true');
          onClose();
          navigate('/dashboard');
        }, 2500);
        
      } else {
        setErrorMsg('Invalid verification code.');
      }
    }, 1500);
  };

  const handleOtpChange = (index: number, value: string) => {
    setErrorMsg('');
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
            onClick={step !== 'success' && !isLoading ? onClose : undefined}
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

              {step !== 'success' && (
                <button
                  onClick={!isLoading ? onClose : undefined}
                  disabled={isLoading}
                  className="absolute top-4 right-4 z-10 text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800 disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              )}

              <div className="p-8 relative min-h-[460px] flex flex-col">
                <AnimatePresence mode="wait" custom={step === 'credentials' ? -1 : 1}>
                  
                  {step === 'credentials' ? (
                    <motion.div
                      key="step-credentials"
                      custom={-1}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.3 }}
                      className="flex-1 flex flex-col"
                    >
                      <div className="text-center mb-6">
                        <div className="w-16 h-16 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(220,38,38,0.15)]">
                          <LogIn className="w-8 h-8 text-red-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">Admin Portal</h2>
                        <p className="text-sm text-slate-400 mt-2">Sign in to access the ERP</p>
                      </div>

                      <form onSubmit={handleLogin} className="space-y-4 flex-1 flex flex-col justify-center">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-slate-300 uppercase tracking-wider ml-1">Email</label>
                          <div className="relative">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                              type="text"
                              value={email}
                              onChange={(e) => {
                                setEmail(e.target.value);
                                setErrorMsg('');
                              }}
                              placeholder="admin@apec.com"
                              required
                              disabled={isLoading}
                              className="w-full bg-slate-950/50 border border-slate-700 text-white rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all placeholder:text-slate-600 disabled:opacity-50"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-slate-300 uppercase tracking-wider ml-1">Password</label>
                          <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                              type="password"
                              value={password}
                              onChange={(e) => {
                                setPassword(e.target.value);
                                setErrorMsg('');
                              }}
                              placeholder="••••••••"
                              required
                              disabled={isLoading}
                              className="w-full bg-slate-950/50 border border-slate-700 text-white rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all placeholder:text-slate-600 disabled:opacity-50"
                            />
                          </div>
                        </div>

                        {errorMsg && (
                           <div className="text-red-500 text-xs font-medium text-center bg-red-500/10 py-2 rounded border border-red-500/20">
                             {errorMsg}
                           </div>
                        )}

                        <button
                          type="submit"
                          disabled={isLoading || !email || !password}
                          className="w-full bg-red-600 hover:bg-red-500 text-white font-medium py-3.5 rounded-xl transition-colors relative overflow-hidden group flex items-center justify-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          {isLoading ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              Login
                              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </>
                          )}
                        </button>
                      </form>
                    </motion.div>
                  ) : step === 'otp' ? (
                    <motion.div
                      key="step-otp"
                      custom={1}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.3 }}
                      className="flex-1 flex flex-col justify-center"
                    >
                      <div className="text-center mb-8">
                        <div className="w-16 h-16 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
                          <ShieldCheck className="w-8 h-8 text-blue-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">Two-Factor Auth</h2>
                        <p className="text-sm text-slate-400 mt-2 px-4">
                          Enter the 6-digit code sent to your device to secure your login.
                        </p>
                      </div>

                      <form onSubmit={handleVerifyOtp} className="space-y-8 flex-1 flex flex-col justify-center">
                        <div className="flex justify-center gap-2 sm:gap-3 items-center">
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

                        {errorMsg && (
                           <div className="text-red-500 text-xs font-medium text-center bg-red-500/10 py-2 rounded border border-red-500/20">
                             {errorMsg}
                           </div>
                        )}

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
                                  setErrorMsg('');
                               }}
                             >
                               Didn't receive a code? Resend
                             </button>
                          </div>
                        </div>
                      </form>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="step-success"
                      custom={1}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.5 }}
                      className="flex-1 flex flex-col items-center justify-center text-center"
                    >
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", damping: 15, delay: 0.2 }}
                        className="w-24 h-24 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-6 relative"
                      >
                         <motion.div 
                           animate={{ rotate: 360 }}
                           transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                           className="absolute inset-0 rounded-full border border-green-500/30 border-t-transparent border-l-transparent"
                         />
                         <CheckCircle2 className="w-12 h-12 text-green-500" />
                      </motion.div>
                      
                      <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Authentication Successful</h2>
                      
                      <div className="flex items-center gap-2 text-slate-400 text-sm mt-4">
                        <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                        Initializing secure session...
                      </div>
                    </motion.div>
                  )}
                  
                </AnimatePresence>

                {step !== 'success' && (
                  <div className="mt-6 text-center border-t border-slate-800 pt-4">
                     <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
                       <Lock className="w-3 h-3" /> Secure 2FA Authentication
                     </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
