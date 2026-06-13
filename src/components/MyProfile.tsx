import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Phone, 
  Mail, 
  Briefcase, 
  Calendar, 
  Award, 
  Shield, 
  Activity, 
  User, 
  HeartPulse, 
  MapPin, 
  Loader2,
  AlertTriangle,
  Lock
} from 'lucide-react';

export default function MyProfile() {
  const { userProfile, firestoreError } = useOutletContext<any>();

  if (firestoreError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center max-w-md mx-auto p-6 bg-slate-900/40 border border-slate-800 rounded-2xl">
        <AlertTriangle className="w-10 h-10 text-amber-500" />
        <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Database Error</h4>
        <p className="text-xs text-slate-400 leading-relaxed">
          Could not sync profile details due to a database connection or security rules restriction.
        </p>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 text-center max-w-md mx-auto p-8 bg-slate-900/40 border border-slate-800 rounded-2xl shadow-xl">
        <div className="relative w-12 h-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Loading Profile Credentials</h4>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Retrieving your secure registry records from the APEC database terminal...
          </p>
        </div>
      </div>
    );
  }

  const avatarGradients: Record<string, string> = {
    cyan: 'from-cyan-500/20 to-cyan-500/5 text-cyan-400 border-cyan-500/25',
    blue: 'from-blue-500/20 to-blue-500/5 text-blue-400 border-blue-500/25',
    red: 'from-rose-500/20 to-rose-500/5 text-rose-400 border-rose-500/25',
    gold: 'from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/25'
  };
  const avatarClass = avatarGradients[userProfile.avatar || 'cyan'] || avatarGradients.cyan;

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
              {userProfile.photoUrl ? (
                <img
                  src={userProfile.photoUrl}
                  alt={userProfile.name}
                  className="w-28 h-28 rounded-2xl object-cover border-2 border-slate-700 shadow-md"
                />
              ) : (
                <div className={`w-28 h-28 rounded-2xl bg-gradient-to-br ${avatarClass} border-2 border-slate-700 flex items-center justify-center text-3xl font-extrabold shadow-md`}>
                  {userProfile.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-950 ${userProfile.status === 'Active' ? 'bg-emerald-500' : userProfile.status === 'Site Visit' ? 'bg-cyan-500' : 'bg-amber-500'}`} />
            </div>

            <h4 className="text-lg font-bold text-slate-100 mt-5 leading-tight">{userProfile.name}</h4>
            <p className="text-xs text-cyan-400 font-bold uppercase tracking-wider mt-1.5">{userProfile.role || 'Staff Member'}</p>
            
            <div className="flex items-center gap-1.5 mt-3 text-slate-400">
              <Briefcase className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs font-semibold">{userProfile.branch || 'Vijayawada'}</span>
            </div>

            <hr className="border-slate-800/80 w-full my-5" />

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4 w-full text-left font-mono">
              <div className="space-y-1">
                <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold block">Employee ID</span>
                <span className="text-xs font-bold text-slate-300 bg-slate-955/60 border border-slate-900 px-2 py-1 rounded block text-center select-all">{userProfile.employeeId || 'APEC-MEMBER'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold block">Access Priority</span>
                <span className={`inline-flex w-full justify-center items-center py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${
                  userProfile.accessRole === 'Admin' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {userProfile.accessRole === 'Admin' ? 'Admin' : 'User'}
                </span>
              </div>
            </div>

            <hr className="border-slate-800/80 w-full my-5" />

            {/* Barcode Visual */}
            <div className="flex flex-col items-center gap-1.5 select-none opacity-60 hover:opacity-85 transition-opacity w-full">
              <div className="flex items-center gap-[1.5px] h-7 bg-white/5 p-1 rounded w-full justify-center">
                {[
                  1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2, 1, 4, 2, 1, 3, 1, 2, 1
                ].map((width, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-400 h-full rounded-[0.5px]"
                    style={{ width: `${width}px` }}
                  />
                ))}
              </div>
              <span className="text-[8px] font-mono text-slate-500 tracking-[0.25em]">APEC-{userProfile.employeeId || 'MEMBER'}-SECURE</span>
            </div>

          </div>
        </div>

        {/* ── RIGHT COLUMN (Profile Details) ── */}
        <div className="md:col-span-8 space-y-6">
          
          {/* Quick contact and dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: Phone, label: 'Phone Number', value: userProfile.phone || 'N/A' },
              { icon: Mail, label: 'Official Email', value: userProfile.email || 'N/A', truncate: true },
              { icon: Calendar, label: 'Joined Date', value: userProfile.joinedDate ? new Date(userProfile.joinedDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A' },
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
                <span className="text-slate-200 font-bold block mt-0.5">{userProfile.fatherName || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Gender</span>
                <span className="text-slate-200 font-bold block mt-0.5">{userProfile.gender || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Date of Birth</span>
                <span className="text-slate-200 font-bold block mt-0.5">{userProfile.dob || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Marital Status</span>
                <span className="text-slate-200 font-bold block mt-0.5">{userProfile.maritalStatus || 'N/A'}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Qualification</span>
                <span className="text-slate-200 font-bold block mt-0.5">{userProfile.qualification || 'N/A'}</span>
              </div>
              <div className="sm:col-span-2 border-t border-slate-900/60 pt-2 mt-1">
                <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Present Address</span>
                <span className="text-slate-305 block text-xs leading-normal select-all mt-0.5">{userProfile.presentAddress || 'N/A'}</span>
              </div>
              <div className="sm:col-span-2 border-t border-slate-900/60 pt-2 mt-1">
                <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Permanent Address</span>
                <span className="text-slate-305 block text-xs leading-normal select-all mt-0.5">{userProfile.permanentAddress || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Secure Registry Details (Bank & Identity Numbers) */}
          <div className="glass-card p-6 space-y-4 border border-white/5">
            <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2.5">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">Secure Registration & Identity Records</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs font-mono">
              <div className="p-3 bg-slate-950/20 rounded-xl border border-white/5">
                <span className="text-slate-500 block uppercase tracking-wider text-[9px]">PAN Card</span>
                <span className="text-slate-200 font-bold block mt-0.5 select-all">{userProfile.pan || 'N/A'}</span>
              </div>
              <div className="p-3 bg-slate-950/20 rounded-xl border border-white/5">
                <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Aadhar Number</span>
                <span className="text-slate-200 font-bold block mt-0.5 select-all">{userProfile.aadharNumber || 'N/A'}</span>
              </div>
              <div className="p-3 bg-slate-950/20 rounded-xl border border-white/5">
                <span className="text-slate-500 block uppercase tracking-wider text-[9px]">ESI Number</span>
                <span className="text-slate-200 font-bold block mt-0.5 select-all">{userProfile.esiNumber || 'N/A'}</span>
              </div>
              <div className="p-3 bg-slate-950/20 rounded-xl border border-white/5">
                <span className="text-slate-500 block uppercase tracking-wider text-[9px]">PF Number</span>
                <span className="text-slate-200 font-bold block mt-0.5 select-all">{userProfile.pfNumber || 'N/A'}</span>
              </div>
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
                <span className="text-slate-200 font-bold block mt-0.5">{userProfile.bankAccountName || 'N/A'}</span>
              </div>
              <div className="p-3 bg-slate-950/10 rounded-xl border border-slate-900/60">
                <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Account Number</span>
                <span className="text-slate-205 font-bold block mt-0.5 select-all">{userProfile.bankAccountNumber || 'N/A'}</span>
              </div>
              <div className="p-3 bg-slate-950/10 rounded-xl border border-slate-900/60">
                <span className="text-slate-500 block uppercase tracking-wider text-[9px]">Bank IFSC Code</span>
                <span className="text-cyan-400 font-bold block mt-0.5 select-all">{userProfile.bankIfsc || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Skills & Emergency Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Skills Card */}
            {userProfile.skills && userProfile.skills.length > 0 && (
              <div className="glass-card p-6 space-y-4 border border-white/5 flex-1">
                <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2.5">
                  <Award className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">Professional Skills</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {userProfile.skills.map((skill: string, idx: number) => (
                    <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-900 text-[11px] text-slate-300 font-medium flex items-center gap-1.5 hover:border-slate-800 transition-colors">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-405 shrink-0" />
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Emergency & Medical Information */}
            <div className="glass-card overflow-hidden border border-red-950/30 flex-1">
              <div className="flex items-center gap-2 px-5 py-3.5 bg-red-950/10 border-b border-red-950/30">
                <HeartPulse className="w-4 h-4 text-[#DC2626]" />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Emergency Contact & Medical</span>
              </div>
              <div className="p-5 space-y-3 font-mono text-xs">
                <div className="flex justify-between border-b border-slate-900/60 pb-1.5">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Contact Person</span>
                  <span className="text-slate-200 font-bold">{userProfile.emergencyName || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-900/60 pb-1.5">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Phone Number</span>
                  <span className="text-slate-205 font-bold select-all">{userProfile.emergencyPhone || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-900/60 pb-1.5">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Blood Group</span>
                  <span className="text-rose-500 font-bold">🩸 {userProfile.bloodGroup || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-550 uppercase tracking-wider block mb-1">Medical Conditions</span>
                  <span className="text-slate-350 block text-[11px] leading-relaxed">{userProfile.medicalConditions || 'None'}</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
