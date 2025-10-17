const express = require('express')
const router = express.Router()

// Mock user routes for development
router.get('/:userId', async (req, res) => {
  const { userId } = req.params

  // Mock user data
  const mockUser = {
    id: userId,
    name: userId === 'demo_user_123' ? 'FuelSOS Driver' : 'FuelSOS User',
    phone: '+27123456789',
    email: 'user@fuelsos.co.za',
    isVerified: true,
    type: 'driver',
    createdAt: new Date('2024-01-01'),
  }

  res.json({
    success: true,
    user: mockUser,
  })
})

router.get('/', async (req, res) => {
  res.json({
    success: true,
    users: [
      {
        id: 'demo_user_123',
        name: 'FuelSOS Driver',
        phone: '+27123456789',
        email: 'driver@fuelsos.co.za',
        isVerified: true,
        type: 'driver',
      },
    ],
  })
})

module.exports = router
