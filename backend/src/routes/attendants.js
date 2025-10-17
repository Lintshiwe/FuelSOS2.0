const express = require('express')
const router = express.Router()

// Mock attendant routes for development
router.get('/nearby', async (req, res) => {
  const { latitude, longitude, radius = 10 } = req.query

  // Mock nearby attendants
  const mockAttendants = [
    {
      id: 'att_001',
      name: 'Lintshiwe Ntoampi',
      phone: '+27123456789',
      vehiclePlate: 'ABC-123-GP',
      isVerified: true,
      isAvailable: true,
      location: {
        latitude: parseFloat(latitude) + 0.01,
        longitude: parseFloat(longitude) + 0.01,
      },
      distance: 1.2,
      rating: 4.8,
      reviewCount: 127,
    },
    {
      id: 'att_002',
      name: 'Lintshiwe Ntoampi',
      phone: '+27123456790',
      vehiclePlate: 'DEF-456-GP',
      isVerified: true,
      isAvailable: true,
      location: {
        latitude: parseFloat(latitude) - 0.01,
        longitude: parseFloat(longitude) - 0.01,
      },
      distance: 2.1,
      rating: 4.6,
      reviewCount: 89,
    },
  ]

  res.json({
    success: true,
    attendants: mockAttendants.filter(
      (att) => att.distance <= parseFloat(radius)
    ),
  })
})

router.get('/:attendantId', async (req, res) => {
  const { attendantId } = req.params

  const mockAttendant = {
    id: attendantId,
    name: attendantId === 'att_001' ? 'Lintshiwe Ntoampi' : 'Sarah Wilson',
    phone: '+27123456789',
    vehiclePlate: attendantId === 'att_001' ? 'ABC-123-GP' : 'DEF-456-GP',
    isVerified: true,
    isAvailable: true,
    rating: attendantId === 'att_001' ? 4.8 : 4.6,
    reviewCount: attendantId === 'att_001' ? 127 : 89,
  }

  res.json({
    success: true,
    attendant: mockAttendant,
  })
})

module.exports = router
