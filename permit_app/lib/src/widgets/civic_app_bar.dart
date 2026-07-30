import 'package:flutter/material.dart';
import 'package:permit_app/src/providers/theme_provider.dart';
import 'package:permit_app/src/utils/colors.dart';
import 'package:provider/provider.dart';

/// Shared applicant AppBar — white/surface bar, navy title, subtle bottom border.
class CivicAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final List<Widget>? actions;
  final bool automaticallyImplyLeading;
  final Widget? leading;
  final bool centerTitle;

  const CivicAppBar({
    super.key,
    required this.title,
    this.actions,
    this.automaticallyImplyLeading = true,
    this.leading,
    this.centerTitle = true,
  });

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight + 1);

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;
    final fg = isDark ? Colors.white : ColorPallete.primaryNavy;
    final bg = isDark ? ColorPallete.cardDark : Colors.white;

    return AppBar(
      title: Text(
        title,
        style: TextStyle(
          fontWeight: FontWeight.w800,
          fontSize: 18,
          color: fg,
        ),
      ),
      backgroundColor: bg,
      foregroundColor: fg,
      elevation: 0,
      scrolledUnderElevation: 0,
      surfaceTintColor: Colors.transparent,
      centerTitle: centerTitle,
      automaticallyImplyLeading: automaticallyImplyLeading,
      leading: leading,
      actions: actions,
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(1),
        child: Container(
          height: 1,
          color: isDark ? Colors.white10 : ColorPallete.borderColor,
        ),
      ),
    );
  }
}
