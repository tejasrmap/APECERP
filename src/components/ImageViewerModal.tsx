import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ZoomIn, ZoomOut, RotateCw, Download, Image as ImageIcon } from 'lucide-react';

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageName: string;
}

export default function ImageViewerModal({ isOpen, onClose, imageUrl, imageName }: ImageViewerModalProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const resetTransform = () => {
    setScale(1);
    setRotation(0);
  };

  const handleClose = () => {
    resetTransform();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-[101] flex flex-col items-center justify-between p-4 md:p-6 pointer-events-none">
            {/* Header controls */}
            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="w-full max-w-4xl bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-2xl backdrop-blur-md pointer-events-auto z-10"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500 shrink-0">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate pr-2">{imageName || 'Photo'}</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">APEC ERP Image Viewer • Made by <span className="text-cyan-400 font-bold">GT INNOX LLP</span></p>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={handleZoomIn}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all border border-transparent hover:border-slate-700"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4.5 h-4.5" />
                </button>
                <button
                  onClick={handleZoomOut}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all border border-transparent hover:border-slate-700"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4.5 h-4.5" />
                </button>
                <button
                  onClick={handleRotate}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all border border-transparent hover:border-slate-700"
                  title="Rotate 90°"
                >
                  <RotateCw className="w-4.5 h-4.5" />
                </button>
                
                <span className="h-6 w-px bg-slate-800 mx-1" />

                <a
                  href={imageUrl}
                  download={imageName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all border border-transparent hover:border-slate-700 flex items-center justify-center"
                  title="Download Image"
                >
                  <Download className="w-4.5 h-4.5" />
                </a>
                
                <button
                  onClick={handleClose}
                  className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-all border border-transparent hover:border-slate-700"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </motion.div>

            {/* Image display viewport */}
            <div className="flex-1 w-full max-w-4xl flex items-center justify-center overflow-hidden my-4 relative">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: 'spring', damping: 25 }}
                className="pointer-events-auto cursor-grab active:cursor-grabbing max-h-full max-w-full"
              >
                <img
                  src={imageUrl}
                  alt={imageName}
                  style={{
                    transform: `scale(${scale}) rotate(${rotation}deg)`,
                    transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                  className="max-h-[70vh] max-w-full rounded-xl object-contain shadow-2xl border border-slate-800/50 select-none pointer-events-none"
                />
              </motion.div>
            </div>

            {/* Helper status bar */}
            <div className="text-[10px] text-slate-500 font-mono pointer-events-none flex items-center gap-3">
              <span>Zoom: {Math.round(scale * 100)}% | Rotation: {rotation}°</span>
              <span className="text-slate-700">•</span>
              <span className="text-slate-400 font-sans uppercase font-medium tracking-wider">Made by <span className="text-cyan-400 font-bold">GT INNOX LLP</span></span>
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
