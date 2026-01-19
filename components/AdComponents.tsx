
import React, { useState, useEffect } from 'react';
import { X, ExternalLink, ShieldCheck, RefreshCw } from 'lucide-react';
import { ADMOB_CONFIG, APP_ICON_URL, DEFAULT_ICON_SVG } from '../constants';

export const BannerAd: React.FC = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full bg-white/60 border border-white backdrop-blur-md p-6 flex flex-col items-center justify-center min-h-[110px] rounded-[3rem] shadow-2xl relative overflow-hidden group transition-all">
      <div className="absolute top-3 left-6 text-[8px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-2">
        <ShieldCheck size={10} className="text-blue-500"/> Verified Partner Ad
      </div>
      
      {loading ? (
        <div className="flex items-center gap-3 animate-pulse">
          <div className="w-10 h-10 bg-slate-100 rounded-xl"></div>
          <div className="space-y-2">
            <div className="w-40 h-2 bg-slate-100 rounded-full"></div>
            <div className="w-24 h-2 bg-slate-50 rounded-full"></div>
          </div>
        </div>
      ) : (
        <div className="text-center animate-in fade-in duration-700 flex items-center gap-6">
          <div className="w-14 h-14 bg-gradient-to-tr from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center shadow-inner">
            <img src={APP_ICON_URL} className="w-10 h-10 object-contain opacity-40 grayscale" alt="Ad Icon" onError={(e) => e.currentTarget.src = DEFAULT_ICON_SVG}/>
          </div>
          <div className="text-left">
            <p className="text-xs font-black text-slate-800 mb-1 leading-tight">
              Unlock the full power of ValoraPricing Pro 
            </p>
            <p className="text-[10px] text-blue-600 font-bold flex items-center gap-1.5 hover:underline cursor-pointer">
              Get Unlimited Saved Projects <ExternalLink size={10}/>
            </p>
          </div>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none"></div>
    </div>
  );
};

export const InterstitialAd: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [useFallback, setUseFallback] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      const timer = setTimeout(() => setLoading(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-3xl flex items-center justify-center p-8 animate-in fade-in duration-500">
      <button 
        onClick={onClose}
        className="absolute top-10 right-10 text-white bg-white/10 w-16 h-16 rounded-full flex items-center justify-center hover:bg-white/20 transition-all hover:rotate-90 active:scale-90"
      >
        <X size={32} />
      </button>

      <div className="bg-white/5 border border-white/20 p-16 rounded-[4rem] text-center max-w-md shadow-2xl relative overflow-hidden crystal-facet">
        {loading ? (
          <div className="flex flex-col items-center py-24">
            <RefreshCw size={64} className="text-blue-400 animate-spin mb-8" />
            <p className="text-blue-200 font-black text-sm uppercase tracking-[0.3em]">Preparing Summary...</p>
          </div>
        ) : (
          <div className="animate-in zoom-in-95 duration-700">
            <div className="w-40 h-40 bg-white rounded-[3.5rem] mx-auto mb-10 flex items-center justify-center shadow-2xl shadow-blue-500/30 overflow-hidden border-4 border-white/50 relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-purple-500/10 animate-pulse"></div>
              <img 
                src={useFallback ? DEFAULT_ICON_SVG : APP_ICON_URL} 
                alt="ValoraPricing" 
                className="w-24 h-24 object-contain relative z-10 filter drop-shadow-xl" 
                onError={() => setUseFallback(true)}
              />
            </div>
            <h3 className="text-white text-4xl font-black mb-4 tracking-tighter">ValoraPricing Pro</h3>
            <p className="text-blue-100/70 text-base mb-12 font-medium px-6 leading-relaxed">
              Experience the future of professional cost calculation with our premium toolset.
            </p>
            <button 
              onClick={onClose}
              className="w-full crystal-button text-white font-black py-6 rounded-[2.5rem] shadow-2xl text-sm uppercase tracking-[0.3em]"
            >
              Continue to Project
            </button>
            <p className="mt-8 text-[9px] text-white/10 font-mono tracking-widest uppercase">ID: {ADMOB_CONFIG.INTERSTITIAL_ID}</p>
          </div>
        )}
      </div>
    </div>
  );
};
