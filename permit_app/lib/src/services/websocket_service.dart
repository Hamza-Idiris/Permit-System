import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:permit_app/src/utils/constants.dart';

class WebSocketService {
  static final WebSocketService _instance = WebSocketService._internal();
  factory WebSocketService() => _instance;

  WebSocketService._internal();

  WebSocketChannel? _channel;
  bool _isConnecting = false;
  bool _isConnected = false;
  Timer? _reconnectTimer;
  String? _currentUserToken;

  final Set<Function(Map<String, dynamic>)> _listeners = {};
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  bool get isConnected => _isConnected;

  /// Register listener callback on WebSocket packet updates
  void addListener(Function(Map<String, dynamic>) listener) {
    _listeners.add(listener);
  }

  /// Remove registered listener callback
  void removeListener(Function(Map<String, dynamic>) listener) {
    _listeners.remove(listener);
  }

  /// Start connection to WebSocket backend using current storage token
  Future<void> connect() async {
    try {
      final token = await _storage.read(key: 'token');
      if (token == null || token.isEmpty) {
        debugPrint('WebSocketService: No auth token found; skipping connection.');
        return;
      }
      _currentUserToken = token;
      _connectWithToken(token);
    } catch (e) {
      debugPrint('WebSocketService Error reading token: $e');
    }
  }

  void _connectWithToken(String token) {
    if (_isConnecting || _isConnected) return;
    _isConnecting = true;

    final wsUri = Uri.parse(Constants.wsUrl);
    debugPrint('WebSocketService: Attempting connection to $wsUri');

    try {
      _channel = WebSocketChannel.connect(wsUri);
      
      // Send authentication payload on connection
      _sendRegisterPayload(token);

      _channel!.stream.listen(
        (message) {
          _isConnected = true;
          _isConnecting = false;
          _handleMessage(message);
        },
        onError: (error) {
          debugPrint('WebSocketService: Connection error: $error');
          _handleDisconnect();
        },
        onDone: () {
          debugPrint('WebSocketService: Connection closed by server.');
          _handleDisconnect();
        },
        cancelOnError: true,
      );
    } catch (e) {
      debugPrint('WebSocketService: Failed to connect: $e');
      _handleDisconnect();
    }
  }

  void _sendRegisterPayload(String token) {
    try {
      final payload = jsonEncode({
        'type': 'register',
        'token': token,
      });
      _channel?.sink.add(payload);
      debugPrint('WebSocketService: Sent register credentials');
    } catch (e) {
      debugPrint('WebSocketService: Error sending registration: $e');
    }
  }

  void _handleMessage(dynamic message) {
    try {
      final Map<String, dynamic> data = jsonDecode(message.toString());
      debugPrint('WebSocketService Received message: ${data['type']}');

      // Keep connection status true when a message is successfully processed
      _isConnected = true;

      // Notify all UI/Provider listeners
      for (final listener in _listeners) {
        try {
          listener(data);
        } catch (e) {
          debugPrint('WebSocketService: Exception in callback listener: $e');
        }
      }
    } catch (e) {
      debugPrint('WebSocketService: Error parsing message content: $e');
    }
  }

  void _handleDisconnect() {
    _isConnected = false;
    _isConnecting = false;
    _channel = null;

    // Reschedule reconnection
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(const Duration(seconds: 8), () {
      if (_currentUserToken != null) {
        debugPrint('WebSocketService: Attempting automatic reconnection...');
        _connectWithToken(_currentUserToken!);
      }
    });
  }

  /// Disconnect current WebSocket stream connection and clear listeners
  void disconnect() {
    _reconnectTimer?.cancel();
    _currentUserToken = null;
    try {
      _channel?.sink.close();
    } catch (_) {}
    _channel = null;
    _isConnected = false;
    _isConnecting = false;
    debugPrint('WebSocketService: Disconnected and state reset.');
  }
}
