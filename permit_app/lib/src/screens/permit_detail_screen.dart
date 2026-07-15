import 'dart:convert';
import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:permit_app/src/utils/colors.dart';
import 'package:permit_app/src/screens/edit_application_screen.dart';
import 'package:permit_app/src/providers/theme_provider.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class PermitDetailScreen extends StatefulWidget {
  final Map<String, dynamic> permit;

  const PermitDetailScreen({super.key, required this.permit});

  @override
  State<PermitDetailScreen> createState() => _PermitDetailScreenState();
}

class _PermitDetailScreenState extends State<PermitDetailScreen> {
  final GlobalKey _boundaryKey = GlobalKey();
  bool _isExporting = false;
  String _loggedInName = 'N/A';

  @override
  void initState() {
    super.initState();
    _loadLoggedInName();
  }

  Future<void> _loadLoggedInName() async {
    const storage = FlutterSecureStorage();
    final name = await storage.read(key: 'fullName');
    if (name != null && name.isNotEmpty && mounted) {
      setState(() {
        _loggedInName = name;
      });
    }
  }

  String _getApplicantName() {
    final userVal = widget.permit['user'];
    if (userVal is Map) {
      final name = userVal['fullName'];
      if (name != null && name.toString().isNotEmpty) return name.toString();
    }
    final formData = widget.permit['formData'];
    if (formData is Map) {
      final name = formData['fullName'];
      if (name != null && name.toString().isNotEmpty && name.toString() != 'Official Member') {
        return name.toString();
      }
    }
    if (_loggedInName != 'N/A') return _loggedInName;
    if (formData is Map) {
      final name = formData['fullName'];
      if (name != null) return name.toString();
    }
    return 'N/A';
  }

  String _getApprovedBy() {
    final reviewedByVal = widget.permit['reviewedBy'];
    if (reviewedByVal is Map) {
      return reviewedByVal['fullName']?.toString() ?? 'System';
    }
    return 'System';
  }

  String _getQrDataString() {
    if (widget.permit['qrData'] != null && widget.permit['qrData'].toString().isNotEmpty) {
      return widget.permit['qrData'].toString();
    }
    
    // Legacy fallback compilation
    final Map<String, dynamic> formData = widget.permit['formData'] ?? {};
    final String buildingType = formData['buildingCategory']?.toString() ?? 'N/A';
    final bool isDabaq = buildingType.toLowerCase().contains('dabaq');

    final Map<String, dynamic> qrMap = {
      'permitId': widget.permit['permitId'] ?? widget.permit['_id'] ?? 'N/A',
      'applicantName': _getApplicantName(),
      'approvedBy': _getApprovedBy(),
      'district': formData['district']?.toString() ?? 'N/A',
      'plotId': formData['plotId']?.toString() ?? 'N/A',
      'buildingType': buildingType,
      'landArea': '${formData['landArea']?.toString() ?? '0'} m²',
      if (isDabaq) 'floors': formData['floors'] ?? 1,
      'approvedTime': widget.permit['approvalDate'] ?? widget.permit['updatedAt']?.toString() ?? DateTime.now().toIso8601String(),
      if (widget.permit['expiryDate'] != null) 'expiryDate': widget.permit['expiryDate'].toString(),
    };

    return jsonEncode(qrMap);
  }

  String _formatExpiryDate(String isoString) {
    try {
      final date = DateTime.parse(isoString);
      final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return '${date.day} ${months[date.month - 1]} ${date.year}';
    } catch (e) {
      return 'N/A';
    }
  }

  String _formatApprovedTime(String? isoString) {
    if (isoString == null || isoString.isEmpty) return 'N/A';
    try {
      final date = DateTime.parse(isoString);
      final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      final hourStr = date.hour.toString().padLeft(2, '0');
      final minuteStr = date.minute.toString().padLeft(2, '0');
      return '${date.day} ${months[date.month - 1]} ${date.year}, $hourStr:$minuteStr';
    } catch (e) {
      return 'N/A';
    }
  }

