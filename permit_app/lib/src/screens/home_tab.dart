import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:permit_app/src/utils/constants.dart';
import 'package:permit_app/src/utils/colors.dart';
import 'package:permit_app/src/providers/theme_provider.dart';
import 'package:provider/provider.dart';
import 'package:permit_app/src/screens/permit_detail_screen.dart';

class HomeTab extends StatefulWidget {
  final VoidCallback onScanTap;
  const HomeTab({super.key, required this.onScanTap});

  @override
  State<HomeTab> createState() => _HomeTabState();
}

class _HomeTabState extends State<HomeTab> {
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  
  bool _isLoading = true;
  String _fullName = "Sarkaalka";
  String _errorMessage = "";

  int _totalPermits = 0;
  int _approvedPermits = 0;
  List<dynamic> _recentPermits = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final name = await _storage.read(key: 'fullName');
      if (name != null && name.isNotEmpty) {
        _fullName = name.split(' ').first;
      }

      final token = await _storage.read(key: 'token');
      if (token == null) throw Exception("No token found");

      final response = await http.get(
        Uri.parse('${Constants.apiBaseUrl}/permits/all'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          if (mounted) {
            setState(() {
              _totalPermits = data['stats']['total'] ?? 0;
              _approvedPermits = data['stats']['approved'] ?? 0;
              _recentPermits = data['data'] ?? [];
              _isLoading = false;
            });
          }
        } else {
          throw Exception("Failed to load");
        }
      } else {
        throw Exception("Server Error");
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = "Internet connection lost.";
          _isLoading = false;
        });
      }
    }
  }

  double _getSuccessRate() {
    if (_totalPermits == 0) return 0;
    return (_approvedPermits / _totalPermits) * 100;
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: ColorPallete.primaryNavy));
    }

    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;
    final primaryColor = isDark ? Colors.white : ColorPallete.primaryNavy;

    return Scaffold(
      backgroundColor: isDark ? ColorPallete.darkBackgroundColor : ColorPallete.backgroundColor,
      body: SafeArea(
        child: SingleChildScrollView(
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
              _buildStatsStats(isDark),
              const SizedBox(height: 32),
              _buildRecentActivityHeader(isDark),
              const SizedBox(height: 16),
              if (_recentPermits.isEmpty)
                _buildEmptyState(isDark)
              else
                ..._recentPermits.take(5).map((p) => _buildPermitCard(p, isDark)),
              const SizedBox(height: 24),
            ],
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
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: isDark ? Colors.white.withOpacity(0.05) : ColorPallete.primaryNavy.withOpacity(0.05),
            shape: BoxShape.circle
          ),
          child: Icon(Icons.notifications_none_rounded, color: isDark ? Colors.white70 : ColorPallete.primaryNavy),
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

  Widget _buildStatsStats(bool isDark) {
    return Row(
      children: [
        Expanded(
          child: _buildStatItem(
            'TOTAL AUDITS',
            _totalPermits.toString(),
            Icons.assessment_rounded,
            const Color(0xFF3B82F6),
            isDark
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: _buildStatItem(
            'APPROVAL RATE',
            '${_getSuccessRate().toStringAsFixed(0)}%',
            Icons.verified_user_rounded,
            const Color(0xFF10B981),
            isDark
          ),
        ),
      ],
    );
  }

  Widget _buildStatItem(String label, String val, IconData icon, Color color, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: isDark ? Colors.white.withOpacity(0.05) : Colors.grey.shade100),
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
    );
  }

  Widget _buildRecentActivityHeader(bool isDark) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text('RECENT LOGS', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: isDark ? Colors.white38 : ColorPallete.hintTextColor, letterSpacing: 1)),
        Text('VIEW ALL', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: isDark ? Colors.white54 : ColorPallete.primaryNavy, letterSpacing: 1)),
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

  Widget _buildPermitCard(dynamic permit, bool isDark) {
    String status = permit['status'] ?? 'Pending';
    String buildingCategory = permit['formData'] != null ? permit['formData']['buildingCategory'] : 'Construction';
    String district = permit['district'] ?? 'District';
    String appId = permit['applicationId'] ?? '#UP-000';

    Color statusColor;
    switch (status) {
      case 'Approved': statusColor = const Color(0xFF10B981); break;
      case 'In Review': case 'Under Review': statusColor = const Color(0xFF3B82F6); break;
      case 'Returned': case 'Rejected': statusColor = const Color(0xFFEF4444); break;
      default: statusColor = const Color(0xFFF59E0B); break;
    }

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
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => PermitDetailScreen(permit: permit)),
            );
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
                  child: Icon(Icons.apartment_rounded, color: isDark ? Colors.white24 : ColorPallete.primaryNavy),
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
                          Text(appId, style: TextStyle(fontSize: 10, color: isDark ? Colors.white24 : ColorPallete.hintTextColor, fontWeight: FontWeight.bold)),
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
