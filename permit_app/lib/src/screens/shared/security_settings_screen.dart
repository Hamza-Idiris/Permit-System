import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:intl/intl.dart';
import 'package:permit_app/src/utils/colors.dart';
import 'package:permit_app/src/providers/auth_provider.dart';
import 'package:permit_app/src/widgets/civic_app_bar.dart';
import 'package:provider/provider.dart';

class SecuritySettingsScreen extends StatefulWidget {
  const SecuritySettingsScreen({super.key});

  @override
  State<SecuritySettingsScreen> createState() => _SecuritySettingsScreenState();
}

class _SecuritySettingsScreenState extends State<SecuritySettingsScreen> {
  final _formKey = GlobalKey<FormState>();
  final _storage = const FlutterSecureStorage();
  
  final _currentPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  
  bool _isCurrentVisible = false;
  bool _isNewVisible = false;
  bool _isConfirmVisible = false;
  String? _currentPasswordError;
  
  String _lastChangedDate = "Loading...";
  double _strengthValue = 0;
  String _strengthLabel = "Weak";
  Color _strengthColor = Colors.red;

  @override
  void initState() {
    super.initState();
    _loadLastChanged();
    _newPasswordController.addListener(_updateStrength);
  }

  Future<void> _loadLastChanged() async {
    final dateStr = await _storage.read(key: 'passwordLastChanged');
    if (mounted) {
      setState(() {
        if (dateStr != null && dateStr.isNotEmpty) {
          final date = DateTime.parse(dateStr);
          _lastChangedDate = DateFormat('MMMM dd, yyyy').format(date);
        } else {
          _lastChangedDate = "Never changed";
        }
      });
    }
  }

  void _updateStrength() {
    final password = _newPasswordController.text;
    int strength = 0;
    
    if (password.length >= 8) strength++;
    if (password.contains(RegExp(r'[A-Z]'))) strength++;
    if (password.contains(RegExp(r'[a-z]'))) strength++;
    if (password.contains(RegExp(r'[0-9]'))) strength++;
    if (password.contains(RegExp(r'[@$!%*?&]'))) strength++;

    if (mounted) {
      setState(() {
        if (strength <= 2) {
          _strengthValue = 0.33;
          _strengthLabel = "Weak";
          _strengthColor = Colors.red;
        } else if (strength <= 4) {
          _strengthValue = 0.66;
          _strengthLabel = "Medium";
          _strengthColor = Colors.orange;
        } else {
          _strengthValue = 1.0;
          _strengthLabel = "Strong";
          _strengthColor = ColorPallete.successGreen;
        }
      });
    }
  }

  @override
  void dispose() {
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _handleSave() async {
    // Reset server-side error
    setState(() {
      _currentPasswordError = null;
    });

    if (_formKey.currentState!.validate()) {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final result = await authProvider.changePassword(
        oldPassword: _currentPasswordController.text,
        newPassword: _newPasswordController.text,
      );

      if (mounted) {
        if (result['success']) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Password updated successfully'),
              backgroundColor: ColorPallete.successGreen,
            ),
          );
          Navigator.pop(context);
        } else {
          // If the error is specifically about the old/current password
          final msg = result['message']?.toString().toLowerCase() ?? '';
          if (msg.contains('current') || msg.contains('old') || msg.contains('incorrect')) {
            setState(() {
              _currentPasswordError = 'Incorrect current password';
            });
            // Trigger validation to show the error
            _formKey.currentState!.validate();
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(result['message'] ?? 'Update failed'),
                backgroundColor: ColorPallete.errorRed,
              ),
            );
          }
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryColor = isDark ? Colors.white : ColorPallete.primaryNavy;
    final scaffoldBg = isDark ? ColorPallete.darkBackgroundColor : const Color(0xFFF8FAFC);
    final cardColor = isDark ? const Color(0xFF1E1E1E) : Colors.white;

    return Scaffold(
      backgroundColor: scaffoldBg,
      appBar: const CivicAppBar(title: 'Security Settings'),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0),
          child: Form(
            key: _formKey,
            child: Column(
              children: [
                const SizedBox(height: 20),
                
                // Icon Header
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.blue.withOpacity(0.05),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.security, color: ColorPallete.secondaryNavy, size: 40),
                ),
                
                const SizedBox(height: 15),
                Text(
                  'Change Password',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: primaryColor,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Update your password to keep your\nM-DBPS account secure.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: ColorPallete.hintTextColor, fontSize: 14),
                ),
                
                const SizedBox(height: 30),
                
