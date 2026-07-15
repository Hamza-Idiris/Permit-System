import { ShieldCheck } from 'lucide-react';

const LoadingScreen = () => {
    return (
        <div className="flex flex-col h-screen w-full items-center justify-center bg-[#F8FAFC]">
            <div className="relative flex items-center justify-center mb-8">
                {/* Outer pulsing ring */}
                <div className="absolute w-24 h-24 rounded-[30px] border-2 border-navy/10 animate-ping opacity-20"></div>

                {/* Rotating border ring */}
                <div className="absolute w-20 h-20 rounded-[24px] border-t-4 border-navy animate-spin duration-700 shadow-xl shadow-navy/5"></div>

                {/* Static Icon Container */}
                <div className="relative w-16 h-16 bg-navy rounded-[22px] flex items-center justify-center shadow-2xl shadow-navy/20 z-10">
                    <ShieldCheck className="text-white" size={28} />
                </div>
            </div>

            <div className="flex flex-col items-center gap-2">
                <h2 className="text-[15px] font-black text-navy uppercase tracking-[0.25em] animate-pulse">
                    Sovereign Ledger
                </h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Initializing Authority Portal...
                </p>

                {/* Progress bar simulation */}
                <div className="w-32 h-1 bg-gray-100 rounded-full mt-4 overflow-hidden relative">
                    <div className="absolute inset-0 bg-navy h-full w-full -translate-x-[60%] animate-[shimmer_1.5s_infinite_ease-in-out]"></div>
                </div>
            </div>

            <style>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </div>
    );
};

export default LoadingScreen;
