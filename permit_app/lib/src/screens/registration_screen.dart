import 'package:flutter/material.dart';
import 'package:permit_app/src/utils/colors.dart';
import 'package:provider/provider.dart';
import 'package:permit_app/src/providers/auth_provider.dart';
import 'package:permit_app/src/screens/login_page.dart';

class RegistrationScreen extends StatefulWidget {
  const RegistrationScreen({super.key});

  @override
  State<RegistrationScreen> createState() => _RegistrationScreenState();
}

class _RegistrationScreenState extends State<RegistrationScreen> {
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmPasswordController =
      TextEditingController();

  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;

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
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _handleRegistration() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final name = _nameController.text.trim();
    final phone = _phoneController.text.trim();
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();
    final confirmPassword = _confirmPasswordController.text.trim();

    if (name.isEmpty ||
        phone.isEmpty ||
        email.isEmpty ||
        password.isEmpty ||
        confirmPassword.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please fill all fields'),
          backgroundColor: ColorPallete.errorRed,
        ),
      );
      return;
    }

    // Somali Phone Validation (9 digits: 2 prefix + 7 random)
    final phoneRegExp = RegExp(r'^(60|61|62|63|65|66|67|68|69|70|71|77|90)\d{7}$');
    if (!phoneRegExp.hasMatch(phone)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('unexisting Number'),
          backgroundColor: ColorPallete.errorRed,
        ),
      );
      return;
    }

    final fullPhone = '+252$phone';

    if (password != confirmPassword) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Passwords do not match'),
          backgroundColor: ColorPallete.errorRed,
        ),
      );
      return;
    }

    if (password.length < 8) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Password must be at least 8 characters'),
          backgroundColor: ColorPallete.errorRed,
        ),
      );
      return;
    }

    final complexityRegex = RegExp(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$');
    if (!complexityRegex.hasMatch(password)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Password must include Uppercase, Lowercase, Number & Special Character'),
          backgroundColor: ColorPallete.errorRed,
        ),
      );
      return;
    }

    final result =
        await authProvider.registerUser(name, email, fullPhone, password);

    if (result['success']) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Registration successful! Please login to continue.'),
            backgroundColor: ColorPallete.successGreen,
          ),
        );
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (context) => const LoginPage()),
          (route) => false,
        );
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result['message'] ?? 'Registration Failed'),
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
            // ── Header ──────────────────────────────────────────────
            _buildHeader(statusBarHeight),

            // ── Card ────────────────────────────────────────────────
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
                            'Create Account',
                            style: TextStyle(
                              fontSize: 26,
                              fontWeight: FontWeight.bold,
                              color: _gold,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Fill in your details to register',
                            style: TextStyle(
                                fontSize: 13, color: Colors.grey.shade600),
                          ),
                          const SizedBox(height: 24),

                          // Full Name
                          _buildFloatingField(
                            label: 'Full Name',
                            controller: _nameController,
                            hint: 'Enter your full name',
                            icon: Icons.person_outline,
                          ),
                          const SizedBox(height: 16),

                          // Phone
                          _buildPhoneField(),
                          const SizedBox(height: 16),

                          // Email
                          _buildFloatingField(
                            label: 'Email Address',
                            controller: _emailController,
                            hint: 'name@gov.so',
                            icon: Icons.mail_outline,
                            keyboardType: TextInputType.emailAddress,
                          ),
                          const SizedBox(height: 16),

                          // Password
                          _buildPasswordField(
                            label: 'Password',
                            controller: _passwordController,
                            hint: 'Enter your password',
                            obscure: _obscurePassword,
                            onToggle: () => setState(
                                () => _obscurePassword = !_obscurePassword),
                          ),
                          const SizedBox(height: 16),

                          // Confirm Password
                          _buildPasswordField(
                            label: 'Confirm Password',
                            controller: _confirmPasswordController,
                            hint: 'Confirm your password',
                            obscure: _obscureConfirmPassword,
                            onToggle: () => setState(() =>
                                _obscureConfirmPassword =
                                    !_obscureConfirmPassword),
                          ),
                          const SizedBox(height: 28),

                          // Sign Up Button
                          _buildPrimaryButton(
                            label: 'Sign Up',
                            isLoading: authProvider.isLoading,
                            onTap: _handleRegistration,
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
                          'Already have an account? ',
                          style: TextStyle(
                              color: Colors.grey.shade600, fontSize: 14),
                        ),
                        GestureDetector(
                          onTap: () => Navigator.pushAndRemoveUntil(
                            context,
                            MaterialPageRoute(
                                builder: (context) => const LoginPage()),
                            (route) => false,
                          ),
                          child: const Text(
                            'Login',
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
                // Back button row
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

  // ─── Shared helpers ──────────────────────────────────────────────────────
  Widget _buildFloatingField({
    required String label,
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
        labelText: label,
        labelStyle: const TextStyle(color: _labelColor, fontSize: 13),
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

  Widget _buildPhoneField() {
    return Row(
      children: [
        // Country Code (Read-only)
        Container(
          width: 75,
          height: 54,
          decoration: BoxDecoration(
            color: Colors.grey.shade100,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: _fieldBorder, width: 1.2),
          ),
          child: const Center(
            child: Text(
              '+252',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: Colors.grey,
              ),
            ),
          ),
        ),
        const SizedBox(width: 8),
        // Entry Number
        Expanded(
          child: TextField(
            controller: _phoneController,
            keyboardType: TextInputType.number,
            maxLength: 9,
            style: const TextStyle(fontSize: 14, color: Color(0xFF3A2E00)),
            decoration: InputDecoration(
              counterText: "",
              labelText: 'Phone Number',
              labelStyle: const TextStyle(color: _labelColor, fontSize: 13),
              hintText: '61XXXXXXX',
              hintStyle: const TextStyle(color: _hintColor, fontSize: 14),
              prefixIcon: const Icon(Icons.phone_outlined, color: _gold, size: 20),
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
          ),
        ),
      ],
    );
  }

  Widget _buildPasswordField({
    required String label,
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
        labelText: label,
        labelStyle: const TextStyle(color: _labelColor, fontSize: 13),
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
          errorBuilder: (_, __, ___) => const Icon(
            Icons.shield,
            size: 46,
            color: _gold,
          ),
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
      child: const Center(
        child: Icon(Icons.verified_outlined, color: _gold, size: 16),
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

    for (int i = 0; i < 4; i++) {
      final x = 20.0 + i * 12;
      _drawDiamondChain(canvas, paint, Offset(x, 0), size.height);
    }
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
    path.quadraticBezierTo(size.width / 2, 0, size.width, size.height);
    path.close();
    return path;
  }

  @override
  bool shouldReclip(CustomClipper<Path> oldClipper) => false;
}
