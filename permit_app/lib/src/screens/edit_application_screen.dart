import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:permit_app/src/utils/colors.dart';
import 'package:permit_app/src/utils/constants.dart';
import 'package:permit_app/src/services/permit_service.dart';
import 'package:permit_app/src/screens/track_applications_screen.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:permit_app/src/providers/theme_provider.dart';
import 'package:provider/provider.dart';

class EditApplicationScreen extends StatefulWidget {
  final Map<String, dynamic> permit;

  const EditApplicationScreen({super.key, required this.permit});

  @override
  State<EditApplicationScreen> createState() => _EditApplicationScreenState();
}

class _EditApplicationScreenState extends State<EditApplicationScreen> {
  late final TextEditingController _plotIdController;
  final TextEditingController _customWidthController = TextEditingController();
  final TextEditingController _customLengthController = TextEditingController();
  final TextEditingController _floorsController = TextEditingController();

  final PermitService _permitService = PermitService();
  final ImagePicker _picker = ImagePicker();

  List<String> _districts = [
    'Warta-Nabadda', 'Howl-Wadaag', 'Deynile', 'Wadajir', 'Hodan',
    'Kaaran', 'Dharkenley', 'Yaqshid', 'Waaberi', 'Hamar-Weyne',
    'Hamar-Jajab', 'Abdi-Aziz', 'Boondhere', 'Shibis', 'Shangani',
    'Heliwa', 'Kaxda', 'Daru-Salam'
  ];

  List<dynamic> _dynamicBuildingTypes = [];
  bool _isLoadingBuildingTypes = true;

  final List<String> _plotSizes = ['Rubac (10x10)', 'Nus (10x20)', 'Boos (20x20)', '2 Boos (20x40)', 'Custom'];
  List<String> _buildingTypes = [];

  String? _selectedDistrict;
  String? _selectedPlotSize;
  String? _selectedBuildingType;

  List<int>? _passportBytes;
  String? _passportName;
  List<int>? _landDocBytes;
  String? _landDocName;

  bool _isSubmitting = false;
  bool _isLoadingDistricts = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    final formData = widget.permit['formData'] ?? {};

    _plotIdController = TextEditingController(text: formData['plotId']?.toString() ?? '');
    _selectedDistrict = formData['district']?.toString();

    // Map landArea back to plot size option
    final landArea = double.tryParse(formData['landArea']?.toString() ?? '0') ?? 0;
    if (landArea == 100) _selectedPlotSize = 'Rubac (10x10)';
    else if (landArea == 200) _selectedPlotSize = 'Nus (10x20)';
    else if (landArea == 400) _selectedPlotSize = 'Boos (20x20)';
    else if (landArea == 800) _selectedPlotSize = '2 Boos (20x40)';
    else {
      _selectedPlotSize = 'Custom';
      // Try to infer width/length from area (sqrt for square plot)
      final side = landArea > 0 ? landArea.toStringAsFixed(0) : '';
      _customWidthController.text = side;
      _customLengthController.text = '1';
    }

    final floors = formData['floors']?.toString() ?? '1';
    _floorsController.text = floors;

    _calculateFee();
    _customWidthController.addListener(_calculateFee);
    _customLengthController.addListener(_calculateFee);
    _floorsController.addListener(_calculateFee);
    _plotIdController.addListener(() => setState(() {}));
    
