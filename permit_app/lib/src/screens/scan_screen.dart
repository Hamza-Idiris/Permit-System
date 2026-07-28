import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:permit_app/src/utils/constants.dart';
import 'package:permit_app/src/utils/colors.dart';
import 'package:provider/provider.dart';
import 'package:permit_app/src/providers/theme_provider.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:intl/intl.dart';
import 'package:permit_app/src/services/scan_history_service.dart';
import 'package:permit_app/src/screens/verified_permit_page.dart';

class ScanScreen extends StatefulWidget {
  const ScanScreen({super.key});

  @override
  State<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends State<ScanScreen> {
  final TextEditingController _searchController = TextEditingController();
  final ScanHistoryService _scanHistoryService = ScanHistoryService();
  bool _isProcessing = false;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _logScanToServer(String code) async {
    try {
      final storage = const FlutterSecureStorage();
      final token = await storage.read(key: 'token');
      if (token == null) return;
      await http.post(
        Uri.parse('${Constants.apiBaseUrl}/scans'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({'code': code, 'source': 'mobile'}),
      ).timeout(const Duration(seconds: 8));
    } catch (_) {
      // Local history still saved; server log is best-effort
    }
  }

  Future<void> _processQR(String barcodeValue, {bool logToServer = true}) async {
    if (_isProcessing) return;
    setState(() {
      _isProcessing = true;
    });

    if (logToServer) {
      _logScanToServer(barcodeValue);
    }

    // 1. Try Native Offline Parsing Check
    try {
      final Map<String, dynamic> offlinePayload = jsonDecode(barcodeValue);
      if (offlinePayload.containsKey('permitId') || offlinePayload.containsKey('plotId')) {
        // If applicantName is a known placeholder, don't trust it — fall
        // through to the live database lookup which has the real User record.
        final offlineName = offlinePayload['applicantName']?.toString() ?? '';
        if (offlineName == 'Official Member' || offlineName.isEmpty) {
          // Do NOT short-circuit here; let the code continue to the DB lookup.
          // (only break out if the ID can be derived for the DB call)
          final lookupId = offlinePayload['permitId']?.toString();
          if (lookupId != null && lookupId.isNotEmpty) {
            setState(() { _isProcessing = false; });
            // Re-enter as a DB lookup using the permitId from the QR payload
            // Server already logged the original QR payload above
            _processQR(lookupId, logToServer: false);
            return;
          }
        }

        setState(() {
          _isProcessing = false;
        });
        
        // Save scan history
        await _scanHistoryService.saveScan(
          permitId: offlinePayload['permitId'] ?? offlinePayload['plotId'],
          isSuccess: true,
          permitData: offlinePayload,
        );
        
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => VerifiedPermitPage(permitData: offlinePayload),
          ),
        );
        return;
      }
    } catch (_) {
      // Failed to parse offline JSON, proceed with standard database lookup
    }

    // Show loading dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(child: CircularProgressIndicator(color: ColorPallete.primaryNavy)),
    );

