import mongoose from 'mongoose';

const planSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  calculatorType: { type: String, enum: ['sip', 'lump sum'], required: true },
  inputs: { type: mongoose.Schema.Types.Mixed, required: true },
  result: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true, versionKey: false });

export default mongoose.model('Plan', planSchema);
