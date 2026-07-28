import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_nav_bar/google_nav_bar.dart';
import 'package:permit_app/src/utils/colors.dart';
import 'package:permit_app/src/screens/apply_permit_screen.dart';
import 'package:permit_app/src/screens/track_applications_screen.dart';
import 'package:permit_app/src/screens/profile_tab.dart';
import 'package:permit_app/src/providers/auth_provider.dart';
import 'package:provider/provider.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:permit_app/src/screens/login_page.dart';
import 'package:permit_app/src/screens/guidelines_screen.dart';
import 'package:permit_app/src/screens/support_screen.dart';
import 'package:permit_app/src/screens/transaction_history_screen.dart';
import 'package:permit_app/src/screens/permit_detail_screen.dart';
import 'package:permit_app/src/screens/renew_permit_screen.dart';
import 'package:permit_app/src/services/permit_service.dart';
import 'package:permit_app/src/services/websocket_service.dart';
import 'package:permit_app/src/providers/theme_provider.dart';

class ApplicantDashboard extends StatefulWidget {
  const ApplicantDashboard({super.key});

  @override
  State<ApplicantDashboard> createState() => _ApplicantDashboardState();
}

class _ApplicantDashboardState extends State<ApplicantDashboard> {
  int _selectedIndex = 0;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  final PermitService _permitService = PermitService();
  String _fullName = "Applicant";
  List<dynamic> _permits = [];
  bool _isLoadingPermits = false;
  List<dynamic> _notifications = [];
  int _unreadNotificationsCount = 0;
  bool _isLoadingNotifications = false;
  Timer? _refreshTimer;
  bool _isFetchingPermits = false;
  bool _isFetchingNotifications = false;

  @override
  void initState() {
    super.initState();
    _loadUserData();
    _fetchPermits();
    WebSocketService().addListener(_onWebSocketMessage);
  }

  @override
  void dispose() {
    WebSocketService().removeListener(_onWebSocketMessage);
    super.dispose();
  }

  void _onWebSocketMessage(Map<String, dynamic> data) {
    if (data['type'] == 'NOTIFICATION_CREATED') {
      _fetchNotifications(silent: true);
    } else if (data['type'] == 'PERMIT_APPLICATION_UPDATED' || 
               data['type'] == 'GLOBAL_PERMIT_APPLICATION_UPDATED') {
      _fetchPermits(silent: true);
    }
  }



  Future<void> _fetchNotifications({bool silent = false}) async {
    if (!mounted || _isFetchingNotifications) return;
    _isFetchingNotifications = true;
    if (!silent) {
      setState(() => _isLoadingNotifications = true);
    }
    
    try {
      final result = await _permitService.getNotifications();
      if (!mounted) return;
      
      if (result['success']) {
        setState(() {
          _notifications = result['data'];
          _unreadNotificationsCount = result['unreadCount'] ?? 0;
        });
      }
    } catch (e) {
      debugPrint('Error fetching notifications: $e');
    } finally {
      _isFetchingNotifications = false;
      if (mounted && !silent) {
        setState(() => _isLoadingNotifications = false);
      }
    }
  }

