import 'package:flutter/material.dart';
import 'package:permit_app/src/utils/colors.dart';

class AppContainer extends StatelessWidget {
  final Widget child;

  const AppContainer({super.key, required this.child, });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: ColorPallete.whiteColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: ColorPallete.borderColor),
      ),
      child: child,
    );
  }
}
