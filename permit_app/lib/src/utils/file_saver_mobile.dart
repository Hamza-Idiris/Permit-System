import 'dart:io';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:permit_app/src/utils/colors.dart';

Future<void> saveAndShareFileImpl({
  required List<int> bytes,
  required String fileName,
  required BuildContext context,
}) async {
  final Directory dir = await getTemporaryDirectory();
  final File outFile = File('${dir.path}/$fileName');
  await outFile.writeAsBytes(bytes, flush: true);

  final result = await SharePlus.instance.share(
    ShareParams(
      files: [XFile(outFile.path, mimeType: 'image/png', name: fileName)],
      subject: 'Permit Certificate',
      text: 'Official building permit certificate',
    ),
  );

  if (context.mounted && result.status == ShareResultStatus.success) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Permit Certificate shared successfully!'),
        backgroundColor: ColorPallete.successGreen,
      ),
    );
  } else if (context.mounted && result.status == ShareResultStatus.dismissed) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Certificate ready — choose Save/Downloads in the share sheet.'),
        backgroundColor: ColorPallete.primaryNavy,
      ),
    );
  }
}
