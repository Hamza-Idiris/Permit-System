import 'dart:async';
import 'package:flutter/material.dart';
import 'package:permit_app/src/utils/colors.dart';
import 'package:permit_app/src/services/permit_service.dart';
import 'package:permit_app/src/screens/permit_detail_screen.dart';
import 'package:permit_app/src/providers/theme_provider.dart';
import 'package:permit_app/src/services/websocket_service.dart';
import 'package:provider/provider.dart';

class TrackApplicationsScreen extends StatefulWidget {
  const TrackApplicationsScreen({super.key});

  @override
  State<TrackApplicationsScreen> createState() => _TrackApplicationsScreenState();
}

class _TrackApplicationsScreenState extends State<TrackApplicationsScreen> {
  final PermitService _permitService = PermitService();
  List<dynamic> _applications = [];
  bool _isLoading = true;
  String _errorMessage = '';
  Timer? _refreshTimer;
  bool _isFetching = false;

  @override
  void initState() {
    super.initState();
    _fetchApplications();
    WebSocketService().addListener(_onWebSocketMessage);
  }

  @override
  void dispose() {
    WebSocketService().removeListener(_onWebSocketMessage);
    super.dispose();
  }

  void _onWebSocketMessage(Map<String, dynamic> data) {
    if (data['type'] == 'PERMIT_APPLICATION_UPDATED' || 
        data['type'] == 'GLOBAL_PERMIT_APPLICATION_UPDATED') {
      _fetchApplications(silent: true);
    }
  }

  Future<void> _fetchApplications({bool silent = false}) async {
    if (!mounted || _isFetching) return;
    _isFetching = true;
    if (!silent) {
      setState(() => _isLoading = true);
    }
    
    try {
      final result = await _permitService.getMyApplications();
      if (mounted) {
        setState(() {
          if (result['success']) {
            _applications = result['data'];
            _errorMessage = '';
          } else if (!silent) {
            _errorMessage = result['message'];
          }
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted && !silent) {
        setState(() {
          _errorMessage = e.toString();
        });
      }
    } finally {
      _isFetching = false;
      if (mounted && !silent) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;
    final primaryColor = isDark ? Colors.white : ColorPallete.primaryNavy;

    return Scaffold(
      backgroundColor: isDark ? ColorPallete.darkBackgroundColor : ColorPallete.backgroundColor,
      appBar: AppBar(
        title: const Text('My Applications', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18)),
        backgroundColor: isDark ? Colors.black : ColorPallete.primaryNavy,
        foregroundColor: ColorPallete.whiteColor,
        elevation: 0,
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _fetchApplications,
          ),
        ],
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator(color: primaryColor))
          : _errorMessage.isNotEmpty
              ? Center(child: Text(_errorMessage, style: const TextStyle(color: ColorPallete.errorRed)))
              : _applications.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.assignment_late_outlined, size: 80, color: isDark ? Colors.white10 : ColorPallete.hintTextColor.withOpacity(0.3)),
                          const SizedBox(height: 20),
                          Text('No applications found.', style: TextStyle(color: isDark ? Colors.white38 : ColorPallete.hintTextColor, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _fetchApplications,
                      color: ColorPallete.primaryNavy,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(24),
                        itemCount: _applications.length,
                        itemBuilder: (context, index) {
                          final app = _applications[index];
                          return _buildApplicationCard(app, isDark);
                        },
                      ),
                    ),
    );
  }

  Widget _buildApplicationCard(Map<String, dynamic> app, bool isDark) {
    final String appId = app['applicationId'] ?? 'N/A';
    final String category = app['formData']?['buildingCategory'] ?? 'N/A';
    final String district = app['formData']?['district'] ?? 'N/A';
    final String status = app['status'] ?? 'Pending';
    final String? date = app['createdAt'];

    Color statusColor;
    switch (status) {
      case 'Approved': statusColor = const Color(0xFF10B981); break;
      case 'Under Review': case 'In Review': statusColor = const Color(0xFF3B82F6); break;
      case 'Returned': case 'Rejected': statusColor = const Color(0xFFEF4444); break;
      case 'Pending': default: statusColor = const Color(0xFFF59E0B); break;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      child: Material(
        color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        elevation: 0,
        child: InkWell(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => PermitDetailScreen(permit: app)),
            );
          },
          borderRadius: BorderRadius.circular(20),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: isDark ? Colors.white.withOpacity(0.05) : Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        appId.toUpperCase(),
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: isDark ? Colors.white38 : ColorPallete.hintTextColor, letterSpacing: 0.5),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: statusColor.withOpacity(0.2)),
                      ),
                      child: Text(
                        status.toUpperCase(),
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: statusColor, letterSpacing: 1),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                Text(
                  category,
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: isDark ? Colors.white : ColorPallete.primaryNavy, letterSpacing: -0.5),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Icon(Icons.location_on_rounded, size: 12, color: isDark ? Colors.white24 : ColorPallete.hintTextColor),
                    const SizedBox(width: 4),
                    Text(
                      district,
                      style: TextStyle(fontSize: 12, color: isDark ? Colors.white38 : ColorPallete.hintTextColor, fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
                const SizedBox(height: 15),
                const Divider(height: 1),
                const SizedBox(height: 15),
                Row(
                  children: [
                    Icon(Icons.access_time_filled_rounded, size: 14, color: isDark ? Colors.white24 : ColorPallete.hintTextColor),
                    const SizedBox(width: 6),
                    Text(
                      date != null ? _formatDate(date) : 'Recently',
                      style: TextStyle(fontSize: 12, color: isDark ? Colors.white38 : ColorPallete.hintTextColor, fontWeight: FontWeight.bold),
                    ),
                    const Spacer(),
                    Text('DETAILS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: isDark ? Colors.white24 : ColorPallete.primaryNavy, letterSpacing: 1)),
                    const SizedBox(width: 4),
                    Icon(Icons.arrow_forward_ios_rounded, size: 12, color: isDark ? Colors.white24 : ColorPallete.primaryNavy),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _formatDate(String isoString) {
    try {
      final date = DateTime.parse(isoString);
      final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return '${date.day} ${months[date.month - 1]} ${date.year}';
    } catch (e) {
      return 'Recently';
    }
  }
}
