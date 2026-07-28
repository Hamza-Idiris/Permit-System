import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:permit_app/src/utils/constants.dart';


class PermitService {
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  Future<Map<String, dynamic>> submitApplication({
    required String fullName,
    required String phone,
    required String email,
    required String plotId,
    required String district,
    required String requestType,
    required String buildingCategory,
    required String floors,
    required String landArea,
    String? totalFee,
    required List<int> nationalIdBytes,
    required String nationalIdName,
    required List<int> ownershipDocsBytes,
    required String ownershipDocsName,
  }) async {
    try {
      final token = await _storage.read(key: 'token');
      if (token == null) return {'success': false, 'message': 'No authentication token found'};

      var request = http.MultipartRequest('POST', Uri.parse('${Constants.apiBaseUrl}/permits/apply'));
      
      request.headers.addAll({
        'Authorization': 'Bearer $token',
      });

      // Add text fields
      request.fields['fullName'] = fullName;
      request.fields['phone'] = phone;
      request.fields['email'] = email;
      request.fields['plotId'] = plotId;
      request.fields['district'] = district;
      request.fields['requestType'] = requestType;
      request.fields['buildingCategory'] = buildingCategory;
      request.fields['floors'] = floors;
      request.fields['landArea'] = landArea;
      if (totalFee != null) request.fields['totalFee'] = totalFee;

      // Add files using fromBytes
      request.files.add(http.MultipartFile.fromBytes(
        'nationalId',
        nationalIdBytes,
        filename: nationalIdName,
      ));

      request.files.add(http.MultipartFile.fromBytes(
        'ownershipDocs',
        ownershipDocsBytes,
        filename: ownershipDocsName,
      ));

      final response = await request.send();
      final responseBody = await response.stream.bytesToString();
      final data = jsonDecode(responseBody);

      if (response.statusCode == 201) {
        return {'success': true, 'data': data};
      } else {
        return {'success': false, 'message': data['message'] ?? 'Failed to submit application'};
      }
    } catch (e) {
      return {'success': false, 'message': 'An error occurred: $e'};
    }
  }

