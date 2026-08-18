import 'package:flutter/material.dart';
import 'package:permit_app/src/utils/colors.dart';
import 'package:permit_app/src/screens/auth/login_page.dart';
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
                    child: const Icon(Icons.lock_reset_rounded, color: Colors.white, size: 36),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'M-DBPS',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.4,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Mogadishu Digital Building Permit System',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 12, fontWeight: FontWeight.w500),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Reset your password',
                    style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 13, fontWeight: FontWeight.w500),
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
                        'Forgot password',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w800,
                          color: ColorPallete.primaryNavy,
                        ),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Enter your email, request a code, then set a new password.',
                        style: TextStyle(fontSize: 13, color: ColorPallete.hintTextColor, fontWeight: FontWeight.w500, height: 1.4),
                      ),
                      const SizedBox(height: 26),
                      const Text('Email', style: TextStyle(fontWeight: FontWeight.w700, color: ColorPallete.primaryNavy, fontSize: 13)),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        decoration: _inputDecoration('Enter your registered email', Icons.mail_outline_rounded),
                      ),
                      const SizedBox(height: 18),
                      const Text('Verification Code', style: TextStyle(fontWeight: FontWeight.w700, color: ColorPallete.primaryNavy, fontSize: 13)),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _codeController,
                              keyboardType: TextInputType.number,
                              decoration: _inputDecoration('Enter code', Icons.verified_outlined),
                            ),
                          ),
                          const SizedBox(width: 10),
                          SizedBox(
                            height: 52,
                            child: _isRequestingCode
                                ? const SizedBox(
                                    width: 100,
                                    child: Center(
                                      child: SizedBox(
                                        width: 22,
                                        height: 22,
                                        child: CircularProgressIndicator(
                                          color: ColorPallete.primaryNavy,
                                          strokeWidth: 2.5,
                                        ),
                                      ),
                                    ),
                                  )
                                : OutlinedButton(
                                    onPressed: _requestCode,
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: ColorPallete.accentTeal,
                                      side: const BorderSide(color: ColorPallete.accentTeal, width: 1.4),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                                    ),
                                    child: const Text(
                                      'Request',
                                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800),
                                    ),
                                  ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),
                      const Text('New Password', style: TextStyle(fontWeight: FontWeight.w700, color: ColorPallete.primaryNavy, fontSize: 13)),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _newPasswordController,
                        obscureText: _obscureNew,
                        decoration: _inputDecoration('Enter new password', Icons.lock_outline_rounded).copyWith(
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscureNew ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                              color: ColorPallete.hintTextColor,
                              size: 20,
                            ),
                            onPressed: () => setState(() => _obscureNew = !_obscureNew),
                          ),
                        ),
                      ),
                      const SizedBox(height: 18),
                      const Text('Confirm Password', style: TextStyle(fontWeight: FontWeight.w700, color: ColorPallete.primaryNavy, fontSize: 13)),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _confirmPasswordController,
                        obscureText: _obscureConfirm,
                        decoration: _inputDecoration('Confirm new password', Icons.lock_outline_rounded).copyWith(
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscureConfirm ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                              color: ColorPallete.hintTextColor,
                              size: 20,
                            ),
                            onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
                          ),
                        ),
                      ),
                      const SizedBox(height: 26),
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton(
                          onPressed: _isSubmitting ? null : _handleUpdatePassword,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: ColorPallete.primaryNavy,
                            foregroundColor: Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          ),
                          child: _isSubmitting
                              ? const SizedBox(
                                  width: 22,
                                  height: 22,
                                  child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
                                )
                              : const Text('Update Password', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: () => Navigator.pushAndRemoveUntil(
                context,
                MaterialPageRoute(builder: (_) => const LoginPage()),
                (route) => false,
              ),
              child: const Text(
                'Back to Sign In',
                style: TextStyle(fontWeight: FontWeight.w800, color: ColorPallete.primaryNavy),
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  InputDecoration _inputDecoration(String hint, IconData icon) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: ColorPallete.hintTextColor, fontSize: 14),
      prefixIcon: Icon(icon, color: ColorPallete.hintTextColor, size: 20),
      filled: true,
      fillColor: ColorPallete.backgroundColor,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: ColorPallete.borderColor),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: ColorPallete.borderColor),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: ColorPallete.accentTeal, width: 1.5),
      ),
    );
  }
}
