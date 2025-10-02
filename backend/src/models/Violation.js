import mongoose from 'mongoose';

const ViolationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    ownerUserId: { type: String },
    imageUrl: { type: String },
    // Store exactly as provided for display
    plateText: { type: String },
    // Normalized for matching/joins (A-Z0-9 upper, no spaces/hyphens)
    normalizedPlateText: { type: String, index: true },
    helmetDetected: { type: Boolean, default: null },
    riderCount: { type: Number, default: null },
    violationTypes: { type: [String], default: [] },
    metadata: { type: Object },
    // payments
    paymentStatus: { type: String, enum: ['pending','paid'], default: 'pending' },
    amount: { type: Number, default: 0 },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model('Violation', ViolationSchema);


