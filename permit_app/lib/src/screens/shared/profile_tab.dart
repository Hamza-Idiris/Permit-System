import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:permit_app/src/screens/shared/about_us_screen.dart';
import 'package:permit_app/src/screens/shared/edit_profile_screen.dart';
import 'package:permit_app/src/screens/shared/security_settings_screen.dart';
import 'package:permit_app/src/screens/shared/support_screen.dart';
import 'package:permit_app/src/utils/colors.dart';
import 'package:permit_app/src/providers/theme_provider.dart';
import 'package:provider/provider.dart';

class ProfileTab extends StatefulWidget {
  final VoidCallback onLogout;
  final VoidCallback? onUpdate;

  const ProfileTab({super.key, required this.onLogout, this.onUpdate});

  @override
  State<ProfileTab> createState() => _ProfileTabState();
}

class _ProfileTabState extends State<ProfileTab> {
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  String fullName = '';
  String email = '';
  String phone = '';
  String role = 'applicant';

  @override
  void initState() {
    super.initState();
    _loadUserData();
  }

  Future<void> _loadUserData() async {
    final storedName = await _storage.read(key: 'fullName');
    final storedEmail = await _storage.read(key: 'email');
    final storedPhone = await _storage.read(key: 'phone');
    final storedRole = await _storage.read(key: 'role');

    if (mounted) {
      setState(() {
        if (storedName != null && storedName.isNotEmpty) fullName = storedName;
        if (storedEmail != null && storedEmail.isNotEmpty) email = storedEmail;
        if (storedPhone != null && storedPhone.isNotEmpty) phone = storedPhone;
        if (storedRole != null && storedRole.isNotEmpty) role = storedRole.toLowerCase();
      });
      widget.onUpdate?.call();
    }
  }

  bool get _isInspector => role == 'inspector';

  String get _roleLabel => _isInspector ? 'Field Inspector' : 'Permit Applicant';