  Future<void> _downloadCertificate(BuildContext context) async {
    setState(() {
      _isExporting = true;
    });

    // Wait for the UI / frame to update and build without the copy icon
    await Future.delayed(const Duration(milliseconds: 100));

    try {
      final RenderRepaintBoundary? boundary = _boundaryKey.currentContext?.findRenderObject() as RenderRepaintBoundary?;
      if (boundary == null) throw Exception("Failed to capture screen area");

      final ui.Image image = await boundary.toImage(pixelRatio: 3.0);
      final ByteData? byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      if (byteData == null) throw Exception("Failed to generate image data");
      final Uint8List pngBytes = byteData.buffer.asUint8List();

      final String? outputFile = await FilePicker.saveFile(
        dialogTitle: 'Save Permit Certificate',
        fileName: 'permit_certificate_${widget.permit['permitId'] ?? widget.permit['_id']}.png',
        bytes: pngBytes,
      );

      if (outputFile != null && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Permit Certificate downloaded successfully!'),
            backgroundColor: ColorPallete.successGreen,
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to save certificate: $e'),
            backgroundColor: ColorPallete.errorRed,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isExporting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final String status = widget.permit['status'] ?? 'Pending';
    final bool isApproved = status == 'Approved';
    final bool isReturned = status == 'Returned';
    
    Color statusColor = Colors.orange;
    IconData statusIcon = Icons.pending_actions_rounded;
    String statusText = 'APPLICATION PENDING';

    if (isApproved) {
      statusColor = ColorPallete.successGreen;
      statusIcon = Icons.verified_rounded;
      statusText = 'OFFICIALLY APPROVED';
    } else if (isReturned) {
      statusColor = ColorPallete.errorRed;
      statusIcon = Icons.error_outline_rounded;
      statusText = 'APPLICATION REJECTED';
    }
    
    return Scaffold(
      backgroundColor: ColorPallete.backgroundColor,
      appBar: AppBar(
        title: const Text('Permit Details', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: ColorPallete.primaryNavy,
        elevation: 0,
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            RepaintBoundary(
              key: _boundaryKey,
              child: Container(
                color: ColorPallete.backgroundColor,
                padding: const EdgeInsets.all(8),
                child: Column(
                  children: [
                    // Status Banner
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(15),
                      decoration: BoxDecoration(
                        color: statusColor,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(statusIcon, color: Colors.white),
                          const SizedBox(width: 10),
                          Text(
                            statusText,
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 25),

                    // Main Info Card
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4)),
                        ],
                      ),
                      child: Column(
                        children: [
                          _buildDetailRow('Applicant Name', _getApplicantName()),
                          _buildDetailRow('Plot ID', widget.permit['formData']?['plotId']?.toString() ?? 'N/A'),
                          _buildDetailRow('District Name', widget.permit['formData']?['district']?.toString() ?? 'N/A'),
                          if (isApproved)
                            _buildDetailRow('Approved By', _getApprovedBy()),
                          _buildDetailRow('Building Type', widget.permit['formData']?['buildingCategory']?.toString() ?? 'N/A'),
                          _buildDetailRow('Floors', widget.permit['formData']?['floors']?.toString() ?? '1'),
                          _buildDetailRow('Size', '${widget.permit['formData']?['landArea']?.toString() ?? '0'} m²'),
                          if (isApproved)
                            _buildDetailRow('Approved Time', _formatApprovedTime(widget.permit['approvalDate']?.toString() ?? widget.permit['updatedAt']?.toString())),
                          if (widget.permit['expiryDate'] != null)
                            _buildDetailRow('Expiry Date', _formatExpiryDate(widget.permit['expiryDate'].toString())),
                          const Divider(height: 30),
                          
                          if (isApproved) ...[
                            const Text(
                              'Official QR Code',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: ColorPallete.primaryNavy),
                            ),
                            const SizedBox(height: 5),
                            const Text(
                              'For Inspector Verification Only',
                              style: TextStyle(fontSize: 12, color: ColorPallete.hintTextColor),
                            ),
                            const SizedBox(height: 15),
                            InkWell(
                              onTap: _isExporting ? null : () async {
                                final String permitIdStr = widget.permit['permitId'] ?? widget.permit['applicationId'] ?? widget.permit['_id'] ?? 'N/A';
                                await Clipboard.setData(ClipboardData(text: permitIdStr));
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Permit ID copied to clipboard!'),
                                      duration: Duration(seconds: 2),
                                      backgroundColor: ColorPallete.successGreen,
                                    ),
                                  );
                                }
                              },
                              borderRadius: BorderRadius.circular(8),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                decoration: BoxDecoration(
                                  color: ColorPallete.primaryNavy.withOpacity(0.05),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: ColorPallete.primaryNavy.withOpacity(0.1)),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      widget.permit['permitId'] ?? widget.permit['applicationId'] ?? widget.permit['_id'] ?? 'N/A',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 15,
                                        color: ColorPallete.primaryNavy,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                    if (!_isExporting) ...[
                                      const SizedBox(width: 8),
                                      const Icon(
                                        Icons.copy_rounded,
                                        size: 16,
                                        color: ColorPallete.primaryNavy,
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(height: 15),
                            // Large QR Code
                            Container(
                              padding: const EdgeInsets.all(15),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(15),
                                border: Border.all(color: Colors.grey.shade200),
                              ),
                              child: QrImageView(
                                data: _getQrDataString(),
                                version: QrVersions.auto,
                                size: 200.0,
                                eyeStyle: const QrEyeStyle(eyeShape: QrEyeShape.square, color: ColorPallete.primaryNavy),
                                dataModuleStyle: const QrDataModuleStyle(dataModuleShape: QrDataModuleShape.square, color: ColorPallete.primaryNavy),
                              ),
                            ),
                            const SizedBox(height: 10),
                            const Text(
                              'Scan to Verify',
                              style: TextStyle(fontWeight: FontWeight.bold, color: ColorPallete.primaryNavy),
                            ),
                          ] else if (isReturned) ...[
                            const SizedBox(height: 20),
                            Icon(Icons.warning_amber_rounded, size: 60, color: ColorPallete.errorRed.withOpacity(0.5)),
                            const SizedBox(height: 15),
                            const Text(
                              'Your application was rejected by the municipality staff.',
                              textAlign: TextAlign.center,
                              style: TextStyle(color: ColorPallete.errorRed, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 10),
                            Container(
                              padding: const EdgeInsets.all(15),
                              decoration: BoxDecoration(
                                color: ColorPallete.errorRed.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: ColorPallete.errorRed.withOpacity(0.3)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Reason for Rejection:', style: TextStyle(fontWeight: FontWeight.bold, color: ColorPallete.errorRed)),
                                  const SizedBox(height: 5),
                                  Text(
                                    widget.permit['staffRemarks'] ?? 'Please correct your application.',
                                    style: const TextStyle(color: ColorPallete.primaryNavy),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 20),
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton.icon(
                                onPressed: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) => EditApplicationScreen(permit: widget.permit),
                                    ),
                                  );
                                },
                                icon: const Icon(Icons.edit_rounded, size: 20),
                                label: const Text(
                                  'Re-edit & Resubmit',
                                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                                ),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: ColorPallete.primaryNavy,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(vertical: 16),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                  elevation: 4,
                                ),
                              ),
                            ),
                          ] else ...[
                            const SizedBox(height: 20),
                            Icon(Icons.hourglass_empty_rounded, size: 60, color: Colors.orange.withOpacity(0.5)),
                            const SizedBox(height: 15),
                            const Text(
                              'Your application is currently under review by the Municipality Staff.',
                              textAlign: TextAlign.center,
                              style: TextStyle(color: ColorPallete.hintTextColor),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            
            const SizedBox(height: 30),
            
            // Footer Action
            if (isApproved)
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () => _downloadCertificate(context),
                  icon: const Icon(Icons.download_rounded),
                  label: const Text('Download Certificate'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 15),
                    foregroundColor: ColorPallete.primaryNavy,
                    side: const BorderSide(color: ColorPallete.primaryNavy),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: ColorPallete.hintTextColor, fontSize: 14)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold, color: ColorPallete.primaryNavy, fontSize: 14)),
        ],
      ),
    );
  }
}
