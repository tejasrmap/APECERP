import React from 'react';
import { motion } from 'motion/react';
import { db, storage as firebaseStorage } from '../firebase';
import { supabase } from '../supabase';

export default function Settings() {

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-xl font-bold text-slate-900">ERP System Settings</h3>
        <p className="text-xs text-slate-500 mt-1">Configure development utilities and database controls</p>
      </div>

      <div className="max-w-2xl">
        {/* Environment Config Info */}
        <div className="p-6 rounded-2xl glass-card border border-white/60 shadow-[0_8px_30px_rgba(15,23,42,0.03)]">
          <h4 className="text-sm font-bold text-slate-900 mb-4">Active System Environment</h4>
          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center py-2 border-b border-slate-100/60">
              <span className="text-slate-500">Firebase Project:</span>
              <span className="text-slate-800 font-semibold">apec-erp</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100/60">
              <span className="text-slate-500">Sender ID (No.):</span>
              <span className="text-slate-800 font-semibold">477001925382</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100/60">
              <span className="text-slate-500">Database Engine:</span>
              <span className="text-slate-800 font-semibold">Cloud Firestore</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100/60">
              <span className="text-slate-500">Storage Engine:</span>
              <span className="text-slate-800 font-semibold">{supabase ? 'Supabase Storage' : 'Firebase Storage'}</span>
            </div>
            {supabase && (
              <div className="flex justify-between items-center py-2 border-b border-slate-100/60">
                <span className="text-slate-500">Storage Bucket:</span>
                <span className="text-slate-800 font-semibold">APECERP</span>
              </div>
            )}
            <div className="flex justify-between items-center py-2 border-b border-slate-100/60">
              <span className="text-slate-500">Database State:</span>
              <span className="text-green-600 font-bold">{db ? 'CONNECTED' : 'DISCONNECTED'}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-500">Storage State:</span>
              <span className="text-green-600 font-bold">{(supabase || firebaseStorage) ? 'CONNECTED' : 'DISCONNECTED'}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
