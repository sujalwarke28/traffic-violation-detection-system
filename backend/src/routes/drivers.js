import { Router } from 'express';
import Driver from '../models/Driver.js';

const router = Router();

function normalizePlate(s){ return String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,''); }

// Register a new driver
router.post('/register', async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { email, name, plateNumber, vehicleType, vehicleModel, vehicleColor, plateImageUrl } = req.body;
    
    // If this user already has a profile, return it (idempotent)
    const existingProfile = await Driver.findOne({ userId });
    if (existingProfile) {
      return res.status(200).json(existingProfile);
    }

    // Check if plate number already exists for another user (normalized)
    const existing = await Driver.findOne({ plateNumberNormalized: normalizePlate(plateNumber) });
    if (existing) {
      return res.status(400).json({ error: 'This plate number is already registered' });
    }

    const driver = await Driver.create({
      userId,
      email,
      name,
      plateNumber, // store exactly as provided
      vehicleType,
      vehicleModel,
      vehicleColor,
      plateImageUrl,
    });
    
    res.status(201).json(driver);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Get driver profile
router.get('/profile', async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const driver = await Driver.findOne({ userId });
    if (!driver) {
      return res.status(404).json({ error: 'Driver profile not found' });
    }
    
    res.json(driver);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update driver profile (editable)
router.patch('/profile', async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const driver = await Driver.findOne({ userId });
    if (!driver) return res.status(404).json({ error: 'Driver profile not found' });

    const { email, name, plateNumber, vehicleType, vehicleModel, vehicleColor, plateImageUrl } = req.body || {};

    if (typeof email === 'string') driver.email = email;
    if (typeof name === 'string') driver.name = name;
    if (typeof vehicleType === 'string') driver.vehicleType = vehicleType;
    if (typeof vehicleModel === 'string') driver.vehicleModel = vehicleModel;
    if (typeof vehicleColor === 'string') driver.vehicleColor = vehicleColor;
    if (typeof plateImageUrl === 'string') driver.plateImageUrl = plateImageUrl;

    if (typeof plateNumber === 'string' && plateNumber.trim() && plateNumber !== driver.plateNumber) {
      const normalized = normalizePlate(plateNumber);
      const conflict = await Driver.findOne({ plateNumberNormalized: normalized, userId: { $ne: userId } });
      if (conflict) return res.status(400).json({ error: 'This plate number is already registered by another user' });
      driver.plateNumber = plateNumber; // exact as provided; pre-validate hook updates normalized
    }

    await driver.save();
    res.json(driver);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get driver's violations (optionally filter by paymentStatus=pending|paid)
router.get('/violations', async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const driver = await Driver.findOne({ userId });
    if (!driver) {
      return res.status(404).json({ error: 'Driver profile not found' });
    }
    
    // Import Violation model
    const Violation = (await import('../models/Violation.js')).default;
    const filter = { $or: [ { ownerUserId: driver.userId }, { plateText: driver.plateNumber } ] };
    const status = String(req.query.status || '').toLowerCase();
    if(status === 'pending'){
      filter.$or = [
        { ...filter },
      ]; // anchor to keep owner/plate match
      // Add paymentStatus inclusion for legacy docs (no field)
      delete filter.$or; // reset, rebuild properly below
      const baseMatch = { $or: [ { ownerUserId: driver.userId }, { plateText: driver.plateNumber } ] };
      Object.assign(filter, baseMatch);
      filter.$and = [ { $or: [ { paymentStatus: 'pending' }, { paymentStatus: { $exists: false } } ] } ];
    } else if(status === 'paid'){
      filter.paymentStatus = 'paid';
    }
    const violations = await Violation.find(filter).sort({ createdAt: -1 });
    
    res.json(violations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
