import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Stores scan history in SharedPreferences (NOT in FlutterSecureStorage)
/// so that calling _storage.deleteAll() on logout does NOT wipe the data.
///
/// Each inspector's history is stored under a key that includes their email,
/// e.g.  "scan_history_inspector@gov.so"
/// This lets multiple inspectors share the same device while keeping
/// their individual scan logs separate.
///
/// Auto-filtering: getCurrentMonthScans() always returns only the current
/// calendar month's records, so the dashboard resets naturally each month
/// without any destructive deletion.
class ScanHistoryService {
  static const String _keyPrefix = 'scan_history_';
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();

  // ── Key helpers ────────────────────────────────────────────────────────────

  Future<String> _storageKey() async {
    // Use the inspector's email as part of the key so different
    // inspectors on the same device have separate histories.
    final email = await _secureStorage.read(key: 'email') ?? 'unknown';
    // Sanitise the email so it's a valid prefs key
    final safeEmail = email.replaceAll(RegExp(r'[^a-zA-Z0-9_]'), '_');
    return '$_keyPrefix$safeEmail';
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────

  /// Save (or update) a scan record.
  Future<void> saveScan({
    required String permitId,
    required bool isSuccess,
    required Map<String, dynamic> permitData,
  }) async {
    final key     = await _storageKey();
    final history = await _getAllScans(key);
    final now     = DateTime.now();

    // If this permit was already scanned THIS month, just update its entry.
    final currentMonthStr =
        '${now.year}-${now.month.toString().padLeft(2, '0')}';

    final existingIndex = history.indexWhere((scan) {
      if (scan['permitId'] != permitId) return false;
      try {
        final scanDate = DateTime.parse(scan['timestamp'] as String);
        final scanMonthStr =
            '${scanDate.year}-${scanDate.month.toString().padLeft(2, '0')}';
        return scanMonthStr == currentMonthStr;
      } catch (_) {
        return false;
      }
    });

    if (existingIndex != -1) {
      history[existingIndex]['timestamp'] = now.toIso8601String();
      history[existingIndex]['status']    = isSuccess ? 'success' : 'failed';
      history[existingIndex]['permitData'] = permitData;
      final updated = history.removeAt(existingIndex);
      history.insert(0, updated);
    } else {
      history.insert(0, {
        'permitId':   permitId,
        'status':     isSuccess ? 'success' : 'failed',
        'timestamp':  now.toIso8601String(),
        'permitData': permitData,
      });
    }

    await _write(key, history);
  }

  /// All scans ever stored for the current inspector (all months).
  Future<List<Map<String, dynamic>>> getScans() async {
    final key = await _storageKey();
    return _getAllScans(key);
  }

  /// Only scans from the current calendar month.
  /// The dashboard calls this — so stats naturally reset each new month.
  Future<List<Map<String, dynamic>>> getCurrentMonthScans() async {
    final scans  = await getScans();
    final now    = DateTime.now();
    final curMonth =
        '${now.year}-${now.month.toString().padLeft(2, '0')}';

    return scans.where((scan) {
      try {
        final scanDate = DateTime.parse(scan['timestamp'] as String);
        final scanMonth =
            '${scanDate.year}-${scanDate.month.toString().padLeft(2, '0')}';
        return scanMonth == curMonth;
      } catch (_) {
        return false;
      }
    }).toList();
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  Future<List<Map<String, dynamic>>> _getAllScans(String key) async {
    final prefs      = await SharedPreferences.getInstance();
    final dataString = prefs.getString(key);
    if (dataString == null || dataString.isEmpty) return [];
    try {
      final List<dynamic> decoded = jsonDecode(dataString);
      return decoded.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> _write(
      String key, List<Map<String, dynamic>> history) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(key, jsonEncode(history));
  }
}
