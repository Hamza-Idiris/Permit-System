import 'package:flutter/material.dart';

class ColorPallete {
  // 1. Background Colors
  static const Color backgroundColor = Color(0xFFF8FAFC); // Light Gray/Blue tint oo nadiif ah
  static const Color darkBackgroundColor = Color(0xFF121212); // Deep Charcoal for Dark Mode

  // 2. Government Primary Colors (Authority & Trust)
  static const Color primaryNavy = Color(0xFF001F3F); // Navy Blue-ga rasmiga ah
  static const Color secondaryNavy = Color(0xFF1E3A8A); // #1e3a8a for gradient and buttons

  // 3. Status & Action Colors
  static const Color successGreen = Color(0xFF10B981); // Emerald Green (Oggolaanshaha)
  static const Color errorRed = Color(0xFFEF4444); // Red (Lama Oggola)
  static const Color warningOrange = Color(0xFFF59E0B); // Pending applications

  // 4. Borders & Input Fields
  static const Color borderColor = Color(0xFFE2E8F0); // Border khafiif ah oo nadiif ah
  static const Color focusedBorderColor = Color(0xFF001F3F); // Marka qofku qoraalka ku jiro
  
  // 5. Text & Hints
  static const Color mainTextColor = Color(0xFF1E293B); // Dark Slate for readability
  static const Color hintTextColor = Color(0xFF94A3B8); // Grayish hint text
  static const Color whiteColor = Colors.white;

  // 6. Professional Gradients (Wixii Dashboard ama Buttons ah)
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [
      primaryNavy,
      secondaryNavy,
    ],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient successGradient = LinearGradient(
    colors: [
      Color(0xFF10B981),
      Color(0xFF059669),
    ],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );
}