  Future<Map<String, dynamic>> getMyApplications() async {
    try {
      final token = await _storage.read(key: 'token');
      if (token == null) return {'success': false, 'message': 'No authentication token found'};

      final response = await http.get(
        Uri.parse('${Constants.apiBaseUrl}/permits/my-applications'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 10));

      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        return {'success': true, 'data': data['data']};
      } else {
        return {'success': false, 'message': data['message'] ?? 'Failed to fetch applications'};
      }
    } catch (e) {
      return {'success': false, 'message': 'An error occurred: $e'};
    }
  }

  Future<Map<String, dynamic>> getMyTransactions() async {
    try {
      final token = await _storage.read(key: 'token');
      if (token == null) return {'success': false, 'message': 'No authentication token found'};

      final response = await http.get(
        Uri.parse('${Constants.apiBaseUrl}/permits/my-transactions'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 10));

      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        return {'success': true, 'data': data['data']};
      } else {
        return {'success': false, 'message': data['message'] ?? 'Failed to fetch transactions'};
      }
    } catch (e) {
      return {'success': false, 'message': 'An error occurred: $e'};
    }
  }

  Future<Map<String, dynamic>> updateApplication({
    required String applicationId,
    required String fullName,
    required String phone,
    required String email,
    required String plotId,
    required String district,
    required String requestType,
    required String buildingCategory,
    required String floors,
    required String landArea,
    String? totalFee,
    List<int>? nationalIdBytes,
    String? nationalIdName,
    List<int>? ownershipDocsBytes,
    String? ownershipDocsName,
  }) async {
    try {
      final token = await _storage.read(key: 'token');
      if (token == null) return {'success': false, 'message': 'No authentication token found'};

      var request = http.MultipartRequest('PUT', Uri.parse('${Constants.apiBaseUrl}/permits/$applicationId'));
      request.headers.addAll({'Authorization': 'Bearer $token'});

      request.fields['fullName'] = fullName;
      request.fields['phone'] = phone;
      request.fields['email'] = email;
      request.fields['plotId'] = plotId;
      request.fields['district'] = district;
      request.fields['requestType'] = requestType;
      request.fields['buildingCategory'] = buildingCategory;
      request.fields['floors'] = floors;
      request.fields['landArea'] = landArea;
      if (totalFee != null) request.fields['totalFee'] = totalFee;

      if (nationalIdBytes != null && nationalIdName != null) {
        request.files.add(http.MultipartFile.fromBytes('nationalId', nationalIdBytes, filename: nationalIdName));
      }
      if (ownershipDocsBytes != null && ownershipDocsName != null) {
        request.files.add(http.MultipartFile.fromBytes('ownershipDocs', ownershipDocsBytes, filename: ownershipDocsName));
      }

      final response = await request.send();
      final responseBody = await response.stream.bytesToString();
      final data = jsonDecode(responseBody);

      if (response.statusCode == 200) {
        return {'success': true, 'data': data};
      } else {
        return {'success': false, 'message': data['message'] ?? 'Failed to update application'};
      }
    } catch (e) {
      return {'success': false, 'message': 'An error occurred: $e'};
    }
  }

  Future<Map<String, dynamic>> getNotifications() async {
    try {
      final token = await _storage.read(key: 'token');
      if (token == null) return {'success': false, 'message': 'No authentication token found'};

      final response = await http.get(
        Uri.parse('${Constants.apiBaseUrl}/notifications'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 10));

      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'data': data['data'],
          'unreadCount': data['unreadCount']
        };
      } else {
        return {'success': false, 'message': data['message'] ?? 'Failed to fetch notifications'};
      }
    } catch (e) {
      return {'success': false, 'message': 'An error occurred: $e'};
    }
  }

  Future<Map<String, dynamic>> markNotificationAsRead(String notificationId) async {
    try {
      final token = await _storage.read(key: 'token');
      if (token == null) return {'success': false, 'message': 'No authentication token found'};

      final response = await http.put(
        Uri.parse('${Constants.apiBaseUrl}/notifications/$notificationId/read'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 10));

      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        return {'success': true, 'data': data['data']};
      } else {
        return {'success': false, 'message': data['message'] ?? 'Failed to mark notification as read'};
      }
    } catch (e) {
      return {'success': false, 'message': 'An error occurred: $e'};
    }
  }

  Future<Map<String, dynamic>> deleteNotification(String notificationId) async {
    try {
      final token = await _storage.read(key: 'token');
      if (token == null) return {'success': false, 'message': 'No authentication token found'};

      final response = await http.delete(
        Uri.parse('${Constants.apiBaseUrl}/notifications/$notificationId'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 10));

      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        return {'success': true, 'message': data['message']};
      } else {
        return {'success': false, 'message': data['message'] ?? 'Failed to delete notification'};
      }
    } catch (e) {
      return {'success': false, 'message': 'An error occurred: $e'};
    }
  }

  Future<Map<String, dynamic>> getDistricts() async {
    try {
      final token = await _storage.read(key: 'token');
      if (token == null) return {'success': false, 'message': 'No authentication token found'};

      final response = await http.get(
        Uri.parse('${Constants.apiBaseUrl}/districts'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 10));

      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        return {'success': true, 'data': data['data']};
      } else {
        return {'success': false, 'message': data['message'] ?? 'Failed to fetch districts'};
      }
    } catch (e) {
      return {'success': false, 'message': 'An error occurred: $e'};
    }
  }

  Future<Map<String, dynamic>> getBuildingTypes() async {
    try {
      final token = await _storage.read(key: 'token');
      if (token == null) return {'success': false, 'message': 'No authentication token found'};

      final response = await http.get(
        Uri.parse('${Constants.apiBaseUrl}/building-types'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 10));

      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        return {'success': true, 'data': data['data']};
      } else {
        return {'success': false, 'message': data['message'] ?? 'Failed to fetch building types'};
      }
    } catch (e) {
      return {'success': false, 'message': 'An error occurred: $e'};
    }
  }

  Future<Map<String, dynamic>> getRenovationTypes() async {
    try {
      final token = await _storage.read(key: 'token');
      if (token == null) return {'success': false, 'message': 'No authentication token found'};

      final response = await http.get(
        Uri.parse('${Constants.apiBaseUrl}/renovation-types'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 10));

      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        return {'success': true, 'data': data['data']};
      } else {
        return {'success': false, 'message': data['message'] ?? 'Failed to fetch renovation types'};
      }
    } catch (e) {
      return {'success': false, 'message': 'An error occurred: $e'};
    }
  }

  Future<Map<String, dynamic>> processPayment({
    required String phone,
    required double amount,
    String? applicationId,
    String? mockStatus,
  }) async {
    try {
      final token = await _storage.read(key: 'token');
      // Even if no token, we might allow it if it's a public endpoint, but we pass it anyway.
      
      final bodyMap = <String, dynamic>{
        'phone': phone,
        'amount': amount,
      };
      if (applicationId != null) bodyMap['applicationId'] = applicationId;
      if (mockStatus != null) bodyMap['mockStatus'] = mockStatus;

      final response = await http.post(
        Uri.parse('${Constants.apiBaseUrl}/payment/waafi'),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
        body: jsonEncode(bodyMap),
      ).timeout(const Duration(seconds: 50));

      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        return {'success': true, 'message': data['message'], 'data': data['data']};
      } else {
        return {'success': false, 'message': data['message'] ?? 'Payment failed'};
      }
    } catch (e) {
      return {'success': false, 'message': 'An error occurred: $e'};
    }
  }

  Future<Map<String, dynamic>> processOfflinePayment({
    required String pin,
    required double amount,
    String? phone,
    String? applicationId,
  }) async {
    try {
      final token = await _storage.read(key: 'token');
      final bodyMap = <String, dynamic>{
        'pin': pin,
        'amount': amount,
      };
      if (phone != null && phone.isNotEmpty) bodyMap['phone'] = phone;
      if (applicationId != null) bodyMap['applicationId'] = applicationId;

      final response = await http.post(
        Uri.parse('${Constants.apiBaseUrl}/payment/offline'),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
        body: jsonEncode(bodyMap),
      ).timeout(const Duration(seconds: 30));

      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        return {'success': true, 'message': data['message'], 'data': data['data']};
      }
      return {'success': false, 'message': data['message'] ?? 'Payment failed'};
    } catch (e) {
      return {'success': false, 'message': 'An error occurred: $e'};
    }
  }

  Future<Map<String, dynamic>> getRenewTypes() async {
    try {
      final token = await _storage.read(key: 'token');
      final response = await http.get(
        Uri.parse('${Constants.apiBaseUrl}/renew-types'),
        headers: {
          if (token != null) 'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 10));
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        return {'success': true, 'data': data['data']};
      }
      return {'success': false, 'message': data['message'] ?? 'Failed'};
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  Future<Map<String, dynamic>> getDiscounts() async {
    try {
      final response = await http.get(
        Uri.parse('${Constants.apiBaseUrl}/discounts'),
      ).timeout(const Duration(seconds: 10));
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        return {'success': true, 'data': data['data']};
      }
      return {'success': false, 'message': data['message'] ?? 'Failed'};
    } catch (e) {
      return {'success': false, 'message': '$e'};
    }
  }

  Future<Map<String, dynamic>> getRenewablePermits() async {
    try {
      final token = await _storage.read(key: 'token');
      if (token == null) return {'success': false, 'message': 'No authentication token found'};

      final response = await http.get(
        Uri.parse('${Constants.apiBaseUrl}/permits/renewable'),
        headers: {'Authorization': 'Bearer $token'},
      ).timeout(const Duration(seconds: 15));

      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        return {'success': true, 'data': data['data'] ?? []};
      }
      return {'success': false, 'message': data['message'] ?? 'Failed to load renewable permits'};
    } catch (e) {
      return {'success': false, 'message': 'An error occurred: $e'};
    }
  }

  Future<Map<String, dynamic>> quoteRenewFee(String applicationId) async {
    try {
      final token = await _storage.read(key: 'token');
      if (token == null) return {'success': false, 'message': 'No authentication token found'};

      final response = await http.get(
        Uri.parse('${Constants.apiBaseUrl}/permits/renew/$applicationId/quote'),
        headers: {'Authorization': 'Bearer $token'},
      ).timeout(const Duration(seconds: 15));

      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        return {'success': true, 'data': data['data']};
      }
      return {'success': false, 'message': data['message'] ?? 'Failed to quote renew fee'};
    } catch (e) {
      return {'success': false, 'message': 'An error occurred: $e'};
    }
  }

  Future<Map<String, dynamic>> renewPermit({
    required String applicationId,
    required double totalFee,
  }) async {
    try {
      final token = await _storage.read(key: 'token');
      if (token == null) return {'success': false, 'message': 'No authentication token found'};

      final response = await http.post(
        Uri.parse('${Constants.apiBaseUrl}/permits/renew/$applicationId'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({'totalFee': totalFee}),
      ).timeout(const Duration(seconds: 30));

      final data = jsonDecode(response.body);
      if (response.statusCode == 201) {
        return {'success': true, 'data': data['data']};
      }
      return {'success': false, 'message': data['message'] ?? 'Failed to renew permit'};
    } catch (e) {
      return {'success': false, 'message': 'An error occurred: $e'};
    }
  }
}
