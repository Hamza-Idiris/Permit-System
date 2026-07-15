import 'package:flutter/material.dart';
import 'package:permit_app/src/utils/colors.dart';

class AboutUsScreen extends StatelessWidget {
  const AboutUsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryNavy = ColorPallete.primaryNavy;
    
    return Scaffold(
      backgroundColor: isDark ? ColorPallete.darkBackgroundColor : const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Sovereign Ledger', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: isDark ? Colors.white : primaryNavy,
        actions: [
          IconButton(
            onPressed: () {},
            icon: const Icon(Icons.share_outlined),
          )
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Header Image Card
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(24),
                  image: DecorationImage(
                    image: const NetworkImage('https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&q=80&w=1000'),
                    fit: BoxFit.cover,
                    colorFilter: ColorFilter.mode(Colors.black.withOpacity(0.6), BlendMode.darken),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'About Sovereign Ledger',
                      style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Sovereign Ledger serves as the official digital infrastructure of the Urban Permit Authority, providing a secure and transparent platform for managing city-wide developments and regulatory compliance.',
                      style: TextStyle(color: Colors.white.withOpacity(0.9), fontSize: 13, height: 1.5),
                    ),
                  ],
                ),
              ),
            ),

            // Core Mission
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 4)),
                  ],
                ),
                child: Column(
                  children: [
                    Container(
                      padding: const Offset(0, 0) == const Offset(0, 0) ? const EdgeInsets.all(12) : EdgeInsets.zero,
                      decoration: const BoxDecoration(
                        color: Color(0xFF001F3F),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.star, color: Colors.amber, size: 28),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Our Core Mission',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: isDark ? Colors.white : primaryNavy),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'To modernize urban development through a high-integrity ledger system that ensures every permit, payment, and plan is processed with absolute precision, speed, and public accountability.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: isDark ? Colors.white70 : Colors.grey.shade600, fontSize: 13, height: 1.6),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 20),
            
            // Pillars Section Header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Row(
                children: [
                  const Icon(Icons.shield_outlined, color: Colors.blueAccent),
                  const SizedBox(width: 12),
                  Text(
                    'The Pillars of Our Platform',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: isDark ? Colors.white : primaryNavy),
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 16),

            // Pillars List
            _buildPillarItem(
              context: context,
              icon: Icons.trending_up,
              title: 'Real-Time Progress Tracking',
              description: 'Experience full visibility with our online blueprint submission portal. Monitor your application status in real-time as it moves through various stages of municipal review.',
            ),
            _buildPillarItem(
              context: context,
              icon: Icons.payment,
              title: 'Secure & Verified Payments',
              description: 'Our integrated digital fee processing system ensures all transactions are encrypted and instantly verified, providing official digital receipts for your records.',
            ),
            _buildPillarItem(
              context: context,
              icon: Icons.qr_code_scanner,
              title: 'Guaranteed Safety & Standards',
              description: 'Every approved permit is issued with a unique system QR code, ensuring that all urban developments strictly adhere to modern safety and engineering compliance standards.',
            ),
            _buildPillarItem(
              context: context,
              icon: Icons.edit_note,
              title: 'Fair and Structured Re-Edits',
              description: 'We understand projects evolve. Our platform provides flexible re-submission windows for corrections and amendments, maintaining a structured trail of all project modifications.',
            ),

            const SizedBox(height: 30),

            // Governing Authority Section
            Container(
              width: double.infinity,
              color: const Color(0xFF001F3F),
              padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Governing Authority &\nCompliance',
                    style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Sovereign Ledger operates under the strict oversight of the Urban Permit Authority. Our multi-layer verification process combines automated algorithmic checks with expert human review to ensure absolute adherence to city by-laws and safety regulations.',
                    style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 13, height: 1.6),
                  ),
                  const SizedBox(height: 20),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.white24),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: const [
                        Icon(Icons.verified_user_outlined, color: Colors.white, size: 16),
                        SizedBox(width: 8),
                        Text('Certified municipal infrastructure', style: TextStyle(color: Colors.white, fontSize: 12)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 30),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: Image.network(
                      'https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80&w=1000',
                      height: 200,
                      width: double.infinity,
                      fit: BoxFit.cover,
                    ),
                  ),
                ],
              ),
            ),

            // System Notice
            Padding(
              padding: const EdgeInsets.all(24),
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: isDark ? Colors.white.withOpacity(0.05) : Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey.withOpacity(0.2)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.notifications_active_outlined, color: isDark ? Colors.white70 : Colors.black54, size: 24),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Important System Notice',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: isDark ? Colors.white : Colors.black),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Applicants are required to maintain up-to-date profile information. All official notifications regarding permit milestones, payment confirmations, and compliance requests will be dispatched exclusively through the Sovereign Ledger secure dashboard.',
                            style: TextStyle(fontSize: 12, color: Colors.grey.shade600, height: 1.5),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildPillarItem({
    required BuildContext context,
    required IconData icon,
    required String title,
    required String description,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.01), blurRadius: 10, offset: const Offset(0, 4)),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.grey.withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: Colors.blueGrey, size: 20),
            ),
            const SizedBox(height: 16),
            Text(
              title,
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: isDark ? Colors.white : ColorPallete.primaryNavy),
            ),
            const SizedBox(height: 8),
            Text(
              description,
              style: TextStyle(color: Colors.grey.shade500, fontSize: 12, height: 1.5),
            ),
          ],
        ),
      ),
    );
  }
}
