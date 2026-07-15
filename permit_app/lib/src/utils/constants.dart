import 'package:flutter/foundation.dart';
import 'dart:io' show Platform;

class Constants {
  // Automatically choose the correct localhost depending on the platform
  static String get apiBaseUrl {
    if (kIsWeb) {
      return 'http://localhost:5000/api';
    } else if (Platform.isAndroid) {
      return 'http://10.0.2.2:5000/api'; // Android emulator
    } else {
      return 'http://localhost:5000/api'; // iOS simulator or Desktop
    }
  }
}
