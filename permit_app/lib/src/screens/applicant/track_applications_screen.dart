import 'dart:async';
import 'package:flutter/material.dart';
import 'package:permit_app/src/utils/colors.dart';
import 'package:permit_app/src/services/permit_service.dart';
import 'package:permit_app/src/screens/applicant/permit_detail_screen.dart';
import 'package:permit_app/src/providers/theme_provider.dart';
import 'package:permit_app/src/services/websocket_service.dart';
import 'package:permit_app/src/widgets/civic_app_bar.dart';
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
  
  String _filterStatus = 'All';
  String _filterBuildingType = 'All';
  String _filterDistrict = 'All';

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
      appBar: CivicAppBar(
        title: 'My Applications',
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list_rounded),
            onPressed: _showFilterModal,
          ),
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
                      child: Builder(
                        builder: (context) {
                          final filteredApplications = _applications.where((app) {
                            final status = app['status'] ?? 'Pending';
                            final type = app['formData']?['buildingCategory'] ?? 'N/A';
                            final dist = app['formData']?['district'] ?? 'N/A';

                            if (_filterStatus != 'All' && status != _filterStatus) return false;
                            if (_filterBuildingType != 'All' && type != _filterBuildingType) return false;
                            if (_filterDistrict != 'All' && dist != _filterDistrict) return false;
                            return true;
                          }).toList();

                          if (filteredApplications.isEmpty) {
                            return Center(
                              child: Text('No results match your filters.', style: TextStyle(color: isDark ? Colors.white38 : ColorPallete.hintTextColor, fontWeight: FontWeight.bold)),
                            );
                          }

                          return ListView.builder(
                            padding: const EdgeInsets.all(24),
                            itemCount: filteredApplications.length,
                            itemBuilder: (context, index) {
                              final app = filteredApplications[index];
                              return _buildApplicationCard(app, isDark);
                            },
                          );
                        }
                      ),
                    ),
    );
  }

  void _showFilterModal() {
    final isDark = Provider.of<ThemeProvider>(context, listen: false).isDarkMode;
    
    // Extract unique values for filters
    final statuses = ['All', ..._applications.map((e) => e['status']?.toString() ?? 'Pending').toSet()];
    final buildingTypes = ['All', ..._applications.map((e) => e['formData']?['buildingCategory']?.toString() ?? 'N/A').toSet()];
    final districts = ['All', ..._applications.map((e) => e['formData']?['district']?.toString() ?? 'N/A').toSet()];

    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? const Color(0xFF1E1E1E) : Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      isScrollControlled: true,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom, left: 24, right: 24, top: 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Filter Permits', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: isDark ? Colors.white : ColorPallete.primaryNavy)),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(context),
                        color: isDark ? Colors.white70 : Colors.black,
                      ),
                    ],
                  ),
                  const Divider(),
                  const SizedBox(height: 10),
                  
                  const Text('Status', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: statuses.map((s) => ChoiceChip(
                      label: Text(s),
                      selected: _filterStatus == s,
                      onSelected: (selected) {
                        setModalState(() => _filterStatus = s);
                        setState(() => _filterStatus = s);
                      },
                    )).toList(),
                  ),
                  const SizedBox(height: 16),
                  
                  const Text('Building Type', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    value: _filterBuildingType,
                    isExpanded: true,
                    dropdownColor: isDark ? const Color(0xFF2D2D2D) : Colors.white,
                    items: buildingTypes.map((t) => DropdownMenuItem(value: t, child: Text(t, overflow: TextOverflow.ellipsis))).toList(),
                    onChanged: (val) {
                      if (val != null) {
                        setModalState(() => _filterBuildingType = val);
                        setState(() => _filterBuildingType = val);
                      }
                    },
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: isDark ? Colors.white.withOpacity(0.05) : Colors.grey.shade100,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    ),
                  ),
                  const SizedBox(height: 16),

                  const Text('District', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    value: _filterDistrict,
                    isExpanded: true,
                    dropdownColor: isDark ? const Color(0xFF2D2D2D) : Colors.white,
                    items: districts.map((d) => DropdownMenuItem(value: d, child: Text(d, overflow: TextOverflow.ellipsis))).toList(),
                    onChanged: (val) {
                      if (val != null) {
                        setModalState(() => _filterDistrict = val);
                        setState(() => _filterDistrict = val);
                      }
                    },
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: isDark ? Colors.white.withOpacity(0.05) : Colors.grey.shade100,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    ),
                  ),
                  const SizedBox(height: 24),
                  
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: ColorPallete.primaryNavy,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))
                      ),
                      onPressed: () {
                        setState(() {
                          _filterStatus = 'All';
                          _filterBuildingType = 'All';
                          _filterDistrict = 'All';
                        });
                        Navigator.pop(context);
                      },
                      child: const Text('Reset Filters'),
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            );
          }
        );
      }
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
          onTap: () async {
            final result = await Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => PermitDetailScreen(permit: app)),
            );
            if (result == true) {
              _fetchApplications();
            }
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
