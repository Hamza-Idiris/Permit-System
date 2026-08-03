import 'dart:html' as html;
import 'package:flutter/material.dart';
import 'package:permit_app/src/utils/colors.dart';

Future<void> saveAndShareFileImpl({
  required List<int> bytes,
  required String fileName,
  required BuildContext context,
}) async {
  final blob = html.Blob([bytes], 'image/png');
  final url = html.Url.createObjectUrlFromBlob(blob);
  final anchor = html.document.createElement('a') as html.AnchorElement
    ..href = url
    ..style.display = 'none'
    ..download = fileName;
  html.document.body?.children.add(anchor);
  anchor.click();
  html.document.body?.children.remove(anchor);
  html.Url.revokeObjectUrl(url);

  if (context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Certificate downloaded successfully!'),
        backgroundColor: ColorPallete.successGreen,
      ),
    );
  }
}
