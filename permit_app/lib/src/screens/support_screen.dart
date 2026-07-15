import 'package:flutter/material.dart';
import 'package:permit_app/src/utils/colors.dart';
import 'package:url_launcher/url_launcher.dart';

class SupportScreen extends StatelessWidget {
  const SupportScreen({super.key});

  // Helper to launch URLs/Phone/WhatsApp
  Future<void> _launchUrl(String url) async {
    final Uri uri = Uri.parse(url);
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      throw Exception('Could not launch $url');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ColorPallete.backgroundColor,
      appBar: AppBar(
        title: const Text('Help & Support', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: ColorPallete.primaryNavy,
        elevation: 0,
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Top Illustration/Icon Section
            Container(
              width: double.infinity,
              color: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 40),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: ColorPallete.primaryNavy.withOpacity(0.05),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.headset_mic_rounded,
                      size: 80,
                      color: ColorPallete.primaryNavy,
                    ),
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    'How can we help you?',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: ColorPallete.primaryNavy,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 40),
                    child: Text(
                      'Our support team is available to assist you with your permit application.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 14,
                        color: ColorPallete.hintTextColor,
                        height: 1.5,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 20),
            
            // Support Options
            Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                children: [
                  _buildSupportCard(
                    title: 'Call Official Support',
                    subtitle: '+252 61 123 4567',
                    icon: Icons.phone_in_talk_rounded,
                    color: Colors.blue,
                    onTap: () => _launchUrl('tel:+252611234567'),
                  ),
                  const SizedBox(height: 15),
                  _buildSupportCard(
                    title: 'WhatsApp Chat',
                    subtitle: 'Chat with our experts now',
                    icon: Icons.chat_rounded,
                    color: Colors.green,
                    onTap: () => _launchUrl('https://wa.me/252611234567'),
                  ),
                  const SizedBox(height: 15),
                  _buildSupportCard(
                    title: 'Email Us',
                    subtitle: 'support@municipality.gov.so',
                    icon: Icons.alternate_email_rounded,
                    color: Colors.orange,
                    onTap: () => _launchUrl('mailto:support@municipality.gov.so'),
                  ),
                  const SizedBox(height: 30),
                  
                  // Working Hours Section
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.05),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      children: [
                        Row(
                          children: const [
                            Icon(Icons.access_time_rounded, color: ColorPallete.primaryNavy, size: 20),
                            SizedBox(width: 10),
                            Text(
                              'Operation Hours',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: ColorPallete.primaryNavy,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 15),
                        _buildHourRow('Saturday - Wednesday', '8:00 AM - 4:00 PM'),
                        const Divider(height: 20),
                        _buildHourRow('Thursday', '8:00 AM - 1:00 PM'),
                        const Divider(height: 20),
                        _buildHourRow('Friday', 'Closed'),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildSupportCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(15),
              ),
              child: Icon(icon, color: color, size: 28),
            ),
            const SizedBox(width: 20),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: ColorPallete.primaryNavy,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 13,
                      color: ColorPallete.hintTextColor,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios_rounded, size: 16, color: Colors.grey),
          ],
        ),
      ),
    );
  }

  Widget _buildHourRow(String day, String hours) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(day, style: const TextStyle(fontSize: 13, color: ColorPallete.mainTextColor)),
        Text(
          hours,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.bold,
            color: ColorPallete.primaryNavy,
          ),
        ),
      ],
    );
  }
}
