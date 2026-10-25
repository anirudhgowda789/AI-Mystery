import mongoose from 'mongoose';

const suspectSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  occupation: { type: String, required: true },
  alibi: { type: String, required: true },
  motive: { type: String, required: true },
  statement: { type: String, required: true },
  relationship: { type: String, default: '' },
  suspicionLevel: { type: Number, default: 50 },
  avatarColor: { type: String, default: '#6366f1' }
}, { _id: false });

const evidenceSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['physical', 'testimonial', 'forensic', 'digital', 'document'], 
    default: 'physical' 
  },
  locationFound: { type: String, required: true },
  relevance: { type: String, default: '' },
  hint: { type: String, default: '' }
}, { _id: false });

const solutionSchema = new mongoose.Schema({
  culpritId: { type: String, required: true },
  motive: { type: String, required: true },
  method: { type: String, required: true },
  conclusiveEvidenceId: { type: String, required: true },
  explanation: { type: String, required: true }
}, { _id: false });

const caseSchema = new mongoose.Schema({
  caseId: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  synopsis: { type: String, required: true },
  crime: {
    type: { type: String, default: 'Homicide' },
    victim: { type: String, required: true },
    timeOfCrime: { type: String, default: 'Late evening' },
    location: { type: String, required: true },
    details: { type: String, required: true }
  },
  setting: {
    name: { type: String, required: true },
    atmosphere: { type: String, default: 'Ominous and shadowy' },
    era: { type: String, default: 'Contemporary Noir' }
  },
  difficulty: { 
    type: String, 
    enum: ['easy', 'medium', 'hard'], 
    default: 'medium' 
  },
  theme: { type: String, default: 'Classic Noir' },
  suspects: [suspectSchema],
  evidence: [evidenceSchema],
  solution: { type: solutionSchema, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Method to safely sanitize case for public consumption (guaranteeing Requirement 9)
caseSchema.methods.toPublicJSON = function() {
  const obj = this.toObject ? this.toObject() : { ...this };
  delete obj.solution;
  delete obj.__v;
  delete obj._id;
  return obj;
};

// Static helper to sanitize any raw case object
caseSchema.statics.sanitize = function(caseDoc) {
  if (!caseDoc) return null;
  const raw = caseDoc.toObject ? caseDoc.toObject() : JSON.parse(JSON.stringify(caseDoc));
  delete raw.solution;
  delete raw.__v;
  delete raw._id;
  return raw;
};

const MongooseCaseModel = mongoose.model('MysteryCase', caseSchema);

// In-memory fallback repository for environments without running MongoDB daemon
const memoryCaseStore = new Map();

export class CaseRepository {
  static async create(caseData) {
    if (mongoose.connection.readyState === 1) {
      const doc = await MongooseCaseModel.create(caseData);
      return doc;
    }
    const cloned = JSON.parse(JSON.stringify(caseData));
    cloned.createdAt = new Date();
    cloned.toPublicJSON = function() {
      const copy = { ...this };
      delete copy.solution;
      delete copy.toPublicJSON;
      return copy;
    };
    memoryCaseStore.set(cloned.caseId, cloned);
    return cloned;
  }

  static async findByCaseId(caseId) {
    if (mongoose.connection.readyState === 1) {
      return await MongooseCaseModel.findOne({ caseId });
    }
    const found = memoryCaseStore.get(caseId);
    if (!found) return null;
    const cloned = JSON.parse(JSON.stringify(found));
    cloned.toPublicJSON = function() {
      const copy = { ...this };
      delete copy.solution;
      delete copy.toPublicJSON;
      return copy;
    };
    return cloned;
  }

  static async findAll() {
    if (mongoose.connection.readyState === 1) {
      return await MongooseCaseModel.find().sort({ createdAt: -1 });
    }
    return Array.from(memoryCaseStore.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  static async count() {
    if (mongoose.connection.readyState === 1) {
      return await MongooseCaseModel.countDocuments();
    }
    return memoryCaseStore.size;
  }

  static sanitize(caseDoc) {
    return MongooseCaseModel.sanitize(caseDoc);
  }

  static clearMemoryStore() {
    memoryCaseStore.clear();
  }
}

export default CaseRepository;
