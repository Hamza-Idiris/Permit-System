import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:permit_app/src/screens/about_us_screen.dart';
import 'package:permit_app/src/screens/edit_profile_screen.dart';
import 'package:permit_app/src/screens/security_settings_screen.dart';
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

  String fullName = "Daliye";
  String email = "daaliye@gmail.com";
  String phone = "+252 61 123 4567";

  @override
  void initState() {
    super.initState();
    _loadUserData();
  }

  Future<void> _loadUserData() async {
    final storedName = await _storage.read(key: 'fullName');
    final storedEmail = await _storage.read(key: 'email');
    final storedPhone = await _storage.read(key: 'phone');

    if (mounted) {
      setState(() {
        if (storedName != null && storedName.isNotEmpty) fullName = storedName;
        if (storedEmail != null && storedEmail.isNotEmpty) email = storedEmail;
        if (storedPhone != null && storedPhone.isNotEmpty) phone = storedPhone;
      });
      if (widget.onUpdate != null) widget.onUpdate!();
    }
  }

  Future<void> _navigateToEditProfile() async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const EditProfileScreen()),
    );
    
    if (result == true) {
      _loadUserData();
    }
  }

  Future<void> _navigateToSecurity() async {
    await Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const SecuritySettingsScreen()),
    );
    _loadUserData(); // In case name/etc changed elsewhere
  }

  void _showThemeSelection(BuildContext context) {
    final themeProvider = Provider.of<ThemeProvider>(context, listen: false);
    showModalBottomSheet(
      context: context,
      backgroundColor: themeProvider.isDarkMode ? ColorPallete.darkBackgroundColor : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Container(
          padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Display Preferences',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: themeProvider.isDarkMode ? Colors.white : ColorPallete.primaryNavy,
                ),
              ),
              const SizedBox(height: 20),
              _buildThemeOption(
                context,
                title: 'Light Mode',
                icon: Icons.wb_sunny_outlined,
                isSelected: !themeProvider.isDarkMode,
                onTap: () {
                  themeProvider.setTheme(false);
                  Navigator.pop(context);
                },
              ),
              const SizedBox(height: 10),
              _buildThemeOption(
                context,
                title: 'Dark Mode',
                icon: Icons.nightlight_round,
                isSelected: themeProvider.isDarkMode,
                onTap: () {
                  themeProvider.setTheme(true);
                  Navigator.pop(context);
                },
              ),
              const SizedBox(height: 20),
            ],
          ),
        );
      },
    );
  }

  Widget _buildThemeOption(
    BuildContext context, {
    required String title,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
        decoration: BoxDecoration(
          color: isSelected
              ? (isDark ? Colors.white.withOpacity(0.1) : ColorPallete.primaryNavy.withOpacity(0.05))
              : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected
                ? (isDark ? Colors.white24 : ColorPallete.primaryNavy.withOpacity(0.1))
                : Colors.transparent,
          ),
        ),
        child: Row(
          children: [
            Icon(icon, color: isDark ? Colors.white70 : ColorPallete.primaryNavy),
            const SizedBox(width: 15),
            Text(
              title,
              style: TextStyle(
                fontSize: 16,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                color: isDark ? Colors.white : ColorPallete.primaryNavy,
              ),
            ),
            const Spacer(),
            if (isSelected)
              Icon(Icons.check_circle, color: isDark ? Colors.white : ColorPallete.primaryNavy, size: 20),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final themeProvider = Provider.of<ThemeProvider>(context);
    final isDark = themeProvider.isDarkMode;
    final primaryColor = isDark ? Colors.white : ColorPallete.primaryNavy;
    final secondaryTextColor = isDark ? Colors.white70 : ColorPallete.hintTextColor;
    final cardColor = isDark ? const Color(0xFF1E1E1E) : Colors.white;
    final scaffoldBg = isDark ? ColorPallete.darkBackgroundColor : ColorPallete.backgroundColor;

    return Scaffold(
      backgroundColor: scaffoldBg,
      appBar: Navigator.canPop(context) ? AppBar(backgroundColor: scaffoldBg, elevation: 0) : null,
      body: SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 10.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Header
                Row(
                  children: [
                    Icon(Icons.account_balance, color: primaryColor, size: 24),
                    const SizedBox(width: 10),
                    Text(
                      'Urban Permits',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: primaryColor,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 25),

                // Profile Card
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: cardColor,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.03),
                        blurRadius: 20,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 70,
                            height: 70,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: ColorPallete.primaryNavy,
                              border: Border.all(
                                color: isDark ? Colors.white24 : Colors.white, 
                                width: 2,
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.1),
                                  blurRadius: 10,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: Center(
                              child: Text(
                                fullName.isNotEmpty ? fullName[0].toUpperCase() : '?',
                                style: const TextStyle(
                                  fontSize: 32,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 15),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  fullName,
                                  style: TextStyle(
                                    fontSize: 22,
                                    fontWeight: FontWeight.bold,
                                    color: primaryColor,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  email,
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: secondaryTextColor,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: Colors.blue.withOpacity(0.15),
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(Icons.verified_user_outlined, size: 14, color: Colors.blue),
                                      const SizedBox(width: 5),
                                      const Text(
                                        'Verified Resident',
                                        style: TextStyle(
                                          color: Colors.blue,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 11,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _navigateToEditProfile,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.black,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            elevation: 0,
                          ),
                          child: const Text('Edit Profile', style: TextStyle(fontWeight: FontWeight.bold)),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 30),

                // Account Section
                _buildSectionTitle('Account', primaryColor),
                const SizedBox(height: 10),
                _buildSettingsCard(
                  cardColor,
                  [
                    _buildSettingsItem(
                      icon: Icons.person_outline,
                      title: 'Manage Profile',
                      subtitle: 'Update your personal information',
                      onTap: _navigateToEditProfile,
                      isDark: isDark,
                    ),
                    _buildSettingsItem(
                      icon: Icons.lock_outline,
                      title: 'Password & Security',
                      subtitle: ' change your password and manage security settings',
                      onTap: _navigateToSecurity,
                      isDark: isDark,
                      isLast: true,
                    ),
                  ],
                ),
                const SizedBox(height: 25),

                // Preferences Section
                _buildSectionTitle('Preferences', primaryColor),
                const SizedBox(height: 10),
                _buildSettingsCard(
                  cardColor,
                  [
                    _buildSettingsItem(
                      icon: Icons.palette_outlined,
                      title: 'Theme',
                      subtitle: 'Switch between Light and Dark mode',
                      onTap: () => _showThemeSelection(context),
                      isDark: isDark,
                    ),
                    _buildSettingsItem(
                      icon: Icons.info_outline,
                      title: 'About Us',
                      subtitle: 'Learn more about Urban Permits',
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (context) => const AboutUsScreen()),
                        );
                      },
                      isDark: isDark,
                      isLast: true,
                    ),
                  ],
                ),
                const SizedBox(height: 25),

                // Support Section
                _buildSectionTitle('Support', primaryColor),
                const SizedBox(height: 10),
                _buildSettingsCard(
                  cardColor,
                  [
                    _buildSettingsItem(
                      icon: Icons.help_outline,
                      title: 'Help Center',
                      subtitle: 'FAQs and support tickets',
                      onTap: () {},
                      isDark: isDark,
                      isLast: true,
                    ),
                  ],
                ),
                const SizedBox(height: 30),

                // Logout Button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: widget.onLogout,
                    icon: const Icon(Icons.logout, size: 20),
                    label: const Text('Logout', style: TextStyle(fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red.withOpacity(0.15),
                      foregroundColor: Colors.red,
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(vertical: 15),
                    ),
                  ),
                ),
                const SizedBox(height: 30),

                // Version Info
                Center(
                  child: Text(
                    'App Version 2.4.1 (Civic Precision)',
                    style: TextStyle(
                      fontSize: 12,
                      color: secondaryTextColor,
                    ),
                  ),
                ),
                const SizedBox(height: 40),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title, Color color) {
    return Text(
      title,
      style: TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.bold,
        color: color,
      ),
    );
  }

  Widget _buildSettingsCard(Color color, List<Widget> children) {
    return Container(
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(15),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 10,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Column(children: children),
    );
  }

  Widget _buildSettingsItem({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    required bool isDark,
    bool isLast = false,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(15),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: isDark ? Colors.white.withOpacity(0.05) : ColorPallete.primaryNavy.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    icon,
                    color: isDark ? Colors.white70 : ColorPallete.primaryNavy,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 15),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: isDark ? Colors.white : ColorPallete.primaryNavy,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        subtitle,
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? Colors.white54 : ColorPallete.hintTextColor,
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(
                  Icons.arrow_forward_ios,
                  size: 14,
                  color: isDark ? Colors.white30 : Colors.grey.shade400,
                ),
              ],
            ),
            if (!isLast)
              Padding(
                padding: const EdgeInsets.only(top: 16.0, left: 54),
                child: Divider(
                  height: 1,
                  color: isDark ? Colors.white10 : Colors.grey.shade100,
                ),
              ),
          ],
        ),
      ),
    );
  }
}
