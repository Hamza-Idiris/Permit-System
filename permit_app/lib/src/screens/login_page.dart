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
  bool _submitted = false;
  String? _formError;

  bool get _emailInvalid => _submitted && _emailController.text.trim().isEmpty;
  bool get _passwordInvalid =>
      _submitted && _passwordController.text.trim().isEmpty;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _clearFormError() {
    if (_formError != null) setState(() => _formError = null);
  }

  void _handleLogin() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();

    setState(() {
      _submitted = true;
      _formError = null;
    });

    if (email.isEmpty || password.isEmpty) {
      setState(() => _formError = 'Please enter both email and password');
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
      if (mounted) {
        setState(() =>
            _formError = result['message'] ?? 'Invalid credentials');
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
              padding: EdgeInsets.fromLTRB(24, top + 28, 24, 40),
              decoration: const BoxDecoration(
                gradient: ColorPallete.accentGradient,
                borderRadius: BorderRadius.vertical(bottom: Radius.circular(32)),
              ),
              child: Column(
                children: [
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white.withOpacity(0.3)),
                    ),
                    child: const Icon(Icons.account_balance_rounded, color: Colors.white, size: 36),
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
                        'Welcome back',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w800,
                          color: ColorPallete.primaryNavy,
                        ),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Sign in to continue',
                        style: TextStyle(fontSize: 13, color: ColorPallete.hintTextColor, fontWeight: FontWeight.w500),
                      ),
                      const SizedBox(height: 26),
                      const Text('Email', style: TextStyle(fontWeight: FontWeight.w700, color: ColorPallete.primaryNavy, fontSize: 13)),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        onChanged: (_) {
                          _clearFormError();
                          if (_submitted) setState(() {});
                        },
                        decoration: _inputDecoration(
                          'Enter your email',
                          Icons.mail_outline_rounded,
                          showErrorBorder: _emailInvalid,
                        ),
                      ),
                      const SizedBox(height: 18),
                      const Text('Password', style: TextStyle(fontWeight: FontWeight.w700, color: ColorPallete.primaryNavy, fontSize: 13)),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _passwordController,
                        obscureText: _obscurePassword,
                        onChanged: (_) {
                          _clearFormError();
                          if (_submitted) setState(() {});
                        },
                        decoration: _inputDecoration(
                          'Enter your password',
                          Icons.lock_outline_rounded,
                          showErrorBorder: _passwordInvalid,
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
                      const SizedBox(height: 10),
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton(
                          onPressed: () => Navigator.push(
                            context,
                            MaterialPageRoute(builder: (context) => const ForgotPasswordScreen()),
                          ),
                          child: const Text(
                            'Forgot Password?',
                            style: TextStyle(fontWeight: FontWeight.w700, color: ColorPallete.accentTeal),
                          ),
                        ),
                      ),
                      if (_formError != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          _formError!,
                          style: const TextStyle(
                            color: ColorPallete.errorRed,
                            fontWeight: FontWeight.w600,
                            fontSize: 13,
                          ),
                        ),
                        const SizedBox(height: 10),
                      ] else
                        const SizedBox(height: 10),
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton(
                          onPressed: authProvider.isLoading ? null : _handleLogin,
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
                              : const Text('Sign In', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
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
                const Text("Don't have an account? ", style: TextStyle(color: ColorPallete.hintTextColor)),
                TextButton(
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const RegistrationScreen()),
                  ),
                  child: const Text(
                    'Sign Up',
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
