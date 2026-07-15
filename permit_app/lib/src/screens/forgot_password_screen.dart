import 'package:flutter/material.dart';
import 'package:permit_app/src/utils/colors.dart';
import 'package:permit_app/src/screens/login_page.dart';
import 'package:http/http.dart' as http;
import 'package:permit_app/src/utils/constants.dart';
import 'dart:convert';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _codeController = TextEditingController();
  final TextEditingController _newPasswordController = TextEditingController();
  final TextEditingController _confirmPasswordController =
      TextEditingController();

  bool _obscureNew = true;
  bool _obscureConfirm = true;
  bool _isRequestingCode = false;
  bool _isSubmitting = false;

  static const Color _gold = Color(0xFFC9A84C);
  static const Color _headerTop = Color(0xFF0A2240);
  static const Color _headerBottom = Color(0xFF0D3B6A);
  static const Color _cardBg = Color(0xFFFDFAF4);
  static const Color _fieldBorder = Color(0xFFCBAE6E);
  static const Color _fieldBg = Color(0xFFFFFBF0);
  static const Color _labelColor = Color(0xFF5C4A1E);
  static const Color _hintColor = Color(0xFFB0A080);

  @override
  void dispose() {
    _emailController.dispose();
    _codeController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _requestCode() async {
    final email = _emailController.text.trim();
    if (email.isEmpty) {
      _showSnack('Please enter your email first', isError: true);
      return;
    }

    setState(() => _isRequestingCode = true);
    try {
      final response = await http.post(
        Uri.parse('${Constants.apiBaseUrl}/auth/forgot-password'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'platform': 'app'}),
      );
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        _showSnack(data['message'] ?? 'Verification code sent!');
      } else {
        _showSnack(data['message'] ?? 'Failed to send code', isError: true);
      }
    } catch (_) {
      _showSnack('Network error. Please try again.', isError: true);
    } finally {
      setState(() => _isRequestingCode = false);
    }
  }

  Future<void> _handleUpdatePassword() async {
    final email = _emailController.text.trim();
    final code = _codeController.text.trim();
    final newPassword = _newPasswordController.text.trim();
    final confirmPassword = _confirmPasswordController.text.trim();

    if (email.isEmpty || code.isEmpty || newPassword.isEmpty || confirmPassword.isEmpty) {
      _showSnack('Please fill in all fields', isError: true);
      return;
    }
    if (newPassword != confirmPassword) {
      _showSnack('Passwords do not match', isError: true);
      return;
    }
    if (newPassword.length < 8) {
      _showSnack('Password must be at least 8 characters', isError: true);
      return;
    }
    
    // Check for complexity (match backend regex: one uppercase, one lowercase, one number, one special)
    final complexityRegex = RegExp(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$');
    if (!complexityRegex.hasMatch(newPassword)) {
      _showSnack('Password must include Uppercase, Lowercase, Number & Special Character (@\$!%*?&)', isError: true);
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      final response = await http.post(
        Uri.parse('${Constants.apiBaseUrl}/auth/reset-password'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'code': code,
          'password': newPassword,
        }),
      );
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        _showSnack(data['message'] ?? 'Password updated successfully!');
        if (mounted) {
          await Future.delayed(const Duration(seconds: 1));
          Navigator.pushAndRemoveUntil(
            context,
            MaterialPageRoute(builder: (_) => const LoginPage()),
            (route) => false,
          );
        }
      } else {
        _showSnack(data['message'] ?? 'Failed to reset password', isError: true);
      }
    } catch (_) {
      _showSnack('Network error. Please try again.', isError: true);
    } finally {
      setState(() => _isSubmitting = false);
    }
  }

  void _showSnack(String msg, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor:
            isError ? ColorPallete.errorRed : ColorPallete.successGreen,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final statusBarHeight = MediaQuery.of(context).padding.top;

    return Scaffold(
      backgroundColor: const Color(0xFFECEEF1),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // ── Header ────────────────────────────────────────────
            _buildHeader(statusBarHeight),

            // ── Card ─────────────────────────────────────────────
            Transform.translate(
              offset: const Offset(0, -30),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20.0),
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 24, vertical: 28),
                      decoration: BoxDecoration(
                        color: _cardBg,
                        borderRadius: BorderRadius.circular(24),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withAlpha(31),
                            blurRadius: 24,
                            offset: const Offset(0, 8),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Reset Password',
                            style: TextStyle(
                              fontSize: 26,
                              fontWeight: FontWeight.bold,
                              color: _gold,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Enter your email, request and enter the\nverification code, then set your new password.',
                            style: TextStyle(
                                fontSize: 13, color: Colors.grey.shade600),
                          ),
                          const SizedBox(height: 24),

                          // Email Address
                          _buildFloatingLabel('Email Address'),
                          const SizedBox(height: 6),
                          _buildTextField(
                            controller: _emailController,
                            hint: 'Enter your registered email',
                            icon: Icons.mail_outline,
                            keyboardType: TextInputType.emailAddress,
                          ),
                          const SizedBox(height: 18),

                          // Verification Code + Request Button
                          _buildFloatingLabel('Verification Request'),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: _codeController,
                                  keyboardType: TextInputType.number,
                                  style: const TextStyle(
                                      fontSize: 14,
                                      color: Color(0xFF3A2E00)),
                                  decoration: InputDecoration(
                                    hintText: 'Enter verification',
                                    hintStyle: const TextStyle(
                                        color: _hintColor, fontSize: 14),
                                    prefixIcon: const Icon(
                                        Icons.verified_outlined,
                                        color: _gold,
                                        size: 20),
                                    filled: true,
                                    fillColor: _fieldBg,
                                    contentPadding:
                                        const EdgeInsets.symmetric(
                                            vertical: 15, horizontal: 16),
                                    enabledBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(14),
                                      borderSide: const BorderSide(
                                          color: _fieldBorder, width: 1.2),
                                    ),
                                    focusedBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(14),
                                      borderSide: const BorderSide(
                                          color: _gold, width: 1.6),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              _isRequestingCode
                                  ? const SizedBox(
                                      width: 100,
                                      child: Center(
                                        child: SizedBox(
                                          width: 22,
                                          height: 22,
                                          child: CircularProgressIndicator(
                                            color: _headerTop,
                                            strokeWidth: 2.5,
                                          ),
                                        ),
                                      ),
                                    )
                                  : OutlinedButton(
                                      onPressed: _requestCode,
                                      style: OutlinedButton.styleFrom(
                                        foregroundColor: _gold,
                                        side: const BorderSide(
                                            color: _gold, width: 1.4),
                                        shape: RoundedRectangleBorder(
                                            borderRadius:
                                                BorderRadius.circular(12)),
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 12, vertical: 14),
                                      ),
                                      child: const Text(
                                        'Request Code',
                                        style: TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                            ],
                          ),
                          const SizedBox(height: 18),

                          // New Password
                          _buildFloatingLabel('New Password'),
                          const SizedBox(height: 6),
                          _buildPasswordField(
                            controller: _newPasswordController,
                            hint: 'Enter your new password',
                            obscure: _obscureNew,
                            onToggle: () =>
                                setState(() => _obscureNew = !_obscureNew),
                          ),
                          const SizedBox(height: 18),

                          // Confirm New Password
                          _buildFloatingLabel('Confirm New Password'),
                          const SizedBox(height: 6),
                          _buildPasswordField(
                            controller: _confirmPasswordController,
                            hint: 'Confirm your new password',
                            obscure: _obscureConfirm,
                            onToggle: () => setState(
                                () => _obscureConfirm = !_obscureConfirm),
                          ),
                          const SizedBox(height: 28),

                          // Update Button
                          _buildPrimaryButton(),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Back to Login
                    GestureDetector(
                      onTap: () => Navigator.pushAndRemoveUntil(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const LoginPage()),
                        (route) => false,
                      ),
                      child: RichText(
                        text: const TextSpan(
                          style: TextStyle(fontSize: 14),
                          children: [
                            TextSpan(
                                text: 'Back to ',
                                style: TextStyle(color: Color(0xFF64748B))),
                            TextSpan(
                                text: 'Login',
                                style: TextStyle(
                                    color: _gold,
                                    fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 40),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ─── Header ─────────────────────────────────────────────────────────────
  Widget _buildHeader(double statusBarHeight) {
    return Container(
      width: double.infinity,
      height: 280 + statusBarHeight,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [_headerTop, _headerBottom],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
      ),
      child: Stack(
        children: [
          Positioned.fill(child: _GeometricPattern()),
          Align(
            alignment: Alignment.bottomCenter,
            child: ClipPath(
              clipper: _BottomCurveClipper(),
              child: Container(
                height: 60, color: const Color(0xFFECEEF1)),
            ),
          ),
          Positioned(
            top: statusBarHeight + 16,
            left: 0,
            right: 0,
            child: Column(
              children: [
                // Back button
                Padding(
                  padding: const EdgeInsets.only(left: 8),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: IconButton(
                      icon: const Icon(Icons.arrow_back,
                          color: Colors.white, size: 26),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ),
                ),
                _buildShieldLogo(),
                const SizedBox(height: 12),
                const Text(
                  'Sovereign Ledger',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Urban Permit Authority',
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.white.withAlpha(204),
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 8),
                _buildSealBadge(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────
  Widget _buildFloatingLabel(String text) {
    return Text(
      text,
      style: const TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w600,
        color: _labelColor,
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    TextInputType? keyboardType,
  }) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      style: const TextStyle(fontSize: 14, color: Color(0xFF3A2E00)),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: _hintColor, fontSize: 14),
        prefixIcon: Icon(icon, color: _gold, size: 20),
        filled: true,
        fillColor: _fieldBg,
        contentPadding:
            const EdgeInsets.symmetric(vertical: 15, horizontal: 16),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: _fieldBorder, width: 1.2),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: _gold, width: 1.6),
        ),
      ),
    );
  }

  Widget _buildPasswordField({
    required TextEditingController controller,
    required String hint,
    required bool obscure,
    required VoidCallback onToggle,
  }) {
    return TextField(
      controller: controller,
      obscureText: obscure,
      style: const TextStyle(fontSize: 14, color: Color(0xFF3A2E00)),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: _hintColor, fontSize: 14),
        prefixIcon: const Icon(Icons.lock_outline, color: _gold, size: 20),
        suffixIcon: IconButton(
          icon: Icon(
            obscure
                ? Icons.visibility_off_outlined
                : Icons.visibility_outlined,
            color: _hintColor,
            size: 20,
          ),
          onPressed: onToggle,
        ),
        filled: true,
        fillColor: _fieldBg,
        contentPadding:
            const EdgeInsets.symmetric(vertical: 15, horizontal: 16),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: _fieldBorder, width: 1.2),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: _gold, width: 1.6),
        ),
      ),
    );
  }

  Widget _buildPrimaryButton() {
    return SizedBox(
      width: double.infinity,
      height: 54,
      child: _isSubmitting
          ? const Center(
              child: CircularProgressIndicator(color: _headerTop))
          : ElevatedButton(
              onPressed: _handleUpdatePassword,
              style: ElevatedButton.styleFrom(
                backgroundColor: _headerTop,
                foregroundColor: _gold,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(30)),
                elevation: 2,
              ),
              child: const Text(
                'Update Password',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.6,
                ),
              ),
            ),
    );
  }

  Widget _buildShieldLogo() {
    return Container(
      width: 80,
      height: 80,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white.withAlpha(20),
        border: Border.all(color: _gold.withAlpha(153), width: 1.5),
      ),
      child: Center(
        child: Image.asset(
          'assets/images/logo.png',
          width: 60,
          height: 60,
          errorBuilder: (_, __, ___) =>
              const Icon(Icons.shield, size: 46, color: _gold),
        ),
      ),
    );
  }

  Widget _buildSealBadge() {
    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white.withAlpha(26),
        border: Border.all(color: _gold.withAlpha(128), width: 1),
      ),
      child:
          const Center(child: Icon(Icons.verified_outlined, color: _gold, size: 16)),
    );
  }
}

