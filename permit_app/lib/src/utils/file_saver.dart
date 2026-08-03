import 'package:flutter/material.dart';
import 'file_saver_mobile.dart'
    if (dart.library.html) 'file_saver_web.dart';

Future<void> saveAndShareFile({
  required List<int> bytes,
  required String fileName,
  required BuildContext context,
}) => saveAndShareFileImpl(bytes: bytes, fileName: fileName, context: context);
