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

enum _ProgressPhase { loading, success }

/// Controls a single fixed-size modal that morphs from loading → success.
class PaymentProgressController {
  _PaymentProgressDialogState? _state;

  void _attach(_PaymentProgressDialogState state) => _state = state;
  void _detach(_PaymentProgressDialogState state) {
    if (_state == state) _state = null;
  }

  void showSuccess({
    String title = 'SUCCESS',
    String message = 'Your request was completed successfully.',
    String buttonLabel = 'DONE',
    VoidCallback? onDone,
  }) {
    _state?.showSuccess(
      title: title,
      message: message,
      buttonLabel: buttonLabel,
      onDone: onDone,
    );
  }

  void dismiss() {
    _state?.dismiss();
  }
}

/// Opens one modern modal (fixed size). Call [PaymentProgressController.showSuccess]
/// to morph loading into success in place — no second dialog.
PaymentProgressController showPaymentProgressDialog(
  BuildContext context, {
  String loadingTitle = 'Processing Payment',
  String loadingMessage = 'Please wait while we confirm your payment…',
}) {
  final controller = PaymentProgressController();
  showDialog<void>(
    context: context,
    barrierDismissible: false,
    barrierColor: Colors.black.withOpacity(0.55),
    builder: (ctx) => PopScope(
      canPop: false,
      child: _PaymentProgressDialog(
        controller: controller,
        loadingTitle: loadingTitle,
        loadingMessage: loadingMessage,
      ),
    ),
  );
  return controller;
}

/// Shared card size for loading / success / PIN processing.
const double _progressCardWidth = 300;
const double _progressCardHeight = 320;

class _PaymentProgressDialog extends StatefulWidget {
  final PaymentProgressController controller;
  final String loadingTitle;
  final String loadingMessage;

  const _PaymentProgressDialog({
    required this.controller,
    required this.loadingTitle,
    required this.loadingMessage,
  });

  @override
  State<_PaymentProgressDialog> createState() => _PaymentProgressDialogState();
}

class _PaymentProgressDialogState extends State<_PaymentProgressDialog> {
  _ProgressPhase _phase = _ProgressPhase.loading;
  String _title = '';
  String _message = '';
  String _buttonLabel = 'DONE';
  VoidCallback? _onDone;

  @override
  void initState() {
    super.initState();
    _title = widget.loadingTitle;
    _message = widget.loadingMessage;
    widget.controller._attach(this);
  }

  @override
  void dispose() {
    widget.controller._detach(this);
    super.dispose();
  }

  void showSuccess({
    required String title,
    required String message,
    required String buttonLabel,
    VoidCallback? onDone,
  }) {
    if (!mounted) return;
    setState(() {
      _phase = _ProgressPhase.success;
      _title = title;
      _message = message;
      _buttonLabel = buttonLabel;
      _onDone = onDone;
    });
  }

  void dismiss() {
    if (mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final isSuccess = _phase == _ProgressPhase.success;

    return Center(
      child: Material(
        color: Colors.transparent,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 280),
          curve: Curves.easeOutCubic,
          width: _progressCardWidth,
          height: _progressCardHeight,
          padding: const EdgeInsets.fromLTRB(26, 28, 26, 22),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              BoxShadow(
                color: ColorPallete.primaryNavy.withOpacity(0.18),
                blurRadius: 28,
                offset: const Offset(0, 12),
              ),
            ],
          ),
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 320),
            switchInCurve: Curves.easeOutCubic,
            switchOutCurve: Curves.easeInCubic,
            transitionBuilder: (child, animation) {
              return FadeTransition(
                opacity: animation,
                child: ScaleTransition(
                  scale: Tween<double>(begin: 0.94, end: 1).animate(animation),
                  child: child,
                ),
              );
            },
            child: Column(
              key: ValueKey(_phase),
              children: [
                const Spacer(),
                Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    gradient: isSuccess ? ColorPallete.successGradient : ColorPallete.accentGradient,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: isSuccess
                      ? const Icon(Icons.check_rounded, color: Colors.white, size: 40)
                      : const Padding(
                          padding: EdgeInsets.all(18),
                          child: CircularProgressIndicator(
                            strokeWidth: 3,
                            color: Colors.white,
                          ),
                        ),
                ),
                const SizedBox(height: 22),
                Text(
                  _title,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: ColorPallete.primaryNavy,
                    letterSpacing: 0.4,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  _message,
                  textAlign: TextAlign.center,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 13,
                    height: 1.4,
                    fontWeight: FontWeight.w500,
                    color: ColorPallete.hintTextColor,
                  ),
                ),
                const Spacer(),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: isSuccess
                      ? ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: ColorPallete.primaryNavy,
                            foregroundColor: Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                          onPressed: () {
                            Navigator.of(context).pop();
                            _onDone?.call();
                          },
                          child: Text(
                            _buttonLabel,
                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                          ),
                        )
                      : const SizedBox.shrink(),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Compact loading card used inside the PIN dialog (same visual language / width).
Widget buildPaymentLoadingCard({
  String title = 'Processing Payment',
  String message = 'Please wait while we confirm your payment…',
}) {
  return Material(
    color: Colors.transparent,
    child: Container(
      width: _progressCardWidth,
      height: _progressCardHeight,
      padding: const EdgeInsets.fromLTRB(26, 28, 26, 22),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: ColorPallete.primaryNavy.withOpacity(0.18),
            blurRadius: 28,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Column(
        children: [
          const Spacer(),
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              gradient: ColorPallete.accentGradient,
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Padding(
              padding: EdgeInsets.all(18),
              child: CircularProgressIndicator(
                strokeWidth: 3,
                color: Colors.white,
              ),
            ),
          ),
          const SizedBox(height: 22),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: ColorPallete.primaryNavy,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 13,
              height: 1.4,
              fontWeight: FontWeight.w500,
              color: ColorPallete.hintTextColor,
            ),
          ),
          const Spacer(),
          const SizedBox(height: 48),
        ],
      ),
    ),
  );
}

@Deprecated('Use showPaymentProgressDialog')
void showPaymentLoadingDialog(
  BuildContext context, {
  String title = 'Processing Payment',
  String message = 'Please wait while we confirm your payment…',
}) {
  showPaymentProgressDialog(context, loadingTitle: title, loadingMessage: message);
}

@Deprecated('Use PaymentProgressController.dismiss')
void dismissPaymentLoadingDialog(BuildContext context) {
  final navigator = Navigator.of(context, rootNavigator: true);
  if (navigator.canPop()) {
    navigator.pop();
  }
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
          if (processing) {
            return PopScope(
              canPop: false,
              child: Dialog(
                backgroundColor: Colors.transparent,
                elevation: 0,
                insetPadding: const EdgeInsets.symmetric(horizontal: 40),
                child: buildPaymentLoadingCard(
                  title: 'Processing Payment',
                  message: 'Verifying your PIN and confirming payment…',
                ),
              ),
            );
          }

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
            ),
            actions: [
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
