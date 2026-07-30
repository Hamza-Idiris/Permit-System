import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:permit_app/src/utils/colors.dart';
import 'package:permit_app/src/providers/auth_provider.dart';
import 'package:permit_app/src/widgets/civic_app_bar.dart';
import 'package:provider/provider.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _storage = const FlutterSecureStorage();
  
  late TextEditingController _nameController;
  late TextEditingController _emailController;
  late TextEditingController _countryCodeController;
  late TextEditingController _phoneController;
  late TextEditingController _passwordController;
  
  bool _isPasswordVisible = false;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController();
    _emailController = TextEditingController();
    _countryCodeController = TextEditingController(text: '+252');
    _phoneController = TextEditingController();
    _passwordController = TextEditingController();
    
    _nameController.addListener(() {
      setState(() {}); // For live avatar update
    });
    
    _loadCurrentData();
  }

  Future<void> _loadCurrentData() async {
    final name = await _storage.read(key: 'fullName');
    final email = await _storage.read(key: 'email');
    final phone = await _storage.read(key: 'phone');
    
    setState(() {
      _nameController.text = name ?? "";
      _emailController.text = email ?? "";
      if (phone != null) {
        if (phone.startsWith('+252')) {
          _countryCodeController.text = '+252';
          _phoneController.text = phone.replaceFirst('+252', '');
        } else {
          _phoneController.text = phone;
        }
      }
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _countryCodeController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleUpdate() async {
    if (_formKey.currentState!.validate()) {
      if (_passwordController.text.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please enter your current password to save changes')),
        );
        return;
      }

      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final fullPhoneNumber = "${_countryCodeController.text}${_phoneController.text.trim()}";
      final result = await authProvider.updateProfile(
        fullName: _nameController.text.trim(),
        email: _emailController.text.trim(),
        phone: fullPhoneNumber,
        currentPassword: _passwordController.text,
      );

      if (mounted) {
        if (result['success']) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Profile updated successfully'),
              backgroundColor: ColorPallete.successGreen,
            ),
          );
          Navigator.pop(context, true); // Return true to indicate update happened
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

  @override
  Widget build(BuildContext context) {
    // We use a light theme explicitly for this screen as per image or match app theme
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryColor = isDark ? Colors.white : ColorPallete.primaryNavy;
    final scaffoldBg = isDark ? ColorPallete.darkBackgroundColor : Color(0xFFF8FAFC);
    final cardColor = isDark ? const Color(0xFF1E1E1E) : Colors.white;

    return Scaffold(
      backgroundColor: scaffoldBg,
      appBar: const CivicAppBar(title: 'Edit Profile'),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0),
          child: Form(
            key: _formKey,
            child: Column(
              children: [
                const SizedBox(height: 20),
                
                // Avatar with First Letter
                Center(
                  child: Container(
                    width: 110,
                    height: 110,
                    decoration: BoxDecoration(
                      color: ColorPallete.primaryNavy,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 3),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.1),
                          blurRadius: 10,
                          offset: const Offset(0, 5),
                        ),
                      ],
                    ),
                    child: Center(
                      child: Text(
                        _nameController.text.isNotEmpty ? _nameController.text[0].toUpperCase() : '?',
                        style: const TextStyle(
                          fontSize: 48,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ),
                
                const SizedBox(height: 15),
                Text(
                  _nameController.text,
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: primaryColor,
                  ),
                ),
                const Text(
                  'Profile Member since 2023',
                  style: TextStyle(color: ColorPallete.hintTextColor, fontSize: 13),
                ),
                
                const SizedBox(height: 30),
                
                // Form Fields Container
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
                      _buildLabel('Full Name'),
                      _buildTextField(_nameController, Icons.person_outline),
                      const SizedBox(height: 20),
                      
                      _buildLabel('Email Address'),
                      _buildTextField(_emailController, Icons.email_outlined, keyboardType: TextInputType.emailAddress),
                      const SizedBox(height: 20),
                      
                      _buildLabel('Phone Number'),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SizedBox(
                            width: 80,
                            child: _buildTextField(_countryCodeController, null, readOnly: true),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: _buildTextField(_phoneController, null, keyboardType: TextInputType.phone),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          _buildLabel('Current Password'),
                          TextButton(
                            onPressed: () {},
                            child: const Text('Change', style: TextStyle(color: Colors.grey, fontSize: 12)),
                          ),
                        ],
                      ),
                      _buildPasswordField(),
                    ],
                  ),
                ),
                
                const SizedBox(height: 24),
                
                // Info Box
                Container(
                  padding: const EdgeInsets.all(15),
                  decoration: BoxDecoration(
                    color: Colors.blue.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.info_outline, color: Colors.blue, size: 20),
                      const SizedBox(width: 12),
                      Expanded(
                        child: const Text(
                          'Changes to your primary contact information may require additional verification for certain permit types.',
                          style: TextStyle(color: Colors.blue, fontSize: 12, height: 1.4),
                        ),
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
                        onPressed: auth.isLoading ? null : _handleUpdate,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: ColorPallete.primaryNavy,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          elevation: 0,
                        ),
                        child: auth.isLoading
                          ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Text('Save Changes', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
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
      padding: const EdgeInsets.only(bottom: 8.0, left: 4),
      child: Text(
        label,
        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.grey),
      ),
    );
  }

  Widget _buildTextField(TextEditingController controller, IconData? icon, {TextInputType keyboardType = TextInputType.text, bool readOnly = false}) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      readOnly: readOnly,
      style: TextStyle(color: isDark ? Colors.white : Colors.black, fontSize: 15),
      decoration: InputDecoration(
        prefixIcon: icon != null ? Icon(icon, color: Colors.grey, size: 20) : null,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        filled: true,
        fillColor: isDark ? Colors.white.withOpacity(0.05) : (readOnly ? Colors.grey.shade100 : Colors.grey.shade50),
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
      ),
      validator: (value) {
        if (value == null || value.isEmpty) return 'Required';
        return null;
      },
    );
  }

  Widget _buildPasswordField() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return TextFormField(
      controller: _passwordController,
      obscureText: !_isPasswordVisible,
      style: TextStyle(color: isDark ? Colors.white : Colors.black, fontSize: 15),
      decoration: InputDecoration(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        filled: true,
        fillColor: isDark ? Colors.white.withOpacity(0.05) : Colors.grey.shade50,
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
        suffixIcon: IconButton(
          icon: Icon(
            _isPasswordVisible ? Icons.visibility : Icons.visibility_off,
            color: Colors.grey,
            size: 20,
          ),
          onPressed: () => setState(() => _isPasswordVisible = !_isPasswordVisible),
        ),
      ),
    );
  }
}
