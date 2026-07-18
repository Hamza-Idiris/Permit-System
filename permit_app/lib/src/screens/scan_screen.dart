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

  Future<void> _processQR(String barcodeValue) async {
    if (_isProcessing) return;
    setState(() {
      _isProcessing = true;
    });

    // 1. Try Native Offline Parsing Check
    try {
      final Map<String, dynamic> offlinePayload = jsonDecode(barcodeValue);
      if (offlinePayload.containsKey('permitId') || offlinePayload.containsKey('plotId')) {
        setState(() {
          _isProcessing = false;
        });
        
        // Save scan history
        await _scanHistoryService.saveScan(
          permitId: offlinePayload['permitId'] ?? offlinePayload['plotId'],
          isSuccess: true,
          permitData: offlinePayload,
        );
        
        _showVerifiedPanel(offlinePayload, isOffline: true);
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
            final Map<String, dynamic> normalizedData = {
              'permitId': permitIdToSave,
              'applicantName': permit['user']?['fullName'] ?? permit['formData']?['fullName'] ?? 'N/A',
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
            
            _showVerifiedPanel(normalizedData, isOffline: false);
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

  void _showVerifiedPanel(Map<String, dynamic> data, {required bool isOffline}) {
    final isDark = Provider.of<ThemeProvider>(context, listen: false).isDarkMode;
    final String permitId = data['permitId'] ?? 'N/A';
    final String applicantName = data['applicantName'] ?? 'N/A';
    final String approvedBy = data['approvedBy'] ?? 'N/A';
    final String district = data['district'] ?? 'N/A';
    final String plotId = data['plotId'] ?? 'N/A';
    final String buildingType = data['buildingType'] ?? 'N/A';
    final String landArea = data['landArea'] ?? '0 m²';
    
    // Floors only if building type is "Dabaq"
    final bool isDabaq = buildingType.toLowerCase().contains('dabaq');
    final String floorsText = isDabaq ? (data['floors']?.toString() ?? '1') : '';

    String formattedTime = 'N/A';
    String formattedExpiry = 'N/A';
    try {
      if (data['approvedTime'] != null) {
        final DateTime dt = DateTime.parse(data['approvedTime'].toString());
        formattedTime = DateFormat('yyyy-MM-dd HH:mm').format(dt);
      }
      if (data['expiryDate'] != null) {
        final DateTime ext = DateTime.parse(data['expiryDate'].toString());
        formattedExpiry = DateFormat('yyyy-MM-dd').format(ext);
      }
    } catch (_) {
      formattedTime = data['approvedTime']?.toString() ?? 'N/A';
      formattedExpiry = data['expiryDate']?.toString() ?? 'N/A';
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.85,
          minChildSize: 0.5,
          maxChildSize: 0.95,
          expand: false,
          builder: (context, scrollController) {
            return Container(
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
              ),
              child: Column(
                children: [
                  // Emerald Green Header Banner
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 30),
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Color(0xFF10B981), Color(0xFF059669)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
                    ),
                    child: const Column(
                      children: [
                        Icon(Icons.verified_user_rounded, color: Colors.white, size: 60),
                        SizedBox(height: 12),
                        Text(
                          'VERIFIED PERMIT',
                          style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w900, letterSpacing: 1),
                        ),
                        Text(
                          'SOVEREIGN DIGITAL AUTHORITY',
                          style: TextStyle(color: Colors.white70, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 2),
                        ),
                      ],
                    ),
                  ),

                  Expanded(
                    child: SingleChildScrollView(
                      controller: scrollController,
                      padding: EdgeInsets.only(
                        left: 30,
                        right: 30,
                        top: 30,
                        bottom: MediaQuery.of(context).padding.bottom + 16,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Center(
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                              decoration: BoxDecoration(
                                color: ColorPallete.primaryNavy.withOpacity(0.05),
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: ColorPallete.primaryNavy.withOpacity(0.1)),
                              ),
                              child: Text(
                                'Permit: $permitId',
                                style: TextStyle(
                                  color: isDark ? Colors.white70 : ColorPallete.primaryNavy, 
                                  fontWeight: FontWeight.w900, 
                                  fontSize: 14,
                                  letterSpacing: 0.5
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 30),

                          _buildTelemetryRow(Icons.person_outline_rounded, 'Applicant Name', applicantName, isDark),
                          _buildTelemetryRow(Icons.admin_panel_settings_rounded, 'Approved By', approvedBy, isDark),
                          _buildTelemetryRow(Icons.location_on_rounded, 'District Area', district, isDark),
                          _buildTelemetryRow(Icons.map_rounded, 'Plot Identifier', plotId, isDark),
                          _buildTelemetryRow(Icons.business_rounded, 'Building Category', buildingType, isDark),
                          _buildTelemetryRow(Icons.square_foot_rounded, 'Land Area', landArea, isDark),

                          if (isDabaq && floorsText.isNotEmpty) ...[
                            _buildTelemetryRow(Icons.layers_rounded, 'Building Floors', floorsText, isDark),
                          ],

                          _buildTelemetryRow(Icons.calendar_month_rounded, 'Approval DateTime', formattedTime, isDark),
                          _buildTelemetryRow(Icons.event_busy_rounded, 'Expiry Date', formattedExpiry, isDark, color: Colors.redAccent),

                          const SizedBox(height: 25),
                          SizedBox(
                            width: double.infinity,
                            height: 56,
                            child: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: isDark ? Colors.white : ColorPallete.primaryNavy,
                                foregroundColor: isDark ? Colors.black : Colors.white,
                                elevation: 0,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                              ),
                              onPressed: () => Navigator.pop(context),
                              child: const Text('CONFIRM & DISMISS', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
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

  Widget _buildTelemetryRow(IconData icon, String label, String value, bool isDark, {Color? color}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: (color ?? ColorPallete.primaryNavy).withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color ?? (isDark ? Colors.white70 : ColorPallete.primaryNavy), size: 20),
          ),
          const SizedBox(width: 15),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label.toUpperCase(), 
                  style: TextStyle(
                    color: isDark ? Colors.white38 : ColorPallete.hintTextColor, 
                    fontSize: 9, 
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1
                  )
                ),
                const SizedBox(height: 4),
                Text(
                  value, 
                  style: TextStyle(
                    fontWeight: FontWeight.w800, 
                    color: color ?? (isDark ? Colors.white : ColorPallete.primaryNavy), 
                    fontSize: 15,
                    letterSpacing: -0.3
                  )
                ),
              ],
            ),
          ),
        ],
      ),
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
