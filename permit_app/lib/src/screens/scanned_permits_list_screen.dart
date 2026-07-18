import 'package:flutter/material.dart';
import 'package:permit_app/src/utils/colors.dart';
import 'package:permit_app/src/providers/theme_provider.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:permit_app/src/screens/permit_detail_screen.dart';

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
      backgroundColor: isDark ? ColorPallete.darkBackgroundColor : ColorPallete.backgroundColor,
      appBar: AppBar(
        backgroundColor: isDark ? const Color(0xFF1E1E1E) : Colors.white,
        elevation: 0,
        iconTheme: IconThemeData(color: isDark ? Colors.white : ColorPallete.primaryNavy),
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
              itemBuilder: (context, index) {
                final scan = permits[index];
                return _buildScanCard(context, scan, isDark);
              },
            ),
    );
  }

  Widget _buildEmptyState(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.history_toggle_off_rounded, size: 64, color: isDark ? Colors.white10 : Colors.grey.shade300),
          const SizedBox(height: 16),
          Text(
            'No scans found for this category.',
            style: TextStyle(color: isDark ? Colors.white38 : Colors.grey),
          ),
        ],
      ),
    );
  }

  Widget _buildScanCard(BuildContext context, Map<String, dynamic> scan, bool isDark) {
    final isSuccess = scan['status'] == 'success';
    final permitId = scan['permitId'] ?? 'Unknown';
    final timestamp = scan['timestamp'];
    
    String formattedTime = '';
    if (timestamp != null) {
      final dt = DateTime.parse(timestamp);
      formattedTime = DateFormat('yyyy-MM-dd HH:mm').format(dt);
    }
    
    final permitData = scan['permitData'] ?? {};
    final buildingCategory = permitData['buildingCategory'] ?? permitData['buildingType'] ?? 'Construction';
    final district = permitData['district'] ?? 'District';

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
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
                    isSuccess ? Icons.verified_user_rounded : Icons.gpp_bad_rounded,
                    color: isSuccess ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(permitId, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: isDark ? Colors.white : ColorPallete.primaryNavy)),
                      const SizedBox(height: 4),
                      Text('$buildingCategory • $district', style: TextStyle(fontSize: 11, color: isDark ? Colors.white38 : ColorPallete.hintTextColor, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      formattedTime.split(' ').first,
                      style: TextStyle(color: isDark ? Colors.white54 : ColorPallete.hintTextColor, fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      formattedTime.split(' ').length > 1 ? formattedTime.split(' ')[1] : '',
                      style: TextStyle(color: isDark ? Colors.white38 : ColorPallete.hintTextColor, fontSize: 9),
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
