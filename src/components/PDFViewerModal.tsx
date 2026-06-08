import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink, Download, FileText } from 'lucide-react';

interface PDFViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
}

export default function PDFViewerModal({ isOpen, onClose, fileUrl, fileName }: PDFViewerModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 md:p-8 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="w-full max-w-5xl h-[85vh] bg-slate-900/90 border border-slate-700/50 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.6)] overflow-hidden pointer-events-auto flex flex-col relative"
            >
              {/* Top Gradient Decorator */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-red-500 to-blue-600 z-10" />

              {/* Header */}
              <div className="p-4 border-b border-slate-800 bg-slate-950/60 backdrop-blur-sm flex items-center justify-between z-10">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate pr-2">{fileName || 'Document.pdf'}</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">APEC ERP Document Viewer</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* External Link */}
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all flex items-center gap-1.5 text-xs font-medium border border-transparent hover:border-slate-700"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span className="hidden sm:inline">Open Original</span>
                  </a>

                  {/* Divider */}
                  <span className="h-6 w-px bg-slate-800 hidden sm:inline" />

                  {/* Close Button */}
                  <button
                    onClick={onClose}
                    className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all border border-transparent hover:border-slate-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* PDF Viewer Body */}
              <div className="flex-1 bg-slate-950/40 relative flex items-center justify-center">
                {fileUrl ? (
                  <iframe
                    src={`${fileUrl}#toolbar=1`}
                    title={fileName}
                    className="w-full h-full border-none"
                    // Fallback helper for browsers that don't support inline PDF views
                    loading="lazy"
                  />
                ) : (
                  <div className="text-center p-6">
                    <FileText className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-400">Failed to load PDF path</p>
                  </div>
                )}
              </div>

              {/* Footer Fallback (Useful for mobile view compatibility) */}
              <div className="p-3 border-t border-slate-800/60 bg-slate-950/30 text-center md:hidden">
                <a
                  href={fileUrl}
                  download
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  <Download className="w-4 h-4" /> Download PDF to Device
                </a>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
