import mongoose from 'mongoose';

const DriverSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    name: { type: String, required: true },
    // Store exactly as user entered for display
    plateNumber: { type: String, required: true },
    // Normalized (A-Z0-9 only, uppercased) for matching and uniqueness
    plateNumberNormalized: { type: String, required: true, unique: true },
    vehicleType: { type: String, required: true },
    vehicleModel: { type: String },
    vehicleColor: { type: String },
    plateImageUrl: { type: String },
  },
  { timestamps: true }
);

function normalizePlate(s){ return String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,''); }

DriverSchema.pre('validate', function(next){
  this.plateNumberNormalized = normalizePlate(this.plateNumber);
  next();
});

// Indexes
DriverSchema.index({ plateNumberNormalized: 1 }, { unique: true });

export default mongoose.model('Driver', DriverSchema);
