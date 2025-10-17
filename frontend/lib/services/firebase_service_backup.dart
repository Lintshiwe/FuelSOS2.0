import 'package:flutter/foundation.dart';
import 'dart:async';

class FirebaseService extends ChangeNotifier {
  // Mock Firebase service for web demo
  bool _isLoading = false;
  String? _error;

  bool get isLoading => _isLoading;
  String? get error => _error;

  // Mock SOS Request Management
  Future<String?> createSOSRequest(Map<String, dynamic> sosData) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      // Simulate network delay
      await Future.delayed(const Duration(seconds: 2));

      // Add timestamp and request ID (mock)
      sosData['createdAt'] = DateTime.now().toIso8601String();
      sosData['updatedAt'] = DateTime.now().toIso8601String();
      sosData['requestId'] = DateTime.now().millisecondsSinceEpoch.toString();

      // Mock document ID
      String mockDocId = 'mock_sos_${DateTime.now().millisecondsSinceEpoch}';

      _isLoading = false;
      notifyListeners();

      if (kDebugMode) {
        print('Mock SOS Request created with ID: $mockDocId');
      }

      return mockDocId;
    } catch (e) {
      _error = 'Failed to create SOS request: $e';
      _isLoading = false;
      notifyListeners();
      
      if (kDebugMode) {
        print('Error creating SOS request: $e');
      }
      
      return null;
    }
  }

  // Mock Stream SOS request updates
  Stream<Map<String, dynamic>> getSOSRequestStream(String requestId) {
    return Stream.periodic(const Duration(seconds: 3), (count) {
      // Mock status updates
      List<String> statuses = ['pending', 'accepted', 'in_progress', 'completed'];
      String status = statuses[count % statuses.length];
      
      return {
        'requestId': requestId,
        'status': status,
        'attendantId': 'attendant_123',
        'attendantName': 'Lintshiwe Ntoampi',
        'attendantPhone': '+27123456789',
        'vehicle': 'ABC-123-GP',
        'rating': 4.8,
        'eta': '${12 - (count * 2)} minutes',
        'location': {'lat': -26.2041, 'lng': 28.0473},
        'updatedAt': DateTime.now().toIso8601String(),
      };
    });
  }

  // Mock Update SOS request status
  Future<bool> updateSOSRequestStatus(String requestId, String status) async {
    try {
      await Future.delayed(const Duration(milliseconds: 500));
      if (kDebugMode) {
        print('Mock: Updated SOS request $requestId to status: $status');
      }
      return true;
    } catch (e) {
      _error = 'Failed to update SOS request: $e';
      notifyListeners();
      return false;
    }
  }

  // Mock Chat Management
  Future<void> sendMessage(String chatId, Map<String, dynamic> messageData) async {
    await Future.delayed(const Duration(milliseconds: 300));
    if (kDebugMode) {
      print('Mock: Message sent to chat $chatId: ${messageData['text']}');
    }
  }

  // Mock Stream chat messages  
  Stream<List<Map<String, dynamic>>> getChatMessagesStream(String chatId) {
    return Stream.periodic(const Duration(seconds: 1), (count) {
      return [
        {
          'messageId': 'msg_1',
          'text': 'Hi! I\'m on my way to help you with fuel.',
          'senderId': 'attendant_123',
          'senderName': 'Lintshiwe Ntoampi',
          'timestamp': DateTime.now().subtract(const Duration(minutes: 5)).toIso8601String(),
          'type': 'text',
        },
        {
          'messageId': 'msg_2', 
          'text': 'Thank you! I\'m at the Shell station on Main Road.',
          'senderId': 'user_123',
          'senderName': 'You',
          'timestamp': DateTime.now().subtract(const Duration(minutes: 4)).toIso8601String(),
          'type': 'text',
        },
      ];
    });
  }

  // Mock Create chat room
  Future<String?> createChatRoom(String userId, String attendantId, String sosRequestId) async {
    await Future.delayed(const Duration(milliseconds: 500));
    String chatId = 'chat_${sosRequestId}_${DateTime.now().millisecondsSinceEpoch}';
    if (kDebugMode) {
      print('Mock: Created chat room $chatId');
    }
    return chatId;
  }

  // Mock User Management
  Future<Map<String, dynamic>?> getCurrentUser() async {
    return {
      'uid': 'user_123',
      'email': 'ntoampilp@gmail.com', 
      'displayName': 'FuelSOS User',
      'phoneNumber': '+27123456789',
    };
  }

  Future<Map<String, dynamic>?> getUserProfile(String userId) async {
    await Future.delayed(const Duration(milliseconds: 300));
    return {
      'uid': userId,
      'email': 'ntoampilp@gmail.com',
      'displayName': 'FuelSOS User',
      'phoneNumber': '+27123456789',
      'location': {'lat': -26.2041, 'lng': 28.0473},
    };
  }

  Future<bool> signInWithEmailAndPassword(String email, String password) async {
    _isLoading = true;
    notifyListeners();
    await Future.delayed(const Duration(seconds: 1));
    _isLoading = false;
    notifyListeners();
    return true;
  }

  Future<void> signOut() async {
    await Future.delayed(const Duration(milliseconds: 500));
  }

  // Mock Attendant Management
  Future<List<Map<String, dynamic>>> getNearbyAttendants(double lat, double lng) async {
    await Future.delayed(const Duration(seconds: 1));
    
    return [
      {
        'attendantId': 'attendant_123',
        'name': 'Lintshiwe Ntoampi',
        'phone': '+27123456789',
        'vehicle': 'ABC-123-GP',
        'rating': 4.8,
        'reviewCount': 127,
        'distance': 1.2,
        'eta': 12,
        'location': {'lat': -26.2041, 'lng': 28.0473},
        'status': 'available',
      },
    ];
  }

  // Mock Call Management
  Future<String?> initiateCall(String attendantId) async {
    await Future.delayed(const Duration(milliseconds: 800));
    String callId = 'call_${DateTime.now().millisecondsSinceEpoch}';
    if (kDebugMode) {
      print('Mock: Initiated call $callId with attendant $attendantId');
    }
    return callId;
  }

  Future<bool> endCall(String callId) async {
    await Future.delayed(const Duration(milliseconds: 300));
    if (kDebugMode) {
      print('Mock: Ended call $callId');
    }
    return true;
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}