                // Password Card
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: cardColor,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.02),
                        blurRadius: 10,
                        offset: const Offset(0, 5),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildLabel('CURRENT PASSWORD'),
                      _buildPasswordField(
                        _currentPasswordController,
                        _isCurrentVisible,
                        (v) => setState(() => _isCurrentVisible = v),
                        isCurrent: true,
                      ),
                      const SizedBox(height: 20),
                      
                      _buildLabel('NEW PASSWORD'),
                      _buildPasswordField(
                        _newPasswordController,
                        _isNewVisible,
                        (v) => setState(() => _isNewVisible = v),
                        validateRules: true,
                      ),
                      const SizedBox(height: 10),
                      
                      // Strength Meter
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Security Strength', style: TextStyle(fontSize: 12, color: Colors.grey)),
                          Text(_strengthLabel, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: _strengthColor)),
                        ],
                      ),
                      const SizedBox(height: 8),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: LinearProgressIndicator(
                          value: _strengthValue,
                          backgroundColor: Colors.grey.shade200,
                          valueColor: AlwaysStoppedAnimation<Color>(_strengthColor),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          const Icon(Icons.info_outline, size: 14, color: Colors.grey),
                          const SizedBox(width: 8),
                          const Expanded(
                            child: Text(
                              'Use at least 8 characters with a mix of letters, numbers & symbols.',
                              style: TextStyle(fontSize: 11, color: Colors.grey),
                            ),
                          ),
                        ],
                      ),
                      
                      const SizedBox(height: 20),
                      _buildLabel('CONFIRM NEW PASSWORD'),
                      _buildPasswordField(
                        _confirmPasswordController,
                        _isConfirmVisible,
                        (v) => setState(() => _isConfirmVisible = v),
                        isConfirm: true,
                      ),
                    ],
                  ),
                ),
                
                const SizedBox(height: 30),
                
                // Action Buttons
                Consumer<AuthProvider>(
                  builder: (context, auth, child) {
                    return SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: auth.isLoading ? null : _handleSave,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.black,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          elevation: 0,
                        ),
                        child: auth.isLoading
                          ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Text('Save Password', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      ),
                    );
                  }
                ),
                
                const SizedBox(height: 12),
                
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(color: Colors.grey.shade300),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Cancel', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 16)),
                  ),
                ),
                
                const SizedBox(height: 30),
                
                // Last Changed Card
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isDark ? Colors.white.withOpacity(0.05) : Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(15),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(10),
                          boxShadow: [
                            BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 5),
                          ],
                        ),
                        child: const Icon(Icons.history, color: ColorPallete.primaryNavy, size: 20),
                      ),
                      const SizedBox(width: 15),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Last Changed',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: primaryColor,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Your password was last updated on\n$_lastChangedDate.',
                              style: const TextStyle(fontSize: 12, color: Colors.grey, height: 1.4),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 40),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLabel(String label) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Text(
        label,
        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey),
      ),
    );
  }

  Widget _buildPasswordField(
    TextEditingController controller,
    bool visible,
    Function(bool) toggle, {
    bool validateRules = false,
    bool isConfirm = false,
    bool isCurrent = false,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return TextFormField(
      controller: controller,
      obscureText: !visible,
      style: TextStyle(color: isDark ? Colors.white : Colors.black, fontSize: 13),
      decoration: InputDecoration(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        filled: true,
        fillColor: isDark ? Colors.white.withOpacity(0.05) : Colors.grey.shade50,
        errorStyle: const TextStyle(color: Colors.red, fontSize: 11),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.grey.shade200),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.grey.shade200),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: ColorPallete.primaryNavy),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Colors.red, width: 1),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Colors.red, width: 2),
        ),
        suffixIcon: IconButton(
          icon: Icon(
            visible ? Icons.visibility : Icons.visibility_off,
            color: Colors.grey,
            size: 18,
          ),
          onPressed: () => toggle(!visible),
        ),
      ),
      validator: (value) {
        if (isCurrent && _currentPasswordError != null) {
          return _currentPasswordError;
        }
        
        if (value == null || value.isEmpty) return 'Field is required';
        
        if (validateRules) {
          if (value.length < 8) return 'At least 8 characters';
          if (!value.contains(RegExp(r'[A-Z]'))) return 'One uppercase letter';
          if (!value.contains(RegExp(r'[a-z]'))) return 'One lowercase letter';
          if (!value.contains(RegExp(r'[0-9]'))) return 'One number';
          if (!value.contains(RegExp(r'[@$!%*?&]'))) return 'One special character';
        }
        
        if (isConfirm) {
          if (value != _newPasswordController.text) {
            return 'Passwords do not match';
          }
        }
        
        return null;
      },
    );
  }
}
