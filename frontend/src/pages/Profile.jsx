import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { User, Mail, Lock, Shield, MapPin, Loader2 } from 'lucide-react';
import AuthContext from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { useTheme } from '../context/ThemeContext';

const Profile = () => {
  const { user, token, updateToken } = useContext(AuthContext);
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    gender: 'Male',
    currentPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const { data } = await axios.get('http://localhost:5000/api/auth/me', config);
        if (data.success && data.data) {
          setFormData(prev => ({
            ...prev,
            fullName: data.data.fullName || '',
            email: data.data.email || '',
            phone: data.data.phone ? data.data.phone.replace('+252', '') : '',
            gender: data.data.gender || 'Male'
          }));
        }
      } catch (error) {
        console.error("Failed to fetch profile", error);
      }
    };

    if (token) {
      fetchProfile();
    }
  }, [token]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!formData.currentPassword) {
      return setMessage({ type: 'error', text: 'Please enter your current password to authorize changes' });
    }

    setLoading(true);

    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      };

      const updateData = {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone.startsWith('+252') ? formData.phone : `+252${formData.phone}`,
        gender: formData.gender,
        currentPassword: formData.currentPassword
      };

      const { data } = await axios.put('http://localhost:5000/api/users/profile', updateData, config);

      if (data.success) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setFormData(prev => ({ ...prev, currentPassword: '' }));

        // Update user context with new token and data
        if (data.token) {
          updateToken(data.token);
        }

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          if (user?.role === 'superadmin') navigate('/admin/dashboard');
          else if (user?.role === 'staff') navigate('/staff/dashboard');
          else if (user?.role === 'inspector') navigate('/inspector/scanner');
          else navigate('/applicant/home');
        }, 1500);
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Error updating profile',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-bg-soft overflow-hidden font-sans transition-colors duration-300">
      <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

      <main className="flex-1 overflow-y-auto w-full relative">
        <div className="max-w-4xl mx-auto p-4 sm:p-8 pt-20 lg:pt-12 pb-24">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-extrabold text-navy tracking-tight transition-colors">Profile Settings</h1>
              <p className="text-sm text-text-muted mt-1 font-black transition-colors">Update your personal information and security settings.</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-indigo-500/20">
              {user?.fullName ? user.fullName[0].toUpperCase() : 'A'}
            </div>
          </div>

          <div className="bg-card-bg rounded-3xl p-6 sm:p-8 shadow-sm border border-border-color transition-colors duration-300">
            {message.text && (
              <div className={`p-4 mb-6 rounded-xl border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                }`}>
                <p className="font-black text-sm flex items-center gap-2">
                  {message.type === 'success' ? (
                    <Shield size={16} className="text-emerald-500" />
                  ) : (
                    <Shield size={16} className="text-rose-500" />
                  )}
                  {message.text}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-black text-text-main flex items-center gap-2 transition-colors">
                    <User size={16} className="text-text-muted" /> Full Name
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-table-header-bg border border-border-color rounded-xl focus:ring-2 focus:ring-navy/20 focus:border-transparent outline-none transition-all text-sm font-black text-navy placeholder:text-text-muted/50"
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-text-main flex items-center gap-2 transition-colors">
                    <Mail size={16} className="text-text-muted" /> Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-table-header-bg border border-border-color rounded-xl focus:ring-2 focus:ring-navy/20 focus:border-transparent outline-none transition-all text-sm font-black text-navy placeholder:text-text-muted/50"
                    placeholder="Enter your email"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-text-main flex items-center gap-2 transition-colors">
                    <Shield size={16} className="text-text-muted" /> Phone Number
                  </label>
                  <div className="flex gap-2">
                    <div className="bg-table-header-bg px-4 py-3 border border-border-color rounded-xl text-sm font-black text-text-muted flex items-center">
                      +252
                    </div>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        if (val.length <= 9) setFormData({ ...formData, phone: val });
                      }}
                      required
                      maxLength={9}
                      className="w-full px-4 py-3 bg-table-header-bg border border-border-color rounded-xl focus:ring-2 focus:ring-navy/20 focus:border-transparent outline-none transition-all text-sm font-black text-navy placeholder:text-text-muted/50"
                      placeholder="61XXXXXXX"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black text-text-main flex items-center gap-2 transition-colors">
                  <User size={16} className="text-text-muted" /> Gender
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-table-header-bg border border-border-color rounded-xl focus:ring-2 focus:ring-navy/20 focus:border-transparent outline-none transition-all text-sm font-black text-navy appearance-none"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              {/* Password Authorization for Changes */}
              <div className="pt-4 mt-6 border-t border-border-color transition-colors">
                <h3 className="text-sm font-black text-rose-500 mb-4 uppercase tracking-wider transition-colors flex items-center gap-2">
                  <Lock size={16} /> Authorization Required
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-black text-text-main flex items-center gap-2 transition-colors">
                      <Lock size={16} className="text-text-muted" /> Current Password
                    </label>
                    <input
                      type="password"
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-table-header-bg border border-border-color rounded-xl focus:ring-2 focus:ring-navy/20 focus:border-transparent outline-none transition-all text-sm font-black text-navy placeholder:text-text-muted/50"
                      placeholder="Enter password to save changes"
                    />
                  </div>
                </div>
              </div>

              {/* Display read-only fields for context */}
              {user?.role && (
                <div className="pt-4 mt-6 border-t border-border-color transition-colors">
                  <div className="flex gap-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 text-xs font-black uppercase tracking-wider transition-colors">
                      <Shield size={14} /> {user.role}
                    </span>
                    {user.district && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-table-header-bg text-text-muted text-xs font-black uppercase tracking-wider transition-colors border border-border-color">
                        <MapPin size={14} /> {user.district}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-6 flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-8 py-3.5 bg-navy hover:brightness-110 text-white rounded-xl font-black shadow-lg shadow-navy/20 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (user?.role === 'superadmin') navigate('/admin/dashboard');
                    else if (user?.role === 'staff') navigate('/staff/dashboard');
                    else if (user?.role === 'inspector') navigate('/inspector/scanner');
                    else navigate('/applicant/home');
                  }}
                  className="w-full sm:w-auto px-8 py-3.5 bg-table-header-bg border border-border-color text-text-main rounded-xl font-black transition-all active:scale-[0.98] flex items-center justify-center"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
