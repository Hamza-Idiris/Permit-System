import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:permit_app/src/utils/colors.dart';
import 'package:permit_app/src/services/permit_service.dart';
import 'package:permit_app/src/providers/theme_provider.dart';
import 'package:provider/provider.dart';

class ApplyPermitScreen extends StatefulWidget {
  const ApplyPermitScreen({super.key});

  @override
  State<ApplyPermitScreen> createState() => _ApplyPermitScreenState();
}

class _ApplyPermitScreenState extends State<ApplyPermitScreen> {
  final TextEditingController _plotIdController = TextEditingController();
  final TextEditingController _customWidthController = TextEditingController();
  final TextEditingController _customLengthController = TextEditingController();
  final TextEditingController _floorsController = TextEditingController(text: '1');
  
  final PermitService _permitService = PermitService();
  final ImagePicker _picker = ImagePicker();
  final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin = FlutterLocalNotificationsPlugin();

  List<String> _districts = [];
  bool _isLoadingDistricts = true;

  List<dynamic> _dynamicBuildingTypes = [];
  bool _isLoadingBuildingTypes = true;
  List<dynamic> _discounts = [];

  String _selectedRequestType = 'New Construction';
  List<dynamic> _allNewConstructionTypes = [];
  List<dynamic> _allRenovationTypes = [];

  final List<String> _plotSizes = ['Rubac (10x10)', 'Nus (10x20)', 'Boos (20x20)', '2 Boos (20x40)', 'Custom'];
  List<String> _buildingTypes = [];

  String? _selectedDistrict;
  String? _selectedPlotSize;
  String? _selectedBuildingType;

  String? _passportPath;
  String? _landDocPath;

  List<int>? _passportBytes;
  String? _passportName;
  List<int>? _landDocBytes;
  String? _landDocName;
  
  double _totalFee = 0.0;
  double _calculatedArea = 0.0;

  @override
  void initState() {
    super.initState();
    _plotIdController.addListener(_validateForm);
    _customWidthController.addListener(() { _calculateFee(); _validateForm(); });
    _customLengthController.addListener(() { _calculateFee(); _validateForm(); });
    _floorsController.addListener(() { _calculateFee(); _validateForm(); });
    _floorsController.addListener(() { _calculateFee(); _validateForm(); });
    _fetchDistricts();
    _fetchBuildingTypes();
    _initNotifications();
  }

  Future<void> _fetchBuildingTypes() async {
    final resultNew = await _permitService.getBuildingTypes();
    final resultReno = await _permitService.getRenovationTypes();
    final resultDisc = await _permitService.getDiscounts();

    if (mounted) {
      if (resultNew['success']) {
        _allNewConstructionTypes = resultNew['data'];
      }
      if (resultReno['success']) {
        _allRenovationTypes = resultReno['data'];
      }
      if (resultDisc['success']) {
        _discounts = resultDisc['data'] as List<dynamic>? ?? [];
      }

      _updateBuildingTypesList();
      
      setState(() {
        _isLoadingBuildingTypes = false;
      });
    }
  }

  void _updateBuildingTypesList() {
    setState(() {
      _selectedBuildingType = null;
      if (_selectedRequestType == 'New Construction') {
        _dynamicBuildingTypes = _allNewConstructionTypes;
      } else {
        _dynamicBuildingTypes = _allRenovationTypes;
      }
      _buildingTypes = _dynamicBuildingTypes.map((b) => b['name'].toString()).toList();
      _calculateFee();
      _validateForm();
    });
  }

  Future<void> _fetchDistricts() async {
    final result = await _permitService.getDistricts();
    if (result['success'] && mounted) {
      setState(() {
        _districts = (result['data'] as List).map((d) => d['name'].toString()).toList();
        _isLoadingDistricts = false;
      });
    } else if (mounted) {
      setState(() {
        _isLoadingDistricts = false;
      });
    }
  }

