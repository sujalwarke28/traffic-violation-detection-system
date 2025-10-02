import { Router } from 'express';
import Violation from '../models/Violation.js';

const router = Router();

// Helper to compute fine amount
function computeAmount(violationTypes = []){
  let amount = 0;
  if(violationTypes.includes('NO_HELMET')) amount += 500;
  if(violationTypes.includes('OVER_CAPACITY')) amount += 1000;
  if(amount === 0) amount = 300; // base fine for other/unknown
  return amount;
}

function normalizePlate(s){ return String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,''); }

// Create
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { imageUrl, plateText, helmetDetected, riderCount, violationTypes, metadata } = req.body;
    // Try to find a registered driver by plate number
    let ownerUserId = undefined;
    if (plateText) {
      try {
        const Driver = (await import('../models/Driver.js')).default;
        const driver = await Driver.findOne({ plateNumberNormalized: normalizePlate(plateText) });
        if (driver) ownerUserId = driver.userId;
      } catch (e) {
        // ignore assignment failure, proceed to save violation
      }
    }
    const doc = await Violation.create({
      userId,
      ownerUserId,
      imageUrl,
      plateText, // keep exactly as provided
      normalizedPlateText: normalizePlate(plateText),
      helmetDetected,
      riderCount,
      violationTypes,
      metadata,
      amount: computeAmount(violationTypes||[]),
    });
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const items = await Violation.find({ userId }).sort({ createdAt: -1 }).limit(100);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Pay a violation
router.post('/:id/pay', async (req, res) => {
  try{
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const v = await Violation.findById(req.params.id);
    if(!v) return res.status(404).json({ error: 'Not found' });
    // Only owner or creator can pay
    if(v.ownerUserId && v.ownerUserId !== userId && v.userId !== userId){
      return res.status(403).json({ error: 'Forbidden' });
    }
    v.paymentStatus = 'paid';
    v.paidAt = new Date();
    await v.save();
    res.json(v);
  }catch(err){ res.status(500).json({ error: err.message }); }
});

export default router;


