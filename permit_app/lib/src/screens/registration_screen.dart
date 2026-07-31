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
  bool _passwordTouched = false;

  static final RegExp _complexityRegex =
      RegExp(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$');

  bool get _hasMinLength => _passwordController.text.length >= 8;
  bool get _hasUpper => _passwordController.text.contains(RegExp(r'[A-Z]'));
  bool get _hasLower => _passwordController.text.contains(RegExp(r'[a-z]'));
  bool get _hasNumber => _passwordController.text.contains(RegExp(r'[0-9]'));
  bool get _hasSpecial => _passwordController.text.contains(RegExp(r'[@$!%*?&]'));
  bool get _isPasswordValid => _complexityRegex.hasMatch(_passwordController.text);

  @override
  void initState() {
    super.initState();
    _passwordController.addListener(() {
      if (mounted) setState(() {});
    });
  }

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

    final complexityRegex = _complexityRegex;
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
    final top = MediaQuery.of(context).padding.top;

    return Scaffold(
      backgroundColor: ColorPallete.backgroundColor,
      body: SingleChildScrollView(
        child: Column(
          children: [
            Container(
              width: double.infinity,
              padding: EdgeInsets.fromLTRB(16, top + 8, 24, 40),
              decoration: const BoxDecoration(
                gradient: ColorPallete.accentGradient,
                borderRadius: BorderRadius.vertical(bottom: Radius.circular(32)),
              ),
              child: Column(
                children: [
                  Align(
                    alignment: Alignment.centerLeft,
                    child: IconButton(
                      icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ),
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white.withOpacity(0.3)),
                    ),
                    child: const Icon(Icons.person_add_alt_1_rounded, color: Colors.white, size: 36),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Urban Permits',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.4,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Create your account',
                    style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 13, fontWeight: FontWeight.w500),
                  ),
                ],
              ),
            ),
            Transform.translate(
              offset: const Offset(0, -20),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.fromLTRB(22, 26, 22, 28),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: ColorPallete.borderColor),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        blurRadius: 24,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Sign up',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w800,
                          color: ColorPallete.primaryNavy,
                        ),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Fill in your details to register',
                        style: TextStyle(fontSize: 13, color: ColorPallete.hintTextColor, fontWeight: FontWeight.w500),
                      ),
                      const SizedBox(height: 26),
                      const Text('Full Name', style: TextStyle(fontWeight: FontWeight.w700, color: ColorPallete.primaryNavy, fontSize: 13)),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _nameController,
                        decoration: _inputDecoration('Enter your full name', Icons.person_outline_rounded),
                      ),
                      const SizedBox(height: 18),
                      const Text('Phone Number', style: TextStyle(fontWeight: FontWeight.w700, color: ColorPallete.primaryNavy, fontSize: 13)),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Container(
                            width: 72,
                            height: 52,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: ColorPallete.backgroundColor,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: ColorPallete.borderColor),
                            ),
                            child: const Text(
                              '+252',
                              style: TextStyle(
                                fontWeight: FontWeight.w800,
                                color: ColorPallete.primaryNavy,
                                fontSize: 14,
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: TextField(
                              controller: _phoneController,
                              keyboardType: TextInputType.number,
                              maxLength: 9,
                              decoration: _inputDecoration('61XXXXXXX', Icons.phone_outlined).copyWith(counterText: ''),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),
                      const Text('Email', style: TextStyle(fontWeight: FontWeight.w700, color: ColorPallete.primaryNavy, fontSize: 13)),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        decoration: _inputDecoration('Enter your email', Icons.mail_outline_rounded),
                      ),
                      const SizedBox(height: 18),
                      const Text('Password', style: TextStyle(fontWeight: FontWeight.w700, color: ColorPallete.primaryNavy, fontSize: 13)),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _passwordController,
                        obscureText: _obscurePassword,
                        onTap: () => setState(() => _passwordTouched = true),
                        onChanged: (_) => setState(() => _passwordTouched = true),
                        decoration: _inputDecoration(
                          'Create a password',
                          Icons.lock_outline_rounded,
                          showErrorBorder: _passwordTouched && !_isPasswordValid,
                        ).copyWith(
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                              color: ColorPallete.hintTextColor,
                              size: 20,
                            ),
                            onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                          ),
                        ),
                      ),
                      if (_passwordTouched && !_isPasswordValid) ...[
                        const SizedBox(height: 10),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
                          decoration: BoxDecoration(
                            color: ColorPallete.errorRed.withOpacity(0.06),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: ColorPallete.errorRed.withOpacity(0.25)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Password must contain:',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: ColorPallete.errorRed,
                                ),
                              ),
                              const SizedBox(height: 6),
                              _passwordRule('At least 8 characters', _hasMinLength),
                              _passwordRule('One uppercase letter (A–Z)', _hasUpper),
                              _passwordRule('One lowercase letter (a–z)', _hasLower),
                              _passwordRule('One number (0–9)', _hasNumber),
                              _passwordRule('One special character (@\$!%*?&)', _hasSpecial),
                            ],
                          ),
                        ),
                      ],
                      const SizedBox(height: 18),
                      const Text('Confirm Password', style: TextStyle(fontWeight: FontWeight.w700, color: ColorPallete.primaryNavy, fontSize: 13)),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _confirmPasswordController,
                        obscureText: _obscureConfirmPassword,
                        decoration: _inputDecoration('Confirm your password', Icons.lock_outline_rounded).copyWith(
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscureConfirmPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                              color: ColorPallete.hintTextColor,
                              size: 20,
                            ),
                            onPressed: () => setState(() => _obscureConfirmPassword = !_obscureConfirmPassword),
                          ),
                        ),
                      ),
                      const SizedBox(height: 26),
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton(
                          onPressed: authProvider.isLoading ? null : _handleRegistration,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: ColorPallete.primaryNavy,
                            foregroundColor: Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          ),
                          child: authProvider.isLoading
                              ? const SizedBox(
                                  width: 22,
                                  height: 22,
                                  child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
                                )
                              : const Text('Sign Up', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text('Already have an account? ', style: TextStyle(color: ColorPallete.hintTextColor)),
                TextButton(
                  onPressed: () => Navigator.pushAndRemoveUntil(
                    context,
                    MaterialPageRoute(builder: (context) => const LoginPage()),
                    (route) => false,
                  ),
                  child: const Text(
                    'Sign In',
                    style: TextStyle(fontWeight: FontWeight.w800, color: ColorPallete.primaryNavy),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _passwordRule(String label, bool met) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          Icon(
            met ? Icons.check_circle_rounded : Icons.cancel_rounded,
            size: 15,
            color: met ? ColorPallete.successGreen : ColorPallete.errorRed,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: met ? ColorPallete.successGreen : ColorPallete.errorRed,
              ),
            ),
          ),
        ],
      ),
    );
  }

  InputDecoration _inputDecoration(String hint, IconData icon, {bool showErrorBorder = false}) {
    final borderColor = showErrorBorder ? ColorPallete.errorRed : ColorPallete.borderColor;
    final focusedColor = showErrorBorder ? ColorPallete.errorRed : ColorPallete.primaryNavy;
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: ColorPallete.hintTextColor, fontSize: 14),
      prefixIcon: Icon(icon, color: showErrorBorder ? ColorPallete.errorRed : ColorPallete.hintTextColor, size: 20),
      filled: true,
      fillColor: ColorPallete.backgroundColor,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: borderColor),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: borderColor, width: showErrorBorder ? 1.5 : 1),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: focusedColor, width: 1.8),
      ),
    );
  }
}
