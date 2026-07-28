import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:intl/intl.dart';
import 'package:permit_app/src/providers/theme_provider.dart';
import 'package:permit_app/src/services/permit_service.dart';
import 'package:permit_app/src/utils/colors.dart';
import 'package:permit_app/src/widgets/civic_app_bar.dart';
import 'package:permit_app/src/widgets/payment_dialogs.dart';
import 'package:provider/provider.dart';

class RenewPermitScreen extends StatefulWidget {
  const RenewPermitScreen({super.key});

  @override
  State<RenewPermitScreen> createState() => _RenewPermitScreenState();
}

class _RenewPermitScreenState extends State<RenewPermitScreen> {
  final PermitService _permitService = PermitService();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  List<dynamic> _items = [];
  bool _loading = true;
  String? _error;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    final result = await _permitService.getRenewablePermits();
    if (!mounted) return;
    if (result['success'] == true) {
      setState(() {
        _items = result['data'] as List<dynamic>? ?? [];
        _loading = false;
      });
    } else {
      setState(() {
        _error = result['message']?.toString() ?? 'Failed to load';
        _loading = false;
      });
    }
  }

  String _fmtDate(dynamic value) {
    if (value == null) return '—';
    try {
      return DateFormat('dd MMM yyyy').format(DateTime.parse(value.toString()));
    } catch (_) {
      return value.toString();
    }
  }

  Future<void> _startRenew(Map<String, dynamic> permit) async {
    final id = permit['_id']?.toString();
    if (id == null) return;

    final themeProvider = Provider.of<ThemeProvider>(context, listen: false);
    final isDark = themeProvider.isDarkMode;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Center(child: CircularProgressIndicator(color: ColorPallete.primaryNavy)),
    );

    final quote = await _permitService.quoteRenewFee(id);
    if (!mounted) return;
    Navigator.pop(context);

    if (quote['success'] != true) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(quote['message']?.toString() ?? 'Could not calculate fee')),
      );
      return;
    }

    final data = quote['data'] as Map<String, dynamic>;
    final fee = (data['totalFee'] as num?)?.toDouble() ?? 0;
    final discount = (data['discountPercent'] as num?)?.toDouble() ?? 0;
    final form = permit['formData'] as Map<String, dynamic>? ?? {};

    final method = await showPaymentMethodChoice(context, amount: fee);
    if (method == null || !mounted) return;

    if (method == 'offline') {
      final payment = await showOfflinePinPayment(
        context,
        permitService: _permitService,
        amount: fee,
        phone: (await _storage.read(key: 'phone') ?? form['phone']?.toString() ?? '').replaceFirst('+252', ''),
      );
      if (payment?['success'] != true || !mounted) return;

      setState(() => _submitting = true);
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => const Center(child: CircularProgressIndicator(color: ColorPallete.primaryNavy)),
      );

      final renew = await _permitService.renewPermit(applicationId: id, totalFee: fee);
      if (!mounted) return;
      Navigator.pop(context);
      setState(() => _submitting = false);

      if (renew['success'] == true) {
        await showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Renew Submitted'),
            content: Text('Your renew application was submitted. ID: ${renew['data']?['applicationId'] ?? ''}'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK')),
            ],
          ),
        );
        _load();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(renew['message']?.toString() ?? 'Renew failed')),
        );
      }
      return;
    }

    final phoneController = TextEditingController(
      text: (await _storage.read(key: 'phone') ?? form['phone']?.toString() ?? '').replaceFirst('+252', ''),
    );

    if (!mounted) return;
    final confirmed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: isDark ? const Color(0xFF1E1E1E) : Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            left: 24,
            right: 24,
            top: 24,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Renew Permit',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                  color: isDark ? Colors.white : ColorPallete.primaryNavy,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Your previous application data and documents will be reused. Pay the renew fee to continue.',
                style: TextStyle(fontSize: 13, color: isDark ? Colors.white60 : Colors.grey.shade600),
              ),
              const SizedBox(height: 20),
              _infoRow('Permit', permit['permitId'] ?? permit['applicationId'], isDark),
              _infoRow('Plot', form['plotId'], isDark),
              _infoRow('Type', form['buildingCategory'], isDark),
              _infoRow('District', permit['district'] ?? form['district'], isDark),
              _infoRow('Land Area', '${form['landArea']} m²', isDark),
              if (discount > 0) _infoRow('Discount', '${discount.toStringAsFixed(0)}%', isDark),
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: ColorPallete.primaryNavy,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Renew Fee', style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold)),
                    Text('\$${fee.toStringAsFixed(2)}', style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w900)),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Text('EVC Plus Number', style: TextStyle(fontWeight: FontWeight.bold, color: isDark ? Colors.white : ColorPallete.primaryNavy)),
              const SizedBox(height: 8),
              TextField(
                controller: phoneController,
                keyboardType: TextInputType.phone,
                decoration: InputDecoration(
                  prefixText: '+252 ',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  hintText: '61XXXXXXX',
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: ColorPallete.primaryNavy,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  onPressed: () => Navigator.pop(ctx, true),
                  child: Text('Pay & Renew \$${fee.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w800)),
                ),
              ),
            ],
          ),
        );
      },
    );

    if (confirmed != true || !mounted) return;

    setState(() => _submitting = true);
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Center(child: CircularProgressIndicator(color: ColorPallete.primaryNavy)),
    );

    final payPhone = phoneController.text.replaceAll(RegExp(r'\D'), '');
    final payment = await _permitService.processPayment(phone: payPhone, amount: fee);
    if (!mounted) return;

    if (payment['success'] != true) {
      Navigator.pop(context);
      setState(() => _submitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(payment['message']?.toString() ?? 'Payment failed')),
      );
      return;
    }

    final renew = await _permitService.renewPermit(applicationId: id, totalFee: fee);
    if (!mounted) return;
    Navigator.pop(context);
    setState(() => _submitting = false);

    if (renew['success'] == true) {
      await showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Renew Submitted'),
          content: Text('Your renew application was submitted. ID: ${renew['data']?['applicationId'] ?? ''}'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK')),
          ],
        ),
      );
      _load();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(renew['message']?.toString() ?? 'Renew failed')),
      );
    }
  }

  Widget _infoRow(String label, dynamic value, bool isDark) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Expanded(child: Text(label, style: TextStyle(color: isDark ? Colors.white54 : Colors.grey.shade600, fontWeight: FontWeight.w600))),
          Text('${value ?? '—'}', style: TextStyle(fontWeight: FontWeight.w800, color: isDark ? Colors.white : ColorPallete.primaryNavy)),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<ThemeProvider>(context).isDarkMode;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF121212) : const Color(0xFFF5F7FA),
      appBar: const CivicAppBar(title: 'Renew Permit'),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: ColorPallete.primaryNavy))
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: Colors.red)))
              : _items.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(32),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.verified_outlined, size: 64, color: Colors.grey.shade400),
                            const SizedBox(height: 16),
                            Text(
                              'No expired permits to renew',
                              textAlign: TextAlign.center,
                              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: isDark ? Colors.white : ColorPallete.primaryNavy),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'When an approved permit expires, it will appear here for a one-tap renew.',
                              textAlign: TextAlign.center,
                              style: TextStyle(color: isDark ? Colors.white54 : Colors.grey.shade600),
                            ),
                          ],
                        ),
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(20),
                        itemCount: _items.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 14),
                        itemBuilder: (context, index) {
                          final permit = Map<String, dynamic>.from(_items[index] as Map);
                          final form = Map<String, dynamic>.from(permit['formData'] as Map? ?? {});
                          return Container(
                            padding: const EdgeInsets.all(18),
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(color: isDark ? Colors.white10 : Colors.grey.shade200),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '${permit['permitId'] ?? permit['applicationId']}',
                                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: isDark ? Colors.white : ColorPallete.primaryNavy),
                                ),
                                const SizedBox(height: 6),
                                Text('${form['buildingCategory']} · ${permit['district']}', style: TextStyle(color: isDark ? Colors.white60 : Colors.grey.shade600)),
                                Text('Expired: ${_fmtDate(permit['expiryDate'])}', style: const TextStyle(color: Colors.redAccent, fontWeight: FontWeight.w700, fontSize: 12)),
                                const SizedBox(height: 14),
                                SizedBox(
                                  width: double.infinity,
                                  child: ElevatedButton(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFF0EA5E9),
                                      foregroundColor: Colors.white,
                                      padding: const EdgeInsets.symmetric(vertical: 14),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                    ),
                                    onPressed: _submitting ? null : () => _startRenew(permit),
                                    child: const Text('Renew Now', style: TextStyle(fontWeight: FontWeight.w800)),
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}
