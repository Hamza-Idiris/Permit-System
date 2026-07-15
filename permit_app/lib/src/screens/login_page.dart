import 'package:flutter/material.dart';
import 'package:permit_app/src/utils/colors.dart';
import 'package:provider/provider.dart';
import 'package:permit_app/src/providers/auth_provider.dart';
import 'package:permit_app/src/screens/inspector_dashboard.dart';
import 'package:permit_app/src/screens/applicant_dashboard.dart';
import 'package:permit_app/src/screens/registration_screen.dart';
import 'package:permit_app/src/screens/forgot_password_screen.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  bool _obscurePassword = true;

  // Gold / amber accent matching the mockup
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
    _passwordController.dispose();
    super.dispose();
  }

  void _handleLogin() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();

    if (email.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter both email and password'),
          backgroundColor: ColorPallete.errorRed,
        ),
      );
      return;
    }

    final result = await authProvider.login(email, password);

    if (result['success']) {
      if (mounted) {
        if (result['role'] == 'applicant') {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (context) => const ApplicantDashboard()),
          );
        } else {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (context) => const InspectorDashboard()),
          );
        }
      }
    } else {
      _emailController.clear();
      _passwordController.clear();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result['message'] ?? 'Login Failed'),
            backgroundColor: ColorPallete.errorRed,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final statusBarHeight = MediaQuery.of(context).padding.top;

    return Scaffold(
      backgroundColor: const Color(0xFFECEEF1),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // ── Header ────────────────────────────────────────────
            _buildHeader(statusBarHeight),

            // ── White-ish Card ─────────────────────────────────────
            Transform.translate(
              offset: const Offset(0, -30),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20.0),
                child: Column(
                  children: [
                    Container(
                      padding:
                          const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
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
                          // Heading
                          const Text(
                            'Welcome Back',
                            style: TextStyle(
                              fontSize: 26,
                              fontWeight: FontWeight.bold,
                              color: _gold,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Sign in to your account to continue',
                            style: TextStyle(
                              fontSize: 13,
                              color: Colors.grey.shade600,
                            ),
                          ),
                          const SizedBox(height: 28),

                          // Email field
                          _buildLabel('Email Address'),
                          const SizedBox(height: 8),
                          _buildTextField(
                            controller: _emailController,
                            hint: 'Enter your email',
                            icon: Icons.mail_outline,
                            keyboardType: TextInputType.emailAddress,
                          ),
                          const SizedBox(height: 20),

                          // Password field
                          _buildLabel('Password'),
                          const SizedBox(height: 8),
                          _buildTextField(
                            controller: _passwordController,
                            hint: 'Enter your password',
                            icon: Icons.lock_outline,
                            obscure: _obscurePassword,
                            suffixIcon: IconButton(
                              icon: Icon(
                                _obscurePassword
                                    ? Icons.visibility_off_outlined
                                    : Icons.visibility_outlined,
                                color: _hintColor,
                                size: 20,
                              ),
                              onPressed: () => setState(
                                  () => _obscurePassword = !_obscurePassword),
                            ),
                          ),
                          const SizedBox(height: 12),

                          // Forgot Password
                          Align(
                            alignment: Alignment.centerRight,
                            child: GestureDetector(
                              onTap: () => Navigator.push(
                                context,
                                MaterialPageRoute(
                                    builder: (context) =>
                                        const ForgotPasswordScreen()),
                              ),
                              child: const Text(
                                'Forgot Password?',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: _labelColor,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 28),

                          // Login Button
                          _buildPrimaryButton(
                            label: 'Login',
                            isLoading: authProvider.isLoading,
                            onTap: _handleLogin,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Bottom link
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          "Don't have an account? ",
                          style: TextStyle(
                              color: Colors.grey.shade600, fontSize: 14),
                        ),
                        GestureDetector(
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (context) =>
                                    const RegistrationScreen()),
                          ),
                          child: const Text(
                            'Sign Up',
                            style: TextStyle(
                              color: _gold,
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
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

  // ─── Shared header ────────────────────────────────────────────────────────
  Widget _buildHeader(double statusBarHeight) {
    return Container(
      width: double.infinity,
      height: 300 + statusBarHeight,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [_headerTop, _headerBottom],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
      ),
      child: Stack(
        children: [
          // Geometric pattern overlay
          Positioned.fill(child: _GeometricPattern()),

          // Curved bottom
          Align(
            alignment: Alignment.bottomCenter,
            child: ClipPath(
              clipper: _BottomCurveClipper(),
              child: Container(
                height: 60,
                color: const Color(0xFFECEEF1),
              ),
            ),
          ),

          // Content: logo + text
          Positioned(
            top: statusBarHeight + 22,
            left: 0,
            right: 0,
            child: Column(
              children: [
                // Shield logo
                _buildShieldLogo(),
                const SizedBox(height: 14),
                const Text(
                  'Building Permit System',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Mogadishu Municipality',
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.white.withAlpha(204),
                    fontWeight: FontWeight.w500,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 10),
                // Small seal badge
                _buildSealBadge(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ─── Field helper ─────────────────────────────────────────────────────────
  Widget _buildLabel(String text) {
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
    bool obscure = false,
    Widget? suffixIcon,
    TextInputType? keyboardType,
  }) {
    return TextField(
      controller: controller,
      obscureText: obscure,
      keyboardType: keyboardType,
      style: const TextStyle(fontSize: 14, color: Color(0xFF3A2E00)),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: _hintColor, fontSize: 14),
        prefixIcon: Icon(icon, color: _gold, size: 20),
        suffixIcon: suffixIcon,
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

  Widget _buildPrimaryButton({
    required String label,
    required bool isLoading,
    required VoidCallback onTap,
  }) {
    return SizedBox(
      width: double.infinity,
      height: 54,
      child: isLoading
          ? const Center(
              child: CircularProgressIndicator(color: _headerTop),
            )
          : ElevatedButton(
              onPressed: onTap,
              style: ElevatedButton.styleFrom(
                backgroundColor: _headerTop,
                foregroundColor: _gold,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(30)),
                elevation: 2,
              ),
              child: Text(
                label,
                style: const TextStyle(
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
      width: 88,
      height: 88,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white.withAlpha(20),
        border: Border.all(color: _gold.withAlpha(153), width: 1.5),
      ),
      child: Center(
        child: Image.asset(
          'assets/images/logo.png',
          width: 66,
          height: 66,
          errorBuilder: (_, __, ___) => const Icon(
            Icons.shield,
            size: 52,
            color: _gold,
          ),
        ),
      ),
    );
  }

  Widget _buildSealBadge() {
    return Container(
      width: 38,
      height: 38,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white.withAlpha(26),
        border: Border.all(color: _gold.withAlpha(128), width: 1),
      ),
      child: const Center(
        child: Icon(Icons.verified_outlined, color: _gold, size: 18),
      ),
    );
  }
}

// ─── Decorative geometric pattern painter ────────────────────────────────────
class _GeometricPattern extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _GeometricPatternPainter(),
    );
  }
}

class _GeometricPatternPainter extends CustomPainter {
  static const Color _goldLine = Color(0xFFC9A84C);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = _goldLine.withAlpha(46)
      ..strokeWidth = 0.8
      ..style = PaintingStyle.stroke;

    // Left decorative band
    for (int i = 0; i < 4; i++) {
      final x = 20.0 + i * 12;
      _drawDiamondChain(canvas, paint, Offset(x, 0), size.height);
    }

    // Right decorative band
    for (int i = 0; i < 4; i++) {
      final x = size.width - 20.0 - i * 12;
      _drawDiamondChain(canvas, paint, Offset(x, 0), size.height);
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

// ─── Bottom curve clipper ────────────────────────────────────────────────────
class _BottomCurveClipper extends CustomClipper<Path> {
  @override
  Path getClip(Size size) {
    final path = Path();
    path.moveTo(0, size.height);
    path.quadraticBezierTo(
        size.width / 2, 0, size.width, size.height);
    path.close();
    return path;
  }

  @override
  bool shouldReclip(CustomClipper<Path> oldClipper) => false;
}
