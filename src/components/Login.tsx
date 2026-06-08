import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Lock, LogIn, ArrowRight, CheckCircle2, Loader2, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'credentials' | 'success'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check if user is already authenticated
  useEffect(() => {
    if (!auth) {
      const isLocalAuth = localStorage.getItem('isAuthenticated') === 'true';
      if (isLocalAuth) {
        navigate('/dashboard');
      }
      setCheckingAuth(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
        if (db) {
          try {
            const q = query(collection(db, 'team'), where('email', '==', user.email));
            const snap = await getDocs(q);
            if (!snap.empty) {
              localStorage.setItem('isAuthenticated', 'true');
              navigate('/dashboard');
            } else {
              await auth.signOut();
              localStorage.removeItem('isAuthenticated');
            }
          } catch (err) {
            console.error('Error auto-redirecting user:', err);
          }
        } else {
          localStorage.setItem('isAuthenticated', 'true');
          navigate('/dashboard');
        }
      }
      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    setErrorMsg('');

    try {
      if (!auth) {
        // Fallback for development/no auth config
        if (email === 'admin@apec.com' && password === 'admin') {
          setStep('success');
          setTimeout(() => {
            localStorage.setItem('isAuthenticated', 'true');
            navigate('/dashboard');
          }, 2000);
          return;
        }
        throw new Error('Firebase authentication is not configured in this environment.');
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check if user is in 'team' database
      if (db && user && user.email) {
        const q = query(collection(db, 'team'), where('email', '==', user.email));
        const snap = await getDocs(q);
        if (snap.empty) {
          await auth.signOut();
          throw new Error('Access denied. This email is not registered as a team member.');
        }
      }
      
      setStep('success');
      setTimeout(() => {
        localStorage.setItem('isAuthenticated', 'true');
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
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      
      // Check if user is in 'team' database
      if (db && user && user.email) {
        const q = query(collection(db, 'team'), where('email', '==', user.email));
        const snap = await getDocs(q);
        if (snap.empty) {
          await auth.signOut();
          throw new Error('Access denied. Your Google account is not registered as a team member.');
        }
      }
      
      setStep('success');
      setTimeout(() => {
        localStorage.setItem('isAuthenticated', 'true');
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMsg('Login popup closed before completion.');
      } else {
        setErrorMsg(err.message || 'Google sign-in failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="h-screen w-full bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#0e2a47]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans selection:bg-[#0e2a47]/10 selection:text-[#0e2a47]">
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-[100px] opacity-70" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-50 rounded-full blur-[120px] opacity-70" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f080_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f080_1px,transparent_1px)] bg-[size:32px_32px] opacity-40"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] overflow-hidden relative z-10"
      >
        {/* Top brand indicator */}
        <div className="h-1.5 bg-gradient-to-r from-red-600 via-red-500 to-[#0e2a47]" />

        <div className="p-8 min-h-[460px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {step === 'credentials' ? (
              <motion.div
                key="login-credentials"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.25 }}
                className="flex-1 flex flex-col justify-center"
              >
                <div className="text-center mb-6">
                  {/* Brand Logo */}
                  <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-4 shadow-sm overflow-hidden">
                    <img 
                      src="/logo.jpeg" 
                      alt="APEC Logo" 
                      className="w-full h-full object-contain p-1" 
                      onError={(e) => {
                        e.currentTarget.src = '/logo.png';
                      }}
                    />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">APEC ERP Portal</h2>
                  <p className="text-sm text-slate-500 mt-1">Sign in to access your dashboard</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4 flex-1 flex flex-col justify-center">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider ml-1">Email Address</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setErrorMsg('');
                        }}
                        placeholder="yourname@apec.com"
                        required
                        disabled={isLoading}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-[#0e2a47] focus:ring-1 focus:ring-[#0e2a47]/30 transition-all placeholder:text-slate-400 disabled:opacity-50 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider ml-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
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
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-[#0e2a47] focus:ring-1 focus:ring-[#0e2a47]/30 transition-all placeholder:text-slate-400 disabled:opacity-50 text-sm"
                      />
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="text-red-600 text-xs font-semibold text-center bg-red-50 py-2 px-3 rounded-xl border border-red-200/50">
                      {errorMsg}
                    </div>
                  )}

                  <div className="space-y-4 pt-2">
                    <button
                      type="submit"
                      disabled={isLoading || !email || !password}
                      className="w-full bg-[#0e2a47] hover:bg-[#0a2540] text-white font-medium py-3.5 rounded-xl transition-all relative overflow-hidden group flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          Sign In
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>

                    <div className="relative my-4 flex items-center justify-center">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-slate-200" />
                      </div>
                      <span className="relative bg-white px-3 text-xs uppercase text-slate-400 font-semibold tracking-wider">Or</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isLoading}
                      className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium py-3.5 rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 text-sm shadow-sm"
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
                      Sign In with Google
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="login-success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex-1 flex flex-col items-center justify-center text-center py-6"
              >
                <div className="w-20 h-20 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mb-6 relative shadow-sm">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 rounded-full border border-green-500/30 border-t-transparent border-l-transparent"
                  />
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Access Granted</h2>
                <p className="text-sm text-slate-500 mb-6">Welcome to APEC ERP Portal</p>
                
                <div className="flex items-center gap-2 text-slate-400 text-xs mt-4">
                  <Loader2 className="w-4 h-4 animate-spin text-[#0e2a47]" />
                  Loading administrative session...
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {step !== 'success' && (
            <div className="mt-8 text-center border-t border-slate-100 pt-4">
              <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 font-medium">
                <Shield className="w-3.5 h-3.5 text-slate-400" /> Secure Admin Access Only
              </p>
            </div>
          )}
        </div>
      </motion.div>
      <div className="text-[10px] text-slate-400 font-medium tracking-wider uppercase mt-6 relative z-10">
        &copy; {new Date().getFullYear()} APEC Power Solutions. All rights reserved.
      </div>
    </div>
  );
}
