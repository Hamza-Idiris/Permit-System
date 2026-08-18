import 'package:flutter/material.dart';
import 'package:permit_app/src/providers/theme_provider.dart';
import 'package:permit_app/src/utils/colors.dart';
import 'package:permit_app/src/widgets/civic_app_bar.dart';
import 'package:provider/provider.dart';

class NotificationMessageScreen extends StatelessWidget {
  final String title;
  final String message;
  final String timeLabel;

  const NotificationMessageScreen({
    super.key,
    required this.title,
    required this.message,
    this.timeLabel = '',
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;

    return Scaffold(
      backgroundColor: ColorPallete.scaffold(isDark),
      appBar: const CivicAppBar(title: 'Message'),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 24, 20, 40),
        children: [
          Center(
            child: Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: ColorPallete.accentTeal.withOpacity(isDark ? 0.18 : 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.campaign_rounded,
                size: 34,
                color: isDark ? ColorPallete.accentTeal : ColorPallete.primaryNavy,
              ),
            ),
          ),
          const SizedBox(height: 18),
          Text(
            title,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w900,
              color: isDark ? Colors.white : ColorPallete.primaryNavy,
              height: 1.25,
            ),
          ),
          if (timeLabel.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              timeLabel,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: isDark ? Colors.white38 : ColorPallete.hintTextColor,
              ),
            ),
          ],
          const SizedBox(height: 24),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(20, 22, 20, 24),
            decoration: BoxDecoration(
              color: ColorPallete.surface(isDark),
              borderRadius: BorderRadius.circular(22),
              border: Border.all(
                color: isDark ? Colors.white10 : ColorPallete.borderColor,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(isDark ? 0.2 : 0.04),
                  blurRadius: 18,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Official notice',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.2,
                    color: isDark ? ColorPallete.accentTeal : ColorPallete.secondaryNavy,
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  message,
                  style: TextStyle(
                    fontSize: 16,
                    height: 1.6,
                    fontWeight: FontWeight.w500,
                    color: isDark ? Colors.white.withOpacity(0.88) : ColorPallete.mainTextColor,
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
