import 'package:flutter/material.dart ';
import 'package:permit_app/src/utils/colors.dart';

class AppTextInput extends StatelessWidget {
  final TextEditingController controller;
  final String hintText;
  final bool obscureText;
  final IconData icon;

  const AppTextInput({
    super.key,
    required this.controller,
    required this.hintText,
    this.obscureText = false,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      obscureText: obscureText,
      decoration: InputDecoration(
        contentPadding: const EdgeInsets.symmetric(vertical: 15, horizontal: 20),
        hintText: hintText,
        hintStyle: const TextStyle(color: ColorPallete.hintTextColor),
        prefixIcon: Icon(icon, color: ColorPallete.hintTextColor),
        filled: true,
        fillColor: ColorPallete.backgroundColor,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: ColorPallete.borderColor),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: ColorPallete.borderColor),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: ColorPallete.primaryNavy),
        ),
      ),
    );
  }
}
