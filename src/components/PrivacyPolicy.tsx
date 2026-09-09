import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  MapPin, 
  Camera, 
  Database, 
  Lock, 
  ArrowLeft, 
  Mail, 
  AlertTriangle, 
  Building2, 
  FileText,
  UserCheck
} from 'lucide-react';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#070a13] text-slate-200 selection:bg-cyan-500 selection:text-white pb-16">
      {/* Header Bar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#070a13]/85 border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 text-slate-300 transition-colors flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/20">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-100 leading-tight">APEC ERP</h1>
              <p className="text-[10px] text-cyan-400 font-medium tracking-wide">Privacy Policy</p>
            </div>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
            Updated Sept 2026
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-8">
        {/* Title Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-cyan-950/40 border border-cyan-500/20 p-6 sm:p-8 mb-8 shadow-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Building2 className="w-3.5 h-3.5" /> Official Policy Document
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
            Privacy Policy for APEC ERP Mobile App
          </h1>
          <p className="text-slate-400 text-sm max-w-2xl leading-relaxed mb-6">
            APEC ERP is the enterprise management and field operations mobile platform designed for <strong className="text-slate-200">APEC Power Solutions</strong>, engineered and maintained by <strong className="text-cyan-400">GT INNOX LLP</strong>.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs text-slate-400 pt-4 border-t border-slate-800">
            <div>
              <span className="text-slate-500 block font-medium">Domain:</span>
              <span className="text-cyan-300 font-mono text-[11px]">erp.apecpowersolutions.com</span>
            </div>
            <div>
              <span className="text-slate-500 block font-medium">Package Identifier:</span>
              <code className="text-cyan-300 font-mono text-[11px]">com.apecpowersolutions.erp</code>
            </div>
            <div>
              <span className="text-slate-500 block font-medium">Organization:</span>
              <span className="text-slate-200 font-semibold">APEC Power Solutions</span>
            </div>
            <div>
              <span className="text-slate-500 block font-medium">Platform:</span>
              <span className="text-slate-200 font-semibold">Android Mobile & Web</span>
            </div>
          </div>
        </div>

        {/* Prominent Disclosure: Background Location (Google Play Policy) */}
        <div className="rounded-xl bg-cyan-950/30 border-2 border-cyan-500/40 p-5 sm:p-6 mb-8 shadow-lg shadow-cyan-950/20">
          <div className="flex items-start gap-3.5 mb-3">
            <div className="p-2.5 rounded-lg bg-cyan-500/20 text-cyan-400 shrink-0">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Prominent Disclosure: Location & Background Location Tracking
              </h2>
              <p className="text-xs text-cyan-300 font-medium mt-0.5">
                Google Play User Data & Background Location Policy Compliance
              </p>
            </div>
          </div>

          <div className="space-y-3 text-sm text-slate-300 pl-0 sm:pl-12">
            <p>
              The <strong className="text-white">APEC ERP</strong> mobile application collects <strong>precise location data</strong> (GPS, network-based) and <strong>background location data</strong> even when the app is closed or not in active use on your screen.
            </p>

            <div className="bg-slate-900/80 rounded-lg p-4 border border-cyan-500/20">
              <p className="font-semibold text-cyan-200 mb-2 text-xs uppercase tracking-wider">
                Why Background Location is Required:
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300">
                <li><strong className="text-white">Substation & Site Check-in:</strong> Verifying physical attendance at designated power substations, transformers, and customer project sites.</li>
                <li><strong className="text-white">Field Operations Coordination:</strong> Enabling real-time dispatching of electrical engineers during field emergencies.</li>
                <li><strong className="text-white">Transit Logging:</strong> Recording travel logs and mileage for duty-related transport reimbursements.</li>
                <li><strong className="text-white">Lone-Worker Safety:</strong> Monitoring the well-being of technical personnel working at high-voltage installations.</li>
              </ul>
            </div>

            <div className="text-xs text-slate-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-amber-200">Active Shift Limitation:</strong> Location tracking is operative <strong>strictly while on duty or checked-in</strong>. When you clock out or end your shift, tracking terminates immediately. Your location data is <strong>never sold, leased, or shared</strong> with any third-party advertising networks.
              </span>
            </div>
          </div>
        </div>

        {/* Section 1: Overview */}
        <section className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-5 sm:p-6 mb-6">
          <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            1. Purpose & Scope
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-3">
            This Privacy Policy sets out the basis on which personal data collected from employees, technicians, managers, and authorized personnel is processed by <strong className="text-white">APEC Power Solutions</strong>.
          </p>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            By signing in to the application, you agree to the collection and use of information in accordance with this policy. If you do not agree with any part of this policy, please contact your organization administrator.
          </p>
        </section>

        {/* Section 2: Data Collected */}
        <section className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-5 sm:p-6 mb-6">
          <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-cyan-400" />
            2. Data Categories We Collect
          </h2>
          <div className="space-y-3 text-xs sm:text-sm text-slate-300">
            <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800">
              <strong className="text-white block mb-1">A. Personal Identification Information</strong>
              Full Name, Corporate Email Address, Registered Mobile Phone Number, Employee ID, Designation/Role, and Department.
            </div>
            <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800">
              <strong className="text-white block mb-1">B. Geolocation Data</strong>
              High-accuracy GPS coordinates, timestamps, travel speed, and proximity to registered electrical substations and project assets.
            </div>
            <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800">
              <strong className="text-white block mb-1">C. Camera & Photographic Media</strong>
              Photographs captured on-site of power installations, panel meters, completed checklists, and defect documentation uploaded for Daily Operations Reports.
            </div>
            <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800">
              <strong className="text-white block mb-1">D. Device & Technical Diagnostics</strong>
              Android version, device model, battery status, push notification tokens, network connection state, and application performance logs.
            </div>
          </div>
        </section>

        {/* Section 3: Camera & File Storage */}
        <section className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-5 sm:p-6 mb-6">
          <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
            <Camera className="w-4 h-4 text-cyan-400" />
            3. Camera & Storage Permissions
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-3">
            The application requests <code className="text-cyan-300 bg-slate-950 px-1.5 py-0.5 rounded text-xs">CAMERA</code> and file storage access strictly when you deliberately choose to:
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-slate-300 pl-2">
            <li>Photograph site condition, transformer readings, or maintenance activities for Daily Work Reports.</li>
            <li>Upload documents or receipts related to operational project expenses.</li>
            <li>Update your profile avatar in the team directory.</li>
          </ul>
          <p className="text-xs text-slate-400 mt-3">
            The app will never access your private image gallery without your direct user action.
          </p>
        </section>

        {/* Section 4: Cloud Infrastructure & Third Parties */}
        <section className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-5 sm:p-6 mb-6">
          <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-400" />
            4. Service Providers & Third-Party SDKs
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-3">
            We use industry-standard enterprise cloud platforms to support our ERP operations:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-slate-300 pl-2 mb-3">
            <li><strong className="text-white">Google Play Services:</strong> Android location provider APIs and core system services.</li>
            <li><strong className="text-white">Google Firebase:</strong> Cloud Firestore, Firebase Authentication, Cloud Storage (encrypted image attachments), and Cloud Messaging.</li>
            <li><strong className="text-white">Supabase:</strong> Enterprise PostgreSQL database storage and secure synchronization.</li>
          </ul>
          <p className="text-xs text-slate-400">
            None of our third-party infrastructure providers are permitted to use your data for advertising or unauthorized purposes.
          </p>
        </section>

        {/* Section 5: Account Deletion (Google Play Mandatory) */}
        <section className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-5 sm:p-6 mb-6">
          <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
            <Lock className="w-4 h-4 text-cyan-400" />
            5. Account & Personal Data Deletion
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-3">
            In compliance with Google Play Developer Policy, any user may request deletion of their account credentials and personal identifiable information.
          </p>
          
          <div className="bg-slate-950/70 rounded-lg p-4 border border-slate-800 mb-3">
            <p className="text-xs font-semibold text-white mb-1.5">To request account deletion:</p>
            <p className="text-xs text-slate-300 mb-2">
              Send an email to our administrative support desk:
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <a 
                href="mailto:admin@apecpowersolutions.com" 
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-medium hover:bg-cyan-900/60 transition-colors"
              >
                <Mail className="w-3.5 h-3.5" /> admin@apecpowersolutions.com
              </a>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Include your full name, registered mobile phone number, and subject line <em>"Account Deletion Request"</em>. Requests are processed within 30 days.
            </p>
          </div>

          <p className="text-xs text-slate-400">
            * Note: Historical engineering maintenance logs and daily site reports submitted as part of past corporate work orders may be retained in internal enterprise archives for statutory compliance and accounting audits as required by law.
          </p>
        </section>

        {/* Section 6: Security */}
        <section className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-5 sm:p-6 mb-6">
          <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            6. Security & Data Protection
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            All data transmitted between the mobile application and cloud services is encrypted using Transport Layer Security (TLS 1.3 / HTTPS). Data stored at rest in Firebase and Supabase utilizes enterprise-grade AES-256 encryption. Role-based access control restricts operational data viewing exclusively to authorized managers.
          </p>
        </section>

        {/* Section 7: Contact Us */}
        <section className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-5 sm:p-6 mb-8">
          <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
            <Mail className="w-4 h-4 text-cyan-400" />
            7. Contact & Grievance Officer
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
            For questions, data access requests, or issues regarding this Privacy Policy, please reach out to:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
            <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[11px]">Primary Contact</span>
              <span className="font-semibold text-white">APEC Power Solutions</span>
              <a href="mailto:admin@apecpowersolutions.com" className="text-cyan-400 block mt-1 hover:underline">
                admin@apecpowersolutions.com
              </a>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[11px]">Executive Management</span>
              <span className="font-semibold text-white">Managing Director Office</span>
              <a href="mailto:managingdirector@apecpowersolutions.com" className="text-cyan-400 block mt-1 hover:underline">
                managingdirector@apecpowersolutions.com
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 border-t border-slate-800/80 text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} APEC Power Solutions. All rights reserved.</p>
        <p className="mt-1">
          Developed & Maintained by <span className="text-cyan-400 font-semibold">GT INNOX LLP</span>
        </p>
      </footer>
    </div>
  );
}
