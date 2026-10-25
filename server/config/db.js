import mongoose from 'mongoose';
import { config } from './env.js';

let isConnected = false;
let memoryServerInstance = null;
let storageEngineType = 'disconnected'; // 'mongodb' | 'memory-server' | 'embedded'

export async function connectDatabase() {
  if (isConnected) {
    return { isConnected, storageEngineType };
  }

  // 1. Attempt connection if MONGODB_URI is provided
  if (config.mongodbUri) {
    try {
      console.log(`[Database] Attempting connection to specified MONGODB_URI...`);
      await mongoose.connect(config.mongodbUri, {
        serverSelectionTimeoutMS: 3000,
      });
      isConnected = true;
      storageEngineType = 'mongodb';
      console.log(`[Database] Connected successfully to MongoDB at ${config.mongodbUri}`);
      return { isConnected, storageEngineType };
    } catch (err) {
      console.warn(`[Database] Could not connect to MONGODB_URI: ${err.message}. Falling back...`);
    }
  }

  // 2. Attempt local default MongoDB (mongodb://127.0.0.1:27017/ai_mystery)
  try {
    const localUri = 'mongodb://127.0.0.1:27017/ai_mystery';
    await mongoose.connect(localUri, {
      serverSelectionTimeoutMS: 1500,
    });
    isConnected = true;
    storageEngineType = 'mongodb';
    console.log(`[Database] Connected successfully to local MongoDB at ${localUri}`);
    return { isConnected, storageEngineType };
  } catch (err) {
    // Local MongoDB daemon not running
  }

  // 3. Attempt MongoMemoryServer if available
  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    console.log(`[Database] Starting in-memory MongoDB server...`);
    memoryServerInstance = await MongoMemoryServer.create();
    const uri = memoryServerInstance.getUri();
    await mongoose.connect(uri);
    isConnected = true;
    storageEngineType = 'memory-server';
    console.log(`[Database] Connected to MongoMemoryServer at ${uri}`);
    return { isConnected, storageEngineType };
  } catch (err) {
    console.warn(`[Database] MongoMemoryServer unavailable (${err.message}). Using embedded fallback storage.`);
  }

  // 4. Mark as embedded fallback
  isConnected = true;
  storageEngineType = 'embedded';
  return { isConnected, storageEngineType };
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (memoryServerInstance) {
    await memoryServerInstance.stop();
  }
  isConnected = false;
  storageEngineType = 'disconnected';
}

export function getDatabaseStatus() {
  return {
    connected: isConnected,
    engine: storageEngineType,
    readyState: mongoose.connection.readyState,
  };
}
