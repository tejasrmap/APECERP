import React from 'react';
import { motion } from 'motion/react';
import { db, storage as firebaseStorage } from '../firebase';
import { supabase } from '../supabase';

export default function Settings() {

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-xl font-bold text-slate-100">ERP System Settings</h3>
        <p className="text-xs text-slate-400 mt-1">Configure development utilities and database controls</p>
      </div>

      <div className="max-w-2xl">
        {/* Environment Config Info */}
        <div className="p-6 rounded-2xl glass-card shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
          <h4 className="text-sm font-bold text-slate-100 mb-4">Active System Environment</h4>
          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
              <span className="text-slate-400">Firebase Project:</span>
              <span className="text-slate-200 font-semibold">apec-erp</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
              <span className="text-slate-400">Sender ID (No.):</span>
              <span className="text-slate-200 font-semibold">477001925382</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
              <span className="text-slate-400">Database Engine:</span>
              <span className="text-slate-200 font-semibold">Cloud Firestore</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
              <span className="text-slate-400">Storage Engine:</span>
              <span className="text-slate-200 font-semibold">{supabase ? 'Supabase Storage' : 'Firebase Storage'}</span>
            </div>
            {supabase && (
              <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                <span className="text-slate-400">Storage Bucket:</span>
                <span className="text-slate-200 font-semibold">APECERP</span>
              </div>
            )}
            <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
              <span className="text-slate-400">Database State:</span>
              <span className="text-emerald-400 font-bold">{db ? 'CONNECTED' : 'DISCONNECTED'}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-400">Storage State:</span>
              <span className="text-emerald-400 font-bold">{(supabase || firebaseStorage) ? 'CONNECTED' : 'DISCONNECTED'}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
