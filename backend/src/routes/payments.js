import { Router } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import Violation from '../models/Violation.js';

const router = Router();

function getClient() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    throw new Error('RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET missing in environment');
  }
  return new Razorpay({ key_id, key_secret });
}

// Create an order for a violation
router.post('/create-order', async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { violationId } = req.body;
    if (!violationId) return res.status(400).json({ error: 'violationId required' });

    const v = await Violation.findById(violationId);
    if (!v) return res.status(404).json({ error: 'Violation not found' });
    // owner or creator can pay
    if (v.ownerUserId && v.ownerUserId !== userId && v.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const amount = Math.max(1, (v.amount || 300)) * 100; // in paise
    const client = getClient();
    const order = await client.orders.create({
      amount,
      currency: 'INR',
      receipt: `violation_${v._id}`,
      notes: { violationId: String(v._id), plateText: v.plateText || '' },
    });

    return res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      violationId: v._id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify payment signature and mark as paid
router.post('/verify', async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, violationId } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !violationId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const v = await Violation.findById(violationId);
    if (!v) return res.status(404).json({ error: 'Violation not found' });

    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    const hmac = crypto.createHmac('sha256', key_secret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const expected = hmac.digest('hex');

    if (expected !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    v.paymentStatus = 'paid';
    v.paidAt = new Date();
    await v.save();
    res.json(v);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
