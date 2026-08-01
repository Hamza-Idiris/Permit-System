/// API endpoints for Banaadir BuildPermit.
///
/// Switch [environment] (or pass `--dart-define=APP_ENV=local`) to use
/// a local backend during development.
class ApiConfig {
  /// `production` | `local`
  /// Override: flutter run/build --dart-define=APP_ENV=local
  static const String environment = String.fromEnvironment(
    'APP_ENV',
    defaultValue: 'production',
  );

  /// Live cloud API (Render). Update if your Render service name differs.
  static const String productionBaseUrl =
      'https://banaadir-permit-api.onrender.com';

  /// Optional override: --dart-define=API_BASE_URL=https://other-host.com
  static const String _apiBaseUrlOverride = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: '',
  );

  /// Optional local LAN host: --dart-define=API_HOST=192.168.100.10
  static const String _localHostOverride = String.fromEnvironment(
    'API_HOST',
    defaultValue: '',
  );

  static bool get isProduction => environment != 'local';

  static String get baseUrl {
    if (_apiBaseUrlOverride.isNotEmpty) {
      return _stripTrailingSlash(_apiBaseUrlOverride);
    }
    if (isProduction) {
      return productionBaseUrl;
    }
    return _localBaseUrl;
  }

  static String get apiBaseUrl => '$baseUrl/api';

  static String get wsUrl {
    final uri = Uri.parse(baseUrl);
    final scheme = uri.scheme == 'https' ? 'wss' : 'ws';
    return '$scheme://${uri.host}${uri.hasPort ? ':${uri.port}' : ''}/ws';
  }

  static String get _localBaseUrl {
    if (_localHostOverride.isNotEmpty) {
      return 'http://$_localHostOverride:5000';
    }
    // Android emulator loopback to host machine
    return 'http://10.0.2.2:5000';
  }

  static String _stripTrailingSlash(String url) {
    return url.endsWith('/') ? url.substring(0, url.length - 1) : url;
  }
}
