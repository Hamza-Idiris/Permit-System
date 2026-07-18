import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ScanHistoryService {
  static const String _storageKey = 'inspector_scan_history';
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  // Save a new scan record
  Future<void> saveScan({
    required String permitId,
    required bool isSuccess,
    required Map<String, dynamic> permitData,
  }) async {
    final history = await getScans();
    final now = DateTime.now();
    
    // Check if we already scanned this permit THIS month
    final currentMonthStr = '${now.year}-${now.month.toString().padLeft(2, '0')}';
    
    int existingIndex = history.indexWhere((scan) {
      if (scan['permitId'] != permitId) return false;
      final scanDate = DateTime.parse(scan['timestamp']);
      final scanMonthStr = '${scanDate.year}-${scanDate.month.toString().padLeft(2, '0')}';
      return scanMonthStr == currentMonthStr;
    });

    if (existingIndex != -1) {
      // Update the timestamp of the existing record to now, but keep its status/data
      // Or just replace it with the new result
      history[existingIndex]['timestamp'] = now.toIso8601String();
      history[existingIndex]['status'] = isSuccess ? 'success' : 'failed';
      history[existingIndex]['permitData'] = permitData;
      
      // Move to top of the list so it appears first in "recent"
      final updatedScan = history.removeAt(existingIndex);
      history.insert(0, updatedScan);
    } else {
      // Add new record
      history.insert(0, {
        'permitId': permitId,
        'status': isSuccess ? 'success' : 'failed',
        'timestamp': now.toIso8601String(),
        'permitData': permitData,
      });
    }

    await _storage.write(key: _storageKey, value: jsonEncode(history));
  }

  // Get all scans
  Future<List<Map<String, dynamic>>> getScans() async {
    final dataString = await _storage.read(key: _storageKey);
    if (dataString == null || dataString.isEmpty) return [];
    try {
      final List<dynamic> decoded = jsonDecode(dataString);
      return decoded.map((e) => Map<String, dynamic>.from(e)).toList();
    } catch (e) {
      return [];
    }
  }

  // Get scans for current month only
  Future<List<Map<String, dynamic>>> getCurrentMonthScans() async {
    final scans = await getScans();
    final now = DateTime.now();
    final currentMonthStr = '${now.year}-${now.month.toString().padLeft(2, '0')}';
    
    return scans.where((scan) {
      final scanDate = DateTime.parse(scan['timestamp']);
      final scanMonthStr = '${scanDate.year}-${scanDate.month.toString().padLeft(2, '0')}';
      return scanMonthStr == currentMonthStr;
    }).toList();
  }
}