  Future<void> _initNotifications() async {
    const AndroidInitializationSettings initializationSettingsAndroid = AndroidInitializationSettings('@mipmap/ic_launcher');
    const InitializationSettings initializationSettings = InitializationSettings(android: initializationSettingsAndroid);
    await flutterLocalNotificationsPlugin.initialize(settings: initializationSettings);
  }

  Future<void> _showNotification(String title, String body) async {
    const AndroidNotificationDetails androidPlatformChannelSpecifics = AndroidNotificationDetails(
      'permit_status_channel',
      'Permit Status',
      importance: Importance.max,
      priority: Priority.high,
      showWhen: true,
    );
    const NotificationDetails platformChannelSpecifics = NotificationDetails(android: androidPlatformChannelSpecifics);
    await flutterLocalNotificationsPlugin.show(id: 0, title: title, body: body, notificationDetails: platformChannelSpecifics);
  }

  @override
  void dispose() {
    _plotIdController.dispose();
    _customWidthController.dispose();
    _customLengthController.dispose();
    _floorsController.dispose();
    super.dispose();
  }

  void _validateForm() {
    setState(() {});
  }

  void _calculateFee() {
    double area = 0;
    if (_selectedPlotSize == 'Rubac (10x10)') area = 100;
    else if (_selectedPlotSize == 'Nus (10x20)') area = 200;
    else if (_selectedPlotSize == 'Boos (20x20)') area = 400;
    else if (_selectedPlotSize == '2 Boos (20x40)') area = 800;
    else if (_selectedPlotSize == 'Custom') {
      double w = double.tryParse(_customWidthController.text) ?? 0;
      double l = double.tryParse(_customLengthController.text) ?? 0;
      area = w * l;
    }
    _calculatedArea = area;

    double fee = 0;
    int floors = int.tryParse(_floorsController.text) ?? 1;
    if (floors < 1) floors = 1;

    final selectedTypeObj = _dynamicBuildingTypes.firstWhere(
      (b) => b['name'] == _selectedBuildingType,
      orElse: () => null,
    );

    if (selectedTypeObj != null) {
      double multiplier = (selectedTypeObj['feeMultiplier'] ?? 0).toDouble();
      bool isPerFloor = selectedTypeObj['isPerFloor'] ?? false;

      if (isPerFloor) {
        fee = area * multiplier * floors;
      } else {
        fee = area * multiplier;
      }

      // Apply active discount: type-specific first, else category-wide
      double discountPct = 0;
      final typeName = _selectedBuildingType ?? '';
      for (final d in _discounts) {
        if (d['isActive'] == false) continue;
        if (d['scope'] == 'type' &&
            (d['typeName']?.toString().toLowerCase() == typeName.toLowerCase()) &&
            ((d['requestType'] == null || d['requestType'] == '' || d['requestType'] == _selectedRequestType))) {
          discountPct = (d['discountPercent'] ?? 0).toDouble();
          break;
        }
      }
      if (discountPct == 0) {
        for (final d in _discounts) {
          if (d['isActive'] == false) continue;
          if (d['scope'] == 'category' && d['requestType'] == _selectedRequestType) {
            discountPct = (d['discountPercent'] ?? 0).toDouble();
            break;
          }
        }
      }
      if (discountPct > 0) {
        fee = fee * (1 - discountPct / 100);
      }
    }

    setState(() { _totalFee = fee; });
  }

  bool _isFormValid() {
    if (_plotIdController.text.isEmpty || _selectedDistrict == null || _selectedPlotSize == null || _selectedBuildingType == null) return false;
    
    final selectedTypeObj = _dynamicBuildingTypes.firstWhere(
      (b) => b['name'] == _selectedBuildingType,
      orElse: () => null,
    );
    bool isPerFloor = selectedTypeObj != null ? (selectedTypeObj['isPerFloor'] ?? false) : false;

    if (_selectedPlotSize == 'Custom' && (_customWidthController.text.isEmpty || _customLengthController.text.isEmpty)) return false;
    if (isPerFloor && _floorsController.text.isEmpty) return false;
    if (_passportBytes == null || _landDocBytes == null) return false;
    return _totalFee > 0;
  }

