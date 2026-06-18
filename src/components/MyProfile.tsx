import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Phone,
  Mail,
  Briefcase,
  Calendar,
  Award,
  Shield,
  User,
  HeartPulse,
  MapPin,
  Loader2,
  AlertTriangle,
  Lock,
  RefreshCw,
  Activity
} from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function MyProfile() {
  const { userProfile: ctxProfile } = useOutletContext<any>();

  const [profile, setProfile] = useState<any>(ctxProfile || null);
  const [loading, setLoading] = useState(!ctxProfile);
  const [error, setError] = useState<string | null>(null);

  // Fetch own profile directly from Firestore when context profile is unavailable
  useEffect(() => {
    if (ctxProfile) {
      setProfile(ctxProfile);
      setLoading(false);
      return;
    }

    const fetchOwnProfile = async () => {
      setLoading(true);
      setError(null);

      if (!db || !auth?.currentUser) {
        setError('not-configured');
        setLoading(false);
        return;
      }

      const user = auth.currentUser;
      const userEmail = user.email ? user.email.toLowerCase() : '';
      const userPhone = user.phoneNumber || '';
      
      let cleanPhone = '';
      const isVirtual = userEmail.endsWith('@apec-erp.local');
      if (isVirtual) {
        cleanPhone = userEmail.split('@')[0];
      } else {
        cleanPhone = userPhone.replace(/[\s+-]/g, '');
      }

      const phoneCandidates = [
        userPhone,
        '+' + cleanPhone,
        cleanPhone,
        cleanPhone.slice(-10),
      ].filter(Boolean);

      try {
        // 1. Try by email first (Google auth)
        if (user.email) {
          const q = query(collection(db, 'team'), where('email', '==', user.email));
          const snap = await getDocs(q);
          if (!snap.empty) {
            setProfile({ id: snap.docs[0].id, ...snap.docs[0].data() });
            setLoading(false);
            return;
          }
        }

        // 2. Try each phone format via indexed where queries
        for (const candidate of phoneCandidates) {
          try {
            const q = query(collection(db, 'team'), where('phone', '==', candidate));
            const snap = await getDocs(q);
            if (!snap.empty) {
              setProfile({ id: snap.docs[0].id, ...snap.docs[0].data() });
              setLoading(false);
              return;
            }
          } catch (_) { /* try next format */ }
        }

        // 3. Normalized full-scan fallback (handles any storage format)
        if (cleanPhone.length >= 10) {
          const allSnap = await getDocs(collection(db, 'team'));
          const loginLast10 = cleanPhone.slice(-10);
          for (const docSnap of allSnap.docs) {
            const phoneVal = docSnap.data().phone;
            const stored = (phoneVal !== undefined && phoneVal !== null ? String(phoneVal) : '').replace(/[\s+-]/g, '');
            if (stored.length >= 10 && stored.slice(-10) === loginLast10) {
              setProfile({ id: docSnap.id, ...docSnap.data() });
              setLoading(false);
              return;
            }
          }
        }

        // Nothing found
        setError('not-found');
      } catch (err: any) {
        console.error('MyProfile fetch error:', err);
        if (err?.code === 'permission-denied') {
          setError('permission-denied');
        } else {
          setError('unknown');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOwnProfile();
  }, [ctxProfile]);

  // Update profile when context eventually loads
  useEffect(() => {
    if (ctxProfile && !profile) {
      setProfile(ctxProfile);
      setLoading(false);
    }
  }, [ctxProfile]);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 text-center max-w-md mx-auto p-8 bg-slate-900/40 border border-slate-800 rounded-2xl shadow-xl">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        <div>
          <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Loading Profile</h4>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Retrieving your records from the APEC database...
          </p>
        </div>
      </div>
    );
  }

  // ── Firestore permission denied ──
  if (error === 'permission-denied') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center max-w-lg mx-auto p-8 bg-amber-950/10 border border-amber-500/20 rounded-2xl shadow-xl">
        <AlertTriangle className="w-10 h-10 text-amber-500" />
        <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Firestore Access Restricted</h4>
        <p className="text-xs text-slate-400 leading-relaxed">
          Your profile data is in the database but Firestore security rules are preventing access.
          Please ask your administrator to update the Firebase Console rules to:
        </p>
        <pre className="text-left text-[10px] bg-slate-950 border border-slate-800 rounded-xl p-4 w-full font-mono text-cyan-400 select-all leading-relaxed overflow-x-auto">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`}
        </pre>
        <button
          onClick={() => { setError(null); setLoading(true); window.location.reload(); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-cyan-400 text-xs font-bold hover:bg-cyan-950/50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry After Updating Rules
        </button>
      </div>
    );
  }

  // ── Not found in team collection ──
  if (error === 'not-found' || (!loading && !profile)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center max-w-md mx-auto p-6 bg-slate-900/40 border border-slate-800 rounded-2xl">
        <User className="w-10 h-10 text-slate-500" />
        <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Profile Not Found</h4>
        <p className="text-xs text-slate-400 leading-relaxed">
          Your phone number is not linked to any team record. Please contact the administrator to add your profile in Team Control.
        </p>
      </div>
    );
  }

  const avatarGradients: Record<string, string> = {
    cyan: 'from-cyan-500/20 to-cyan-500/5 text-cyan-400 border-cyan-500/25',
    blue: 'from-blue-500/20 to-blue-500/5 text-blue-400 border-blue-500/25',
    red: 'from-rose-500/20 to-rose-500/5 text-rose-400 border-rose-500/25',
    gold: 'from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/25'
  };
  const avatarClass = avatarGradients[profile.avatar || 'cyan'] || avatarGradients.cyan;

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      {/* Top Welcome Title */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-slate-100">My Profile</h3>
          <p className="text-xs text-slate-400 mt-1">Review your corporate credentials, personal records, and registry details</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
          <Lock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          Secure Dashboard View
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">

        {/* ── LEFT COLUMN (ID Pass Card) ── */}
        <div className="md:col-span-4 space-y-6">
          <div className="glass-card p-6 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.3)] border border-white/5 flex flex-col items-center text-center">

            {/* Photo / Initials */}
            <div className="relative shrink-0 mt-4 inline-block">
              {profile.photoUrl ? (
                <img
                  src={profile.photoUrl}
                  alt={profile.name}
                  className="w-28 h-28 rounded-2xl object-cover border-2 border-slate-700 shadow-md"
                />
              ) : (
                <div className={`w-28 h-28 rounded-2xl bg-gradient-to-br ${avatarClass} border-2 border-slate-700 flex items-center justify-center text-3xl font-extrabold shadow-md`}>
                  {profile.name?.slice(0, 2).toUpperCase() || 'ME'}
                </div>
              )}
              <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-950 ${profile.status === 'Active' ? 'bg-emerald-500' : profile.status === 'Site Visit' ? 'bg-cyan-500' : profile.status === 'Inactive' ? 'bg-rose-500' : 'bg-amber-500'}`} />
            </div>

            <h4 className="text-lg font-bold text-slate-100 mt-5 leading-tight">{profile.name}</h4>
            <p className="text-xs text-cyan-400 font-bold uppercase tracking-wider mt-1.5">{profile.role || 'Staff Member'}</p>

            <div className="flex items-center gap-1.5 mt-3 text-slate-400">
              <Briefcase className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs font-semibold">{profile.branch || 'Vijayawada'}</span>
            </div>

            <hr className="border-slate-800/80 w-full my-5" />

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4 w-full text-left font-mono">
              <div className="space-y-1">
                <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold block">Employee ID</span>
                <span className="text-xs font-bold text-slate-300 bg-slate-955/60 border border-slate-900 px-2 py-1 rounded block text-center select-all">{profile.employeeId || 'APEC-MEMBER'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold block">Access Priority</span>
                <span className={`inline-flex w-full justify-center items-center py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${
                  profile.accessRole === 'Admin' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {profile.accessRole === 'Admin' ? 'Admin' : 'User'}
                </span>
              </div>
            </div>

            <div className="mt-3.5 space-y-1 w-full text-left font-mono">
              <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold block">Last Active</span>
              <span className="text-xs font-bold text-slate-300 bg-slate-955/60 border border-slate-900 px-2 py-1 rounded block text-center truncate">
                {profile.lastActive ? (
                  profile.lastActive.toDate ? profile.lastActive.toDate().toLocaleString() : new Date(profile.lastActive).toLocaleString()
                ) : 'Just Now'}
              </span>
            </div>

            <hr className="border-slate-800/80 w-full my-5" />

            {/* Barcode Visual */}
            <div className="flex flex-col items-center gap-1.5 select-none opacity-60 hover:opacity-85 transition-opacity w-full">
              <div className="flex items-center gap-[1.5px] h-7 bg-white/5 p-1 rounded w-full justify-center">
                {[1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2, 1, 4, 2, 1, 3, 1, 2, 1].map((width, idx) => (
                  <div key={idx} className="bg-slate-400 h-full rounded-[0.5px]" style={{ width: `${width}px` }} />
                ))}
              </div>
              <span className="text-[8px] font-mono text-slate-500 tracking-[0.25em]">APEC-{profile.employeeId || 'MEMBER'}-SECURE</span>
            </div>

          </div>
        </div>

        {/* ── RIGHT COLUMN (Profile Details) ── */}
        <div className="md:col-span-8 space-y-6">

          {/* Quick contact and dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: Phone, label: 'Phone Number', value: profile.phone || 'N/A' },
              { icon: Mail, label: 'Official Email', value: profile.email || 'N/A', truncate: true },
              { icon: Calendar, label: 'Joined Date', value: profile.joinedDate ? new Date(profile.joinedDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A' },
            ].map(({ icon: Icon, label, value, truncate }: any) => (
              <div key={label} className="glass-card p-4 flex flex-col justify-between border border-white/5 hover:border-slate-800 transition-all">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-950 flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
                </div>
                <p className={`text-xs font-semibold text-slate-200 mt-2.5 ${truncate ? 'truncate' : ''}`} title={value}>{value}</p>
              </div>
            ))}
          </div>

          {/* Personal & Address Details */}
          <div className="glass-card p-6 space-y-4 border border-white/5">
            <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2.5">
              <User className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">Personal & Address Details</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Father's Name</span>
                <span className="text-slate-200 font-bold block mt-0.5">{profile.fatherName || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Gender</span>
                <span className="text-slate-200 font-bold block mt-0.5">{profile.gender || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Date of Birth</span>
                <span className="text-slate-200 font-bold block mt-0.5">{profile.dob || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Marital Status</span>
                <span className="text-slate-200 font-bold block mt-0.5">{profile.maritalStatus || 'N/A'}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Qualification</span>
                <span className="text-slate-200 font-bold block mt-0.5">{profile.qualification || 'N/A'}</span>
              </div>
              <div className="sm:col-span-2 border-t border-slate-900/60 pt-2 mt-1">
                <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Present Address</span>
                <span className="text-slate-300 block text-xs leading-normal select-all mt-0.5">{profile.presentAddress || 'N/A'}</span>
              </div>
              <div className="sm:col-span-2 border-t border-slate-900/60 pt-2 mt-1">
                <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Permanent Address</span>
                <span className="text-slate-300 block text-xs leading-normal select-all mt-0.5">{profile.permanentAddress || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Secure Registry Details */}
          <div className="glass-card p-6 space-y-4 border border-white/5">
            <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2.5">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">Secure Registration & Identity Records</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs font-mono">
              {[
                { label: 'PAN Card', value: profile.pan },
                { label: 'Aadhar Number', value: profile.aadharNumber },
                { label: 'ESI Number', value: profile.esiNumber },
                { label: 'PF Number', value: profile.pfNumber },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 bg-slate-950/20 rounded-xl border border-white/5">
                  <span className="text-slate-500 block uppercase tracking-wider text-[9px]">{label}</span>
                  <span className="text-slate-200 font-bold block mt-0.5 select-all">{value || 'N/A'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bank Account Details */}
          <div className="glass-card p-6 space-y-4 border border-white/5">
            <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2.5">
              <Award className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">Bank Account Details</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-3 bg-slate-950/10 rounded-xl border border-slate-900/60">
                <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Account Holder Name</span>
                <span className="text-slate-200 font-bold block mt-0.5">{profile.bankAccountName || 'N/A'}</span>
              </div>
              <div className="p-3 bg-slate-950/10 rounded-xl border border-slate-900/60">
                <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Account Number</span>
                <span className="text-slate-200 font-bold block mt-0.5 select-all">{profile.bankAccountNumber || 'N/A'}</span>
              </div>
              <div className="p-3 bg-slate-950/10 rounded-xl border border-slate-900/60">
                <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Bank IFSC Code</span>
                <span className="text-cyan-400 font-bold block mt-0.5 select-all">{profile.bankIfsc || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Skills & Emergency Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

            {/* Skills */}
            {profile.skills && profile.skills.length > 0 && (
              <div className="glass-card p-6 space-y-4 border border-white/5 flex-1">
                <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2.5">
                  <Award className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">Professional Skills</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill: string, idx: number) => (
                    <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-900 text-[11px] text-slate-300 font-medium flex items-center gap-1.5 hover:border-slate-800 transition-colors">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Emergency & Medical */}
            <div className="glass-card overflow-hidden border border-red-950/30 flex-1">
              <div className="flex items-center gap-2 px-5 py-3.5 bg-red-950/10 border-b border-red-950/30">
                <HeartPulse className="w-4 h-4 text-[#DC2626]" />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Emergency Contact & Medical</span>
              </div>
              <div className="p-5 space-y-3 font-mono text-xs">
                <div className="flex justify-between border-b border-slate-900/60 pb-1.5">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Contact Person</span>
                  <span className="text-slate-200 font-bold">{profile.emergencyName || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-900/60 pb-1.5">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Phone Number</span>
                  <span className="text-slate-200 font-bold select-all">{profile.emergencyPhone || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-900/60 pb-1.5">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Blood Group</span>
                  <span className="text-rose-500 font-bold">🩸 {profile.bloodGroup || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Medical Conditions</span>
                  <span className="text-slate-400 block text-[11px] leading-relaxed">{profile.medicalConditions || 'None'}</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
