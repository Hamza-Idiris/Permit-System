import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:permit_app/src/utils/colors.dart';
import 'package:permit_app/src/providers/theme_provider.dart';
import 'package:permit_app/src/screens/home_tab.dart';
import 'package:permit_app/src/screens/scan_screen.dart';
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
        height: 70,
        width: 70,
        child: FloatingActionButton(
          onPressed: _openScanner,
          backgroundColor: ColorPallete.primaryNavy,
          elevation: 8,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          child: const Icon(
            Icons.camera_alt_rounded,
            color: Colors.white,
            size: 32,
          ),
        ),
      ),
    );
  }
}
