import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:permit_app/src/utils/colors.dart';
import 'package:permit_app/src/providers/theme_provider.dart';
import 'package:permit_app/src/screens/inspector/home_tab.dart';
import 'package:permit_app/src/screens/inspector/scan_screen.dart';
import 'package:flutter/cupertino.dart'; // For CupertinoIcons if needed

class InspectorDashboard extends StatefulWidget {
  const InspectorDashboard({super.key});

  @override
  State<InspectorDashboard> createState() => _InspectorDashboardState();
}

class _InspectorDashboardState extends State<InspectorDashboard> {
  final GlobalKey<HomeTabState> _homeTabKey = GlobalKey<HomeTabState>();

  void _openScanner() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const ScanScreen()),
    ).then((_) {
      // Refresh dashboard stats after returning from scan
      _homeTabKey.currentState?.loadData();
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;

    return Scaffold(
      backgroundColor: isDark ? ColorPallete.darkBackgroundColor : ColorPallete.backgroundColor,
      body: HomeTab(
        key: _homeTabKey,
        onScanTap: _openScanner,
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
        floatingActionButton: Container(
        margin: const EdgeInsets.only(bottom: 20),
        height: 68,
        width: 68,
        child: FloatingActionButton(
          onPressed: _openScanner,
          backgroundColor: ColorPallete.accentTeal,
          elevation: 6,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          child: const Icon(
            Icons.qr_code_scanner_rounded,
            color: Colors.white,
            size: 30,
          ),
        ),
      ),
    );
  }
}
