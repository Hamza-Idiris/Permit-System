import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:permit_app/src/utils/constants.dart';
import 'package:permit_app/src/services/websocket_service.dart';

class AuthProvider extends ChangeNotifier {
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  bool _isLoading = false;
  String? _errorMessage;

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<Map<String, dynamic>> login(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await http.post(
        Uri.parse('${Constants.apiBaseUrl}/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password}),
      ).timeout(const Duration(seconds: 15));

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        String role = data['role']?.toString().toLowerCase() ?? '';
        
        if (role == 'inspector' || role == 'applicant') {
          await _storage.write(key: 'token', value: data['token']);
          await _storage.write(key: 'role', value: role);
          await _storage.write(key: 'district', value: data['district'] ?? '');
          await _storage.write(key: 'fullName', value: data['fullName'] ?? 'Unknown User');
          await _storage.write(key: 'email', value: data['email'] ?? '');
          await _storage.write(key: 'phone', value: data['phone'] ?? '+252 61 123 4567');
          await _storage.write(key: 'passwordLastChanged', value: data['passwordLastChanged'] ?? '');
          await _storage.write(key: 'createdAt', value: data['createdAt']?.toString() ?? '');
          
          // Trigger WebSocket connection for live updates
          WebSocketService().connect();

          _isLoading = false;
          notifyListeners();
          return {'success': true, 'role': role};
        } else {
          _errorMessage = "Access Denied: Unauthorized role.";
          _isLoading = false;
          notifyListeners();
          return {'success': false, 'message': _errorMessage};
        }
      } else {
        _errorMessage = data['message'] ?? 'Invalid credentials';
        _isLoading = false;
        notifyListeners();
        return {'success': false, 'message': _errorMessage};
      }
    } on SocketException {
      _errorMessage = 'No Internet Connection or Server is Down.';
      _isLoading = false;
      notifyListeners();
      return {'success': false, 'message': _errorMessage};
    } catch (e) {
      _errorMessage = 'An error occurred. Please try again.';
      _isLoading = false;
      notifyListeners();
      return {'success': false, 'message': _errorMessage};
    }
  }

  Future<Map<String, dynamic>> registerUser(String fullName, String email, String phone, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await http.post(
        Uri.parse('${Constants.apiBaseUrl}/auth/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'fullName': fullName,
          'email': email,
          'phone': phone,
          'password': password,
          'gender': 'Male', // Defaulting for now
        }),
      ).timeout(const Duration(seconds: 15));

      final data = jsonDecode(response.body);

      if (response.statusCode == 201 && data['success'] == true) {
        _isLoading = false;
        notifyListeners();
        return {'success': true};
      } else {
        _errorMessage = data['message'] ?? 'Registration failed';
        _isLoading = false;
        notifyListeners();
        return {'success': false, 'message': _errorMessage};
      }
    } on SocketException {
      _errorMessage = 'No Internet Connection or Server is Down.';
      _isLoading = false;
      notifyListeners();
      return {'success': false, 'message': _errorMessage};
    } catch (e) {
      _errorMessage = 'An error occurred during registration.';
      _isLoading = false;
      notifyListeners();
      return {'success': false, 'message': _errorMessage};
    }
  }
  Future<Map<String, dynamic>> updateProfile({
    required String fullName,
    required String email,
    required String phone,
    required String currentPassword,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final token = await _storage.read(key: 'token');
      final response = await http.put(
        Uri.parse('${Constants.apiBaseUrl}/users/profile'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'fullName': fullName,
          'email': email,
          'phone': phone,
          'currentPassword': currentPassword,
        }),
      ).timeout(const Duration(seconds: 15));

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        // Update local storage with new info
        await _storage.write(key: 'fullName', value: data['fullName'] ?? fullName);
        await _storage.write(key: 'email', value: data['email'] ?? email);
        await _storage.write(key: 'phone', value: data['phone'] ?? phone);
        if (data['token'] != null) {
          await _storage.write(key: 'token', value: data['token']);
        }

        _isLoading = false;
        notifyListeners();
        return {'success': true};
      } else {
        _errorMessage = data['message'] ?? 'Update failed';
        _isLoading = false;
        notifyListeners();
        return {'success': false, 'message': _errorMessage};
      }
    } on SocketException {
      _errorMessage = 'No Internet Connection or Server is Down.';
      _isLoading = false;
      notifyListeners();
      return {'success': false, 'message': _errorMessage};
    } catch (e) {
      _errorMessage = 'An error occurred during profile update.';
      _isLoading = false;
      notifyListeners();
      return {'success': false, 'message': _errorMessage};
    }
  }

  Future<Map<String, dynamic>> changePassword({
    required String oldPassword,
    required String newPassword,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final token = await _storage.read(key: 'token');
      final response = await http.put(
        Uri.parse('${Constants.apiBaseUrl}/users/change-password'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'oldPassword': oldPassword,
          'newPassword': newPassword,
        }),
      ).timeout(const Duration(seconds: 15));

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        if (data['passwordLastChanged'] != null) {
          await _storage.write(key: 'passwordLastChanged', value: data['passwordLastChanged']);
        }
        _isLoading = false;
        notifyListeners();
        return {'success': true};
      } else {
        _errorMessage = data['message'] ?? 'Password update failed';
        _isLoading = false;
        notifyListeners();
        return {'success': false, 'message': _errorMessage};
      }
    } on SocketException {
      _errorMessage = 'No Internet Connection or Server is Down.';
      _isLoading = false;
      notifyListeners();
      return {'success': false, 'message': _errorMessage};
    } catch (e) {
      _errorMessage = 'An error occurred during password change.';
      _isLoading = false;
      notifyListeners();
      return {'success': false, 'message': _errorMessage};
    }
  }

  Future<void> logout() async {
    await _storage.deleteAll();
    notifyListeners();
  }
}
