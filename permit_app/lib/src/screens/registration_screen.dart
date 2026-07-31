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

  final FocusNode _passwordFocus = FocusNode();
  final FocusNode _confirmFocus = FocusNode();
  final FocusNode _passwordVisibilityFocus =
      FocusNode(skipTraversal: true, canRequestFocus: false);
  final FocusNode _confirmVisibilityFocus =
      FocusNode(skipTraversal: true, canRequestFocus: false);

  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _submitted = false;
  bool _passwordFocused = false;
  String? _formError;

  /// Once the user focuses password, keep red border until the password is valid.
  bool _showPasswordErrorBorder = false;
  bool _showConfirmErrorBorder = false;

  static final RegExp _complexityRegex =
      RegExp(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$');
  static final RegExp _phoneRegExp =
      RegExp(r'^(60|61|62|63|65|66|67|68|69|70|71|77|90)\d{7}$');

  bool get _isPasswordValid =>
      _complexityRegex.hasMatch(_passwordController.text);

  bool get _nameInvalid => _submitted && _nameController.text.trim().isEmpty;
  bool get _phoneInvalid =>
      _submitted && !_phoneRegExp.hasMatch(_phoneController.text.trim());
  bool get _emailInvalid => _submitted && _emailController.text.trim().isEmpty;

  bool _computeConfirmErrorBorder() {
    final confirm = _confirmPasswordController.text;
    final password = _passwordController.text;
    if (confirm.isEmpty) return _submitted;
    return confirm != password;
  }

  @override
  void initState() {
    super.initState();
    _passwordFocus.addListener(_onPasswordFocusChange);
    _passwordController.addListener(_onPasswordTextChanged);
    _confirmPasswordController.addListener(_onConfirmTextChanged);
  }

  void _onPasswordFocusChange() {
    final focused = _passwordFocus.hasFocus;
    final nextPasswordBorder = focused
        ? !_isPasswordValid
        : (_showPasswordErrorBorder && !_isPasswordValid);
    setState(() {
      _passwordFocused = focused;
      _showPasswordErrorBorder = nextPasswordBorder;
    });
  }

  void _syncFieldBorders({bool clearFormError = true}) {
    final nextPasswordBorder = !_isPasswordValid &&
        (_passwordFocused || _showPasswordErrorBorder || _submitted);
    final nextConfirmBorder = _computeConfirmErrorBorder();
    final shouldClear = clearFormError && _formError != null;

    if (nextPasswordBorder == _showPasswordErrorBorder &&
        nextConfirmBorder == _showConfirmErrorBorder &&
        !shouldClear) {
      return;
    }

    setState(() {
      _showPasswordErrorBorder = nextPasswordBorder;
      _showConfirmErrorBorder = nextConfirmBorder;
      if (shouldClear) _formError = null;
    });
  }

  void _onPasswordTextChanged() => _syncFieldBorders();

  void _onConfirmTextChanged() => _syncFieldBorders();

  @override
  void dispose() {
    _passwordFocus.removeListener(_onPasswordFocusChange);
    _passwordController.removeListener(_onPasswordTextChanged);
    _confirmPasswordController.removeListener(_onConfirmTextChanged);
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _passwordFocus.dispose();
    _confirmFocus.dispose();
    _passwordVisibilityFocus.dispose();
    _confirmVisibilityFocus.dispose();
    super.dispose();
  }

  void _handleRegistration() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final name = _nameController.text.trim();
    final phone = _phoneController.text.trim();
    final email = _emailController.text.trim();
    final password = _passwordController.text;
    final confirmPassword = _confirmPasswordController.text;

    setState(() {
      _submitted = true;
      _formError = null;
      if (!_isPasswordValid) _showPasswordErrorBorder = true;
      _showConfirmErrorBorder = _computeConfirmErrorBorder();
    });

    if (name.isEmpty ||
        phone.isEmpty ||
        email.isEmpty ||
        password.isEmpty ||
        confirmPassword.isEmpty) {
      setState(() => _formError = 'Please fill all fields');
      return;
    }

    if (!_phoneRegExp.hasMatch(phone)) {
      setState(() => _formError = 'Invalid phone number');
      return;
    }

    if (password != confirmPassword) {
      setState(() => _formError = 'Passwords do not match');
      return;
    }

    if (!_complexityRegex.hasMatch(password)) {
      setState(() => _formError =
          'Password must include uppercase, lowercase, number & special character');
      return;
    }

    final fullPhone = '+252$phone';
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
        setState(
            () => _formError = result['message'] ?? 'Registration Failed');
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
                borderRadius:
                    BorderRadius.vertical(bottom: Radius.circular(32)),
              ),
              child: Column(
                children: [
                  Align(
                    alignment: Alignment.centerLeft,
                    child: IconButton(
                      icon: const Icon(Icons.arrow_back_rounded,
                          color: Colors.white),
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
                    child: const Icon(Icons.person_add_alt_1_rounded,
                        color: Colors.white, size: 36),
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
                    style: TextStyle(
                        color: Colors.white.withOpacity(0.8),
                        fontSize: 12,
                        fontWeight: FontWeight.w500),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Create your account',
                    style: TextStyle(
                        color: Colors.white.withOpacity(0.7),
                        fontSize: 13,
                        fontWeight: FontWeight.w500),
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
                        style: TextStyle(
                            fontSize: 13,
                            color: ColorPallete.hintTextColor,
                            fontWeight: FontWeight.w500),
                      ),
                      const SizedBox(height: 26),
                      const Text('Full Name',
                          style: TextStyle(
                              fontWeight: FontWeight.w700,
                              color: ColorPallete.primaryNavy,
                              fontSize: 13)),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _nameController,
                        onChanged: (_) {
                          if (_formError != null) {
                            setState(() => _formError = null);
                          }
                        },
                        decoration: _inputDecoration(
                          'Enter your full name',
                          Icons.person_outline_rounded,
                          showErrorBorder: _nameInvalid,
                        ),
                      ),
                      const SizedBox(height: 18),
                      const Text('Phone Number',
                          style: TextStyle(
                              fontWeight: FontWeight.w700,
                              color: ColorPallete.primaryNavy,
                              fontSize: 13)),
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
                              border: Border.all(
                                color: _phoneInvalid
                                    ? ColorPallete.errorRed
                                    : ColorPallete.borderColor,
                                width: _phoneInvalid ? 1.5 : 1,
                              ),
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
                              onChanged: (_) {
                                if (_formError != null) {
                                  setState(() => _formError = null);
                                }
                              },
                              decoration: _inputDecoration(
                                '61XXXXXXX',
                                Icons.phone_outlined,
                                showErrorBorder: _phoneInvalid,
                              ).copyWith(counterText: ''),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),
                      const Text('Email',
                          style: TextStyle(
                              fontWeight: FontWeight.w700,
                              color: ColorPallete.primaryNavy,
                              fontSize: 13)),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        onChanged: (_) {
                          if (_formError != null) {
                            setState(() => _formError = null);
                          }
                        },
                        decoration: _inputDecoration(
                          'Enter your email',
                          Icons.mail_outline_rounded,
                          showErrorBorder: _emailInvalid,
                        ),
                      ),
                      const SizedBox(height: 18),
                      const Text('Password',
                          style: TextStyle(
                              fontWeight: FontWeight.w700,
                              color: ColorPallete.primaryNavy,
                              fontSize: 13)),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _passwordController,
                        focusNode: _passwordFocus,
                        obscureText: _obscurePassword,
                        enableSuggestions: false,
                        autocorrect: false,
                        keyboardType: TextInputType.visiblePassword,
                        decoration: _inputDecoration(
                          'Create a password',
                          Icons.lock_outline_rounded,
                          showErrorBorder: _showPasswordErrorBorder,
                        ).copyWith(
                          suffixIcon: IconButton(
                            focusNode: _passwordVisibilityFocus,
                            icon: Icon(
                              _obscurePassword
                                  ? Icons.visibility_off_outlined
                                  : Icons.visibility_outlined,
                              color: ColorPallete.hintTextColor,
                              size: 20,
                            ),
                            onPressed: () => setState(
                                () => _obscurePassword = !_obscurePassword),
                          ),
                        ),
                      ),
                      if (_passwordFocused) ...[
                        const SizedBox(height: 6),
                        Text(
                          '8+ chars with upper, lower, number & special (@\$!%*?&)',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: _showPasswordErrorBorder
                                ? ColorPallete.errorRed
                                : ColorPallete.hintTextColor,
                          ),
                        ),
                      ],
                      const SizedBox(height: 18),
                      const Text('Confirm Password',
                          style: TextStyle(
                              fontWeight: FontWeight.w700,
                              color: ColorPallete.primaryNavy,
                              fontSize: 13)),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _confirmPasswordController,
                        focusNode: _confirmFocus,
                        obscureText: _obscureConfirmPassword,
                        enableSuggestions: false,
                        autocorrect: false,
                        keyboardType: TextInputType.visiblePassword,
                        decoration: _inputDecoration(
                          'Confirm your password',
                          Icons.lock_outline_rounded,
                          showErrorBorder: _showConfirmErrorBorder,
                        ).copyWith(
                          suffixIcon: IconButton(
                            focusNode: _confirmVisibilityFocus,
                            icon: Icon(
                              _obscureConfirmPassword
                                  ? Icons.visibility_off_outlined
                                  : Icons.visibility_outlined,
                              color: ColorPallete.hintTextColor,
                              size: 20,
                            ),
                            onPressed: () => setState(() =>
                                _obscureConfirmPassword =
                                    !_obscureConfirmPassword),
                          ),
                        ),
                      ),
                      if (_formError != null) ...[
                        const SizedBox(height: 16),
                        Text(
                          _formError!,
                          style: const TextStyle(
                            color: ColorPallete.errorRed,
                            fontWeight: FontWeight.w600,
                            fontSize: 13,
                          ),
                        ),
                      ],
                      const SizedBox(height: 26),
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton(
                          onPressed: authProvider.isLoading
                              ? null
                              : _handleRegistration,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: ColorPallete.primaryNavy,
                            foregroundColor: Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14)),
                          ),
                          child: authProvider.isLoading
                              ? const SizedBox(
                                  width: 22,
                                  height: 22,
                                  child: CircularProgressIndicator(
                                      strokeWidth: 2.5, color: Colors.white),
                                )
                              : const Text('Sign Up',
                                  style: TextStyle(
                                      fontWeight: FontWeight.w800,
                                      fontSize: 15)),
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
                const Text('Already have an account? ',
                    style: TextStyle(color: ColorPallete.hintTextColor)),
                TextButton(
                  onPressed: () => Navigator.pushAndRemoveUntil(
                    context,
                    MaterialPageRoute(builder: (context) => const LoginPage()),
                    (route) => false,
                  ),
                  child: const Text(
                    'Sign In',
                    style: TextStyle(
                        fontWeight: FontWeight.w800,
                        color: ColorPallete.primaryNavy),
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

  InputDecoration _inputDecoration(String hint, IconData icon,
      {bool showErrorBorder = false}) {
    final borderColor =
        showErrorBorder ? ColorPallete.errorRed : ColorPallete.borderColor;
    final focusedColor =
        showErrorBorder ? ColorPallete.errorRed : ColorPallete.primaryNavy;
    return InputDecoration(
      hintText: hint,
      hintStyle:
          const TextStyle(color: ColorPallete.hintTextColor, fontSize: 14),
      prefixIcon: Icon(icon,
          color: showErrorBorder
              ? ColorPallete.errorRed
              : ColorPallete.hintTextColor,
          size: 20),
      filled: true,
      fillColor: ColorPallete.backgroundColor,
      contentPadding:
          const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: borderColor),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide:
            BorderSide(color: borderColor, width: showErrorBorder ? 1.5 : 1),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: focusedColor, width: 1.8),
      ),
    );
  }
}
