import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:permit_app/src/utils/constants.dart';
import 'package:permit_app/src/utils/colors.dart';
import 'package:permit_app/src/providers/theme_provider.dart';
import 'package:provider/provider.dart';
import 'package:permit_app/src/screens/permit_detail_screen.dart';
import 'package:permit_app/src/screens/scanned_permits_list_screen.dart';
import 'package:permit_app/src/services/scan_history_service.dart';
import 'package:permit_app/src/screens/profile_tab.dart';
import 'package:permit_app/src/screens/staff_notifications_screen.dart';
import 'package:permit_app/src/providers/auth_provider.dart';
import 'package:permit_app/src/screens/login_page.dart';

class HomeTab extends StatefulWidget {
  final VoidCallback onScanTap;
  const HomeTab({super.key, required this.onScanTap});

  @override
  State<HomeTab> createState() => HomeTabState();
}

class HomeTabState extends State<HomeTab> {
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  final ScanHistoryService _scanService = ScanHistoryService();
  
  bool _isLoading = true;
  String _fullName = "Sarkaalka";
  
  List<Map<String, dynamic>> _currentMonthScans = [];
  int _totalScans = 0;
  int _successScans = 0;
  int _failedScans = 0;

  @override
  void initState() {
    super.initState();
    loadData();
  }

