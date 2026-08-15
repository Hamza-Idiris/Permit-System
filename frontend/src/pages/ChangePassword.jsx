import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Lock, Shield, Loader2, KeyRound } from 'lucide-react';
import AuthContext from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { useTheme } from '../context/ThemeContext';

const ChangePassword = () => {
    const { user, token } = useContext(AuthContext);
    const { darkMode } = useTheme();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const [formData, setFormData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [offlinePin, setOfflinePin] = useState('');
    const [confirmOfflinePin, setConfirmOfflinePin] = useState('');
    const [pinLoading, setPinLoading] = useState(false);
    const [pinMessage, setPinMessage] = useState({ type: '', text: '' });

    const isSuperAdmin = user?.role === 'superadmin';

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (formData.newPassword !== formData.confirmPassword) {
            return setMessage({ type: 'error', text: 'New passwords do not match' });
        }

        setLoading(true);

        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            };

            const { data } = await axios.put('http://localhost:5000/api/users/change-password', {
                oldPassword: formData.oldPassword,
                newPassword: formData.newPassword
            }, config);

            if (data.success) {
                setMessage({ type: 'success', text: 'Password updated successfully!' });
                setFormData({ oldPassword: '', newPassword: '', confirmPassword: '' });

                // Redirect after success
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
                text: error.response?.data?.message || 'Error updating password',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleOfflinePinSubmit = async (e) => {
        e.preventDefault();
        setPinMessage({ type: '', text: '' });

        if (!/^\d{4}$/.test(offlinePin)) {
            return setPinMessage({ type: 'error', text: 'PIN must be exactly 4 digits' });
        }
        if (offlinePin !== confirmOfflinePin) {
            return setPinMessage({ type: 'error', text: 'PINs do not match' });
        }

        setPinLoading(true);
        try {
            const { data } = await axios.put(
                'http://localhost:5000/api/payment/offline-pin',
                { pin: offlinePin },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (data.success) {
                setPinMessage({ type: 'success', text: 'Offline payment PIN updated successfully!' });
                setOfflinePin('');
                setConfirmOfflinePin('');
            }
        } catch (error) {
            setPinMessage({
                type: 'error',
                text: error.response?.data?.message || 'Failed to update offline payment PIN',
            });
        } finally {
            setPinLoading(false);
        }
    };

    const handleCancel = () => {
        if (user?.role === 'superadmin') navigate('/admin/dashboard');
        else if (user?.role === 'staff') navigate('/staff/dashboard');
        else if (user?.role === 'inspector') navigate('/inspector/scanner');
        else navigate('/applicant/home');
    };

    return (
        <div className="flex h-screen bg-bg-soft overflow-hidden font-sans transition-colors duration-300">
            <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

            <main className="flex-1 overflow-y-auto w-full relative">
                <div className="max-w-4xl mx-auto p-4 sm:p-8 pt-20 lg:pt-12 pb-24">
                    <div className="mb-8 flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-extrabold text-navy tracking-tight transition-colors">Account Security</h1>
                            <p className="text-sm text-text-muted mt-1 font-black transition-colors">Safeguard your account by updating your credentials regularly.</p>
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-blue-500/20">
                            <KeyRound size={24} />
                        </div>
                    </div>

                    <div className="bg-card-bg rounded-2xl p-6 sm:p-8 shadow-sm border border-border-color transition-colors duration-300">
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

                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-black text-text-main flex items-center gap-2 transition-colors">
                                        <Lock size={16} className="text-text-muted" /> Current Password
                                    </label>
                                    <input
                                        type="password"
                                        name="oldPassword"
                                        value={formData.oldPassword}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-3 bg-table-header-bg border border-border-color rounded-xl focus:ring-2 focus:ring-navy/20 focus:border-transparent outline-none transition-all text-sm font-black text-navy placeholder:text-text-muted/50"
                                        placeholder="Enter your current password"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border-color transition-colors">
                                    <div className="space-y-2">
                                        <label className="text-sm font-black text-text-main flex items-center gap-2 transition-colors">
                                            <Lock size={16} className="text-text-muted" /> New Password
                                        </label>
                                        <input
                                            type="password"
                                            name="newPassword"
                                            value={formData.newPassword}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-3 bg-table-header-bg border border-border-color rounded-xl focus:ring-2 focus:ring-navy/20 focus:border-transparent outline-none transition-all text-sm font-black text-navy placeholder:text-text-muted/50"
                                            placeholder="8+ chars, Upper, Lower, Num, Special"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-black text-text-main flex items-center gap-2 transition-colors">
                                            <Lock size={16} className="text-text-muted" /> Confirm New Password
                                        </label>
                                        <input
                                            type="password"
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-3 bg-table-header-bg border border-border-color rounded-xl focus:ring-2 focus:ring-navy/20 focus:border-transparent outline-none transition-all text-sm font-black text-navy placeholder:text-text-muted/50"
                                            placeholder="Repeat new password"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 flex gap-4 border-t border-border-color transition-colors">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full sm:w-auto px-8 py-3.5 bg-navy hover:brightness-110 text-white rounded-xl font-black shadow-lg shadow-navy/20 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : <>Save Password Changes</>}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className="w-full sm:w-auto px-8 py-3.5 bg-table-header-bg border border-border-color text-text-main rounded-xl font-black transition-all active:scale-[0.98] flex items-center justify-center"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>

                    {isSuperAdmin && (
                        <div className="mt-8 bg-card-bg rounded-2xl p-6 sm:p-8 shadow-sm border border-border-color transition-colors duration-300">
                            <h2 className="text-xl font-extrabold text-navy mb-1">Offline Payment PIN</h2>
                            <p className="text-sm text-text-muted mb-6 font-medium">
                                Applicants use this 4-digit PIN for offline payment. Default is 1234 until you change it.
                            </p>

                            {pinMessage.text && (
                                <div className={`p-4 mb-6 rounded-xl border ${pinMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
                                    <p className="font-black text-sm flex items-center gap-2">
                                        <Shield size={16} />
                                        {pinMessage.text}
                                    </p>
                                </div>
                            )}

                            <form onSubmit={handleOfflinePinSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-black text-text-main flex items-center gap-2">
                                            <KeyRound size={16} className="text-text-muted" /> New PIN
                                        </label>
                                        <input
                                            type="password"
                                            inputMode="numeric"
                                            maxLength={4}
                                            value={offlinePin}
                                            onChange={(e) => setOfflinePin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                            required
                                            className="w-full px-4 py-3 bg-table-header-bg border border-border-color rounded-xl focus:ring-2 focus:ring-navy/20 focus:border-transparent outline-none transition-all text-sm font-black text-navy tracking-[0.4em] text-center"
                                            placeholder="••••"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-black text-text-main flex items-center gap-2">
                                            <KeyRound size={16} className="text-text-muted" /> Confirm PIN
                                        </label>
                                        <input
                                            type="password"
                                            inputMode="numeric"
                                            maxLength={4}
                                            value={confirmOfflinePin}
                                            onChange={(e) => setConfirmOfflinePin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                            required
                                            className="w-full px-4 py-3 bg-table-header-bg border border-border-color rounded-xl focus:ring-2 focus:ring-navy/20 focus:border-transparent outline-none transition-all text-sm font-black text-navy tracking-[0.4em] text-center"
                                            placeholder="••••"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={pinLoading}
                                    className="w-full sm:w-auto px-8 py-3.5 bg-navy hover:brightness-110 text-white rounded-xl font-black shadow-lg shadow-navy/20 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                                >
                                    {pinLoading ? <Loader2 size={18} className="animate-spin" /> : 'Update Offline PIN'}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ChangePassword;
