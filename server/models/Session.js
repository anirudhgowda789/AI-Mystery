import mongoose from 'mongoose';

const accusationSchema = new mongoose.Schema({
  suspectId: { type: String, required: true },
  suspectName: { type: String, required: true },
  rationale: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
  isCorrect: { type: Boolean, required: true },
  feedback: { type: String, required: true }
}, { _id: false });

const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  caseId: { type: String, required: true, index: true },
  status: { 
    type: String, 
    enum: ['active', 'solved', 'failed'], 
    default: 'active' 
  },
  attemptsRemaining: { type: Number, default: 3 },
  maxAttempts: { type: Number, default: 3 },
  viewedEvidenceIds: { type: [String], default: [] },
  accusations: [accusationSchema],
  accusedSuspectId: { type: String, default: null },
  notes: { type: String, default: '' },
  score: { type: Number, default: 0 },
  rank: { type: String, default: 'Apprentice Sleuth' },
  solutionUnlocked: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const MongooseSessionModel = mongoose.model('InvestigationSession', sessionSchema);

const memorySessionStore = new Map();

export class SessionRepository {
  static async create(sessionData) {
    const data = {
      status: 'active',
      attemptsRemaining: 3,
      maxAttempts: 3,
      viewedEvidenceIds: [],
      accusations: [],
      notes: '',
      score: 0,
      solutionUnlocked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...sessionData
    };

    if (mongoose.connection.readyState === 1) {
      return await MongooseSessionModel.create(data);
    }
    const cloned = JSON.parse(JSON.stringify(data));
    memorySessionStore.set(cloned.sessionId, cloned);
    return cloned;
  }

  static async findBySessionId(sessionId) {
    if (mongoose.connection.readyState === 1) {
      return await MongooseSessionModel.findOne({ sessionId });
    }
    const found = memorySessionStore.get(sessionId);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  static async update(sessionId, updateData) {
    updateData.updatedAt = new Date();
    if (mongoose.connection.readyState === 1) {
      return await MongooseSessionModel.findOneAndUpdate(
        { sessionId },
        { $set: updateData },
        { returnDocument: 'after' }
      );
    }
    const existing = memorySessionStore.get(sessionId);
    if (!existing) return null;
    const updated = { ...existing, ...updateData };
    memorySessionStore.set(sessionId, updated);
    return JSON.parse(JSON.stringify(updated));
  }

  static async addViewedEvidence(sessionId, evidenceId) {
    if (mongoose.connection.readyState === 1) {
      return await MongooseSessionModel.findOneAndUpdate(
        { sessionId },
        { 
          $addToSet: { viewedEvidenceIds: evidenceId },
          $set: { updatedAt: new Date() }
        },
        { returnDocument: 'after' }
      );
    }
    const session = memorySessionStore.get(sessionId);
    if (!session) return null;
    if (!session.viewedEvidenceIds.includes(evidenceId)) {
      session.viewedEvidenceIds.push(evidenceId);
    }
    session.updatedAt = new Date();
    memorySessionStore.set(sessionId, session);
    return JSON.parse(JSON.stringify(session));
  }

  static async addAccusation(sessionId, accusationRecord, updates = {}) {
    if (mongoose.connection.readyState === 1) {
      return await MongooseSessionModel.findOneAndUpdate(
        { sessionId },
        {
          $push: { accusations: accusationRecord },
          $set: { ...updates, updatedAt: new Date() }
        },
        { returnDocument: 'after' }
      );
    }
    const session = memorySessionStore.get(sessionId);
    if (!session) return null;
    session.accusations.push(accusationRecord);
    Object.assign(session, updates, { updatedAt: new Date() });
    memorySessionStore.set(sessionId, session);
    return JSON.parse(JSON.stringify(session));
  }

  static clearMemoryStore() {
    memorySessionStore.clear();
  }
}

export default SessionRepository;
