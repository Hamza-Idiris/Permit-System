import 'package:flutter/material.dart';
import 'package:permit_app/src/utils/colors.dart';
import 'package:permit_app/src/providers/theme_provider.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

/// Full-screen scan result. Same layout for valid + expired;
/// expired uses orange header / labels instead of green.
class VerifiedPermitPage extends StatelessWidget {
  final Map<String, dynamic> permitData;

  const VerifiedPermitPage({super.key, required this.permitData});

  bool get _isExpired {
    if (permitData['isExpired'] == true) return true;
    final raw = permitData['expiryDate'];
    if (raw == null) return false;
    try {
      return DateTime.parse(raw.toString()).isBefore(DateTime.now());
    } catch (_) {
      return false;
    }
  }

  String _str(dynamic v, [String fallback = 'N/A']) {
    if (v == null) return fallback;
    final s = v.toString().trim();
    if (s.isEmpty || s == 'null') return fallback;
    return s;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;
    final expired = _isExpired;

    final String permitId = _str(permitData['permitId']);
    final String applicantName = _str(permitData['applicantName']);
    final String approvedBy = _str(permitData['approvedBy']);
    final String district = _str(permitData['district']);
    final String plotId = _str(permitData['plotId']);
    final String buildingType = _str(permitData['buildingType']);
    final String landArea = _str(permitData['landArea'], '0 m²');
    final bool isDabaq = buildingType.toLowerCase().contains('dabaq');
    final String floorsText = isDabaq ? _str(permitData['floors'], '1') : '';

    String formattedTime = 'N/A';
    String formattedExpiry = 'N/A';
    try {
      if (permitData['approvedTime'] != null || permitData['approvalDate'] != null) {
        final DateTime dt = DateTime.parse(
          (permitData['approvedTime'] ?? permitData['approvalDate']).toString(),
        );
        formattedTime = DateFormat('yyyy-MM-dd HH:mm').format(dt);
      }
      if (permitData['expiryDate'] != null) {
        final DateTime ext = DateTime.parse(permitData['expiryDate'].toString());
        formattedExpiry = DateFormat('yyyy-MM-dd').format(ext);
      }
    } catch (_) {
      formattedTime = _str(permitData['approvedTime'] ?? permitData['approvalDate']);
      formattedExpiry = _str(permitData['expiryDate']);
    }

    // Valid = green (same as before). Expired = orange, same layout.
    const Color validTop = Color(0xFF10B981);
    const Color validBottom = Color(0xFF059669);
    const Color expiredTop = Color(0xFFF59E0B);
    const Color expiredBottom = Color(0xFFD97706);
    const Color expiredAccent = Color(0xFFEA580C);

    final Color headerPinned = expired ? expiredBottom : validBottom;
    final List<Color> headerGradient = expired
        ? const [expiredTop, expiredBottom]
        : const [validTop, validBottom];
    final String headline = expired ? 'EXPIRED PERMIT' : 'VERIFIED PERMIT';
    final String subline = expired ? 'PERMIT NO LONGER VALID' : 'SOVEREIGN DIGITAL AUTHORITY';
    final IconData headerIcon =
        expired ? Icons.warning_amber_rounded : Icons.verified_user_rounded;

    return Scaffold(
      backgroundColor:
          isDark ? ColorPallete.darkBackgroundColor : ColorPallete.backgroundColor,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 220,
            pinned: true,
            backgroundColor: headerPinned,
            iconTheme: const IconThemeData(color: Colors.white),
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: headerGradient,
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: SafeArea(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const SizedBox(height: 20),
                      Icon(headerIcon, color: Colors.white, size: 64),
                      const SizedBox(height: 12),
                      Text(
                        headline,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 24,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1,
                        ),
                      ),
                      Text(
                        subline,
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 2,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),

          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 28, 24, 40),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                      decoration: BoxDecoration(
                        color: isDark
                            ? Colors.white.withOpacity(0.08)
                            : ColorPallete.primaryNavy.withOpacity(0.06),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: isDark
                              ? Colors.white.withOpacity(0.12)
                              : ColorPallete.primaryNavy.withOpacity(0.12),
                        ),
                      ),
                      child: Text(
                        'Permit: $permitId',
                        style: TextStyle(
                          color: isDark ? Colors.white70 : ColorPallete.primaryNavy,
                          fontWeight: FontWeight.w900,
                          fontSize: 14,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 32),

                  _buildRow(Icons.person_outline_rounded, 'Applicant Name', applicantName, isDark),
                  _buildRow(Icons.admin_panel_settings_rounded, 'Approved By', approvedBy, isDark),
                  _buildRow(Icons.location_on_rounded, 'District Area', district, isDark),
                  _buildRow(Icons.map_rounded, 'Plot Identifier', plotId, isDark),
                  _buildRow(Icons.business_rounded, 'Building Category', buildingType, isDark),
                  _buildRow(Icons.square_foot_rounded, 'Land Area', landArea, isDark),

                  if (isDabaq && floorsText.isNotEmpty)
                    _buildRow(Icons.layers_rounded, 'Building Floors', floorsText, isDark),

                  _buildRow(Icons.calendar_month_rounded, 'Approval DateTime', formattedTime, isDark),
                  _buildRow(
                    Icons.event_busy_rounded,
                    'Expiry Date',
                    formattedExpiry,
                    isDark,
                    highlight: expired ? expiredAccent : Colors.redAccent,
                  ),

                  const SizedBox(height: 32),

                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: expired
                            ? expiredBottom
                            : (isDark ? Colors.white : ColorPallete.primaryNavy),
                        foregroundColor: expired
                            ? Colors.white
                            : (isDark ? Colors.black : Colors.white),
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      onPressed: () => Navigator.pop(context),
                      child: const Text(
                        'DONE',
                        style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRow(
    IconData icon,
    String label,
    String value,
    bool isDark, {
    Color? highlight,
  }) {
    final Color iconColor =
        highlight ?? (isDark ? Colors.white70 : ColorPallete.primaryNavy);
    final Color textColor =
        highlight ?? (isDark ? Colors.white : ColorPallete.primaryNavy);

    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(11),
            decoration: BoxDecoration(
              color: iconColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(13),
            ),
            child: Icon(icon, color: iconColor, size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label.toUpperCase(),
                  style: TextStyle(
                    color: isDark ? Colors.white38 : ColorPallete.hintTextColor,
                    fontSize: 9,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    color: textColor,
                    fontSize: 15,
                    letterSpacing: -0.3,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
