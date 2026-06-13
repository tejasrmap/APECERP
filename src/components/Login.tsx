import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, ArrowRight, CheckCircle2, Loader2, Shield, MessageSquare, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { RecaptchaVerifier, signInWithPhoneNumber, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'phone' | 'otp' | 'success'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
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
      if (user) {
        let isAllowed = false;
        let isAdminUser = false;

        const emailLower = user.email ? user.email.toLowerCase() : '';
        const userPhone = user.phoneNumber || '';
        const cleanUserPhone = userPhone.replace(/[\s+-]/g, '');
        const phoneCandidates = [
          userPhone,
          '+' + cleanUserPhone,
          cleanUserPhone,
          cleanUserPhone.slice(-10),
        ].filter(Boolean);

        const isAdminEmail =
          emailLower === 'admin@apecpowersolutions.com' ||
          emailLower === 'managingdirector@apecpowersolutions.com';
        const adminPhones = ['+918499903275', '918499903275', '8499903275', '+919999999999'];
        const isAdminPhone = adminPhones.some(ap => phoneCandidates.includes(ap));

        if (isAdminEmail || isAdminPhone) {
          isAllowed = true;
          isAdminUser = true;
        } else if (db) {
          try {
            // Check by email (Google Auth)
            if (user.email) {
              const q = query(collection(db, 'team'), where('email', '==', user.email));
              const snap = await getDocs(q);
              if (!snap.empty) isAllowed = true;
            }
            // Check by phone (OTP logins) — try all format variants
            if (!isAllowed && user.phoneNumber) {
              for (const candidate of phoneCandidates) {
                if (isAllowed) break;
                try {
                  const q = query(collection(db, 'team'), where('phone', '==', candidate));
                  const snap = await getDocs(q);
                  if (!snap.empty) isAllowed = true;
                } catch (_) { /* skip */ }
              }
            }
          } catch (err) {
            console.error('Error auto-redirecting user:', err);
          }
        } else {
          isAllowed = true;
        }

        if (isAllowed) {
          localStorage.setItem('isAuthenticated', 'true');
          // Admins → Overview dashboard; Employees → their My Profile page
          navigate(isAdminUser ? '/dashboard' : '/dashboard/my-profile');
        } else {
          await auth.signOut();
          localStorage.removeItem('isAuthenticated');
        }
      }
      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;

    // Ensure phone number is normalized to E.164 format (strip spaces, dashes, etc.)
    const rawPhone = phone.trim();
    const hasPlus = rawPhone.startsWith('+');
    const cleanDigits = rawPhone.replace(/\D/g, ''); // keep only digits

    let formattedPhone = '';
    if (hasPlus) {
      formattedPhone = '+' + cleanDigits;
    } else {
      if (cleanDigits.length === 10) {
        formattedPhone = '+91' + cleanDigits;
      } else if (cleanDigits.length === 12 && cleanDigits.startsWith('91')) {
        formattedPhone = '+' + cleanDigits;
      } else {
        setErrorMsg('Please enter a valid 10-digit phone number or include the country code (e.g. +91XXXXXXXXXX).');
        return;
      }
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      if (!auth) {
        // Fallback for development/offline mode
        if (formattedPhone === '+919999999999' || formattedPhone === '+919448102941') {
          setConfirmationResult({ mock: true, phone: formattedPhone });
          setStep('otp');
          alert('Offline Mode: Use OTP verification code 123456');
          return;
        }
        throw new Error('Firebase authentication is not configured in this environment.');
      }

      // Initialize RecaptchaVerifier
      const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible'
      });

      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      setConfirmationResult(confirmation);
      setStep('otp');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to send OTP code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !confirmationResult) return;

    setIsLoading(true);
    setErrorMsg('');

    try {
      let user = null;

      if (confirmationResult.mock) {
        // Offline mock verification
        if (otp === '123456') {
          user = { phoneNumber: confirmationResult.phone };
        } else {
          throw new Error('Invalid OTP verification code.');
        }
      } else {
        const userCredential = await confirmationResult.confirm(otp);
        user = userCredential.user;
      }

      // Check if user's phone number is registered in team database
      let isAllowed = false;
      let isAdminUser = false;
      let redirectPath = '/dashboard/my-profile'; // default for employees
      const userPhone = user.phoneNumber || '';
      // Normalize: strip all spaces, dashes, plus signs → raw digits
      const cleanUserPhone = userPhone.replace(/[\s+-]/g, '');
      // Build candidate phone formats to try against Firestore
      const phoneCandidates = [
        userPhone,                         // e.g. +918499903275
        '+' + cleanUserPhone,              // e.g. +918499903275 (re-prefixed)
        cleanUserPhone,                    // e.g. 918499903275
        cleanUserPhone.slice(-10),         // last 10 digits e.g. 8499903275
      ].filter(Boolean);

      // Hardcoded Admin numbers
      const adminPhones = ['+918499903275', '918499903275', '8499903275', '+919999999999'];
      if (adminPhones.some(ap => phoneCandidates.includes(ap))) {
        isAllowed = true;
        isAdminUser = true;
        redirectPath = '/dashboard';
      } else if (db) {
        // ── Phase 1: Fast indexed queries with all phone format variants ──
        for (const candidate of phoneCandidates) {
          if (isAllowed) break;
          try {
            const q = query(collection(db, 'team'), where('phone', '==', candidate));
            const snap = await getDocs(q);
            if (!snap.empty) { isAllowed = true; break; }
          } catch (_) { /* skip format */ }
        }

        // ── Phase 2: Normalized full-scan fallback ──
        // Matches regardless of how the admin typed the number (spaces, dashes,
        // leading 0, no country code, +91 prefix, etc.) by comparing last 10 digits.
        if (!isAllowed && cleanUserPhone.length >= 10) {
          try {
            const allSnap = await getDocs(collection(db, 'team'));
            const loginLast10 = cleanUserPhone.slice(-10);
            for (const docSnap of allSnap.docs) {
              const phoneVal = docSnap.data().phone;
              const storedClean = (phoneVal !== undefined && phoneVal !== null ? String(phoneVal) : '').replace(/[\s+-]/g, '');
              if (storedClean.length >= 10 && storedClean.slice(-10) === loginLast10) {
                isAllowed = true;
                break;
              }
            }
          } catch (_) { /* ignore scan errors */ }
        }
      } else {
        isAllowed = true;
      }

      if (!isAllowed) {
        if (auth && !confirmationResult.mock) {
          await auth.signOut();
        }
        throw new Error('Access denied. This phone number is not registered as a team member.');
      }

      setStep('success');
      setTimeout(() => {
        localStorage.setItem('isAuthenticated', 'true');
        navigate(isAdminUser ? '/dashboard' : redirectPath);
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'OTP verification failed. Please check the code.');
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
        const emailLower = user.email.toLowerCase();
        const isAdminEmail = 
          emailLower === 'admin@apecpowersolutions.com' ||
          emailLower === 'managingdirector@apecpowersolutions.com';

        if (!isAdminEmail) {
          const q = query(collection(db, 'team'), where('email', '==', user.email));
          const snap = await getDocs(q);
          if (snap.empty) {
            await auth.signOut();
            throw new Error('Access denied. Your Google account is not registered as a team member.');
          }
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
    <div className="min-h-screen w-full bg-[#05070c] flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans selection:bg-cyan-500/15 selection:text-cyan-400">
      
      {/* Invisible Recaptcha Container */}
      <div id="recaptcha-container"></div>

      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Vibrant Gradient Blobs */}
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-gradient-to-br from-cyan-500/15 via-cyan-500/5 to-transparent rounded-full blur-[120px] will-change-transform" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[70%] h-[70%] bg-gradient-to-br from-rose-500/10 via-rose-500/2 to-transparent rounded-full blur-[140px] will-change-transform" />
        
        {/* Tech Dotted Grid */}
        <div 
          className="absolute inset-0 opacity-40" 
          style={{ 
            backgroundImage: 'radial-gradient(rgba(6, 182, 212, 0.15) 1px, transparent 1px)', 
            backgroundSize: '24px 24px' 
          }} 
        />
        
        {/* Vignette fade to center */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#05070c_80%)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md glass-card border border-white/8 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.4)] overflow-hidden relative z-10"
      >
        {/* Top brand indicator */}
        <div className="h-1.5 bg-gradient-to-r from-rose-600 via-cyan-500 to-cyan-400" />

        <div className="p-5 sm:p-8 min-h-[460px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {step === 'phone' ? (
              <motion.div
                key="login-phone"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.25 }}
                className="flex-1 flex flex-col justify-center"
              >
                <div className="text-center mb-6">
                  {/* Brand Logo */}
                  <div className="w-16 h-16 rounded-full bg-slate-900/80 border border-slate-700/80 flex items-center justify-center mx-auto mb-4 shadow-md overflow-hidden p-0.5">
                    <img 
                      src="/logo.jpeg" 
                      alt="APEC Logo" 
                      className="w-full h-full object-contain" 
                      onError={(e) => {
                        e.currentTarget.src = '/logo.png';
                      }}
                    />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-100 tracking-tight">APEC ERP Portal</h2>
                  <p className="text-sm text-slate-400 mt-1">Sign in with phone number OTP</p>
                </div>

                <form onSubmit={handleSendOtp} className="space-y-4 flex-1 flex flex-col justify-center">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Phone Number</label>
                    <div className="relative flex items-center">
                      <Phone className="absolute left-3.5 w-5 h-5 text-slate-500" />
                      <span className="absolute left-11 text-sm text-slate-400 font-semibold select-none border-r border-slate-800/80 pr-2.5">
                        +91
                      </span>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          setErrorMsg('');
                        }}
                        placeholder="76750 52828"
                        required
                        disabled={isLoading}
                        style={{ paddingLeft: '88px' }}
                        className="w-full bg-slate-950/40 border border-slate-800 text-slate-100 rounded-xl py-3.5 pr-4 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/25 transition-all placeholder:text-slate-600 disabled:opacity-50 text-sm shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 ml-1">Enter your 10-digit registered mobile number.</p>
                  </div>

                  {errorMsg && (
                    <div className="text-rose-500 text-xs font-semibold text-center bg-rose-950/20 py-2.5 px-3 rounded-xl border border-rose-500/20">
                      {errorMsg}
                    </div>
                  )}

                  <div className="space-y-4 pt-2">
                    <button
                      type="submit"
                      disabled={isLoading || !phone}
                      className="w-full bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-950 font-extrabold py-3.5 rounded-xl transition-all relative overflow-hidden group flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(6,182,212,0.3)] hover:shadow-[0_4px_20px_rgba(6,182,212,0.45)]"
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-slate-955" />
                      ) : (
                        <>
                          Send Verification OTP
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>

                    <div className="relative my-4 flex items-center justify-center">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-slate-800" />
                      </div>
                      <span className="relative bg-[#090d16] px-3 text-xs uppercase text-slate-500 font-bold tracking-wider">Or</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isLoading}
                      className="w-full bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-slate-200 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 text-sm shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
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
            ) : step === 'otp' ? (
              <motion.div
                key="login-otp"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.25 }}
                className="flex-1 flex flex-col justify-center"
              >
                <div className="text-center mb-6">
                  {/* Message Icon */}
                  <div className="w-16 h-16 rounded-full bg-slate-900/80 border border-slate-700/80 flex items-center justify-center mx-auto mb-4 shadow-md overflow-hidden p-0.5">
                    <MessageSquare className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-100 tracking-tight">Enter Verification Code</h2>
                  <p className="text-sm text-slate-400 mt-1">We sent an SMS with a 6-digit OTP to your phone.</p>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-4 flex-1 flex flex-col justify-center">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">OTP Verification Code</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => {
                          setOtp(e.target.value.replace(/\D/g, ''));
                          setErrorMsg('');
                        }}
                        placeholder="••••••"
                        maxLength={6}
                        required
                        disabled={isLoading}
                        className="w-full bg-slate-950/40 border border-slate-800 text-slate-100 rounded-xl py-3.5 pl-11 pr-4 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/25 transition-all placeholder:text-slate-650 disabled:opacity-50 text-sm tracking-[0.2em] font-extrabold text-center shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                      />
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="text-rose-550 text-xs font-semibold text-center bg-rose-950/20 py-2.5 px-3 rounded-xl border border-rose-500/20">
                      {errorMsg}
                    </div>
                  )}

                  <div className="space-y-3 pt-2">
                    <button
                      type="submit"
                      disabled={isLoading || otp.length < 6}
                      className="w-full bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-950 font-extrabold py-3.5 rounded-xl transition-all relative overflow-hidden group flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(6,182,212,0.3)] hover:shadow-[0_4px_20px_rgba(6,182,212,0.45)]"
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-slate-955" />
                      ) : (
                        <>
                          Verify OTP & Sign In
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setStep('phone');
                        setErrorMsg('');
                        setOtp('');
                      }}
                      disabled={isLoading}
                      className="w-full bg-transparent hover:bg-slate-900/60 border border-slate-800/80 text-slate-400 hover:text-slate-200 py-3 rounded-xl transition-all text-xs font-bold"
                    >
                      Go Back
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
                <div className="w-20 h-20 rounded-full bg-emerald-950/20 border border-emerald-500/20 flex items-center justify-center mb-6 relative shadow-sm">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 rounded-full border border-emerald-500/30 border-t-transparent border-l-transparent"
                  />
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
                
                <h2 className="text-2xl font-bold text-slate-100 tracking-tight mb-2">Access Granted</h2>
                <p className="text-sm text-slate-400 mb-6">Welcome to APEC ERP Portal</p>
                
                <div className="flex items-center gap-2 text-slate-500 text-xs mt-4">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  Redirecting to your profile...
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {step !== 'success' && (
            <div className="mt-8 text-center border-t border-slate-800 pt-4">
              <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5 font-medium">
                <Shield className="w-3.5 h-3.5 text-slate-500" /> Secure OTP Verification Portal
              </p>
            </div>
          )}
        </div>
      </motion.div>
      <div className="text-[10px] text-slate-500 font-medium tracking-wider uppercase mt-6 relative z-10">
        &copy; {new Date().getFullYear()} APEC Power Solutions. All rights reserved.
      </div>
    </div>
  );
}