  Future<void> _navigateToEditProfile() async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const EditProfileScreen()),
    );
    if (result == true) _loadUserData();
  }

  Future<void> _navigateToSecurity() async {
    await Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const SecuritySettingsScreen()),
    );
    _loadUserData();
  }

  void _showThemeSelection(BuildContext context) {
    final themeProvider = Provider.of<ThemeProvider>(context, listen: false);
    final isDark = themeProvider.isDarkMode;
    showModalBottomSheet(
      context: context,
      backgroundColor: ColorPallete.surface(isDark),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: isDark ? Colors.white24 : Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
              const SizedBox(height: 20),
              Text(
                'Display',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: ColorPallete.text(isDark),
                ),
              ),
              const SizedBox(height: 16),
              _themeOption(
                title: 'Light',
                icon: Icons.wb_sunny_outlined,
                selected: !themeProvider.isDarkMode,
                isDark: isDark,
                onTap: () {
                  themeProvider.setTheme(false);
                  Navigator.pop(context);
                },
              ),
              const SizedBox(height: 10),
              _themeOption(
                title: 'Dark',
                icon: Icons.dark_mode_outlined,
                selected: themeProvider.isDarkMode,
                isDark: isDark,
                onTap: () {
                  themeProvider.setTheme(true);
                  Navigator.pop(context);
                },
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _themeOption({
    required String title,
    required IconData icon,
    required bool selected,
    required bool isDark,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: selected
              ? ColorPallete.accentTeal.withOpacity(0.12)
              : (isDark ? Colors.white.withOpacity(0.04) : ColorPallete.backgroundColor),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected
                ? ColorPallete.accentTeal.withOpacity(0.35)
                : (isDark ? Colors.white10 : ColorPallete.borderColor),
          ),
        ),
        child: Row(
          children: [
            Icon(icon, color: ColorPallete.text(isDark)),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                title,
                style: TextStyle(
                  fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                  color: ColorPallete.text(isDark),
                ),
              ),
            ),
            if (selected)
              const Icon(Icons.check_circle_rounded, color: ColorPallete.accentTeal, size: 20),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;
    final canPop = Navigator.canPop(context);
    final displayName = fullName.isEmpty ? 'User' : fullName;
    final initial = displayName[0].toUpperCase();

    return Scaffold(
      backgroundColor: ColorPallete.scaffold(isDark),
      appBar: canPop
          ? AppBar(
              backgroundColor: ColorPallete.scaffold(isDark),
              elevation: 0,
              foregroundColor: ColorPallete.text(isDark),
              title: Text(
                'Profile',
                style: TextStyle(fontWeight: FontWeight.w800, color: ColorPallete.text(isDark)),
              ),
            )
          : null,
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (!canPop) ...[
                Text(
                  'Profile',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w800,
                    color: ColorPallete.text(isDark),
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Manage your account and preferences',
                  style: TextStyle(color: ColorPallete.muted(isDark), fontWeight: FontWeight.w500),
                ),
                const SizedBox(height: 22),
              ],

              // Identity card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  gradient: ColorPallete.accentGradient,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: ColorPallete.primaryNavy.withOpacity(0.25),
                      blurRadius: 24,
                      offset: const Offset(0, 12),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Container(
                      width: 76,
                      height: 76,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white.withOpacity(0.18),
                        border: Border.all(color: Colors.white.withOpacity(0.45), width: 2),
                      ),
                      child: Center(
                        child: Text(
                          initial,
                          style: const TextStyle(
                            fontSize: 32,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),
                    Text(
                      displayName,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      email.isEmpty ? '—' : email,
                      style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 13),
                    ),
                    if (phone.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        phone,
                        style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12),
                      ),
                    ],
                    const SizedBox(height: 14),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.16),
                        borderRadius: BorderRadius.circular(99),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            _isInspector ? Icons.badge_outlined : Icons.verified_outlined,
                            size: 14,
                            color: Colors.white,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            _roleLabel,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 18),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _navigateToEditProfile,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: ColorPallete.primaryNavy,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        child: const Text('Edit Profile', style: TextStyle(fontWeight: FontWeight.w800)),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 28),

              _sectionLabel('Account', isDark),
              const SizedBox(height: 10),
              _groupCard(isDark, [
                _tile(
                  icon: Icons.person_outline_rounded,
                  title: 'Manage Profile',
                  subtitle: 'Update your personal information',
                  onTap: _navigateToEditProfile,
                  isDark: isDark,
                ),
                _tile(
                  icon: Icons.lock_outline_rounded,
                  title: 'Password & Security',
                  subtitle: 'Change your password',
                  onTap: _navigateToSecurity,
                  isDark: isDark,
                  isLast: true,
                ),
              ]),
              const SizedBox(height: 22),

              _sectionLabel('Preferences', isDark),
              const SizedBox(height: 10),
              _groupCard(isDark, [
                _tile(
                  icon: Icons.palette_outlined,
                  title: 'Theme',
                  subtitle: 'Light or dark appearance',
                  onTap: () => _showThemeSelection(context),
                  isDark: isDark,
                ),
                _tile(
                  icon: Icons.info_outline_rounded,
                  title: 'About Us',
                  subtitle: 'Learn more about the permit system',
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => const AboutUsScreen()),
                    );
                  },
                  isDark: isDark,
                  isLast: true,
                ),
              ]),
              const SizedBox(height: 22),

              _sectionLabel('Support', isDark),
              const SizedBox(height: 10),
              _groupCard(isDark, [
                _tile(
                  icon: Icons.help_outline_rounded,
                  title: 'Help Center',
                  subtitle: 'FAQs and support',
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => const SupportScreen()),
                    );
                  },
                  isDark: isDark,
                  isLast: true,
                ),
              ]),
              const SizedBox(height: 28),

              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: widget.onLogout,
                  icon: const Icon(Icons.logout_rounded, size: 18),
                  label: const Text('Logout', style: TextStyle(fontWeight: FontWeight.w800)),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: ColorPallete.errorRed,
                    side: BorderSide(color: ColorPallete.errorRed.withOpacity(0.35)),
                    padding: const EdgeInsets.symmetric(vertical: 15),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Center(
                child: Text(
                  'Version 2.4.1',
                  style: TextStyle(fontSize: 12, color: ColorPallete.muted(isDark)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _sectionLabel(String text, bool isDark) {
    return Text(
      text,
      style: TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w800,
        letterSpacing: 0.4,
        color: ColorPallete.muted(isDark),
      ),
    );
  }

  Widget _groupCard(bool isDark, List<Widget> children) {
    return Container(
      decoration: BoxDecoration(
        color: ColorPallete.surface(isDark),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: isDark ? Colors.white10 : ColorPallete.borderColor),
      ),
      child: Column(children: children),
    );
  }

  Widget _tile({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    required bool isDark,
    bool isLast = false,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 14, 14, 0),
        child: Column(
          children: [
            Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: ColorPallete.accentTeal.withOpacity(isDark ? 0.15 : 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icon, color: isDark ? Colors.white70 : ColorPallete.primaryNavy, size: 22),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: ColorPallete.text(isDark),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        subtitle,
                        style: TextStyle(fontSize: 12, color: ColorPallete.muted(isDark)),
                      ),
                    ],
                  ),
                ),
                Icon(Icons.chevron_right_rounded, color: ColorPallete.muted(isDark)),
              ],
            ),
            const SizedBox(height: 14),
            if (!isLast)
              Divider(height: 1, color: isDark ? Colors.white10 : ColorPallete.borderColor),
          ],
        ),
      ),
    );
  }
}
