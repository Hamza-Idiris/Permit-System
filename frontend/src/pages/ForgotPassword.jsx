import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import {
    ArrowRight,
    Mail,
    ShieldCheck,
    KeyRound,
    Lock,
    Eye,
    EyeOff,
    ChevronLeft,
    Timer,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';

const ForgotPassword = () => {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [countdown, setCountdown] = useState(0);
    const [showPopup, setShowPopup] = useState(false);
    const navigate = useNavigate();

    const API_URL = 'http://localhost:5000/api/auth';

    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const urlEmail = queryParams.get('email');
        const urlStep = queryParams.get('step');

        if (urlEmail) {
            setEmail(urlEmail);
        }
        if (urlStep === '2') {
            setStep(2);
            setMessage('Account verified. Please enter the code from your welcome email.');
            setShowPopup(true);
            setTimeout(() => setShowPopup(false), 5000);
        }
    }, [navigate]);

    useEffect(() => {
        let timer;
        if (countdown > 0) {
            timer = setInterval(() => {
                setCountdown(prev => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [countdown]);

    // Auto-focus first digit when entering Step 2
    useEffect(() => {
        if (step === 2) {
            setTimeout(() => {
                document.getElementById('code-0')?.focus();
            }, 500); // Wait for transition animation
        }
    }, [step]);

    const handleStep1Submit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setIsSubmitting(true);
        try {
            const res = await axios.post(`${API_URL}/forgot-password`, { email, platform: 'web' });
            if (res.data.success) {
                setIsSubmitting(false);
                setIsSuccess(true);
                await new Promise(resolve => setTimeout(resolve, 1500));

                setIsSuccess(false);
                setMessage('Verification code sent successfully!');
                setShowPopup(true);
                setTimeout(() => setShowPopup(false), 3000);
                setStep(2);
                setCountdown(59);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong');
            setIsSubmitting(false);
        }
    };

    const handleStep2Submit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        const verificationCode = code.join('');
        try {
            const res = await axios.post(`${API_URL}/verify-code`, { email, code: verificationCode });
            if (res.data.success) {
                setStep(3);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid or expired code');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStep3Submit = async (e) => {
        e.preventDefault();
        setError('');
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        // Rule Validation (matching User model)
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            setError('Password must be 8+ chars and include uppercase, lowercase, numbers, and special characters.');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await axios.post(`${API_URL}/reset-password`, {
                email,
                code: code.join(''),
                password: newPassword
            });
            if (res.data.success) {
                setIsSubmitting(false);
                setIsSuccess(true);
                setMessage('Password reset successful! Redirecting...');
                await new Promise(resolve => setTimeout(resolve, 2000));
                navigate('/login');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error resetting password');
            setIsSubmitting(false);
        }
    };

    const handleResendCode = async () => {
        if (countdown > 0) return;
        setError('');
        setMessage('');
        try {
            const res = await axios.post(`${API_URL}/forgot-password`, { email, platform: 'web' });
            if (res.data.success) {
                setMessage('Verification code sent successfully!');
                setShowPopup(true);
                setTimeout(() => setShowPopup(false), 3000);
                setCountdown(59);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error resending code');
        }
    };

    const handleCodeChange = (index, value) => {
        if (value.length > 1) return;
        if (value !== '' && !/^\d+$/.test(value)) return;

        const newCode = [...code];
        newCode[index] = value;
        setCode(newCode);

        // Auto-focus next input
        if (value && index < 5) {
            const nextInput = document.getElementById(`code-${index + 1}`);
            nextInput?.focus();
        }

        // Auto-verify if last digit is entered
        if (value && index === 5) {
            autoVerifyToken(newCode.join(''));
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace') {
            if (!code[index] && index > 0) {
                // Focus previous input if current is empty
                const prevInput = document.getElementById(`code-${index - 1}`);
                prevInput?.focus();
            }
        }
    };

    const autoVerifyToken = async (verificationCode) => {
        setError('');
        setIsSubmitting(true);
        try {
            const res = await axios.post(`${API_URL}/verify-code`, { email, code: verificationCode });
            if (res.data.success) {
                setIsSubmitting(false);
                setIsSuccess(true);
                await new Promise(resolve => setTimeout(resolve, 1200));

                setIsSuccess(false);
                setStep(3);
                setMessage('');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid or expired code');
            setIsSubmitting(false);
        }
    };

    const BrandingSide = () => (
        <div className="hidden lg:flex w-1/2 relative bg-navy overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy to-navy-light opacity-90"></div>
            <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-white/5 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[100px]"></div>
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>

            <div className="relative z-10 w-full h-full p-20 flex flex-col">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-center shadow-2xl">
                        <ShieldCheck className="text-white" size={24} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-white font-black text-xl tracking-tight leading-none">M-DBPS</span>
                        <span className="text-white/50 text-[10px] font-semibold mt-1 leading-snug">Mogadishu Digital Building Permit System</span>
                    </div>
                </div>

                <div className="mt-auto max-w-lg mb-20">
                    <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-8 border border-white/10">
                        <ShieldCheck className="text-blue-200" size={40} />
                    </div>
                    <h1 className="text-5xl font-black text-white leading-[1.1] tracking-tighter mb-8">
                        Secure Access <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-indigo-100">Recovery.</span>
                    </h1>
                    <p className="text-lg text-white/60 font-medium leading-relaxed">
                        Protecting your identity through institutional-grade security protocols and biometric-ready authentication frameworks.
                    </p>
                </div>

                <div className="mt-auto pt-10 border-t border-white/10 flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Mogadishu Digital Sovereignty v4.0</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex min-h-screen bg-white font-inter overflow-hidden relative">
            {/* Success Popup */}
            {showPopup && (
                <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="bg-navy text-white px-8 py-4 rounded-[20px] shadow-2xl flex items-center gap-4 border border-white/10 backdrop-blur-xl">
                        <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                            <CheckCircle2 size={18} className="text-white" />
                        </div>
                        <span className="font-black text-[14px] tracking-tight uppercase">Verification code sent successfully!</span>
                    </div>
                </div>
            )}

            <BrandingSide />

            <div className="w-full lg:w-1/2 flex flex-col p-8 lg:p-20 bg-slate-50/30 overflow-y-auto">
                <div className="mb-auto">
                    <Link to="/login" className="inline-flex items-center gap-2 text-gray-400 hover:text-navy transition-colors font-bold text-sm group">
                        <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                        Back to login
                    </Link>
                </div>

                <div className="w-full max-w-[480px] mx-auto py-20 relative">
                    {/* Enhanced Loading & Success Overlay */}
                    {(isSubmitting || isSuccess) && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-50/80 backdrop-blur-[4px] rounded-[32px] transition-all duration-500">
                            <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-300">
                                {isSuccess ? (
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/40 animate-in zoom-in duration-500 bounce-in">
                                            <CheckCircle2 size={40} className="text-white" />
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="text-[13px] font-black uppercase tracking-[0.2em] text-emerald-600">Verified Successfully</span>
                                            <p className="text-[10px] text-emerald-600/60 font-bold uppercase tracking-widest">Sovereign Protocol Active</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-5">
                                        <div className="relative">
                                            <div className="w-16 h-16 border-4 border-navy/5 rounded-full"></div>
                                            <div className="absolute inset-0 w-16 h-16 border-t-4 border-navy rounded-full animate-spin"></div>
                                        </div>
                                        <div className="flex flex-col items-center gap-1 text-center">
                                            <span className="text-[12px] font-black uppercase tracking-[0.3em] text-navy animate-pulse">Processing Request</span>
                                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Validating with Authority Records...</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-8">
                                <Timer className="text-navy" size={32} />
                            </div>
                            <h2 className="text-4xl font-black text-navy tracking-tight mb-4 text-balance">Reset your password</h2>
                            <p className="text-gray-500 font-medium mb-10 leading-relaxed">
                                Enter your registered email address and we'll send you a 6-digit verification code to reset your account.
                            </p>

                            {error && (
                                <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-start gap-3 mb-8 animate-in shake duration-300">
                                    <div className="w-5 h-5 bg-rose-500 rounded-lg flex items-center justify-center text-white shrink-0 mt-0.5">
                                        <AlertCircle size={14} />
                                    </div>
                                    <p className="text-rose-500 font-bold text-[13px] leading-snug">{error}</p>
                                </div>
                            )}

                            {message && (
                                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-start gap-3 mb-8 animate-in fade-in duration-300">
                                    <div className="w-5 h-5 bg-emerald-500 rounded-lg flex items-center justify-center text-white shrink-0 mt-0.5">
                                        <CheckCircle2 size={14} />
                                    </div>
                                    <p className="text-emerald-500 font-bold text-[13px] leading-snug">{message}</p>
                                </div>
                            )}

                            <form onSubmit={handleStep1Submit} className="space-y-8">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Email Address</label>
                                    <div className="relative group">
                                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-navy transition-colors">
                                            <Mail size={20} />
                                        </div>
                                        <input
                                            type="email"
                                            required
                                            placeholder="name@gov.so"
                                            className="w-full bg-white border border-gray-200 rounded-[24px] pl-16 pr-6 py-5 text-[15px] font-bold text-navy placeholder:text-gray-300 focus:outline-none focus:ring-4 focus:ring-navy/5 focus:border-navy/20 transition-all shadow-sm group-hover:border-gray-300"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between py-2">
                                    <div className="flex gap-1.5">
                                        <div className="w-8 h-1.5 bg-navy rounded-full"></div>
                                        <div className="w-8 h-1.5 bg-gray-200 rounded-full"></div>
                                        <div className="w-8 h-1.5 bg-gray-200 rounded-full"></div>
                                    </div>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Step 1 of 3</span>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full group relative flex items-center justify-center h-20 bg-navy text-white rounded-[28px] overflow-hidden shadow-2xl shadow-navy/20 hover:shadow-navy/40 transition-all active:scale-95 disabled:opacity-70"
                                >
                                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                                    {isSubmitting ? (
                                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <div className="flex items-center gap-4 relative z-10 font-black text-[16px] tracking-tight uppercase">
                                            Request Verification Code <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform duration-300" />
                                        </div>
                                    )}
                                </button>
                            </form>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="animate-in fade-in slide-in-from-right-8 duration-700">
                            <h2 className="text-4xl font-black text-navy tracking-tight mb-4">Enter Verification Code</h2>
                            <p className="text-gray-500 font-medium mb-10 leading-relaxed">
                                We've sent a 6-digit code to <span className="text-navy font-bold">{email}</span>.
                            </p>

                            {error && (
                                <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-start gap-3 mb-8 animate-in shake duration-300">
                                    <div className="w-5 h-5 bg-rose-500 rounded-lg flex items-center justify-center text-white shrink-0 mt-0.5">
                                        <AlertCircle size={14} />
                                    </div>
                                    <p className="text-rose-500 font-bold text-[13px] leading-snug">{error}</p>
                                </div>
                            )}

                            <form onSubmit={handleStep2Submit} className="space-y-10">
                                <div className="flex justify-between gap-3">
                                    {code.map((digit, idx) => (
                                        <input
                                            key={idx}
                                            id={`code-${idx}`}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            className="w-full h-20 bg-white border-2 border-gray-100 rounded-2xl text-center text-2xl font-black text-navy focus:border-navy focus:ring-4 focus:ring-navy/5 outline-none transition-all shadow-sm"
                                            value={digit}
                                            onChange={(e) => handleCodeChange(idx, e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(idx, e)}
                                        />
                                    ))}
                                </div>

                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center justify-between py-2 border-t border-gray-100 pt-6">
                                        <div className="flex gap-1.5">
                                            <div className="w-8 h-1.5 bg-navy rounded-full"></div>
                                            <div className="w-8 h-1.5 bg-navy rounded-full"></div>
                                            <div className="w-8 h-1.5 bg-gray-200 rounded-full"></div>
                                        </div>
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Step 2 of 3</span>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full group relative flex items-center justify-center h-20 bg-navy text-white rounded-[28px] overflow-hidden shadow-2xl shadow-navy/20 hover:shadow-navy/40 transition-all active:scale-95 disabled:opacity-70"
                                    >
                                        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                                        {isSubmitting ? (
                                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            <div className="flex items-center gap-4 relative z-10 font-black text-[16px] tracking-tight uppercase">
                                                Verify Token <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform duration-300" />
                                            </div>
                                        )}
                                    </button>

                                    <div className="text-center">
                                        <button
                                            type="button"
                                            onClick={handleResendCode}
                                            disabled={countdown > 0}
                                            className="text-sm font-bold text-gray-400 hover:text-navy transition-colors flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
                                        >
                                            <Timer size={16} />
                                            Didn't receive the code? <span className="text-navy underline">Resend Code {countdown > 0 ? `(${countdown}s)` : ''}</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                                        <ShieldCheck className="text-navy mb-3" size={20} />
                                        <h4 className="text-[13px] font-bold text-navy mb-1">Secure Access</h4>
                                        <p className="text-[11px] text-gray-500 font-medium">Multi-factor authentication protects your account.</p>
                                    </div>
                                    <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                                        <KeyRound className="text-navy mb-3" size={20} />
                                        <h4 className="text-[13px] font-bold text-navy mb-1">Code Expiry</h4>
                                        <p className="text-[11px] text-gray-500 font-medium">Verification tokens are valid for 10 minutes.</p>
                                    </div>
                                </div>
                            </form>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="animate-in fade-in slide-in-from-right-8 duration-700">
                            <h2 className="text-4xl font-black text-navy tracking-tight mb-4">Create New Password</h2>
                            <p className="text-gray-500 font-medium mb-10 leading-relaxed">
                                Please choose a strong password that you haven't used before.
                            </p>

                            {error && (
                                <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-start gap-3 mb-8 animate-in shake duration-300">
                                    <div className="w-5 h-5 bg-rose-500 rounded-lg flex items-center justify-center text-white shrink-0 mt-0.5">
                                        <AlertCircle size={14} />
                                    </div>
                                    <p className="text-rose-500 font-bold text-[13px] leading-snug">{error}</p>
                                </div>
                            )}

                            {message && (
                                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-start gap-3 mb-8 animate-in fade-in duration-300">
                                    <div className="w-5 h-5 bg-emerald-500 rounded-lg flex items-center justify-center text-white shrink-0 mt-0.5">
                                        <CheckCircle2 size={14} />
                                    </div>
                                    <p className="text-emerald-500 font-bold text-[13px] leading-snug">{message}</p>
                                </div>
                            )}

                            <form onSubmit={handleStep3Submit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">New Password</label>
                                    <div className="relative group">
                                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-navy transition-colors">
                                            <Lock size={20} />
                                        </div>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            placeholder="••••••••"
                                            className="w-full bg-white border border-gray-200 rounded-[24px] pl-16 pr-16 py-5 text-[15px] font-bold text-navy placeholder:text-gray-300 focus:outline-none focus:ring-4 focus:ring-navy/5 focus:border-navy/20 transition-all shadow-sm group-hover:border-gray-300"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-300 hover:text-navy transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Confirm Password</label>
                                    <div className="relative group">
                                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-navy transition-colors">
                                            <Lock size={20} />
                                        </div>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            placeholder="••••••••"
                                            className="w-full bg-white border border-gray-200 rounded-[24px] pl-16 pr-16 py-5 text-[15px] font-bold text-navy placeholder:text-gray-300 focus:outline-none focus:ring-4 focus:ring-navy/5 focus:border-navy/20 transition-all shadow-sm group-hover:border-gray-300"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-start gap-4 mb-8">
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-blue-100">
                                        <CheckCircle2 className="text-navy" size={20} />
                                    </div>
                                    <p className="text-[12px] text-gray-600 font-medium leading-relaxed">
                                        <span className="font-bold text-navy">Security Policy:</span> 8+ chars, uppercase, lowercase, numbers, and special characters (e.g., @, #, !).
                                    </p>
                                </div>

                                <div className="flex items-center justify-between py-2">
                                    <div className="flex gap-1.5">
                                        <div className="w-8 h-1.5 bg-navy rounded-full"></div>
                                        <div className="w-8 h-1.5 bg-navy rounded-full"></div>
                                        <div className="w-8 h-1.5 bg-navy rounded-full"></div>
                                    </div>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Step 3 of 3</span>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full group relative flex items-center justify-center h-20 bg-navy text-white rounded-[28px] overflow-hidden shadow-2xl shadow-navy/20 hover:shadow-navy/40 transition-all active:scale-95 disabled:opacity-70"
                                >
                                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                                    {isSubmitting ? (
                                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <div className="flex items-center gap-4 relative z-10 font-black text-[16px] tracking-tight uppercase">
                                            Reset Password <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform duration-300" />
                                        </div>
                                    )}
                                </button>
                            </form>
                        </div>
                    )}
                </div>

                <div className="mt-auto py-10 border-t border-gray-100 flex items-center justify-between transition-opacity text-navy">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Mogadishu Digital Sovereignty</p>
                    <div className="flex items-center gap-6">
                        <span className="text-[11px] font-bold hover:text-navy cursor-pointer opacity-40">Privacy Policy</span>
                        <span className="text-[11px] font-bold hover:text-navy cursor-pointer opacity-40">Terms of Service</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
