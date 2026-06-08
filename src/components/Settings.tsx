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
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <h4 className="text-sm font-semibold text-slate-900">Active System Environment</h4>
          <div className="mt-4 space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-400">Firebase Project:</span>
              <span className="text-slate-700">apec-erp</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-400">Sender ID (No.):</span>
              <span className="text-slate-700">477001925382</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-400">Database Engine:</span>
              <span className="text-slate-700">Cloud Firestore</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-400">Storage Engine:</span>
              <span className="text-slate-700">{supabase ? 'Supabase Storage' : 'Firebase Storage'}</span>
            </div>
            {supabase && (
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Storage Bucket:</span>
                <span className="text-slate-700">APECERP</span>
              </div>
            )}
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-400">Database State:</span>
              <span className="text-green-600 font-bold">{db ? 'CONNECTED' : 'DISCONNECTED'}</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-slate-400">Storage State:</span>
              <span className="text-green-600 font-bold">{(supabase || firebaseStorage) ? 'CONNECTED' : 'DISCONNECTED'}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
