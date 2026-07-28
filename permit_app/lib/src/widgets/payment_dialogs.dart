import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:permit_app/src/services/permit_service.dart';
import 'package:permit_app/src/utils/colors.dart';

/// Returns `'online'`, `'offline'`, or `null` if cancelled.
Future<String?> showPaymentMethodChoice(BuildContext context, {required double amount}) {
  return showDialog<String>(
    context: context,
    barrierDismissible: true,
    builder: (ctx) => AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: const Text('Choose Payment Method', style: TextStyle(fontWeight: FontWeight.w900)),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Amount: \$${amount.toStringAsFixed(2)}',
            textAlign: TextAlign.center,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: ColorPallete.primaryNavy),
          ),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: ColorPallete.primaryNavy,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: () => Navigator.pop(ctx, 'online'),
            icon: const Icon(Icons.phone_android),
            label: const Text('Online Payment', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              foregroundColor: ColorPallete.primaryNavy,
              padding: const EdgeInsets.symmetric(vertical: 14),
              side: const BorderSide(color: ColorPallete.primaryNavy),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: () => Navigator.pop(ctx, 'offline'),
            icon: const Icon(Icons.pin),
            label: const Text('Offline Payment', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(ctx),
          child: const Text('Cancel'),
        ),
      ],
    ),
  );
}

/// Shows PIN entry and processes offline payment. Returns payment result map, or null if cancelled.
Future<Map<String, dynamic>?> showOfflinePinPayment(
  BuildContext context, {
  required PermitService permitService,
  required double amount,
  String? phone,
  String? applicationId,
}) async {
  final pinController = TextEditingController();
  String? errorText;
  bool processing = false;

  final result = await showDialog<Map<String, dynamic>>(
    context: context,
    barrierDismissible: false,
    builder: (ctx) {
      return StatefulBuilder(
        builder: (ctx, setDialogState) {
          return AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            title: const Text('Enter Payment PIN', style: TextStyle(fontWeight: FontWeight.w900)),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Amount: \$${amount.toStringAsFixed(2)}',
                  style: const TextStyle(fontWeight: FontWeight.bold, color: ColorPallete.primaryNavy),
                ),
                const SizedBox(height: 16),
                if (processing)
                  const Padding(
                    padding: EdgeInsets.all(16),
                    child: CircularProgressIndicator(color: ColorPallete.primaryNavy),
                  )
                else ...[
                  TextField(
                    controller: pinController,
                    keyboardType: TextInputType.number,
                    obscureText: true,
                    maxLength: 4,
                    autofocus: true,
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 28, letterSpacing: 12, fontWeight: FontWeight.bold),
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    decoration: InputDecoration(
                      counterText: '',
                      hintText: '••••',
                      errorText: errorText,
                      filled: true,
                      fillColor: Colors.grey.shade100,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    ),
                    onChanged: (_) {
                      if (errorText != null) setDialogState(() => errorText = null);
                    },
                  ),
                ],
              ],
            ),
            actions: processing
                ? null
                : [
                    TextButton(
                      onPressed: () => Navigator.pop(ctx),
                      child: const Text('Cancel'),
                    ),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: ColorPallete.primaryNavy,
                        foregroundColor: Colors.white,
                      ),
                      onPressed: () async {
                        final pin = pinController.text.trim();
                        if (pin.length != 4) {
                          setDialogState(() => errorText = 'Enter a 4-digit PIN');
                          return;
                        }
                        setDialogState(() {
                          processing = true;
                          errorText = null;
                        });
                        final payment = await permitService.processOfflinePayment(
                          pin: pin,
                          amount: amount,
                          phone: phone,
                          applicationId: applicationId,
                        );
                        if (!ctx.mounted) return;
                        if (payment['success'] == true) {
                          Navigator.pop(ctx, payment);
                        } else {
                          setDialogState(() {
                            processing = false;
                            errorText = payment['message']?.toString() ?? 'Payment failed';
                            pinController.clear();
                          });
                        }
                      },
                      child: const Text('Pay', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ],
          );
        },
      );
    },
  );

  pinController.dispose();
  return result;
}