    try {
      final storage = const FlutterSecureStorage();
      final token = await storage.read(key: 'token');

      final response = await http.get(
        Uri.parse('${Constants.apiBaseUrl}/permits/$barcodeValue'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 10));

      if (!mounted) return;
      Navigator.pop(context); // Close loading dialog

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          final permit = data['data'];
          final status = permit['status'];
          
          final String permitIdToSave = permit['permitId'] ?? permit['applicationId'] ?? permit['_id'] ?? barcodeValue;

          if (status == 'Approved') {
            bool isExpired = false;
            if (permit['expiryDate'] != null) {
              try {
                final DateTime expiry = DateTime.parse(permit['expiryDate'].toString());
                if (expiry.isBefore(DateTime.now())) {
                  isExpired = true;
                }
              } catch (_) {}
            }

            if (isExpired) {
              await _scanHistoryService.saveScan(
                permitId: permitIdToSave,
                isSuccess: false,
                permitData: permit,
              );
              _showFailedPanel('Permit has Expired');
            } else {
              final Map<String, dynamic> normalizedData = {
                'permitId': permitIdToSave,
                'applicantName': (() {
                  // Priority 1: populated user object (real User record)
                final userObj = permit['user'];
                if (userObj is Map) {
                  final n = userObj['fullName']?.toString() ?? '';
                  if (n.isNotEmpty && n != 'Official Member') return n;
                }
                // Priority 2: formData fullName (applicant-entered, may be stale)
                final fd = permit['formData'];
                if (fd is Map) {
                  final n = fd['fullName']?.toString() ?? '';
                  if (n.isNotEmpty && n != 'Official Member') return n;
                }
                return 'N/A';
              })(),
              'approvedBy': permit['reviewedBy']?['fullName'] ?? 'System',
              'district': permit['district'] ?? 'N/A',
              'plotId': permit['formData']?['plotId'] ?? 'N/A',
              'buildingType': permit['formData']?['buildingCategory'] ?? 'N/A',
              'landArea': '${permit['formData']?['landArea'] ?? 0} m²',
              'floors': permit['formData']?['floors'],
              'approvedTime': permit['approvalDate'] ?? permit['updatedAt'] ?? permit['createdAt'],
              'expiryDate': permit['expiryDate'],
            };
            
              await _scanHistoryService.saveScan(
                permitId: permitIdToSave,
                isSuccess: true,
                permitData: normalizedData,
              );
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => VerifiedPermitPage(permitData: normalizedData),
                ),
              );
            }
          } else {
            await _scanHistoryService.saveScan(
              permitId: permitIdToSave,
              isSuccess: false,
              permitData: permit,
            );
            _showFailedPanel('Permit is currently $status');
          }
        } else {
          await _scanHistoryService.saveScan(
            permitId: barcodeValue,
            isSuccess: false,
            permitData: {'error': data['message']},
          );
          _showFailedPanel(data['message'] ?? 'Invalid or Not Found');
        }
      } else if (response.statusCode == 403) {
        final data = jsonDecode(response.body);
        await _scanHistoryService.saveScan(
            permitId: barcodeValue,
            isSuccess: false,
            permitData: {'error': 'Forbidden'},
        );
        _showFailedPanel(data['message'] ?? 'You do not have permission to scan this application.');
      } else if (response.statusCode == 404) {
        await _scanHistoryService.saveScan(
            permitId: barcodeValue,
            isSuccess: false,
            permitData: {'error': 'Not Found'},
        );
        _showFailedPanel('Permit Not Found (Tiradan meelna kuma jirto)');
      } else {
        await _scanHistoryService.saveScan(
            permitId: barcodeValue,
            isSuccess: false,
            permitData: {'error': 'Server Error'},
        );
        _showFailedPanel('Error: ${response.statusCode}');
      }
    } catch (e) {
      if (mounted) {
        Navigator.pop(context); // Close loading dialog
        _showFailedPanel('Network Error: Failed to verify permit');
      }
    } finally {
      await Future.delayed(const Duration(seconds: 2));
      if (mounted) {
        setState(() {
          _isProcessing = false;
        });
      }
    }
  }



  void _showFailedPanel(String message) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.cancel_rounded, color: ColorPallete.errorRed, size: 60),
              const SizedBox(height: 12),
              const Text(
                'VERIFICATION FAILED',
                style: TextStyle(color: ColorPallete.errorRed, fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                message,
                textAlign: TextAlign.center,
                style: const TextStyle(color: ColorPallete.hintTextColor, fontSize: 14),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: ColorPallete.errorRed,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () => Navigator.pop(context),
                  child: const Text('CLOSE', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        );
      },
    );
  }



  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;
    
    return Scaffold(
      backgroundColor: isDark ? ColorPallete.darkBackgroundColor : ColorPallete.backgroundColor,
      appBar: AppBar(
        backgroundColor: isDark ? const Color(0xFF1E1E1E) : Colors.white,
        elevation: 0,
        iconTheme: IconThemeData(color: isDark ? Colors.white : ColorPallete.primaryNavy),
        title: Text(
          'SCAN PERMIT',
          style: TextStyle(
            color: isDark ? Colors.white : ColorPallete.primaryNavy,
            fontSize: 16,
            fontWeight: FontWeight.w900,
            letterSpacing: 1,
          ),
        ),
        centerTitle: true,
      ),
      body: Column(
        children: [
          // Fallback search field at the top
          Container(
            padding: const EdgeInsets.all(24),
            color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'FIELD VERIFICATION ENGINE',
                  style: TextStyle(
                    fontSize: 11, 
                    fontWeight: FontWeight.w900, 
                    color: isDark ? Colors.white38 : ColorPallete.hintTextColor,
                    letterSpacing: 2
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _searchController,
                        style: TextStyle(color: isDark ? Colors.white : Colors.black, fontWeight: FontWeight.bold),
                        decoration: InputDecoration(
                          hintText: 'Enter Permit Alphanumeric ID',
                          hintStyle: TextStyle(fontSize: 13, color: isDark ? Colors.white24 : ColorPallete.hintTextColor),
                          prefixIcon: Icon(Icons.search_rounded, color: isDark ? Colors.white54 : ColorPallete.primaryNavy),
                          filled: true,
                          fillColor: isDark ? Colors.black26 : ColorPallete.backgroundColor,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(16),
                            borderSide: BorderSide.none,
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(16),
                            borderSide: BorderSide(color: isDark ? Colors.white24 : ColorPallete.primaryNavy, width: 2),
                          ),
                        ),
                        textCapitalization: TextCapitalization.characters,
                      ),
                    ),
                    const SizedBox(width: 12),
                    SizedBox(
                      height: 56,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: isDark ? Colors.white : ColorPallete.primaryNavy,
                          foregroundColor: isDark ? Colors.black : Colors.white,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(horizontal: 20),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        ),
                        onPressed: () {
                          final val = _searchController.text.trim();
                          if (val.isNotEmpty) {
                            FocusScope.of(context).unfocus();
                            _searchController.clear();
                            _processQR(val);
                          }
                        },
                        child: const Text('Verify', style: TextStyle(fontWeight: FontWeight.w900)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          
          Expanded(
            child: Stack(
              children: [
                MobileScanner(
                  onDetect: (capture) {
                    final List<Barcode> barcodes = capture.barcodes;
                    for (final barcode in barcodes) {
                      if (barcode.rawValue != null && !_isProcessing) {
                        _processQR(barcode.rawValue!);
                        break;
                      }
                    }
                  },
                ),
                Center(
                  child: Container(
                    width: 280,
                    height: 280,
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.white.withOpacity(0.5), width: 2),
                      borderRadius: BorderRadius.circular(40),
                    ),
                    child: Stack(
                      children: [
                        Positioned(
                          top: 40,
                          left: 0, right: 0,
                          child: Container(
                            height: 2,
                            decoration: BoxDecoration(
                              boxShadow: [
                                BoxShadow(color: Colors.redAccent.withOpacity(0.5), blurRadius: 10, spreadRadius: 2)
                              ],
                              color: Colors.redAccent
                            ),
                          ),
                        )
                      ],
                    ),
                  ),
                ),
                Positioned(
                  bottom: 40,
                  left: 0, right: 0,
                  child: Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                      decoration: BoxDecoration(
                        color: Colors.black54,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Text(
                        'PAN QR CODE INTO FRAME',
                        style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 1),
                      ),
                    ),
                  ),
                )
              ],
            ),
          ),
        ],
      ),
    );
  }
}
