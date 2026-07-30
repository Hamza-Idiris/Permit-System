import 'package:flutter/material.dart';

/// Modern civic design tokens — trustworthy, clean, not flashy.
class ColorPallete {
  // Surfaces
  static const Color backgroundColor = Color(0xFFF3F6FA);
  static const Color darkBackgroundColor = Color(0xFF0F1419);
  static const Color cardLight = Color(0xFFFFFFFF);
  static const Color cardDark = Color(0xFF1A222D);

  // Brand (civic teal-navy)
  static const Color primaryNavy = Color(0xFF0B2C4A);
  static const Color secondaryNavy = Color(0xFF1A4A6E);
  static const Color accentTeal = Color(0xFF0D9488);

  // Status
  static const Color successGreen = Color(0xFF059669);
  static const Color errorRed = Color(0xFFDC2626);
  static const Color warningOrange = Color(0xFFD97706);

  // Borders & text
  static const Color borderColor = Color(0xFFE2E8F0);
  static const Color focusedBorderColor = Color(0xFF0B2C4A);
  static const Color mainTextColor = Color(0xFF0F172A);
  static const Color hintTextColor = Color(0xFF64748B);
  static const Color whiteColor = Colors.white;

  static const LinearGradient primaryGradient = LinearGradient(
    colors: [primaryNavy, secondaryNavy],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient accentGradient = LinearGradient(
    colors: [Color(0xFF0B2C4A), Color(0xFF0D9488)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient successGradient = LinearGradient(
    colors: [Color(0xFF10B981), Color(0xFF059669)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  static Color surface(bool isDark) => isDark ? cardDark : cardLight;
  static Color scaffold(bool isDark) => isDark ? darkBackgroundColor : backgroundColor;
  static Color text(bool isDark) => isDark ? Colors.white : primaryNavy;
  static Color muted(bool isDark) => isDark ? Colors.white60 : hintTextColor;
}
