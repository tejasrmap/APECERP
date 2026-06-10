import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { motion } from 'motion/react';
import {
  Phone,
  Mail,
  Briefcase,
  Calendar,
  Award,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Shield,
  ArrowLeft,
  MapPin,
  HeartPulse,
  User,
  BadgeCheck
} from 'lucide-react';
import { db } from '../firebase';

export default function ProfileView() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    const cleanedId = id.trim();

    if (cleanedId.toUpperCase().startsWith('APEC-DEMO') || cleanedId === 'demo') {
      setTimeout(() => {
        setProfile({
          id: 'demo-tech',
          name: 'Rahul Sharma',
          email: 'r.sharma@apecpowersolutions.com',
          role: 'Lead Grid Engineer',
          employeeId: 'APEC-2026-009',
          department: 'Grid Automation',
          status: 'Active',
          phone: '+91 94481 02941',
          joinedDate: '2025-01-15',
          avatar: 'cyan',
          accessRole: 'User',
          skills: ['HV Substation Audit', 'LOTO Protocol', 'PLC Systems', 'Transformer Safety'],
          emergencyName: 'Priya Sharma (Spouse)',
          emergencyPhone: '+91 94481 87654',
          bloodGroup: 'B+',
          medicalConditions: 'Allergy to Penicillin'
        });
        setLoading(false);
      }, 1000);
      return;
    }

    if (!db) {
      setError("Firebase Firestore is not initialized. Please verify that your environment variables (VITE_FIREBASE_*) are configured correctly.");
      setLoading(false);
      return;
    }

    setError(null);
    let unsubDoc: (() => void) | null = null;

    // Fetch via employeeId query first
    const qEmp = query(collection(db, 'team'), where('employeeId', '==', cleanedId));
    const unsubQuery = onSnapshot(qEmp, (snapshot) => {
      if (!snapshot.empty) {
        setProfile({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
        setLoading(false);
      } else {
        // Fallback to doc ID lookup
        try {
          const docRef = doc(db, 'team', cleanedId);
          unsubDoc = onSnapshot(docRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
              setProfile({ id: docSnapshot.id, ...docSnapshot.data() });
            } else {
              setProfile(null);
            }
            setLoading(false);
          }, (docErr) => {
            console.error("Direct doc ID fetch error:", docErr);
            setProfile(null);
            setLoading(false);
          });
        } catch (err) {
          console.error("Direct doc ID fetch catch block error:", err);
          setProfile(null);
          setLoading(false);
        }
      }
    }, (queryErr) => {
      console.error("Query by employeeId failed:", queryErr);
      setError(`Firestore Query Error: ${queryErr.message || queryErr.code || queryErr}`);
      
      // Fallback to direct doc ID lookup in case of query permission-denied
      try {
        console.log("Attempting direct doc ID lookup fallback for ID:", cleanedId);
        const docRef = doc(db, 'team', cleanedId);
        unsubDoc = onSnapshot(docRef, (docSnapshot) => {
          if (docSnapshot.exists()) {
            setProfile({ id: docSnapshot.id, ...docSnapshot.data() });
            setError(null); // Clear query error since fallback succeeded
          } else {
            setProfile(null);
          }
          setLoading(false);
        }, (docErr) => {
          console.error("Fallback direct doc ID fetch error:", docErr);
          setError(`Query failed: ${queryErr.message}. Fallback doc fetch failed: ${docErr.message}`);
          setProfile(null);
          setLoading(false);
        });
      } catch (err: any) {
        console.error("Fallback direct doc ID fetch catch block error:", err);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubQuery();
      if (unsubDoc) unsubDoc();
    };
  }, [id]);

  const isAdmin = profile?.accessRole === 'Admin' || profile?.roleType === 'Admin' || [
    'admin@apecpowersolutions.com',
    'managingdirector@apecpowersolutions.com'
  ].includes(profile?.email?.toLowerCase());

  const avatarGradients: Record<string, string> = {
    cyan: 'from-cyan-500 to-cyan-700',
    blue: 'from-blue-500 to-blue-700',
    red: 'from-rose-500 to-rose-700',
    gold: 'from-amber-400 to-amber-600',
  };
  const avatarGrad = profile ? (avatarGradients[profile.avatar || 'cyan'] || avatarGradients.cyan) : avatarGradients.cyan;

  return (
    <div className="min-h-screen bg-[#070C16] text-slate-800 relative overflow-hidden font-sans pb-12">
      {/* Real Power Grid background overlay matching the company's branding */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img 
          src="https://images.unsplash.com/photo-1473625247510-8ceb1760e4ec?auto=format&fit=crop&q=80" 
          alt="Power Grid" 
          className="w-full h-full object-cover opacity-[0.05] mix-blend-luminosity grayscale"
          referrerPolicy="no-referrer"
        />
        {/* Soft, professional brand color washes */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(220,38,38,0.04),transparent_60%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#070C16]/60 to-[#070C16]" />
        
        {/* Subtle architectural lines for a professional structure */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-70" />
      </div>

      {/* ─── LOADING STATE ─── */}
      {loading && (
        <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-slate-200 animate-spin border-t-[#DC2626]" />
            <Activity className="absolute inset-0 m-auto w-5 h-5 text-[#DC2626] animate-pulse" />
          </div>
          <p className="text-xs font-mono text-slate-400 tracking-wider uppercase">Loading Employee Record...</p>
        </div>
      )}

      {/* ─── NOT FOUND ─── */}
      {!loading && !profile && (
        <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6 px-4 py-8">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-4 text-center max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-[#DC2626]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wide">Record Not Found</h3>
              <p className="text-xs text-slate-505 mt-2 leading-relaxed">
                No active employee record in the APEC Power Solutions database matches the provided ID:
              </p>
              <span className="inline-block mt-3 font-mono text-slate-705 text-xs bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 break-all font-semibold">{id}</span>
            </div>

            {error && (
              <div className="mt-4 p-4 rounded-xl bg-red-50/50 border border-red-100 text-left w-full">
                <span className="text-[10px] font-mono text-[#DC2626] uppercase tracking-wider font-bold block mb-1">Database Diagnostic Alert</span>
                <p className="text-[11px] text-slate-650 leading-normal mb-3 font-mono break-words">
                  {error}
                </p>
                <div className="text-[10px] text-slate-500 leading-relaxed border-t border-red-100/60 pt-2.5 font-sans">
                  💡 <span className="font-semibold text-slate-700">Tip for Administrator:</span> If this is a <code>permission-denied</code> error, ensure your Firestore Security Rules allow public read access on the <code>team</code> collection. Example rule:
                  <pre className="mt-1.5 p-2 bg-slate-800 border border-slate-700 rounded text-[9px] font-mono text-cyan-400 overflow-x-auto select-all">
{`match /team/{memberId} {
  allow read: if true;
  allow write: if request.auth != null;
}`}
                  </pre>
                </div>
              </div>
            )}

            <Link to="/" className="mt-4 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-805 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm">
              <ArrowLeft className="w-4 h-4" /> Return to Portal
            </Link>
          </motion.div>
        </div>
      )}

      {/* ─── PROFILE ─── */}
      {!loading && profile && (
        <div className="relative z-10 max-w-xl mx-auto px-4 py-12 space-y-8">

          {/* ── HERO CARD ── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
          >
            {/* Solid corporate header banner */}
            <div className="h-24 bg-[#070C16] relative flex items-center justify-between px-6">
              {/* Left branding logo */}
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center p-0.5 overflow-hidden border border-white/10 shrink-0">
                  <img src="/logo.png" alt="APEC Logo" className="w-full h-full object-contain" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold tracking-wider text-white uppercase leading-none">APEC Power</span>
                  <span className="text-[#DC2626] text-[8px] font-bold tracking-widest uppercase mt-0.5">Solutions</span>
                </div>
              </div>
              {/* Right verification badge */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider font-sans">Verified Pass</span>
              </div>
            </div>

            {/* Profile info area */}
            <div className="px-8 pb-8 pt-8">
              {/* Avatar — overlapping the banner */}
              <div className="flex items-center gap-6 mb-6">
                <div className="relative shrink-0 -mt-14">
                  {profile.photoUrl ? (
                    <img
                      src={profile.photoUrl}
                      alt={profile.name}
                      className="w-28 h-28 rounded-2xl object-cover border-4 border-white shadow-md"
                    />
                  ) : (
                    <div className={`w-28 h-28 rounded-2xl bg-gradient-to-br ${avatarGrad} border-4 border-white flex items-center justify-center text-3xl font-bold text-white shadow-md`}>
                      {profile.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  {/* Status dot */}
                  <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${profile.status === 'Active' ? 'bg-emerald-500' : profile.status === 'Site Visit' ? 'bg-cyan-500' : 'bg-amber-500'}`} />
                </div>
                
                <div className="mb-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-lg font-bold text-[#070C16] leading-tight" style={{ color: '#070C16' }}>{profile.name}</h1>
                    {isAdmin && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[9px] font-bold uppercase tracking-wider">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#DC2626] font-bold mt-0.5 uppercase tracking-wide">{profile.role || 'Staff Member'}</p>
                  <div className="flex items-center gap-1.5 mt-1 text-slate-500">
                    <Briefcase className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-xs font-medium">{profile.department || 'Operations'}</span>
                  </div>
                </div>
              </div>

              <hr className="border-slate-100 my-6" />

              {/* Employee ID + Status row */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Employee ID:</span>
                  <span className="font-mono text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-lg">{profile.employeeId || 'APEC-MEMBER'}</span>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  profile.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  profile.status === 'Site Visit' ? 'bg-cyan-50 text-cyan-700 border-cyan-200' :
                  'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {profile.status || 'Active'}
                </span>
              </div>
            </div>
          </motion.div>

          {/* ── INFO GRID ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="grid grid-cols-2 gap-4"
          >
            {[
              { icon: Phone, label: 'Contact Phone', value: profile.phone || 'N/A', color: 'text-slate-800' },
              { icon: Mail, label: 'Official Email', value: profile.email || 'N/A', color: 'text-slate-800', truncate: true },
              { icon: Briefcase, label: 'Department', value: profile.department || 'Operations', color: 'text-slate-800' },
              { icon: Calendar, label: 'Joined Date', value: profile.joinedDate ? new Date(profile.joinedDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A', color: 'text-slate-800' },
            ].map(({ icon: Icon, label, value, color, truncate }) => (
              <div key={label} className="bg-white border border-slate-200 rounded-xl p-5 space-y-1.5 hover:border-slate-300 transition-colors shadow-sm">
                <div className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
                </div>
                <p className={`text-xs font-semibold ${color} ${truncate ? 'truncate' : ''}`} title={value}>{value}</p>
              </div>
            ))}
          </motion.div>

          {/* ── SKILLS ── */}
          {profile.skills && profile.skills.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
              className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm"
            >
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <Award className="w-4 h-4 text-[#DC2626]" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Skills & Certifications</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill: string, idx: number) => (
                  <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-55 border border-slate-200 text-[11px] text-slate-650 font-medium flex items-center gap-1.5 hover:border-slate-300 transition-colors">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] shrink-0" />
                    {skill}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── EMERGENCY CARD ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15 }}
            className="bg-white rounded-xl overflow-hidden border border-red-100 shadow-sm"
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-5 py-3.5 bg-red-50/60 border-b border-red-100">
              <HeartPulse className="w-4 h-4 text-[#DC2626]" />
              <span className="text-xs font-bold text-slate-850 uppercase tracking-wider">Emergency & Medical Information</span>
            </div>
            <div className="p-6 grid grid-cols-2 gap-6">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Emergency Contact</span>
                <span className="text-xs font-bold text-slate-800">{profile.emergencyName || 'N/A'}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Emergency Phone</span>
                <span className="text-xs font-bold text-slate-800">{profile.emergencyPhone || 'N/A'}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Blood Group</span>
                <span className="text-xs font-extrabold text-[#DC2626] flex items-center gap-1">🩸 {profile.bloodGroup || 'N/A'}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Medical Notes</span>
                <span className="text-xs font-medium text-slate-600 leading-snug">{profile.medicalConditions || 'None'}</span>
              </div>
            </div>
          </motion.div>

          {/* ── EMERGENCY CALL BUTTON ── */}
          {profile.emergencyPhone && profile.emergencyPhone !== 'N/A' && (
            <motion.a
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, delay: 0.2 }}
              href={`tel:${profile.emergencyPhone}`}
              className="flex w-full items-center justify-center gap-2.5 py-4 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-sm transition-all shadow-sm active:scale-[0.99] uppercase tracking-wider font-sans"
            >
              <Phone className="w-4 h-4 animate-pulse" />
              Call Emergency Contact
            </motion.a>
          )}

          {/* ── FOOTER ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, delay: 0.25 }}
            className="flex items-center justify-center pt-8"
          >
            <div className="flex items-center gap-1.5 text-slate-400">
              <User className="w-3.5 h-3.5" />
              <span className="text-[10px] font-medium uppercase tracking-wider">APEC Power Solutions Pvt. Ltd. · Employee Registry</span>
            </div>
          </motion.div>

        </div>
      )}
    </div>
  );
}
