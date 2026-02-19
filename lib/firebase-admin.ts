import { App, cert, getApps, initializeApp } from "firebase-admin/app";
import { Auth, getAuth } from "firebase-admin/auth";
import { Firestore, getFirestore } from "firebase-admin/firestore";
import { getStorage, Storage } from "firebase-admin/storage";

export function hasFirebaseAdminCredentials() {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
      (process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY)
  );
}

function getServiceAccount() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountJson) {
    return JSON.parse(serviceAccountJson);
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase admin credentials.");
  }

  return {
    project_id: projectId,
    client_email: clientEmail,
    private_key: privateKey
  };
}

let app: App | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: Storage | null = null;

export function getStorageBucketCandidates() {
  const candidates = new Set<string>();
  const explicitBucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (explicitBucket) {
    candidates.add(explicitBucket);
    if (explicitBucket.endsWith(".firebasestorage.app")) {
      candidates.add(explicitBucket.replace(".firebasestorage.app", ".appspot.com"));
    }
    if (explicitBucket.endsWith(".appspot.com")) {
      candidates.add(explicitBucket.replace(".appspot.com", ".firebasestorage.app"));
    }
  }

  if (projectId) {
    candidates.add(`${projectId}.appspot.com`);
    candidates.add(`${projectId}.firebasestorage.app`);
  }

  return Array.from(candidates);
}

function getAdminApp() {
  if (app) {
    return app;
  }

  const bucketName = getStorageBucketCandidates()[0];

  app =
    getApps()[0] ||
    initializeApp({
      credential: cert(getServiceAccount()),
      storageBucket: bucketName
    });

  return app;
}

export function getAdminAuth() {
  if (!auth) {
    auth = getAuth(getAdminApp());
  }
  return auth;
}

export function getAdminDb() {
  if (!db) {
    db = getFirestore(getAdminApp());
  }
  return db;
}

export function getAdminStorage() {
  if (!storage) {
    storage = getStorage(getAdminApp());
  }
  return storage;
}


