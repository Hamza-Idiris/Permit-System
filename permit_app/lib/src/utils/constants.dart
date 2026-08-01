import 'api_config.dart';

class Constants {
  /// Live / local API root including `/api`.
  /// See [ApiConfig] to switch environments.
  static String get apiBaseUrl => ApiConfig.apiBaseUrl;

  /// WebSocket endpoint (`wss://` in production, `ws://` locally).
  static String get wsUrl => ApiConfig.wsUrl;
}