  Future<void> loadData() async {
    try {
      final name = await _storage.read(key: 'fullName');
      if (name != null && name.isNotEmpty) {
        _fullName = name.split(' ').first;
      }

      final scans = await _scanService.getCurrentMonthScans();
      
      int success = 0;
      int failed = 0;
      for (var scan in scans) {
        if (scan['status'] == 'success') {
          success++;
        } else {
          failed++;
        }
      }

      if (mounted) {
        setState(() {
          _currentMonthScans = scans;
          _totalScans = scans.length;
          _successScans = success;
          _failedScans = failed;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  void _logout() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    await authProvider.logout();
    if (mounted) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const LoginPage()),
      );
    }
  }

  void _navigateToScans(String title, List<Map<String, dynamic>> permits, Color color) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ScannedPermitsListScreen(
          title: title,
          permits: permits,
          themeColor: color,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;

    if (_isLoading) {
      return Scaffold(
        backgroundColor: isDark ? ColorPallete.darkBackgroundColor : ColorPallete.backgroundColor,
        body: const Center(child: CircularProgressIndicator(color: ColorPallete.primaryNavy))
      );
    }

    return Scaffold(
      backgroundColor: isDark ? ColorPallete.darkBackgroundColor : ColorPallete.backgroundColor,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: loadData,
          color: ColorPallete.primaryNavy,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildHeader(isDark),
                const SizedBox(height: 32),
                _buildWelcomeSection(isDark),
                const SizedBox(height: 32),
                _buildQuickActionCard(isDark),
                const SizedBox(height: 32),
                Text(
                  'CURRENT MONTH SCANS',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: isDark ? Colors.white38 : ColorPallete.hintTextColor, letterSpacing: 1)
                ),
                const SizedBox(height: 16),
                _buildSummaryCards(isDark),
                const SizedBox(height: 32),
                _buildRecentActivityHeader(isDark),
                const SizedBox(height: 16),
                if (_currentMonthScans.isEmpty)
                  _buildEmptyState(isDark)
                else
                  ..._currentMonthScans.take(5).map((p) => _buildScanCard(p, isDark)),
                const SizedBox(height: 80), // Padding for FAB
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(bool isDark) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Sovereign Ledger'.toUpperCase(), 
              style: TextStyle(
                fontSize: 10, 
                fontWeight: FontWeight.w900, 
                letterSpacing: 2, 
                color: isDark ? Colors.white38 : ColorPallete.hintTextColor
              )
            ),
            Text('Inspectorate Portal', 
              style: TextStyle(
                fontSize: 16, 
                fontWeight: FontWeight.w900, 
                color: isDark ? Colors.white : ColorPallete.primaryNavy
              )
            ),
          ],
        ),
        Row(
          children: [
            GestureDetector(
              onTap: () {
                Navigator.push(context, MaterialPageRoute(builder: (context) => const StaffNotificationsScreen()));
              },
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: isDark ? Colors.white.withOpacity(0.05) : ColorPallete.primaryNavy.withOpacity(0.05),
                  shape: BoxShape.circle
                ),
                child: Icon(Icons.notifications_none_rounded, color: isDark ? Colors.white70 : ColorPallete.primaryNavy),
              ),
            ),
            const SizedBox(width: 12),
            GestureDetector(
              onTap: () {
                Navigator.push(context, MaterialPageRoute(builder: (context) => ProfileTab(onLogout: _logout)));
              },
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: isDark ? Colors.white.withOpacity(0.05) : ColorPallete.primaryNavy.withOpacity(0.05),
                  shape: BoxShape.circle
                ),
                child: Icon(Icons.person_rounded, color: isDark ? Colors.white70 : ColorPallete.primaryNavy),
              ),
            ),
          ],
        )
      ],
    );
  }

  Widget _buildWelcomeSection(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Maalin Wacan, $_fullName',
          style: TextStyle(
            fontSize: 28, 
            fontWeight: FontWeight.w900, 
            color: isDark ? Colors.white : ColorPallete.primaryNavy,
            letterSpacing: -1
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Mogadishu Urban Planning & Permit Control',
          style: TextStyle(
            fontSize: 14, 
            color: isDark ? Colors.white38 : ColorPallete.hintTextColor,
            fontWeight: FontWeight.w500
          ),
        ),
      ],
    );
  }

  Widget _buildQuickActionCard(bool isDark) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isDark 
            ? [const Color(0xFF1E293B), const Color(0xFF0F172A)]
            : [ColorPallete.primaryNavy, ColorPallete.secondaryNavy],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: (isDark ? Colors.black : ColorPallete.primaryNavy).withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 10),
          )
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            right: -20,
            top: -20,
            child: Icon(Icons.qr_code_2_rounded, size: 150, color: Colors.white.withOpacity(0.05)),
          ),
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('FIELD VERIFICATION', style: TextStyle(color: Colors.white60, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 1.5)),
                const SizedBox(height: 12),
                const Text('Instant Permit Validation', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900)),
                const SizedBox(height: 8),
                const Text('Scan official municipality QR codes to verify construction legitimacy in real-time.', style: TextStyle(color: Colors.white70, fontSize: 13, height: 1.4)),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  onPressed: widget.onScanTap,
                  icon: const Icon(Icons.qr_code_scanner_rounded, size: 18),
                  label: const Text('LAUNCH SCANNER', style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 0.5)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: ColorPallete.primaryNavy,
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0
                  ),
                )
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryCards(bool isDark) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      physics: const BouncingScrollPhysics(),
      child: Row(
        children: [
          _buildStatCard(
            'TOTAL SCANS',
            _totalScans.toString(),
            Icons.assessment_rounded,
            const Color(0xFF3B82F6),
            isDark,
            () => _navigateToScans('Total Scans', _currentMonthScans, const Color(0xFF3B82F6)),
          ),
          const SizedBox(width: 16),
          _buildStatCard(
            'SUCCESS',
            _successScans.toString(),
            Icons.verified_user_rounded,
            const Color(0xFF10B981),
            isDark,
            () => _navigateToScans('Successful Scans', _currentMonthScans.where((s) => s['status'] == 'success').toList(), const Color(0xFF10B981)),
          ),
          const SizedBox(width: 16),
          _buildStatCard(
            'FAILED',
            _failedScans.toString(),
            Icons.gpp_bad_rounded,
            const Color(0xFFEF4444),
            isDark,
            () => _navigateToScans('Failed Scans', _currentMonthScans.where((s) => s['status'] == 'failed').toList(), const Color(0xFFEF4444)),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(String label, String val, IconData icon, Color color, bool isDark, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 140,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: isDark ? Colors.white.withOpacity(0.05) : Colors.grey.shade100),
          boxShadow: [
            BoxShadow(
              color: color.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, 5),
            )
          ]
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
              child: Icon(icon, size: 20, color: color),
            ),
            const SizedBox(height: 16),
            Text(val, style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: isDark ? Colors.white : ColorPallete.primaryNavy)),
            const SizedBox(height: 4),
            Text(label, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: isDark ? Colors.white38 : ColorPallete.hintTextColor, letterSpacing: 1)),
          ],
        ),
      ),
    );
  }

  Widget _buildRecentActivityHeader(bool isDark) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text('RECENT LOGS', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: isDark ? Colors.white38 : ColorPallete.hintTextColor, letterSpacing: 1)),
        GestureDetector(
          onTap: () => _navigateToScans('All Scans', _currentMonthScans, ColorPallete.primaryNavy),
          child: Text('VIEW ALL', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: isDark ? Colors.white54 : ColorPallete.primaryNavy, letterSpacing: 1)),
        ),
      ],
    );
  }

  Widget _buildEmptyState(bool isDark) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 40),
        child: Column(
          children: [
            Icon(Icons.history_toggle_off_rounded, size: 48, color: isDark ? Colors.white10 : Colors.grey.shade300),
            const SizedBox(height: 16),
            Text('No verification logs found', style: TextStyle(color: isDark ? Colors.white24 : Colors.grey)),
          ],
        ),
      ),
    );
  }

  Widget _buildScanCard(Map<String, dynamic> scan, bool isDark) {
    bool isSuccess = scan['status'] == 'success';
    String status = isSuccess ? 'Verified' : 'Failed';
    Color statusColor = isSuccess ? const Color(0xFF10B981) : const Color(0xFFEF4444);
    
    String permitId = scan['permitId'] ?? '#UP-000';
    Map<String, dynamic> permitData = scan['permitData'] ?? {};
    
    String buildingCategory = permitData['buildingCategory'] ?? permitData['buildingType'] ?? 'Construction';
    String district = permitData['district'] ?? 'District';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isDark ? Colors.white.withOpacity(0.05) : Colors.grey.shade100),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            if (isSuccess && permitData.isNotEmpty) {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => PermitDetailScreen(permit: permitData)),
              );
            }
          },
          borderRadius: BorderRadius.circular(20),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: isDark ? Colors.black26 : Colors.grey.shade50,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(
                    isSuccess ? Icons.apartment_rounded : Icons.warning_rounded, 
                    color: isDark ? Colors.white24 : ColorPallete.primaryNavy
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(buildingCategory, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: isDark ? Colors.white : ColorPallete.primaryNavy)),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Text(permitId, style: TextStyle(fontSize: 10, color: isDark ? Colors.white24 : ColorPallete.hintTextColor, fontWeight: FontWeight.bold)),
                          const SizedBox(width: 8),
                          Container(width: 4, height: 4, decoration: const BoxDecoration(color: Colors.grey, shape: BoxShape.circle)),
                          const SizedBox(width: 8),
                          Text(district, style: TextStyle(fontSize: 10, color: isDark ? Colors.white24 : ColorPallete.hintTextColor, fontWeight: FontWeight.w500)),
                        ],
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    status.toUpperCase(),
                    style: TextStyle(color: statusColor, fontSize: 9, fontWeight: FontWeight.w900, letterSpacing: 0.5),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