// ─── Decorative geometric pattern painter ────────────────────────────────────
class _GeometricPattern extends StatelessWidget {
  @override
  Widget build(BuildContext context) =>
      CustomPaint(painter: _GeometricPatternPainter());
}

class _GeometricPatternPainter extends CustomPainter {
  static const Color _goldLine = Color(0xFFC9A84C);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = _goldLine.withAlpha(46)
      ..strokeWidth = 0.8
      ..style = PaintingStyle.stroke;

    for (int i = 0; i < 4; i++) {
      _drawDiamondChain(canvas, paint, Offset(20.0 + i * 12, 0), size.height);
    }
    for (int i = 0; i < 4; i++) {
      _drawDiamondChain(canvas, paint,
          Offset(size.width - 20.0 - i * 12, 0), size.height);
    }
  }

  void _drawDiamondChain(
      Canvas canvas, Paint paint, Offset start, double height) {
    double y = 0;
    const double step = 24;
    const double halfW = 6;
    while (y < height) {
      final center = Offset(start.dx, y + step / 2);
      final path = Path()
        ..moveTo(center.dx, center.dy - halfW)
        ..lineTo(center.dx + halfW, center.dy)
        ..lineTo(center.dx, center.dy + halfW)
        ..lineTo(center.dx - halfW, center.dy)
        ..close();
      canvas.drawPath(path, paint);
      y += step;
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

// ─── Bottom curve clipper ─────────────────────────────────────────────────────
class _BottomCurveClipper extends CustomClipper<Path> {
  @override
  Path getClip(Size size) {
    final path = Path();
    path.moveTo(0, size.height);
    path.quadraticBezierTo(size.width / 2, 0, size.width, size.height);
    path.close();
    return path;
  }

  @override
  bool shouldReclip(CustomClipper<Path> oldClipper) => false;
}
