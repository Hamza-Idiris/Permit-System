import 'package:flutter/material.dart';
import 'package:permit_app/src/utils/colors.dart';
import 'package:permit_app/src/screens/login_page.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  final List<Map<String, String>> _onboardingData = [
    {
      'title': 'Start Your Building Project',
      'description': 'Initiate municipal permit applications digitally from your pocket. Track your site surveys and architectural blueprints in one place.',
      'image': 'onboarding_step1', // Placeholder logic for now, using local generated assets
    },
    {
      'title': 'Smart Compliance Review',
      'description': 'Our staff checks every requirement. If corrections are needed, re-edit your file instantly without paying extra fees if core parameters stay the same.',
      'image': 'onboarding_step2',
    },
    {
      'title': 'Instant Digital Issuance',
      'description': 'Once fully approved by municipal staff, your official building permit and its unique validation QR code are generated instantly for mobile access.',
      'image': 'onboarding_step3',
    },
    {
      'title': 'Verified Site Inspection',
      'description': 'Assigned inspectors use mandatory QR scanning on-site to verify physical compliance, ensure structural safety, and finalize project execution.',
      'image': 'onboarding_step4',
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ColorPallete.primaryNavy,
      body: Stack(
        children: [
          // Background Images
          PageView.builder(
            controller: _pageController,
            onPageChanged: (index) => setState(() => _currentPage = index),
            itemCount: _onboardingData.length,
            itemBuilder: (context, index) {
              return Stack(
                children: [
                  // Full screen background for the top half (using images would go here)
                  Container(
                    width: double.infinity,
                    height: MediaQuery.of(context).size.height * 0.6,
                    decoration: BoxDecoration(
                      color: ColorPallete.primaryNavy,
                    ),
                    child: Center(
                      child: Icon(
                        index == 0 ? Icons.architecture_rounded : 
                        index == 1 ? Icons.assignment_turned_in_rounded :
                        index == 2 ? Icons.qr_code_2_rounded : Icons.verified_user_rounded,
                        size: 150,
                        color: Colors.white.withOpacity(0.1),
                      ),
                    )
                  ),
                  // Content Card
                  Align(
                    alignment: Alignment.bottomCenter,
                    child: Container(
                      height: MediaQuery.of(context).size.height * 0.45,
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(horizontal: 30, vertical: 40),
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.only(
                          topLeft: Radius.circular(40),
                          topRight: Radius.circular(40),
                        ),
                      ),
                      child: Column(
                        children: [
                          // Indicators
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: List.generate(
                              _onboardingData.length,
                              (i) => AnimatedContainer(
                                duration: const Duration(milliseconds: 300),
                                margin: const EdgeInsets.only(right: 8),
                                height: 8,
                                width: _currentPage == i ? 24 : 8,
                                decoration: BoxDecoration(
                                  color: _currentPage == i ? ColorPallete.primaryNavy : Colors.grey.shade300,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 30),
                          Text(
                            _onboardingData[index]['title']!,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontSize: 26,
                              fontWeight: FontWeight.w900,
                              color: ColorPallete.primaryNavy,
                              letterSpacing: -0.5,
                            ),
                          ),
                          const SizedBox(height: 15),
                          Text(
                            _onboardingData[index]['description']!,
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 16,
                              color: Colors.grey.shade600,
                              height: 1.6,
                            ),
                          ),
                          const Spacer(),
                          // Button
                          SizedBox(
                            width: double.infinity,
                            height: 60,
                            child: ElevatedButton(
                              onPressed: () {
                                if (_currentPage == _onboardingData.length - 1) {
                                  Navigator.pushReplacement(
                                    context,
                                    MaterialPageRoute(builder: (context) => const LoginPage()),
                                  );
                                } else {
                                  _pageController.nextPage(
                                    duration: const Duration(milliseconds: 400),
                                    curve: Curves.easeInOut,
                                  );
                                }
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: ColorPallete.primaryNavy,
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                                elevation: 0,
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    _currentPage == _onboardingData.length - 1 ? 'Get Started' : 'Continue',
                                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                                  ),
                                  const SizedBox(width: 10),
                                  const Icon(Icons.arrow_forward_rounded),
                                ],
                              ),
                            ),
                          ),
                          if (_currentPage != _onboardingData.length - 1)
                            TextButton(
                              onPressed: () {
                                Navigator.pushReplacement(
                                  context,
                                  MaterialPageRoute(builder: (context) => const LoginPage()),
                                );
                              },
                              child: Text(
                                'Skip',
                                style: TextStyle(color: Colors.grey.shade400, fontWeight: FontWeight.bold),
                              ),
                            ),
                        ],
                      ),
                    ),
                  )
                ],
              );
            },
          ),
          // System Title Overlay (Small at top)
          Positioned(
            top: 60,
            left: 0,
            right: 0,
            child: Text(
              'SOVEREIGN LEDGER',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.white.withOpacity(0.5),
                letterSpacing: 8,
                fontSize: 12,
                fontWeight: FontWeight.w900,
              ),
            ),
          )
        ],
      ),
    );
  }
}
