import 'package:device_preview/device_preview.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:permit_app/src/screens/onboarding_screen.dart';
import 'package:provider/provider.dart';
import 'package:permit_app/src/providers/theme_provider.dart';
import 'package:permit_app/src/providers/auth_provider.dart';
import 'package:permit_app/src/utils/colors.dart';

void main() {
  runApp(
    DevicePreview(
      enabled: !kReleaseMode,
      builder: (context) => const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    final textTheme = GoogleFonts.plusJakartaSansTextTheme();

    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
      ],
      child: Consumer<ThemeProvider>(
        builder: (context, themeProvider, child) {
          return MaterialApp(
            useInheritedMediaQuery: true,
            builder: DevicePreview.appBuilder,
            debugShowCheckedModeBanner: false,
            title: 'Urban Permits',
            themeMode: themeProvider.isDarkMode ? ThemeMode.dark : ThemeMode.light,
            theme: ThemeData(
              useMaterial3: true,
              textTheme: textTheme,
              colorScheme: ColorScheme.fromSeed(
                seedColor: ColorPallete.primaryNavy,
                primary: ColorPallete.primaryNavy,
                secondary: ColorPallete.accentTeal,
                background: ColorPallete.backgroundColor,
              ),
              scaffoldBackgroundColor: ColorPallete.backgroundColor,
              appBarTheme: AppBarTheme(
                backgroundColor: Colors.white,
                elevation: 0,
                centerTitle: true,
                titleTextStyle: GoogleFonts.plusJakartaSans(
                  color: ColorPallete.primaryNavy,
                  fontWeight: FontWeight.w800,
                  fontSize: 18,
                ),
              ),
            ),
            darkTheme: ThemeData(
              useMaterial3: true,
              brightness: Brightness.dark,
              textTheme: GoogleFonts.plusJakartaSansTextTheme(ThemeData.dark().textTheme),
              scaffoldBackgroundColor: ColorPallete.darkBackgroundColor,
              colorScheme: ColorScheme.fromSeed(
                brightness: Brightness.dark,
                seedColor: ColorPallete.primaryNavy,
                primary: ColorPallete.primaryNavy,
                secondary: ColorPallete.accentTeal,
                background: ColorPallete.darkBackgroundColor,
              ),
              appBarTheme: AppBarTheme(
                backgroundColor: ColorPallete.cardDark,
                elevation: 0,
                centerTitle: true,
                titleTextStyle: GoogleFonts.plusJakartaSans(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                  fontSize: 18,
                ),
              ),
            ),
            home: const OnboardingScreen(),
          );
        },
      ),
    );
  }
}
