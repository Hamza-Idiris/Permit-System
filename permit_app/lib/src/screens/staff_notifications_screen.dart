import 'dart:async';
import 'package:flutter/material.dart';
import 'package:permit_app/src/utils/colors.dart';
import 'package:permit_app/src/services/permit_service.dart';
import 'package:permit_app/src/providers/theme_provider.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

class StaffNotificationsScreen extends StatefulWidget {
  const StaffNotificationsScreen({super.key});

  @override
  State<StaffNotificationsScreen> createState() => _StaffNotificationsScreenState();
}

class _StaffNotificationsScreenState extends State<StaffNotificationsScreen> {
  final PermitService _permitService = PermitService();
  List<dynamic> _notifications = [];
  bool _isLoading = true;
  Timer? _refreshTimer;
  bool _isFetching = false;

  @override
  void initState() {
    super.initState();
    _fetchNotifications();
    _startRefreshTimer();
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  void _startRefreshTimer() {
    _refreshTimer = Timer.periodic(const Duration(seconds: 5), (timer) {
      _fetchNotifications(silent: true);
    });
  }

  Future<void> _fetchNotifications({bool silent = false}) async {
    if (!mounted || _isFetching) return;
    _isFetching = true;
    if (!silent) {
      setState(() => _isLoading = true);
    }
    try {
      final result = await _permitService.getNotifications();
      if (mounted) {
        if (result['success']) {
          setState(() {
            _notifications = result['data'];
            _isLoading = false;
          });
        } else if (!silent) {
          setState(() => _isLoading = false);
        }
      }
    } catch (e) {
      debugPrint('Error fetching notifications: $e');
    } finally {
      _isFetching = false;
      if (mounted && !silent) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _deleteNotification(String id) async {
    final result = await _permitService.deleteNotification(id);
    if (result['success']) {
      _fetchNotifications();
    }
  }

  Future<void> _markAsRead(String id) async {
    await _permitService.markNotificationAsRead(id);
    _fetchNotifications();
  }

  void _showDetailsModal(Map<String, dynamic> notif, bool isDark) {
    if (!notif['isRead']) _markAsRead(notif['_id']);
    
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.6,
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1A1A1A) : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
        ),
        padding: const EdgeInsets.all(32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: isDark ? Colors.white10 : Colors.grey.shade200,
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
            const SizedBox(height: 32),
            Text(
              'ALERT DETAILS',
              style: TextStyle(
                fontSize: 10, 
                fontWeight: FontWeight.w900, 
                letterSpacing: 2,
                color: isDark ? Colors.white38 : ColorPallete.hintTextColor
              ),
            ),
            const SizedBox(height: 8),
            Text(
              notif['type']?.toUpperCase() ?? 'INFORMATION',
              style: TextStyle(
                fontSize: 24, 
                fontWeight: FontWeight.w900, 
                color: isDark ? Colors.white : ColorPallete.primaryNavy
              ),
            ),
            const SizedBox(height: 24),
            const Divider(),
            const SizedBox(height: 24),
            Expanded(
              child: SingleChildScrollView(
                child: Text(
                  notif['message'] ?? 'No message content.',
                  style: TextStyle(
                    fontSize: 16, 
                    height: 1.6, 
                    color: isDark ? Colors.white70 : Colors.black87,
                    fontWeight: FontWeight.w500
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isDark ? Colors.white : ColorPallete.primaryNavy,
                      foregroundColor: isDark ? Colors.black : Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 18),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      elevation: 0
                    ),
                    child: const Text('ACKNOWLEDGE', style: TextStyle(fontWeight: FontWeight.w900)),
                  ),
                ),
                const SizedBox(width: 12),
                Container(
                  decoration: BoxDecoration(
                    color: ColorPallete.errorRed.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: IconButton(
                    onPressed: () {
                      _deleteNotification(notif['_id']);
                      Navigator.pop(context);
                    },
                    icon: const Icon(Icons.delete_outline_rounded, color: ColorPallete.errorRed),
                    padding: const EdgeInsets.all(18),
                  ),
                )
              ],
            )
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;
    final primaryColor = isDark ? Colors.white : ColorPallete.primaryNavy;

    return Scaffold(
      backgroundColor: isDark ? ColorPallete.darkBackgroundColor : ColorPallete.backgroundColor,
      appBar: AppBar(
        title: const Text('Staff Alerts', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18)),
        backgroundColor: isDark ? Colors.black : ColorPallete.primaryNavy,
        foregroundColor: ColorPallete.whiteColor,
        elevation: 0,
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _fetchNotifications,
          ),
        ],
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator(color: primaryColor))
          : _notifications.isEmpty
              ? _buildEmptyState(isDark)
              : ListView.builder(
                  padding: const EdgeInsets.all(24),
                  itemCount: _notifications.length,
                  itemBuilder: (context, index) {
                    return _buildNotificationCard(_notifications[index], isDark);
                  },
                ),
    );
  }

  Widget _buildEmptyState(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.notifications_off_rounded, size: 80, color: isDark ? Colors.white10 : Colors.grey.shade200),
          const SizedBox(height: 24),
          Text(
            'System is quiet.',
            style: TextStyle(
              fontSize: 16, 
              fontWeight: FontWeight.w900, 
              color: isDark ? Colors.white38 : ColorPallete.hintTextColor
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'New alerts will appear here.',
            style: TextStyle(
              fontSize: 12, 
              color: isDark ? Colors.white24 : ColorPallete.hintTextColor.withOpacity(0.5)
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNotificationCard(Map<String, dynamic> notif, bool isDark) {
    final String id = notif['_id'];
    final String type = notif['type'] ?? 'INFO';
    final String message = notif['message'] ?? '';
    final bool isRead = notif['isRead'] ?? false;
    final String time = notif['createdAt'] != null 
        ? DateFormat('HH:mm | MMM d').format(DateTime.parse(notif['createdAt']))
        : 'Recently';

    Color typeColor;
    IconData icon;

    switch (type.toUpperCase()) {
      case 'URGENT':
      case 'ERROR':
      case 'ALERT':
        typeColor = const Color(0xFFEF4444);
        icon = Icons.warning_amber_rounded;
        break;
      case 'SUCCESS':
      case 'APPROVED':
        typeColor = const Color(0xFF10B981);
        icon = Icons.check_circle_outline_rounded;
        break;
      default:
        typeColor = const Color(0xFF3B82F6);
        icon = Icons.info_outline_rounded;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      child: Material(
        color: isDark 
            ? (isRead ? const Color(0xFF1E1E1E) : const Color(0xFF2D2D2D))
            : (isRead ? Colors.white : const Color(0xFFF8FAFC)),
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
          onTap: () => _markAsRead(id),
          borderRadius: BorderRadius.circular(20),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: typeColor.withOpacity(0.1),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(icon, color: typeColor, size: 18),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      type.toUpperCase(),
                      style: TextStyle(
                        fontSize: 10, 
                        fontWeight: FontWeight.w900, 
                        color: typeColor, 
                        letterSpacing: 1
                      ),
                    ),
                    const Spacer(),
                    Text(
                      time,
                      style: TextStyle(
                        fontSize: 10, 
                        color: isDark ? Colors.white24 : ColorPallete.hintTextColor,
                        fontWeight: FontWeight.bold
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  message,
                  style: TextStyle(
                    fontSize: 14, 
                    fontWeight: isRead ? FontWeight.w500 : FontWeight.w800,
                    color: isDark ? Colors.white : ColorPallete.primaryNavy,
                    height: 1.5
                  ),
                ),
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton.icon(
                      onPressed: () => _deleteNotification(id),
                      icon: const Icon(Icons.delete_outline_rounded, size: 14),
                      label: const Text('DISMISS', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 0.5)),
                      style: TextButton.styleFrom(
                        foregroundColor: isDark ? Colors.white24 : ColorPallete.errorRed.withOpacity(0.7),
                      ),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      onPressed: () => _showDetailsModal(notif, isDark),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: isDark ? Colors.white : ColorPallete.primaryNavy,
                        foregroundColor: isDark ? Colors.black : Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      ),
                      child: const Text('DETAILS', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900)),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
