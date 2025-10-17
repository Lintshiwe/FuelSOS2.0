class SOSRequest {
  final String id;
  final String userId;
  final Location location;
  final DateTime timestamp;
  final SOSStatus status;
  final String type;
  final String? attendantId;
  final String? chatId;
  final DateTime? estimatedArrival;

  SOSRequest({
    required this.id,
    required this.userId,
    required this.location,
    required this.timestamp,
    required this.status,
    required this.type,
    this.attendantId,
    this.chatId,
    this.estimatedArrival,
  });

  factory SOSRequest.fromMap(Map<String, dynamic> map) {
    return SOSRequest(
      id: map['id'] ?? '',
      userId: map['userId'] ?? '',
      location: Location.fromMap(map['location'] ?? {}),
      timestamp: DateTime.parse(map['timestamp'] ?? DateTime.now().toIso8601String()),
      status: SOSStatus.values.firstWhere(
        (s) => s.toString().split('.').last == map['status'],
        orElse: () => SOSStatus.pending,
      ),
      type: map['type'] ?? 'fuel_emergency',
      attendantId: map['attendantId'],
      chatId: map['chatId'],
      estimatedArrival: map['estimatedArrival'] != null 
          ? DateTime.parse(map['estimatedArrival']) 
          : null,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'userId': userId,
      'location': location.toMap(),
      'timestamp': timestamp.toIso8601String(),
      'status': status.toString().split('.').last,
      'type': type,
      'attendantId': attendantId,
      'chatId': chatId,
      'estimatedArrival': estimatedArrival?.toIso8601String(),
    };
  }
}

class Location {
  final double latitude;
  final double longitude;
  final String? address;

  Location({
    required this.latitude,
    required this.longitude,
    this.address,
  });

  factory Location.fromMap(Map<String, dynamic> map) {
    return Location(
      latitude: (map['latitude'] ?? 0.0).toDouble(),
      longitude: (map['longitude'] ?? 0.0).toDouble(),
      address: map['address'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'latitude': latitude,
      'longitude': longitude,
      'address': address,
    };
  }
}

enum SOSStatus {
  pending,
  assigned,
  confirmed,
  enRoute,
  arrived,
  completed,
  cancelled,
}

class User {
  final String id;
  final String name;
  final String phone;
  final String email;
  final bool isVerified;
  final DateTime createdAt;
  final UserType type;

  User({
    required this.id,
    required this.name,
    required this.phone,
    required this.email,
    required this.isVerified,
    required this.createdAt,
    required this.type,
  });

  factory User.fromMap(Map<String, dynamic> map) {
    return User(
      id: map['id'] ?? '',
      name: map['name'] ?? '',
      phone: map['phone'] ?? '',
      email: map['email'] ?? '',
      isVerified: map['isVerified'] ?? false,
      createdAt: DateTime.parse(map['createdAt'] ?? DateTime.now().toIso8601String()),
      type: UserType.values.firstWhere(
        (t) => t.toString().split('.').last == map['type'],
        orElse: () => UserType.driver,
      ),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'phone': phone,
      'email': email,
      'isVerified': isVerified,
      'createdAt': createdAt.toIso8601String(),
      'type': type.toString().split('.').last,
    };
  }
}

enum UserType {
  driver,
  attendant,
  admin,
}

class Attendant {
  final String id;
  final String name;
  final String phone;
  final String vehiclePlate;
  final bool isVerified;
  final bool isAvailable;
  final Location? currentLocation;
  final double rating;
  final int reviewCount;
  final DateTime lastLocationUpdate;

  Attendant({
    required this.id,
    required this.name,
    required this.phone,
    required this.vehiclePlate,
    required this.isVerified,
    required this.isAvailable,
    this.currentLocation,
    required this.rating,
    required this.reviewCount,
    required this.lastLocationUpdate,
  });

  factory Attendant.fromMap(Map<String, dynamic> map) {
    return Attendant(
      id: map['id'] ?? '',
      name: map['name'] ?? '',
      phone: map['phone'] ?? '',
      vehiclePlate: map['vehiclePlate'] ?? '',
      isVerified: map['isVerified'] ?? false,
      isAvailable: map['isAvailable'] ?? false,
      currentLocation: map['currentLocation'] != null 
          ? Location.fromMap(map['currentLocation']) 
          : null,
      rating: (map['rating'] ?? 0.0).toDouble(),
      reviewCount: map['reviewCount'] ?? 0,
      lastLocationUpdate: DateTime.parse(
        map['lastLocationUpdate'] ?? DateTime.now().toIso8601String()
      ),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'phone': phone,
      'vehiclePlate': vehiclePlate,
      'isVerified': isVerified,
      'isAvailable': isAvailable,
      'currentLocation': currentLocation?.toMap(),
      'rating': rating,
      'reviewCount': reviewCount,
      'lastLocationUpdate': lastLocationUpdate.toIso8601String(),
    };
  }
}