import 'package:flutter/material.dart';
import 'package:permit_app/src/utils/colors.dart';
import 'package:permit_app/src/screens/apply_permit_screen.dart';

class GuidelinesScreen extends StatelessWidget {
  const GuidelinesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ColorPallete.backgroundColor,
      body: CustomScrollView(
        slivers: [
          // Header Sliver
          SliverAppBar(
            expandedHeight: 200.0,
            floating: false,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              title: const Text(
                'Application Guide',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                  fontSize: 18,
                ),
              ),
              background: Container(
                decoration: const BoxDecoration(
                  gradient: ColorPallete.accentGradient,
                ),
                child: Stack(
                  children: [
                    Positioned(
                      right: -50,
                      top: -50,
                      child: CircleAvatar(
                        radius: 100,
                        backgroundColor: Colors.white.withOpacity(0.1),
                      ),
                    ),
                    const Center(
                      child: Icon(
                        Icons.menu_book_rounded,
                        size: 80,
                        color: Colors.white24,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          
          // Guidelines Content
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'How to Apply for a Permit',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: ColorPallete.primaryNavy,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Follow these 5 simple steps to get your building permit approved by the Mogadishu Municipality.',
                    style: TextStyle(
                      fontSize: 14,
                      color: ColorPallete.hintTextColor,
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 30),
                  
                  _buildStepItem(
                    stepNumber: '01',
                    title: 'Enter Building Details',
                    description: 'Provide your Plot ID, District, and the type of building you plan to construct (e.g., Villa, Apartment).',
                    icon: Icons.edit_note_rounded,
                    color: Colors.blue,
                  ),
                  _buildStepItem(
                    stepNumber: '02',
                    title: 'Auto-Calculate Fees',
                    description: 'The app will automatically calculate the permit fee based on the land area and number of floors.',
                    icon: Icons.calculate_rounded,
                    color: Colors.orange,
                  ),
                  _buildStepItem(
                    stepNumber: '03',
                    title: 'Secure Payment',
                    description: 'Pay the calculated fee directly through the integrated EVC Plus USSD experience.',
                    icon: Icons.payments_rounded,
                    color: Colors.green,
                  ),
                  _buildStepItem(
                    stepNumber: '04',
                    title: 'Upload Documents',
                    description: 'Attach a digital copy of your Passport/ID and your Land Ownership document (PDF or Image).',
                    icon: Icons.cloud_upload_rounded,
                    color: Colors.purple,
                  ),
                  _buildStepItem(
                    stepNumber: '05',
                    title: 'Real-time Tracking',
                    description: 'Submit your application and monitor its status from "Pending" to "Approved" in the My Permits tab.',
                    icon: Icons.track_changes_rounded,
                    color: Colors.red,
                  ),
                  
                  const SizedBox(height: 40),
                  
                  // Final CTA
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(25),
                    decoration: BoxDecoration(
                      color: ColorPallete.primaryNavy.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: ColorPallete.primaryNavy.withOpacity(0.1)),
                    ),
                    child: Column(
                      children: [
                        const Text(
                          'Ready to start?',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: ColorPallete.primaryNavy,
                          ),
                        ),
                        const SizedBox(height: 10),
                        const Text(
                          'Begin your application process now and get your permit faster than ever.',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 13, color: ColorPallete.hintTextColor),
                        ),
                        const SizedBox(height: 20),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: () {
                              Navigator.pushReplacement(
                                context,
                                MaterialPageRoute(builder: (context) => const ApplyPermitScreen()),
                              );
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: ColorPallete.primaryNavy,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 18),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
                              elevation: 0,
                            ),
                            child: const Text('START APPLICATION', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1.1)),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 40),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepItem({
    required String stepNumber,
    required String title,
    required String description,
    required IconData icon,
    required Color color,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 25),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    stepNumber,
                    style: TextStyle(
                      color: color,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ),
              ),
              if (stepNumber != '05')
                Container(
                  width: 2,
                  height: 60,
                  color: color.withOpacity(0.1),
                ),
            ],
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(icon, color: color, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: ColorPallete.primaryNavy,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  description,
                  style: TextStyle(
                    fontSize: 14,
                    color: ColorPallete.mainTextColor.withOpacity(0.7),
                    height: 1.5,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
