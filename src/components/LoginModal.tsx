import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Lock, LogIn, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<'credentials' | 'success'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('credentials');
      setEmail('');
      setPassword('');
      setIsLoading(false);
      setErrorMsg('');
    }
  }, [isOpen]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    setErrorMsg('');

    try {
      if (!auth) {
        throw new Error('Firebase authentication is not configured in this environment.');
      }
      // Sign in with Email and Password using Firebase Auth
      await signInWithEmailAndPassword(auth, email, password);
      
      // Verification succeeded, transition to success step
      setStep('success');
      
      // Wait 2 seconds for success animation, then navigate to dashboard
      setTimeout(() => {
        localStorage.setItem('isAuthenticated', 'true');
        onClose();
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      console.error(err);
      if (
        err.code === 'auth/invalid-credential' || 
        err.code === 'auth/user-not-found' || 
        err.code === 'auth/wrong-password'
      ) {
        setErrorMsg('Invalid email or password.');
      } else if (err.code === 'auth/missing-password') {
        setErrorMsg('Password is required.');
      } else if (err.code === 'auth/too-many-requests') {
        setErrorMsg('Too many unsuccessful login attempts. Please try again later.');
      } else {
        setErrorMsg(err.message || 'Authentication failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      if (!auth) {
        throw new Error('Firebase authentication is not configured in this environment.');
      }
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      
      // Verification succeeded, transition to success step
      setStep('success');
      
      // Wait 2 seconds for success animation, then navigate to dashboard
      setTimeout(() => {
        localStorage.setItem('isAuthenticated', 'true');
        onClose();
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMsg('Login popup closed before completion.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        // Ignored, user double clicked or opened multiple popups
      } else {
        setErrorMsg(err.message || 'Google sign-in failed.');
      }
    } finally {
      setIsLoading(false);
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

              <div className="p-8 relative min-h-[460px] flex flex-col justify-center">
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
                      className="flex-1 flex flex-col justify-center"
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

                        <div className="space-y-4 pt-2">
                          <button
                            type="submit"
                            disabled={isLoading || !email || !password}
                            className="w-full bg-red-600 hover:bg-red-500 text-white font-medium py-3.5 rounded-xl transition-colors relative overflow-hidden group flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
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

                          <div className="relative my-4">
                            <div className="absolute inset-0 flex items-center">
                              <span className="w-full border-t border-slate-800" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                              <span className="bg-slate-900 px-2 text-slate-500">Or continue with</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                            className="w-full bg-slate-950 hover:bg-slate-800 border border-slate-700 text-white font-medium py-3.5 rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                          >
                            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                              <path
                                fill="#EA4335"
                                d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.16 2.682 1.077 6.618l4.189 3.147z"
                              />
                              <path
                                fill="#4285F4"
                                d="M24 12.273c0-.818-.082-1.609-.218-2.386H12v4.527h6.75A5.764 5.764 0 0 1 16.27 18.25l3.86 3.003c2.259-2.091 3.87-5.164 3.87-8.98z"
                              />
                              <path
                                fill="#FBBC05"
                                d="M5.266 14.235L1.077 17.38c2.083 3.937 6.192 6.62 10.923 6.62 3.055 0 5.864-1.009 7.945-2.747l-3.86-3.003c-1.1.736-2.5 1.182-4.085 1.182-4.227 0-7.8-2.855-9.082-6.764z"
                              />
                              <path
                                fill="#34A853"
                                d="M12 19.432c-1.585 0-2.985-.446-4.085-1.182l-3.86 3.003C6.136 22.991 8.945 24 12 24c4.73 0 8.84-2.683 10.923-6.62l-4.189-3.145c-1.282 3.909-4.855 6.764-9.082 6.764z"
                              />
                            </svg>
                            Sign in with Google
                          </button>
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
                      className="flex-1 flex flex-col items-center justify-center text-center py-6"
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
                      
                      <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Login Successful</h2>
                      
                      <div className="flex items-center gap-2 text-slate-400 text-sm mt-4">
                        <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                        Accessing administrative portal...
                      </div>
                    </motion.div>
                  )}
                  
                </AnimatePresence>

                {step !== 'success' && (
                  <div className="mt-6 text-center border-t border-slate-800 pt-4">
                     <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
                       <Lock className="w-3.5 h-3.5 text-slate-400" /> Secure Admin Authentication
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