  Future<void> _fetchPermits({bool silent = false}) async {
    if (!mounted || _isFetchingPermits) return;
    _isFetchingPermits = true;
    if (!silent) {
      setState(() => _isLoadingPermits = true);
    }
    
    try {
      final result = await _permitService.getMyApplications();
      if (!mounted) return;
      
      if (result['success']) {
        setState(() {
          _permits = result['data'];
        });
      } else if (!silent) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(result['message'] ?? 'Failed to fetch updates')),
        );
      }
    } catch (e) {
      if (mounted && !silent) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Connection Error: $e')),
        );
      }
    } finally {
      _isFetchingPermits = false;
      if (mounted && !silent) {
        setState(() => _isLoadingPermits = false);
      }
    }
    _fetchNotifications(silent: silent);
  }

  Future<void> _loadUserData() async {
    final name = await _storage.read(key: 'fullName');
    if (mounted && name != null) {
      setState(() {
        _fullName = name;
      });
    }
  }

  void _logout() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    await authProvider.logout();
    if (mounted) {
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (context) => const LoginPage()),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;
    final List<Widget> pages = [
      _buildHomeTab(),
      const TrackApplicationsScreen(),
      _buildNotificationsTab(),
      ProfileTab(onLogout: _logout, onUpdate: _loadUserData),
    ];

    return Scaffold(
      backgroundColor: isDark ? ColorPallete.darkBackgroundColor : ColorPallete.backgroundColor,
      body: IndexedStack(
        index: _selectedIndex,
        children: pages,
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: isDark ? ColorPallete.darkBackgroundColor : ColorPallete.backgroundColor,
        ),
        child: SafeArea(
          child: Container(
            margin: const EdgeInsets.fromLTRB(20, 0, 20, 20),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
              borderRadius: BorderRadius.circular(30),
              boxShadow: [
                BoxShadow(
                  blurRadius: 30,
                  color: Colors.black.withOpacity(isDark ? 0.3 : 0.08),
                  offset: const Offset(0, 10),
                )
              ],
            ),
            child: GNav(
              rippleColor: ColorPallete.primaryNavy.withOpacity(0.1),
              hoverColor: ColorPallete.primaryNavy.withOpacity(0.05),
              gap: 8,
              activeColor: isDark ? Colors.white : ColorPallete.primaryNavy,
              iconSize: 24,
              padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 12),
              duration: const Duration(milliseconds: 400),
              tabBackgroundColor: isDark ? Colors.white.withOpacity(0.1) : ColorPallete.primaryNavy.withOpacity(0.08),
              color: isDark ? Colors.white38 : ColorPallete.hintTextColor,
              tabs: [
                const GButton(
                  icon: Icons.home_rounded,
                  text: 'Home',
                ),
                const GButton(
                  icon: Icons.assignment_rounded,
                  text: 'Permits',
                ),
                GButton(
                  icon: Icons.notifications_rounded,
                  text: 'Alerts',
                  leading: Badge(
                    label: Text('$_unreadNotificationsCount'),
                    isLabelVisible: _unreadNotificationsCount > 0,
                    child: Icon(
                      Icons.notifications_rounded,
                      color: _selectedIndex == 2 
                          ? (isDark ? Colors.white : ColorPallete.primaryNavy) 
                          : (isDark ? Colors.white38 : ColorPallete.hintTextColor),
                      size: 24,
                    ),
                  ),
                ),
                const GButton(
                  icon: Icons.person_rounded,
                  text: 'Profile',
                ),
              ],
              selectedIndex: _selectedIndex,
              onTabChange: (index) {
                setState(() {
                  _selectedIndex = index;
                });
                if (index == 2) {
                  _fetchNotifications();
                } else if (index == 1) {
                  _fetchPermits();
                }
              },
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHomeTab() {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;
    final primaryColor = isDark ? Colors.white : ColorPallete.primaryNavy;
    
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 60),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Marhaba, Welcome back',
                      style: TextStyle(
                        fontSize: 14, 
                        fontWeight: FontWeight.w600,
                        color: isDark ? Colors.white54 : ColorPallete.hintTextColor,
                        letterSpacing: 0.5
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _fullName,
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w900,
                        color: primaryColor,
                        letterSpacing: -0.5
                      ),
                    ),
                  ],
                ),
                GestureDetector(
                  onTap: () => setState(() => _selectedIndex = 3),
                  child: Container(
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: primaryColor.withOpacity(0.1), width: 2),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.05),
                          blurRadius: 10,
                          offset: const Offset(0, 5),
                        )
                      ]
                    ),
                    child: CircleAvatar(
                      backgroundColor: isDark ? ColorPallete.primaryNavy : ColorPallete.primaryNavy,
                      radius: 28,
                      child: Text(
                        _fullName.isNotEmpty ? _fullName[0].toUpperCase() : '?',
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 35),
            
            // Premium Hero Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(30),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: isDark 
                    ? [const Color(0xFF1E3A8A), const Color(0xFF001F3F)]
                    : [ColorPallete.primaryNavy, const Color(0xFF1E3A8A)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(32),
                boxShadow: [
                  BoxShadow(
                    color: ColorPallete.primaryNavy.withOpacity(isDark ? 0.5 : 0.3),
                    blurRadius: 25,
                    offset: const Offset(0, 15),
                    spreadRadius: -5,
                  ),
                ],
              ),
              child: Stack(
                children: [
                   Positioned(
                    right: -20,
                    top: -20,
                    child: Icon(Icons.account_balance, size: 120, color: Colors.white.withOpacity(0.05)),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Text(
                          'GOVERNMENT PORTAL',
                          style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 1),
                        ),
                      ),
                      const SizedBox(height: 20),
                      const Text(
                        'Start Your Building\nPermit Application',
                        style: TextStyle(
                          color: Colors.white, 
                          fontSize: 24, 
                          fontWeight: FontWeight.w900,
                          height: 1.2,
                          letterSpacing: -0.5
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Fast-track your construction legacy with our secure digital sovereignty engine.',
                        style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 13, fontWeight: FontWeight.w500),
                      ),
                      const SizedBox(height: 25),
                      ElevatedButton(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (context) => const ApplyPermitScreen()),
                          );
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: ColorPallete.primaryNavy,
                          elevation: 0,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          padding: const EdgeInsets.symmetric(horizontal: 30, vertical: 15),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: const [
                            Text('Apply Now', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15)),
                            SizedBox(width: 8),
                            Icon(Icons.arrow_forward_rounded, size: 18),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 45),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Institutional Services',
                  style: TextStyle(
                    fontSize: 20, 
                    fontWeight: FontWeight.w900, 
                    color: primaryColor,
                    letterSpacing: -0.5
                  ),
                ),
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: primaryColor.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(Icons.grid_view_rounded, size: 18, color: primaryColor),
                )
              ],
            ),
            const SizedBox(height: 25),
            
            GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 2,
              mainAxisSpacing: 20,
              crossAxisSpacing: 20,
              childAspectRatio: 1.1,
              children: [
                _buildQuickActionCard(
                  title: 'Renew Permit',
                  status: 'Expired',
                  icon: Icons.autorenew_rounded,
                  color: const Color(0xFF0EA5E9),
                  isDark: isDark,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => const RenewPermitScreen()),
                    );
                  },
                ),
                _buildQuickActionCard(
                  title: 'Guidelines',
                  status: 'Handbook',
                  icon: Icons.menu_book_rounded,
                  color: const Color(0xFFF59E0B),
                  isDark: isDark,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => const GuidelinesScreen()),
                    );
                  },
                ),
                _buildQuickActionCard(
                  title: 'Support',
                  status: '24/7 Active',
                  icon: Icons.support_agent_rounded,
                  color: const Color(0xFF10B981),
                  isDark: isDark,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => const SupportScreen()),
                    );
                  },
                ),
                _buildQuickActionCard(
                  title: 'History',
                  status: 'Records',
                  icon: Icons.history_rounded,
                  color: const Color(0xFF8B5CF6),
                  isDark: isDark,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => const TransactionHistoryScreen()),
                    );
                  },
                ),
              ],
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActionCard({
    required String title,
    required String status,
    required IconData icon,
    required Color color,
    required bool isDark,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
          borderRadius: BorderRadius.circular(28),
          border: Border.all(color: isDark ? Colors.white.withOpacity(0.05) : Colors.transparent),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(isDark ? 0.2 : 0.04),
              blurRadius: 20,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const Spacer(),
            Text(
              status.toUpperCase(),
              style: TextStyle(
                fontSize: 9, 
                fontWeight: FontWeight.w900, 
                color: color.withOpacity(0.8),
                letterSpacing: 1
              ),
            ),
            const SizedBox(height: 4),
            Text(
              title,
              style: TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: 15,
                color: isDark ? Colors.white : ColorPallete.primaryNavy,
                letterSpacing: -0.3
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNotificationsTab() {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;
    final primaryColor = isDark ? Colors.white : ColorPallete.primaryNavy;

    return Scaffold(
      backgroundColor: isDark ? ColorPallete.darkBackgroundColor : ColorPallete.backgroundColor,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: Text('Notifications', style: TextStyle(fontWeight: FontWeight.bold, color: isDark ? Colors.white : ColorPallete.primaryNavy)),
        backgroundColor: isDark ? const Color(0xFF1E1E1E) : Colors.white,
        foregroundColor: isDark ? Colors.white : ColorPallete.primaryNavy,
        elevation: 0,
        actions: [
          IconButton(
            icon: Icon(Icons.refresh_rounded, color: isDark ? Colors.white70 : ColorPallete.primaryNavy),
            onPressed: () {
              _fetchPermits();
              _fetchNotifications();
            },
          ),
        ],
      ),
      body: _isLoadingNotifications
          ? Center(child: CircularProgressIndicator(color: primaryColor))
          : _notifications.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.notifications_none_rounded, size: 80, color: isDark ? Colors.white10 : ColorPallete.hintTextColor.withOpacity(0.5)),
                      const SizedBox(height: 20),
                      Text(
                        'No notifications yet',
                        style: TextStyle(color: isDark ? Colors.white38 : ColorPallete.hintTextColor, fontSize: 16),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: () async {
                    await _fetchPermits();
                    await _fetchNotifications();
                  },
                  color: primaryColor,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(15),
                    itemCount: _notifications.length,
                    itemBuilder: (context, index) {
                      final notif = _notifications[index];
                      final String message = notif['message'] ?? '';
                      final String type = notif['type'] ?? 'Info';
                      final bool isRead = notif['isRead'] ?? false;
                      final String createdAt = notif['createdAt'] ?? '';

                      IconData icon = Icons.info_rounded;
                      Color color = isDark ? Colors.white : ColorPallete.primaryNavy;

                      if (type == 'Success' || type == 'Approved' || type == 'Applied') {
                        icon = Icons.check_circle_rounded;
                        color = ColorPallete.successGreen;
                      } else if (type == 'Alert' || type == 'Rejected' || type == 'Returned') {
                        icon = Icons.warning_rounded;
                        color = ColorPallete.errorRed;
                      }

                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(15),
                          side: isRead 
                              ? BorderSide.none 
                              : BorderSide(color: primaryColor.withOpacity(0.15), width: 1.5),
                        ),
                        color: isDark
                            ? (isRead ? const Color(0xFF1E1E1E) : const Color(0xFF2D2D2D))
                            : (isRead ? Colors.white : ColorPallete.primaryNavy.withOpacity(0.02)),
                        elevation: isRead ? 1 : 3,
                        shadowColor: Colors.black.withOpacity(isDark ? 0.3 : 0.08),
                        child: ListTile(
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          leading: Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: color.withOpacity(0.1),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              icon,
                              color: color,
                              size: 24,
                            ),
                          ),
                          title: Row(
                            children: [
                              Expanded(
                                child: Text(
                                  type == 'Applied' 
                                      ? 'Request Sent Correctly' 
                                      : (type == 'Approved' 
                                          ? 'Request Been Approved' 
                                          : (type == 'Success' 
                                              ? 'Permit Approved / Submitted' 
                                              : (type == 'Returned' ? 'Action Required / Returned' : (type == 'Rejected' ? 'Permit Request Rejected' : 'System Update')))),
                                  style: TextStyle(
                                    fontWeight: isRead ? FontWeight.bold : FontWeight.w900,
                                    color: isDark ? Colors.white : ColorPallete.primaryNavy,
                                    fontSize: 15,
                                  ),
                                ),
                              ),
                              if (!isRead)
                                Container(
                                  width: 8,
                                  height: 8,
                                  decoration: const BoxDecoration(
                                    color: Colors.redAccent,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                            ],
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const SizedBox(height: 6),
                              Text(
                                message,
                                style: TextStyle(
                                  color: isDark 
                                      ? (isRead ? Colors.white38 : Colors.white70)
                                      : (isRead ? ColorPallete.hintTextColor : Colors.black87),
                                  fontSize: 13.5,
                                  fontWeight: isRead ? FontWeight.normal : FontWeight.w500,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                _formatRelativeTime(createdAt),
                                style: TextStyle(
                                  color: isDark ? Colors.white24 : ColorPallete.hintTextColor.withOpacity(0.8),
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                          trailing: Icon(Icons.arrow_forward_ios_rounded, size: 14, color: isDark ? Colors.white24 : Colors.grey),
                          onTap: () async {
                            if (!isRead) {
                              await _permitService.markNotificationAsRead(notif['_id']);
                              _fetchNotifications();
                            }

                            final matchApp = RegExp(r'MOG-\d{4}-\d{4}').firstMatch(message);
                            final matchPermit = RegExp(r'MUBP-\d{4}-[A-Z0-9]{5}').firstMatch(message);
                            final appId = matchApp?.group(0);
                            final permitId = matchPermit?.group(0);

                            dynamic matchingPermit;
                            if (appId != null || permitId != null) {
                              try {
                                matchingPermit = _permits.firstWhere(
                                  (p) => p['applicationId'] == appId || p['permitId'] == permitId,
                                  orElse: () => null,
                                );
                              } catch (_) {}
                            }

                            if (matchingPermit != null) {
                              if (mounted) {
                                final result = await Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => PermitDetailScreen(permit: matchingPermit),
                                  ),
                                );
                                if (result == true) {
                                  _fetchPermits();
                                  _fetchNotifications();
                                }
                              }
                            } else {
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Opening applications list...'),
                                    duration: Duration(seconds: 1),
                                  ),
                                );
                                setState(() {
                                  _selectedIndex = 1;
                                });
                              }
                            }
                          },
                        ),
                      );
                    },
                  ),
                ),
    );
  }

  String _formatRelativeTime(String isoString) {
    try {
      final date = DateTime.parse(isoString);
      final diff = DateTime.now().difference(date);

      if (diff.inSeconds < 60) return 'Just now';
      if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
      if (diff.inHours < 24) return '${diff.inHours}h ago';
      if (diff.inDays < 7) return '${diff.inDays}d ago';
      
      final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return '${date.day} ${months[date.month - 1]} ${date.year}';
    } catch (e) {
      return 'Recently';
    }
  }
}

