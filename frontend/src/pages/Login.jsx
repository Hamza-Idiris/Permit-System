import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, Eye, EyeOff, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const data = await login(email, password);

      // Role-Based Redirect
      switch (data.role) {
        case 'superadmin':
          navigate('/admin/dashboard');
          break;
        case 'staff':
          navigate('/staff/dashboard');
          break;
        case 'applicant':
          navigate('/applicant/home');
          break;
        case 'inspector':
          navigate('/inspector/scanner');
          break;
        default:
          navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Invalid Credentials. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white font-inter overflow-hidden">
      {/* Branding / Cinematic Panel */}
      <div className="hidden lg:flex w-1/2 relative bg-navy overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy to-navy-light opacity-90"></div>
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-white/5 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[100px]"></div>

        {/* Grid Pattern Overlay */}
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
            <h1 className="text-6xl font-black text-white leading-[1.05] tracking-tighter mb-8">
              Building a <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-indigo-100">Modern State.</span>
            </h1>
            <p className="text-lg text-white/60 font-medium leading-relaxed mb-12">
              The official M-DBPS — Mogadishu Digital Building Permit System. Modernizing infrastructure through digital governance and secure workflows.
            </p>

            <div className="grid grid-cols-3 gap-8 pt-10 border-t border-white/10">
              <div>
                <h4 className="text-white font-black text-2xl">100%</h4>
                <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mt-1">Digital</p>
              </div>
              <div>
                <h4 className="text-white font-black text-2xl">24/7</h4>
                <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mt-1">Accessible</p>
              </div>
              <div>
                <h4 className="text-white font-black text-2xl">SECURE</h4>
                <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mt-1">Encrypted</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50/30">
        <div className="w-full max-w-[440px] animate-in fade-in slide-in-from-bottom-8 duration-700">

          <div className="mb-12">
            <h2 className="text-4xl font-black text-navy tracking-tight mb-3">Sign In</h2>
            <p className="text-gray-500 font-medium">Access the official municipal permitting engine.</p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-start gap-3 mb-8 animate-in shake duration-300">
              <div className="w-5 h-5 bg-rose-500 rounded-lg flex items-center justify-center text-white shrink-0 mt-0.5">
                <span className="text-[14px] font-black">!</span>
              </div>
              <p className="text-rose-500 font-bold text-[13px] leading-snug">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Email</label>
              <div className="relative group">
                <input
                  type="email"
                  required
                  placeholder="Email"
                  className="w-full bg-white border border-gray-200 rounded-[20px] px-6 py-4 text-[15px] font-bold text-navy placeholder:text-gray-300 focus:outline-none focus:ring-4 focus:ring-navy/5 focus:border-navy/20 transition-all shadow-sm group-hover:border-gray-300"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Password</label>
              <div className="relative group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Password"
                  className="w-full bg-white border border-gray-200 rounded-[20px] px-6 py-4 text-[15px] font-bold text-navy placeholder:text-gray-300 focus:outline-none focus:ring-4 focus:ring-navy/5 focus:border-navy/20 transition-all shadow-sm group-hover:border-gray-300"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-300 hover:text-navy transition-colors transition-all duration-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 px-1 pt-2">
              <div className="relative flex items-center cursor-pointer group">
                <input type="checkbox" id="remember" className="peer hidden" />
                <div className="w-5 h-5 border-2 border-gray-200 rounded-lg peer-checked:bg-navy peer-checked:border-navy transition-all flex items-center justify-center">
                  <div className="w-2.5 h-1.5 border-l-2 border-b-2 border-white -rotate-45 mb-0.5 opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                </div>
                <label htmlFor="remember" className="ml-3 text-[13px] font-bold text-gray-400 cursor-pointer hover:text-gray-600 transition-colors">Keep session active</label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full group relative flex items-center justify-center h-16 bg-navy text-white rounded-[24px] overflow-hidden shadow-2xl shadow-navy/20 hover:shadow-navy/40 transition-all active:scale-95 disabled:opacity-70"
            >
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
              {isSubmitting ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span className="font-black text-[15px] tracking-tight">Authenticating...</span>
                </div>
              ) : (
                <div className="flex items-center gap-4 relative z-10 font-black text-[15px] tracking-tight uppercase">
                  Log In <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform duration-300" />
                </div>
              )}
            </button>
          </form>

          <p className="mt-10 text-center text-[13px] font-bold text-navy hover:underline decoration-2 cursor-pointer">
            <Link to="/forgot-password" className="text-navy hover:underline decoration-2">Forgot password?</Link>
          </p>

          <div className="mt-20 pt-10 border-t border-gray-100 flex items-center justify-between opacity-30">
            <ShieldCheck size={20} className="text-navy" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-navy">Mogadishu Digital Sovereignty v4.0</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

