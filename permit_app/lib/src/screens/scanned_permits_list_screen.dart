import 'package:flutter/material.dart';
import 'package:permit_app/src/utils/colors.dart';
import 'package:permit_app/src/providers/theme_provider.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:permit_app/src/screens/verified_permit_page.dart';

class ScannedPermitsListScreen extends StatelessWidget {
  final String title;
  final List<Map<String, dynamic>> permits;
  final Color themeColor;

  const ScannedPermitsListScreen({
    super.key,
    required this.title,
    required this.permits,
    required this.themeColor,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;

    return Scaffold(
      backgroundColor:
          isDark ? ColorPallete.darkBackgroundColor : ColorPallete.backgroundColor,
      appBar: AppBar(
        backgroundColor: isDark ? const Color(0xFF1E1E1E) : Colors.white,
        elevation: 0,
        iconTheme:
            IconThemeData(color: isDark ? Colors.white : ColorPallete.primaryNavy),
        title: Text(
          title.toUpperCase(),
          style: TextStyle(
            color: isDark ? Colors.white : ColorPallete.primaryNavy,
            fontSize: 16,
            fontWeight: FontWeight.w900,
            letterSpacing: 1,
          ),
        ),
        centerTitle: true,
      ),
      body: permits.isEmpty
          ? _buildEmptyState(isDark)
          : ListView.builder(
              padding: const EdgeInsets.all(24),
              itemCount: permits.length,
              itemBuilder: (context, index) =>
                  _buildScanCard(context, permits[index], isDark),
            ),
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  Widget _buildEmptyState(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.history_toggle_off_rounded,
              size: 64,
              color: isDark ? Colors.white10 : Colors.grey.shade300),
          const SizedBox(height: 16),
          Text(
            'No scans found.',
            style: TextStyle(color: isDark ? Colors.white38 : Colors.grey),
          ),
        ],
      ),
    );
  }

  // ── Individual scan card ────────────────────────────────────────────────────
  Widget _buildScanCard(
      BuildContext context, Map<String, dynamic> scan, bool isDark) {
    final isSuccess    = scan['status'] == 'success';
    final permitId     = scan['permitId'] ?? 'Unknown';
    final timestamp    = scan['timestamp']?.toString();
    final permitData   = (scan['permitData'] as Map?)?.cast<String, dynamic>() ?? {};
    final buildingType = permitData['buildingType'] ??
        permitData['buildingCategory'] ??
        'Construction';
    final district      = permitData['district'] ?? 'District';
    final applicantName = permitData['applicantName'] ?? '';

    String formattedDate = '';
    String formattedTime = '';
    if (timestamp != null) {
      try {
        final dt = DateTime.parse(timestamp);
        formattedDate = DateFormat('yyyy-MM-dd').format(dt);
        formattedTime = DateFormat('HH:mm').format(dt);
      } catch (_) {
        formattedDate = timestamp;
      }
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color:
              isDark ? Colors.white.withOpacity(0.05) : Colors.grey.shade100),
        boxShadow: isDark
            ? []
            : [
                BoxShadow(
                  color: Colors.black.withOpacity(0.04),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                )
              ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: isSuccess && permitData.isNotEmpty
              ? () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) =>
                          VerifiedPermitPage(permitData: permitData),
                    ),
                  )
              : null,
          borderRadius: BorderRadius.circular(20),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              children: [
                // ── Status icon ───────────────────────────────────────────
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: isSuccess
                        ? const Color(0xFF10B981).withOpacity(0.12)
                        : const Color(0xFFEF4444).withOpacity(0.12),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(
                    isSuccess
                        ? Icons.verified_user_rounded
                        : Icons.gpp_bad_rounded,
                    color: isSuccess
                        ? const Color(0xFF10B981)
                        : const Color(0xFFEF4444),
                    size: 22,
                  ),
                ),
                const SizedBox(width: 14),

                // ── Permit info ───────────────────────────────────────────
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        permitId,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                          color: isDark
                              ? Colors.white
                              : ColorPallete.primaryNavy,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        '$buildingType · $district',
                        style: TextStyle(
                          fontSize: 11,
                          color: isDark
                              ? Colors.white38
                              : ColorPallete.hintTextColor,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (applicantName.isNotEmpty &&
                          applicantName != 'N/A') ...[
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            Icon(Icons.person_outline_rounded,
                                size: 11,
                                color: isDark
                                    ? Colors.white24
                                    : ColorPallete.hintTextColor),
                            const SizedBox(width: 3),
                            Flexible(
                              child: Text(
                                applicantName,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isDark
                                      ? Colors.white24
                                      : ColorPallete.hintTextColor,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),

                // ── Timestamp + badge ─────────────────────────────────────
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      formattedDate,
                      style: TextStyle(
                        color: isDark
                            ? Colors.white54
                            : ColorPallete.hintTextColor,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      formattedTime,
                      style: TextStyle(
                        color: isDark
                            ? Colors.white38
                            : ColorPallete.hintTextColor,
                        fontSize: 9,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: isSuccess
                            ? const Color(0xFF10B981).withOpacity(0.12)
                            : const Color(0xFFEF4444).withOpacity(0.12),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        isSuccess ? 'VALID' : 'FAILED',
                        style: TextStyle(
                          fontSize: 8,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.5,
                          color: isSuccess
                              ? const Color(0xFF10B981)
                              : const Color(0xFFEF4444),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
