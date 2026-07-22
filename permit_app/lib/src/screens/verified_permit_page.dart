import 'package:flutter/material.dart';
import 'package:permit_app/src/utils/colors.dart';
import 'package:permit_app/src/providers/theme_provider.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

/// A full-screen page that displays the verified permit details.
/// Replaces the old bottom-sheet popup so inspectors see a proper
/// page with a back arrow that returns them to the scan list.
class VerifiedPermitPage extends StatelessWidget {
  final Map<String, dynamic> permitData;

  const VerifiedPermitPage({super.key, required this.permitData});

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;

    final String permitId      = permitData['permitId']      ?? 'N/A';
    final String applicantName = permitData['applicantName'] ?? 'N/A';
    final String approvedBy    = permitData['approvedBy']    ?? 'N/A';
    final String district      = permitData['district']      ?? 'N/A';
    final String plotId        = permitData['plotId']        ?? 'N/A';
    final String buildingType  = permitData['buildingType']  ?? 'N/A';
    final String landArea      = permitData['landArea']      ?? '0 m²';
    final bool isDabaq         = buildingType.toLowerCase().contains('dabaq');
    final String floorsText    = isDabaq ? (permitData['floors']?.toString() ?? '1') : '';

    String formattedTime   = 'N/A';
    String formattedExpiry = 'N/A';
    try {
      if (permitData['approvedTime'] != null) {
        final DateTime dt = DateTime.parse(permitData['approvedTime'].toString());
        formattedTime = DateFormat('yyyy-MM-dd HH:mm').format(dt);
      }
      if (permitData['expiryDate'] != null) {
        final DateTime ext = DateTime.parse(permitData['expiryDate'].toString());
        formattedExpiry = DateFormat('yyyy-MM-dd').format(ext);
      }
    } catch (_) {
      formattedTime   = permitData['approvedTime']?.toString()  ?? 'N/A';
      formattedExpiry = permitData['expiryDate']?.toString()    ?? 'N/A';
    }

    return Scaffold(
      backgroundColor:
          isDark ? ColorPallete.darkBackgroundColor : ColorPallete.backgroundColor,
      body: CustomScrollView(
        slivers: [
          // ── Collapsible Green Header (SliverAppBar) ────────────────────────
          SliverAppBar(
            expandedHeight: 220,
            pinned: true,
            backgroundColor: const Color(0xFF059669),
            iconTheme: const IconThemeData(color: Colors.white),
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFF10B981), Color(0xFF059669)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: const SafeArea(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      SizedBox(height: 20),
                      Icon(Icons.verified_user_rounded,
                          color: Colors.white, size: 64),
                      SizedBox(height: 12),
                      Text(
                        'VERIFIED PERMIT',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 24,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1,
                        ),
                      ),
                      Text(
                        'SOVEREIGN DIGITAL AUTHORITY',
                        style: TextStyle(
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

          // ── Body ───────────────────────────────────────────────────────────
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 28, 24, 40),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Permit ID badge
                  Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 20, vertical: 10),
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
                          color: isDark
                              ? Colors.white70
                              : ColorPallete.primaryNavy,
                          fontWeight: FontWeight.w900,
                          fontSize: 14,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 32),

                  // ── Detail Rows ────────────────────────────────────────────
                  _buildRow(Icons.person_outline_rounded,
                      'Applicant Name', applicantName, isDark),
                  _buildRow(Icons.admin_panel_settings_rounded,
                      'Approved By', approvedBy, isDark),
                  _buildRow(Icons.location_on_rounded,
                      'District Area', district, isDark),
                  _buildRow(Icons.map_rounded,
                      'Plot Identifier', plotId, isDark),
                  _buildRow(Icons.business_rounded,
                      'Building Category', buildingType, isDark),
                  _buildRow(Icons.square_foot_rounded,
                      'Land Area', landArea, isDark),

                  if (isDabaq && floorsText.isNotEmpty)
                    _buildRow(Icons.layers_rounded,
                        'Building Floors', floorsText, isDark),

                  _buildRow(Icons.calendar_month_rounded,
                      'Approval DateTime', formattedTime, isDark),
                  _buildRow(Icons.event_busy_rounded,
                      'Expiry Date', formattedExpiry, isDark,
                      highlight: Colors.redAccent),

                  const SizedBox(height: 32),

                  // ── Dismiss button ─────────────────────────────────────────
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: isDark
                            ? Colors.white
                            : ColorPallete.primaryNavy,
                        foregroundColor:
                            isDark ? Colors.black : Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16)),
                      ),
                      onPressed: () => Navigator.pop(context),
                      child: const Text(
                        'DONE',
                        style: TextStyle(
                            fontWeight: FontWeight.w900, fontSize: 16),
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
                    color: isDark
                        ? Colors.white38
                        : ColorPallete.hintTextColor,
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
