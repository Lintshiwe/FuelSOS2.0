import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/firebase_service.dart';
import '../services/location_service.dart';
import 'rescue_status_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _isEmergencyActive = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initializeLocation();
    });
  }

  Future<void> _initializeLocation() async {
    final locationService =
        Provider.of<LocationService>(context, listen: false);
    await locationService.requestPermission();
    await locationService.getCurrentLocation();
  }

  Future<void> _handleSOSPress() async {
    if (_isEmergencyActive) return;

    setState(() {
      _isEmergencyActive = true;
    });

    try {
      final locationService =
          Provider.of<LocationService>(context, listen: false);
      final firebaseService =
          Provider.of<FirebaseService>(context, listen: false);

      // Get current location
      final position = await locationService.getCurrentLocation();

      if (position != null) {
        // Create SOS request
        final sosRequest = {
          'userId': 'lintshiwe_ntoampi', // Fuel attendant user
          'location': {
            'latitude': position.latitude,
            'longitude': position.longitude,
          },
          'timestamp': DateTime.now().toIso8601String(),
          'status': 'pending',
          'type': 'fuel_emergency',
        };

        // Send to backend
        await firebaseService.createSOSRequest(sosRequest);

        // Navigate to rescue status screen
        if (mounted) {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (context) => const RescueStatusScreen(),
            ),
          );
        }
      }
    } catch (e) {
      _showErrorDialog('Failed to send SOS request. Please try again.');
    } finally {
      setState(() {
        _isEmergencyActive = false;
      });
    }
  }

  void _showErrorDialog(String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Error'),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'FuelSOS',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 24,
          ),
        ),
        centerTitle: true,
      ),
      body: Consumer<LocationService>(
        builder: (context, locationService, child) {
          return Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Location Status
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.grey[100],
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        locationService.currentPosition != null
                            ? Icons.location_on
                            : Icons.location_off,
                        color: locationService.currentPosition != null
                            ? Colors.green
                            : Colors.red,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          locationService.currentPosition != null
                              ? 'Location detected'
                              : 'Getting location...',
                          style: const TextStyle(fontSize: 16),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 60),

                // SOS Button
                GestureDetector(
                  onTap: _isEmergencyActive ? null : _handleSOSPress,
                  child: Container(
                    width: 250,
                    height: 250,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: _isEmergencyActive
                          ? Colors.grey
                          : const Color(0xFFE53E3E),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.red.withValues(alpha: 0.3),
                          spreadRadius: 5,
                          blurRadius: 20,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          _isEmergencyActive
                              ? Icons.hourglass_empty
                              : Icons.emergency,
                          size: 80,
                          color: Colors.white,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          _isEmergencyActive ? 'SENDING...' : 'SOS',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 32,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'TAP FOR HELP',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 60),

                // Emergency Info
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.orange[50],
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.orange[200]!),
                  ),
                  child: const Column(
                    children: [
                      Icon(
                        Icons.info_outline,
                        color: Colors.orange,
                        size: 32,
                      ),
                      SizedBox(height: 12),
                      Text(
                        'Emergency Use Only',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.orange,
                        ),
                      ),
                      SizedBox(height: 8),
                      Text(
                        'This will send your location to nearby verified attendants. Misuse will result in penalties.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.orange,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