  Future<void> _pickDocument(String docType) async {
    final themeProvider = Provider.of<ThemeProvider>(context, listen: false);
    final isDark = themeProvider.isDarkMode;

    if (docType == 'passport') {
      final source = await showModalBottomSheet<String>(
        context: context,
        backgroundColor: isDark ? const Color(0xFF1E1E1E) : Colors.white,
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
        builder: (context) => Container(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Identity Verification', 
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: isDark ? Colors.white : ColorPallete.primaryNavy)
              ),
              const SizedBox(height: 10),
              Text('Choose a source for your Passport or ID', 
                style: TextStyle(fontSize: 14, color: isDark ? Colors.white54 : ColorPallete.hintTextColor)
              ),
              const SizedBox(height: 30),
              _buildModalOption(Icons.camera_alt_rounded, 'Open Camera', isDark, () => Navigator.pop(context, 'camera')),
              const SizedBox(height: 12),
              _buildModalOption(Icons.photo_library_rounded, 'Browse Files', isDark, () => Navigator.pop(context, 'gallery')),
            ],
          ),
        ),
      );

      if (source == 'camera') {
        final XFile? photo = await _picker.pickImage(source: ImageSource.camera);
        if (photo != null) {
          final bytes = await photo.readAsBytes();
          setState(() { _passportPath = photo.path; _passportBytes = bytes; _passportName = photo.name; });
        }
      } else if (source == 'gallery') {
        FilePickerResult? result = await FilePicker.pickFiles(type: FileType.custom, allowedExtensions: ['jpg','jpeg','png','pdf'], withData: true);
        if (result != null) {
          setState(() { _passportPath = result.files.single.path; _passportBytes = result.files.single.bytes; _passportName = result.files.single.name; });
        }
      }
    } else if (docType == 'land') {
      FilePickerResult? result = await FilePicker.pickFiles(type: FileType.custom, allowedExtensions: ['pdf'], withData: true);
      if (result != null) {
        setState(() { _landDocPath = result.files.single.path; _landDocBytes = result.files.single.bytes; _landDocName = result.files.single.name; });
      }
    }
    _validateForm();
  }

  Widget _buildModalOption(IconData icon, String label, bool isDark, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
        decoration: BoxDecoration(
          color: isDark ? Colors.white.withOpacity(0.05) : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            Icon(icon, color: isDark ? Colors.white70 : ColorPallete.primaryNavy),
            const SizedBox(width: 15),
            Text(label, style: TextStyle(fontWeight: FontWeight.bold, color: isDark ? Colors.white70 : ColorPallete.primaryNavy)),
            const Spacer(),
            Icon(Icons.chevron_right_rounded, color: isDark ? Colors.white24 : Colors.grey.shade400),
          ],
        ),
      ),
    );
  }

  void _showPaymentModal() {
    final isDark = Provider.of<ThemeProvider>(context, listen: false).isDarkMode;
    final TextEditingController phoneController = TextEditingController();
    final TextEditingController amountController = TextEditingController(text: _totalFee.toStringAsFixed(2));
    bool isProcessing = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) {
          return Container(
            margin: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
              borderRadius: BorderRadius.circular(24),
            ),
            padding: EdgeInsets.only(
              left: 24, right: 24, top: 32,
              bottom: MediaQuery.of(context).viewInsets.bottom + 32,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (isProcessing) ...[
                  const CircularProgressIndicator(color: ColorPallete.primaryNavy),
                  const SizedBox(height: 24),
                  const Text('Processing Payment...', style: TextStyle(fontWeight: FontWeight.bold)),
                ] else ...[
                  Icon(
                    phoneController.text.startsWith('61') ? Icons.phone_android : (phoneController.text.startsWith('62') ? Icons.cell_wifi : Icons.account_balance_wallet),
                    size: 50,
                    color: phoneController.text.startsWith('61') ? Colors.green : (phoneController.text.startsWith('62') ? Colors.blue : ColorPallete.primaryNavy),
                  ),
                  const SizedBox(height: 15),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text('\$', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: isDark ? Colors.white : ColorPallete.primaryNavy)),
                      const SizedBox(width: 4),
                      IntrinsicWidth(
                        child: TextField(
                          controller: amountController,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          style: TextStyle(fontSize: 32, fontWeight: FontWeight.w900, color: isDark ? Colors.white : ColorPallete.primaryNavy),
                          decoration: const InputDecoration(border: InputBorder.none, isDense: true),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 5),
                  Text('Confirming to Mogadishu Local Gov', style: TextStyle(color: isDark ? Colors.white38 : ColorPallete.hintTextColor, fontSize: 13, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 30),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
                        decoration: BoxDecoration(
                          color: isDark ? Colors.black26 : Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Text('+252', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: isDark ? Colors.white : Colors.black)),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: TextField(
                          controller: phoneController,
                          keyboardType: TextInputType.phone,
                          maxLength: 9,
                          onChanged: (value) => setModalState(() {}),
                          style: TextStyle(fontSize: 20, letterSpacing: 2, color: isDark ? Colors.white : Colors.black, fontWeight: FontWeight.bold),
                          decoration: InputDecoration(
                            hintText: '61XXXXXXX',
                            hintStyle: TextStyle(fontSize: 16, letterSpacing: 0, color: isDark ? Colors.white24 : Colors.grey),
                            counterText: "",
                            filled: true,
                            fillColor: isDark ? Colors.black26 : Colors.grey.shade100,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  if (phoneController.text.startsWith('61'))
                    Text('Hormuud Telecom', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 16))
                  else if (phoneController.text.startsWith('62'))
                    Text('Somtel Network', style: TextStyle(color: Colors.blue, fontWeight: FontWeight.bold, fontSize: 16)),
                  const SizedBox(height: 30),
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: ColorPallete.primaryNavy,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      onPressed: () async {
                        if (phoneController.text.length < 7) {
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter a valid phone number (at least 7 digits)')));
                          return;
                        }
                        final double actualAmount = double.tryParse(amountController.text) ?? _totalFee;
                        setModalState(() => isProcessing = true);
                        
                        final paymentResult = await _permitService.processPayment(
                          phone: phoneController.text,
                          amount: actualAmount,
                        );

                        if (!paymentResult['success']) {
                          setModalState(() => isProcessing = false);
                          showDialog(
                            context: context,
                            builder: (ctx) => Dialog(
                                backgroundColor: isDark ? const Color(0xFF1E1E1E) : Colors.white,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                                child: Padding(
                                  padding: const EdgeInsets.all(24.0),
                                  child: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(Icons.error_outline_rounded, color: Colors.amber, size: 60),
                                      const SizedBox(height: 16),
                                      Text('Payment Issue', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: isDark ? Colors.white : ColorPallete.primaryNavy)),
                                      const SizedBox(height: 12),
                                      Text('Payment failed:\n${paymentResult['message']}', textAlign: TextAlign.center, style: TextStyle(color: isDark ? Colors.white70 : Colors.grey.shade700, fontSize: 14)),
                                      const SizedBox(height: 24),
                                      SizedBox(
                                        width: double.infinity,
                                        child: ElevatedButton(
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: ColorPallete.primaryNavy,
                                            foregroundColor: Colors.white,
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                          ),
                                          onPressed: () => Navigator.pop(ctx),
                                          child: const Text('OK', style: TextStyle(fontWeight: FontWeight.bold)),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                          );
                          return;
                        }

                        const storage = FlutterSecureStorage();
                        final String storedName = await storage.read(key: 'fullName') ?? 'Official Member';
                        final String storedPhone = await storage.read(key: 'phone') ?? '061XXXXXXX';
                        final String storedEmail = await storage.read(key: 'email') ?? 'user@gov.so';

                        final selectedTypeObj = _dynamicBuildingTypes.firstWhere((b) => b['name'] == _selectedBuildingType, orElse: () => null);
                        bool isPerFloor = selectedTypeObj != null ? (selectedTypeObj['isPerFloor'] ?? false) : false;

                        // Submit Application ONLY if Payment Succeeded
                        final result = await _permitService.submitApplication(
                          fullName: storedName, phone: storedPhone, email: storedEmail,
                          plotId: _plotIdController.text, district: _selectedDistrict!,
                          requestType: _selectedRequestType,
                          buildingCategory: _selectedBuildingType!,
                          floors: isPerFloor ? _floorsController.text : '1',
                          landArea: _calculatedArea.toString(),
                          totalFee: actualAmount.toString(),
                          nationalIdBytes: _passportBytes!, nationalIdName: _passportName ?? 'id.jpg',
                          ownershipDocsBytes: _landDocBytes!, ownershipDocsName: _landDocName ?? 'land.pdf',
                        );
                        
                        if (mounted) Navigator.pop(context);
                        if (result['success']) {
                          _showSuccessAnimation();
                          _showNotification('Permit Applied!', 'Application Ref: ${_plotIdController.text}. Payment confirmed.');
                        } else {
                          if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(result['message']), backgroundColor: Colors.red));
                        }

                      },
                      child: const Text('AUTHORIZE PAYMENT', style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1)),
                    ),
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }

  void _showSuccessAnimation() {
    final isDark = Provider.of<ThemeProvider>(context, listen: false).isDarkMode;
    showGeneralDialog(
      context: context,
      barrierDismissible: false,
      transitionDuration: const Duration(milliseconds: 600),
      pageBuilder: (context, anim1, anim2) => Center(
        child: Material(
          color: Colors.transparent,
          child: Container(
            width: MediaQuery.of(context).size.width * 0.8,
            padding: const EdgeInsets.all(32),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
            borderRadius: BorderRadius.circular(32),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.check_circle, size: 80, color: ColorPallete.successGreen),
              const SizedBox(height: 24),
              Text('SUCCESS', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: isDark ? Colors.white : ColorPallete.primaryNavy, letterSpacing: 2)),
              const SizedBox(height: 12),
              Text('Your application is being processed.', textAlign: TextAlign.center, style: TextStyle(color: isDark ? Colors.white54 : ColorPallete.hintTextColor)),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: ColorPallete.primaryNavy, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
                  onPressed: () { Navigator.pop(context); Navigator.pop(context); },
                  child: const Text('DONE'),
                ),
              ),
            ],
          ),
        ),
        ), // Added missing Material closing
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;
    final primaryColor = isDark ? Colors.white : ColorPallete.primaryNavy;
    final cardColor = isDark ? const Color(0xFF1E1E1E) : Colors.white;
    bool isValid = _isFormValid();

    return Scaffold(
      backgroundColor: isDark ? ColorPallete.darkBackgroundColor : ColorPallete.backgroundColor,
      appBar: AppBar(
        title: const Text('New Application', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18)),
        backgroundColor: isDark ? Colors.black : ColorPallete.primaryNavy,
        foregroundColor: ColorPallete.whiteColor,
        elevation: 0,
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildSectionTitle(Icons.home_work_rounded, 'PROPERTY INFO', isDark),
              const SizedBox(height: 20),
              _buildTextField('Plot Identifier', _plotIdController, 'e.g. MOG-10293', isDark),
              const SizedBox(height: 15),
              _buildDropdown('District Authority', _isLoadingDistricts ? ['Loading...'] : _districts, _selectedDistrict, isDark, _isLoadingDistricts ? null : (val) {
                setState(() => _selectedDistrict = val);
                _validateForm();
              }),
              const SizedBox(height: 15),
              _buildDropdown('Land Size', _plotSizes, _selectedPlotSize, isDark, (val) {
                setState(() { _selectedPlotSize = val; _calculateFee(); _validateForm(); });
              }),
              if (_selectedPlotSize == 'Custom') ...[
                const SizedBox(height: 15),
                Row(
                  children: [
                    Expanded(child: _buildTextField('Width (m)', _customWidthController, '15.0', isDark, isNumber: true)),
                    const SizedBox(width: 15),
                    Expanded(child: _buildTextField('Length (m)', _customLengthController, '20.0', isDark, isNumber: true)),
                  ],
                ),
              ],
              const SizedBox(height: 15),
              _buildDropdown('Request Type', ['New Construction', 'Renovation'], _selectedRequestType, isDark, (val) {
                setState(() {
                  _selectedRequestType = val!;
                  _updateBuildingTypesList();
                });
              }),
              const SizedBox(height: 15),
              _buildDropdown(_selectedRequestType == 'Renovation' ? 'Renovation Type' : 'Architecture Type', _isLoadingBuildingTypes ? ['Loading...'] : _buildingTypes, _selectedBuildingType, isDark, _isLoadingBuildingTypes ? null : (val) {
                setState(() { _selectedBuildingType = val; _calculateFee(); _validateForm(); });
              }),
              
              ...() {
                final selectedTypeObj = _dynamicBuildingTypes.firstWhere((b) => b['name'] == _selectedBuildingType, orElse: () => null);
                bool isPerFloor = selectedTypeObj != null ? (selectedTypeObj['isPerFloor'] ?? false) : false;
                if (isPerFloor) {
                  return [
                    const SizedBox(height: 15),
                    _buildTextField('Structural Floors', _floorsController, 'e.g. 2', isDark, isNumber: true),
                  ];
                }
                return <Widget>[];
              }(),

              const SizedBox(height: 40),
              
              // Premium Fee Banner
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(30),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [Color(0xFF0F172A), Color(0xFF1E293B)], begin: Alignment.topLeft, end: Alignment.bottomRight),
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 20, offset: const Offset(0, 10))],
                ),
                child: Column(
                  children: [
                    const Text('OFFICIAL APPRAISAL FEE', style: TextStyle(color: Colors.white54, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 2)),
                    const SizedBox(height: 10),
                    Text('\$${_totalFee.toStringAsFixed(2)}', style: const TextStyle(color: Colors.white, fontSize: 48, fontWeight: FontWeight.w900)),
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(color: Colors.white.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.verified_rounded, color: Colors.blueAccent, size: 16),
                          SizedBox(width: 8),
                          Text('MUNICIPAL GUARANTEED', style: TextStyle(color: Colors.white70, fontSize: 10, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 40),
              _buildSectionTitle(Icons.file_present_rounded, 'DOCUMENTATION', isDark),
              const SizedBox(height: 20),
              _buildUploadButton('Ownership Deed (PDF) *', _landDocBytes != null, () => _pickDocument('land'), isDark, subtitle: _landDocName),
              const SizedBox(height: 12),
              _buildUploadButton('Passport / National ID *', _passportBytes != null, () => _pickDocument('passport'), isDark, subtitle: _passportName),

              const SizedBox(height: 50),
              SizedBox(
                width: double.infinity,
                height: 60,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isValid ? ColorPallete.successGreen : Colors.grey.withOpacity(0.2),
                    foregroundColor: Colors.white,
                    elevation: isValid ? 8 : 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                  ),
                  onPressed: isValid ? _showPaymentModal : null,
                  child: const Text('INITIALIZE APPLICATION', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, letterSpacing: 1)),
                ),
              ),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionTitle(IconData icon, String title, bool isDark) {
    return Row(
      children: [
        Icon(icon, color: isDark ? Colors.white38 : ColorPallete.primaryNavy, size: 20),
        const SizedBox(width: 10),
        Text(title, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: isDark ? Colors.white38 : ColorPallete.hintTextColor, letterSpacing: 1.5)),
      ],
    );
  }

  Widget _buildTextField(String label, TextEditingController controller, String hint, bool isDark, {bool isNumber = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text(label, style: TextStyle(fontWeight: FontWeight.bold, color: isDark ? Colors.white70 : ColorPallete.primaryNavy, fontSize: 13)),
        ),
        TextField(
          controller: controller,
          keyboardType: isNumber ? const TextInputType.numberWithOptions(decimal: true) : TextInputType.text,
          style: TextStyle(color: isDark ? Colors.white : Colors.black, fontWeight: FontWeight.bold),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(color: isDark ? Colors.white24 : ColorPallete.hintTextColor),
            filled: true,
            fillColor: isDark ? Colors.white.withOpacity(0.05) : Colors.white,
            contentPadding: const EdgeInsets.all(18),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: isDark ? BorderSide.none : BorderSide(color: Colors.grey.shade200)),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: ColorPallete.primaryNavy, width: 2)),
          ),
        ),
      ],
    );
  }

  Widget _buildDropdown(String label, List<String> items, String? selectedValue, bool isDark, Function(String?)? onChanged) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text(label, style: TextStyle(fontWeight: FontWeight.bold, color: isDark ? Colors.white70 : ColorPallete.primaryNavy, fontSize: 13)),
        ),
        DropdownButtonFormField<String>(
          value: items.contains(selectedValue) ? selectedValue : null,
          dropdownColor: isDark ? const Color(0xFF2D2D2D) : Colors.white,
          style: TextStyle(color: isDark ? Colors.white : Colors.black, fontWeight: FontWeight.bold),
          items: items.map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(),
          onChanged: onChanged,
          icon: Icon(Icons.keyboard_arrow_down_rounded, color: isDark ? Colors.white38 : ColorPallete.hintTextColor),
          decoration: InputDecoration(
            filled: true,
            fillColor: isDark ? Colors.white.withOpacity(0.05) : Colors.white,
            contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: isDark ? BorderSide.none : BorderSide(color: Colors.grey.shade200)),
          ),
        ),
      ],
    );
  }

  Widget _buildUploadButton(String title, bool isUploaded, VoidCallback onTap, bool isDark, {String? subtitle}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: isDark ? (isUploaded ? ColorPallete.successGreen.withOpacity(0.1) : Colors.white.withOpacity(0.03)) : Colors.white,
          border: Border.all(color: isUploaded ? ColorPallete.successGreen : (isDark ? Colors.white10 : Colors.grey.shade200), width: 2),
          borderRadius: BorderRadius.circular(18),
        ),
        child: Row(
          children: [
            Icon(isUploaded ? Icons.verified_rounded : Icons.cloud_upload_rounded, color: isUploaded ? ColorPallete.successGreen : (isDark ? Colors.white38 : ColorPallete.primaryNavy), size: 28),
            const SizedBox(width: 20),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: TextStyle(fontWeight: FontWeight.w900, color: isDark ? Colors.white : ColorPallete.primaryNavy, fontSize: 14)),
                  const SizedBox(height: 4),
                  Text(isUploaded ? (subtitle ?? 'Verified Upload') : 'Click to Upload', style: TextStyle(color: isUploaded ? ColorPallete.successGreen : ColorPallete.hintTextColor, fontSize: 11, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
            if (isUploaded) const Icon(Icons.edit_note_rounded, color: ColorPallete.successGreen)
            else Text('BROWSE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: isDark ? Colors.white38 : ColorPallete.primaryNavy, letterSpacing: 1)),
          ],
        ),
      ),
    );
  }
}