    _fetchDistricts();
    _fetchBuildingTypes();
  }

  Future<void> _fetchBuildingTypes() async {
    try {
      final result = await _permitService.getBuildingTypes();
      if (result['success'] && mounted) {
        setState(() {
          _dynamicBuildingTypes = result['data'];
          _buildingTypes = _dynamicBuildingTypes.map((b) => b['name'].toString()).toList();
          _isLoadingBuildingTypes = false;

          // Set initial building type correctly if it's in the fetched list
          final category = widget.permit['formData']?['buildingCategory']?.toString() ?? '';
          if (_buildingTypes.contains(category)) {
            _selectedBuildingType = category;
            _calculateFee();
          }
        });
      } else if (mounted) {
        setState(() {
          _isLoadingBuildingTypes = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoadingBuildingTypes = false);
    }
  }

  Future<void> _fetchDistricts() async {
    try {
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
    } catch (e) {
      if (mounted) setState(() => _isLoadingDistricts = false);
    }
  }

  @override
  void dispose() {
    _plotIdController.dispose();
    _customWidthController.dispose();
    _customLengthController.dispose();
    _floorsController.dispose();
    super.dispose();
  }

  double _totalFee = 0;
  void _calculateFee() {
    double area = _calculatedArea;
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
    }

    if (mounted) {
      setState(() {
        _totalFee = fee;
      });
    }
  }

  double get _calculatedArea {
    if (_selectedPlotSize == 'Rubac (10x10)') return 100;
    if (_selectedPlotSize == 'Nus (10x20)') return 200;
    if (_selectedPlotSize == 'Boos (20x20)') return 400;
    if (_selectedPlotSize == '2 Boos (20x40)') return 800;
    if (_selectedPlotSize == 'Custom') {
      final w = double.tryParse(_customWidthController.text) ?? 0;
      final l = double.tryParse(_customLengthController.text) ?? 0;
      return w * l;
    }
    return 0;
  }

  bool _isFormValid() {
    if (_plotIdController.text.isEmpty || _selectedDistrict == null ||
        _selectedPlotSize == null || _selectedBuildingType == null) return false;
        
    final selectedTypeObj = _dynamicBuildingTypes.firstWhere(
      (b) => b['name'] == _selectedBuildingType,
      orElse: () => null,
    );
    bool isPerFloor = selectedTypeObj != null ? (selectedTypeObj['isPerFloor'] ?? false) : false;

    if (_selectedPlotSize == 'Custom' &&
        (_customWidthController.text.isEmpty || _customLengthController.text.isEmpty)) return false;
    if (isPerFloor && _floorsController.text.isEmpty) return false;
    return true;
  }

  Future<void> _pickDocument(String docType) async {
    if (docType == 'passport') {
      final source = await showModalBottomSheet<String>(
        context: context,
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
        builder: (context) => Container(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Select Passport Source',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: ColorPallete.primaryNavy)),
              const SizedBox(height: 20),
              ListTile(
                leading: const Icon(Icons.camera_alt, color: ColorPallete.primaryNavy),
                title: const Text('Take a Photo (Camera)'),
                onTap: () => Navigator.pop(context, 'camera'),
              ),
              ListTile(
                leading: const Icon(Icons.photo_library, color: ColorPallete.primaryNavy),
                title: const Text('Select from Gallery/Files'),
                onTap: () => Navigator.pop(context, 'gallery'),
              ),
            ],
          ),
        ),
      );
      if (source == 'camera') {
        final XFile? photo = await _picker.pickImage(source: ImageSource.camera);
        if (photo != null) {
          final bytes = await photo.readAsBytes();
          setState(() { _passportBytes = bytes; _passportName = photo.name; });
        }
      } else if (source == 'gallery') {
        final result = await FilePicker.pickFiles(
            type: FileType.custom, allowedExtensions: ['jpg', 'jpeg', 'png', 'pdf'], withData: true);
        if (result != null) {
          setState(() { _passportBytes = result.files.single.bytes; _passportName = result.files.single.name; });
        }
      }
    } else {
      final result = await FilePicker.pickFiles(
          type: FileType.custom, allowedExtensions: ['pdf'], withData: true);
      if (result != null) {
        setState(() { _landDocBytes = result.files.single.bytes; _landDocName = result.files.single.name; });
      }
    }
  }

  Future<void> _previewDocument(String docType) async {
    if (docType == 'passport' && _passportBytes != null) {
      final name = _passportName ?? '';
      final isImage = name.toLowerCase().endsWith('.jpg') ||
          name.toLowerCase().endsWith('.jpeg') ||
          name.toLowerCase().endsWith('.png');

      if (isImage) {
        showDialog(
          context: context,
          builder: (context) => Dialog(
            backgroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                AppBar(
                  title: Text(name, style: const TextStyle(color: ColorPallete.primaryNavy, fontSize: 16, fontWeight: FontWeight.bold)),
                  backgroundColor: Colors.white,
                  foregroundColor: ColorPallete.primaryNavy,
                  elevation: 0,
                  leading: IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ),
                Flexible(
                  child: Padding(
                    padding: const EdgeInsets.only(left: 16.0, right: 16.0, bottom: 20.0),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.memory(Uint8List.fromList(_passportBytes!)),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Preview not available for local PDF file: $name. You can resubmit to view it.'),
            backgroundColor: ColorPallete.primaryNavy,
          ),
        );
      }
      return;
    }

    if (docType == 'land' && _landDocBytes != null) {
      final name = _landDocName ?? '';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Preview not available for local PDF file: $name. You can resubmit to view it.'),
          backgroundColor: ColorPallete.primaryNavy,
        ),
      );
      return;
    }

    final docPath = widget.permit['documents']?[docType == 'passport' ? 'nationalId' : 'ownershipDocs'];
    if (docPath != null && docPath.toString().isNotEmpty) {
      final baseUrl = Constants.apiBaseUrl.replaceAll('/api', '');
      final fullUrl = '$baseUrl$docPath';
      try {
        final uri = Uri.parse(fullUrl);
        if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
          throw Exception('Could not launch $fullUrl');
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Could not open document: $e'), backgroundColor: ColorPallete.errorRed),
          );
        }
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No existing document found to preview.')),
        );
      }
    }
  }

  void _showPaymentModal(double diffAmount) {
    final TextEditingController phoneController = TextEditingController();
    bool isProcessing = false;

    showGeneralDialog(
      context: context,
      barrierDismissible: false,
      barrierLabel: 'EVC Plus',
      barrierColor: Colors.black.withOpacity(0.8),
      transitionDuration: const Duration(milliseconds: 200),
      pageBuilder: (context, anim1, anim2) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Center(
              child: Container(
                width: MediaQuery.of(context).size.width * 0.85,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(15),
                ),
                child: Material(
                  color: Colors.transparent,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text(
                        'EVC Plus',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20, color: ColorPallete.primaryNavy),
                      ),
                      const SizedBox(height: 10),
                      Text('District: ${_selectedDistrict ?? 'Central'}', style: TextStyle(color: Colors.grey.shade600, fontSize: 12, fontWeight: FontWeight.bold)),
                      const Divider(height: 30),
                      if (isProcessing)
                        Column(
                          children: const [
                            CircularProgressIndicator(color: ColorPallete.primaryNavy),
                            SizedBox(height: 20),
                            Text('Talo: Fadlan sug...', style: TextStyle(fontWeight: FontWeight.bold)),
                          ],
                        )
                      else ...[
                        Text(
                          'Confirm extra payment of \$${diffAmount.toStringAsFixed(2)} to Mogadishu Municipality?',
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: ColorPallete.primaryNavy),
                        ),
                        const SizedBox(height: 25),
                        const SizedBox(height: 25),
                        const Text('Enter Phone Number:', style: TextStyle(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 10),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
                              decoration: BoxDecoration(
                                color: Colors.grey.shade100,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Text('+252', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: TextField(
                                controller: phoneController,
                                keyboardType: TextInputType.phone,
                                maxLength: 9,
                                onChanged: (value) => setModalState(() {}),
                                autofocus: true,
                                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, letterSpacing: 2),
                                decoration: InputDecoration(
                                  hintText: '61XXXXXXX',
                                  counterText: "",
                                  fillColor: Colors.grey.shade100,
                                  filled: true,
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
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
                        const SizedBox(height: 25),
                        Row(
                          children: [
                            Expanded(
                              child: TextButton(
                                onPressed: () => Navigator.pop(context),
                                child: const Text('Cancel', style: TextStyle(color: ColorPallete.errorRed, fontWeight: FontWeight.bold)),
                              ),
                            ),
                            Expanded(
                              child: ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: ColorPallete.primaryNavy,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                ),
                                onPressed: () async {
                                  if (phoneController.text.length < 7) {
                                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter a valid phone number')));
                                    return;
                                  }
                                  setModalState(() => isProcessing = true);
                                  
                                  final paymentResult = await _permitService.processPayment(
                                    phone: phoneController.text,
                                    amount: diffAmount,
                                  );

                                  if (!paymentResult['success']) {
                                    setModalState(() => isProcessing = false);
                                    showDialog(
                                      context: context,
                                      builder: (ctx) => Dialog(
                                        backgroundColor: Colors.white,
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                                        child: Padding(
                                          padding: const EdgeInsets.all(24.0),
                                          child: Column(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              const Icon(Icons.error_outline_rounded, color: Colors.redAccent, size: 60),
                                              const SizedBox(height: 16),
                                              const Text('Payment Failed', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: ColorPallete.primaryNavy)),
                                              const SizedBox(height: 12),
                                              Text(paymentResult['message'], textAlign: TextAlign.center, style: TextStyle(color: Colors.grey.shade700, fontSize: 16)),
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

                                  Navigator.pop(context);
                                  _processSubmission();
                                },
                                child: const Text('Send', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _submit() async {
    if (!_isFormValid() || _isSubmitting) return;

    double oldFee = double.tryParse(widget.permit['formData']?['totalFee']?.toString() ?? '0') ?? 0;
    double diff = _totalFee - oldFee;

    if (diff > 0.01) {
      _showPaymentModal(diff);
    } else {
      _processSubmission();
    }
  }

  Future<void> _processSubmission() async {
    setState(() { _isSubmitting = true; _errorMessage = null; });

    final formData = widget.permit['formData'] ?? {};

    final selectedTypeObj = _dynamicBuildingTypes.firstWhere((b) => b['name'] == _selectedBuildingType, orElse: () => null);
    bool isPerFloor = selectedTypeObj != null ? (selectedTypeObj['isPerFloor'] ?? false) : false;

    final result = await _permitService.updateApplication(
      applicationId: widget.permit['_id'],
      fullName: formData['fullName']?.toString() ?? '',
      phone: formData['phone']?.toString() ?? '',
      email: formData['email']?.toString() ?? '',
      plotId: _plotIdController.text,
      district: _selectedDistrict!,
      buildingCategory: _selectedBuildingType!,
      floors: isPerFloor ? _floorsController.text : '1',
      landArea: _calculatedArea.toString(),
      totalFee: _totalFee.toString(),
      nationalIdBytes: _passportBytes,
      nationalIdName: _passportName,
      ownershipDocsBytes: _landDocBytes,
      ownershipDocsName: _landDocName,
    );

    if (!mounted) return;
    setState(() => _isSubmitting = false);

    if (result['success']) {
      _showSuccessDialog();
    } else {
      setState(() => _errorMessage = result['message'] ?? 'Submission failed. Please try again.');
    }
  }

  void _showSuccessDialog() {
    showGeneralDialog(
      context: context,
      barrierDismissible: false,
      barrierLabel: 'Success',
      transitionDuration: const Duration(milliseconds: 400),
      pageBuilder: (context, anim1, anim2) {
        return FadeTransition(
          opacity: anim1,
          child: ScaleTransition(
            scale: CurvedAnimation(parent: anim1, curve: Curves.easeOutBack),
            child: AlertDialog(
              backgroundColor: Colors.white,
              surfaceTintColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const SizedBox(height: 10),
                  Container(
                    width: 80, height: 80,
                    decoration: const BoxDecoration(color: ColorPallete.successGreen, shape: BoxShape.circle),
                    child: const Icon(Icons.check_rounded, color: Colors.white, size: 45),
                  ),
                  const SizedBox(height: 24),
                  const Text('Application Resubmitted!',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: ColorPallete.primaryNavy)),
                  const SizedBox(height: 10),
                  const Text(
                    'Your corrected application has been sent back to the municipality staff for review.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: ColorPallete.hintTextColor, fontSize: 14, height: 1.5),
                  ),
                  const SizedBox(height: 30),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.pop(context); // Close dialog
                        Navigator.pop(context, true); // Return true to pop caller
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: ColorPallete.primaryNavy,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('OK',
                          style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 0.5)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final formData = widget.permit['formData'] ?? {};
    final staffRemarks = widget.permit['staffRemarks'] ?? '';
    double oldFee = double.tryParse(formData['totalFee']?.toString() ?? '0') ?? 0;
    double diff = _totalFee - oldFee;
    bool needsPayment = diff > 0.01;

    return Scaffold(
      backgroundColor: ColorPallete.backgroundColor,
      appBar: AppBar(
        title: const Text('Re-edit Application', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: ColorPallete.primaryNavy,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Rejection reason banner
            if (staffRemarks.isNotEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                margin: const EdgeInsets.only(bottom: 24),
                decoration: BoxDecoration(
                  color: ColorPallete.errorRed.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: ColorPallete.errorRed.withOpacity(0.3)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.warning_amber_rounded, color: ColorPallete.errorRed, size: 18),
                        const SizedBox(width: 8),
                        const Text('Reason for Rejection:',
                            style: TextStyle(fontWeight: FontWeight.bold, color: ColorPallete.errorRed)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(staffRemarks,
                        style: const TextStyle(color: ColorPallete.primaryNavy, fontSize: 14, height: 1.5)),
                  ],
                ),
              ),

            if (_errorMessage != null)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: ColorPallete.errorRed.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(_errorMessage!, style: const TextStyle(color: ColorPallete.errorRed, fontWeight: FontWeight.w600)),
              ),

            // --- Section 1: Project Details ---
            _buildSectionTitle(Icons.home_work, '1. Project Details'),
            const SizedBox(height: 15),
            _buildTextField('Plot ID', _plotIdController, 'Enter Plot ID'),
            const SizedBox(height: 15),
            _buildDropdown('District', _isLoadingDistricts ? ['Loading...'] : _districts, _selectedDistrict, (val) => setState(() { _selectedDistrict = val; _calculateFee(); })),
            const SizedBox(height: 15),
            _buildDropdown('Plot Size', _plotSizes, _selectedPlotSize, (val) => setState(() { _selectedPlotSize = val; _calculateFee(); })),

            if (_selectedPlotSize == 'Custom') ...[
              const SizedBox(height: 15),
              Row(children: [
                Expanded(child: _buildTextField('Width (m)', _customWidthController, 'e.g. 15', isNumber: true)),
                const SizedBox(width: 15),
                Expanded(child: _buildTextField('Length (m)', _customLengthController, 'e.g. 30', isNumber: true)),
              ]),
            ],

            const SizedBox(height: 15),
            _buildDropdown('Building Type', _isLoadingBuildingTypes ? ['Loading...'] : _buildingTypes, _selectedBuildingType,
                (val) => setState(() { _selectedBuildingType = val; _calculateFee(); })),

            ...() {
              final selectedTypeObj = _dynamicBuildingTypes.firstWhere((b) => b['name'] == _selectedBuildingType, orElse: () => null);
              bool isPerFloor = selectedTypeObj != null ? (selectedTypeObj['isPerFloor'] ?? false) : false;
              if (isPerFloor) {
                return [
                  const SizedBox(height: 15),
                  _buildTextField('Number of Floors', _floorsController, 'e.g. 3', isNumber: true),
                ];
              }
              return <Widget>[];
            }(),

            const SizedBox(height: 24),

            // Fee Banner Logic
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [ColorPallete.primaryNavy, ColorPallete.secondaryNavy],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(color: ColorPallete.primaryNavy.withOpacity(0.2), blurRadius: 10, offset: const Offset(0, 5)),
                ],
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      Icon(
                        needsPayment ? Icons.info_outline_rounded : Icons.check_circle_rounded,
                        color: needsPayment ? Colors.amberAccent : ColorPallete.successGreen,
                        size: 32,
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(needsPayment ? 'DIFFERENCE TO PAY' : 'PAYMENT ALREADY CONFIRMED',
                                style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1)),
                            const SizedBox(height: 4),
                            Text(
                              '\$${_totalFee.toStringAsFixed(2)} (${oldFee.toStringAsFixed(2)})',
                              style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.bold),
                            ),
                            Text(
                              needsPayment
                                  ? 'Rest to pay: \$${diff.toStringAsFixed(2)} via EVC Plus'
                                  : 'No additional payment required',
                              style: TextStyle(
                                color: needsPayment ? Colors.amberAccent : Colors.white60,
                                fontSize: 13,
                                fontWeight: needsPayment ? FontWeight.bold : FontWeight.normal,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 28),

            // --- Section 2: Documents ---
            _buildSectionTitle(Icons.upload_file, '2. Update Documents (Optional)'),
            const SizedBox(height: 6),
            const Text('Existing documents are kept. Upload new ones only if needed.',
                style: TextStyle(color: ColorPallete.hintTextColor, fontSize: 12)),
            const SizedBox(height: 15),

            _buildUploadButton(
              title: 'Passport / National ID',
              docType: 'passport',
              isUploaded: _passportBytes != null,
              subtitle: _passportBytes != null ? 'New file: $_passportName' : 'Keeping existing document',
              onEdit: () => _pickDocument('passport'),
              onPreview: () => _previewDocument('passport'),
            ),
            const SizedBox(height: 12),
            _buildUploadButton(
              title: 'Land Ownership Document',
              docType: 'land',
              isUploaded: _landDocBytes != null,
              subtitle: _landDocBytes != null ? 'New file: $_landDocName' : 'Keeping existing document',
              onEdit: () => _pickDocument('land'),
              onPreview: () => _previewDocument('land'),
            ),

            const SizedBox(height: 36),

            // Submit button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: _isFormValid() ? ColorPallete.primaryNavy : Colors.grey.shade400,
                  padding: const EdgeInsets.symmetric(vertical: 18),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: _isFormValid() ? 6 : 0,
                ),
                onPressed: _isFormValid() && !_isSubmitting ? _submit : null,
                child: _isSubmitting
                    ? const SizedBox(
                        height: 22, width: 22,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                    : const Text('Resubmit Corrected Application',
                        style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
              ),
            ),
            const SizedBox(height: 30),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(IconData icon, String title) {
    return Row(children: [
      Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
            color: ColorPallete.primaryNavy.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
        child: Icon(icon, color: ColorPallete.primaryNavy, size: 20),
      ),
      const SizedBox(width: 12),
      Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: ColorPallete.primaryNavy)),
    ]);
  }

  Widget _buildTextField(String label, TextEditingController controller, String hint, {bool isNumber = false}) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontWeight: FontWeight.bold, color: ColorPallete.primaryNavy, fontSize: 14)),
      const SizedBox(height: 8),
      TextField(
        controller: controller,
        keyboardType: isNumber ? TextInputType.number : TextInputType.text,
        onChanged: (_) => setState(() {}),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(color: ColorPallete.hintTextColor),
          filled: true,
          fillColor: Colors.white,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: ColorPallete.primaryNavy, width: 2)),
        ),
      ),
    ]);
  }

  Widget _buildDropdown(String label, List<String> items, String? selectedValue, Function(String?) onChanged) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontWeight: FontWeight.bold, color: ColorPallete.primaryNavy, fontSize: 14)),
      const SizedBox(height: 8),
      DropdownButtonFormField<String>(
        value: items.contains(selectedValue) ? selectedValue : null,
        items: items.map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(),
        onChanged: (val) { onChanged(val); setState(() {}); },
        decoration: InputDecoration(
          filled: true,
          fillColor: Colors.white,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: ColorPallete.primaryNavy, width: 2)),
        ),
      ),
    ]);
  }

  Widget _buildUploadButton({
    required String title,
    required String docType,
    required bool isUploaded,
    required String subtitle,
    required VoidCallback onEdit,
    required VoidCallback onPreview,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: isUploaded ? ColorPallete.successGreen : Colors.grey.shade300, width: 1.5),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(
            isUploaded ? Icons.check_circle : Icons.upload_file,
            color: isUploaded ? ColorPallete.successGreen : ColorPallete.primaryNavy,
            size: 28,
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold, color: ColorPallete.primaryNavy)),
                Text(
                  subtitle,
                  style: TextStyle(
                    color: isUploaded ? ColorPallete.successGreen : ColorPallete.hintTextColor,
                    fontSize: 12,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          // Eye Preview Button
          Container(
            decoration: BoxDecoration(
              color: ColorPallete.primaryNavy.withOpacity(0.05),
              shape: BoxShape.circle,
            ),
            child: IconButton(
              icon: const Icon(Icons.visibility_rounded, color: ColorPallete.primaryNavy, size: 20),
              onPressed: onPreview,
              constraints: const BoxConstraints(),
              padding: const EdgeInsets.all(8),
              tooltip: 'Preview Document',
            ),
          ),
          const SizedBox(width: 8),
          // Pencil Edit Button
          Container(
            decoration: BoxDecoration(
              color: ColorPallete.primaryNavy.withOpacity(0.05),
              shape: BoxShape.circle,
            ),
            child: IconButton(
              icon: const Icon(Icons.edit_rounded, color: ColorPallete.primaryNavy, size: 20),
              onPressed: onEdit,
              constraints: const BoxConstraints(),
              padding: const EdgeInsets.all(8),
              tooltip: 'Re-upload / Change',
            ),
          ),
        ],
      ),
    );
  }
}
