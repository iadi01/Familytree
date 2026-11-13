import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDoc,
  updateDoc,
  deleteField,
} from "firebase/firestore";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Safe singleton initialization
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);

const PHOTOS_COLLECTION = "family_photos";
const CHILDREN_DOC_REF = () => doc(db, "family_data", "children");
const BRANCHES_DOC_REF = () => doc(db, "family_data", "custom_branches");
const DELETED_DOC_REF = () => doc(db, "family_data", "deleted_ids");

/**
 * Save a family member's photo directly into Firestore.
 */
export async function uploadFamilyPhoto(memberId: string, base64Photo: string): Promise<string> {
  const photoDocRef = doc(db, PHOTOS_COLLECTION, memberId);
  await setDoc(photoDocRef, {
    photo: base64Photo,
    updatedAt: Date.now(),
  });
  return base64Photo;
}

/**
 * Remove/reset custom photo for a family member
 */
export async function removeFamilyPhoto(memberId: string): Promise<void> {
  const photoDocRef = doc(db, PHOTOS_COLLECTION, memberId);
  await deleteDoc(photoDocRef);
}

/**
 * Real-time listener for all family photos across all devices
 */
export function subscribeToPhotos(
  onUpdate: (photos: Record<string, string>) => void,
): () => void {
  return onSnapshot(
    collection(db, PHOTOS_COLLECTION),
    (snapshot) => {
      const photos: Record<string, string> = {};
      snapshot.forEach((d) => {
        const data = d.data();
        if (data && typeof data.photo === "string") {
          photos[d.id] = data.photo;
        }
      });
      onUpdate(photos);
    },
    (err) => {
      console.error("Firestore photos listener error:", err);
    },
  );
}

export type CustomChild = {
  id: string;
  name: string;
  relation: string;
  img?: string;
};

export type CustomBranch = {
  id: string;
  name: string;
  spouse?: string;
  relation: string;
  img?: string;
};

/**
 * Real-time listener for custom added children
 */
export function subscribeToChildren(
  onUpdate: (childrenMap: Record<string, CustomChild[]>) => void,
): () => void {
  return onSnapshot(
    CHILDREN_DOC_REF(),
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Record<string, any>;
        const result: Record<string, CustomChild[]> = {};
        for (const [key, value] of Object.entries(data)) {
          if (key !== "updatedAt" && Array.isArray(value)) {
            result[key] = value as CustomChild[];
          }
        }
        onUpdate(result);
      } else {
        onUpdate({});
      }
    },
    (err) => {
      console.error("Firestore children listener error:", err);
    },
  );
}

/**
 * Add a custom child under a parent branch and save to Firestore
 */
export async function saveCustomChild(
  parentId: string,
  child: CustomChild,
): Promise<void> {
  const docSnap = await getDoc(CHILDREN_DOC_REF());
  const existing = docSnap.exists() ? (docSnap.data()[parentId] as CustomChild[]) || [] : [];
  const updated = [...existing.filter(c => c.id !== child.id), child];

  await setDoc(
    CHILDREN_DOC_REF(),
    {
      [parentId]: updated,
      updatedAt: Date.now(),
    },
    { merge: true },
  );
}

/**
 * Remove a custom child under a parent branch
 */
export async function removeCustomChild(
  parentId: string,
  childId: string,
): Promise<void> {
  const docSnap = await getDoc(CHILDREN_DOC_REF());
  if (docSnap.exists()) {
    const existing = (docSnap.data()[parentId] as CustomChild[]) || [];
    const updated = existing.filter(c => c.id !== childId);
    await setDoc(
      CHILDREN_DOC_REF(),
      {
        [parentId]: updated,
        updatedAt: Date.now(),
      },
      { merge: true },
    );
  }
}

/**
 * Real-time listener for custom added family branches/couples
 */
export function subscribeToCustomBranches(
  onUpdate: (branches: CustomBranch[]) => void,
): () => void {
  return onSnapshot(
    BRANCHES_DOC_REF(),
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        onUpdate((data?.branches as CustomBranch[]) || []);
      } else {
        onUpdate([]);
      }
    },
    (err) => {
      console.error("Firestore branches listener error:", err);
    },
  );
}

/**
 * Add a new custom family branch (couple)
 */
export async function saveCustomBranch(branch: CustomBranch): Promise<void> {
  const docSnap = await getDoc(BRANCHES_DOC_REF());
  const existing = docSnap.exists() ? (docSnap.data().branches as CustomBranch[]) || [] : [];
  const updated = [...existing.filter(b => b.id !== branch.id), branch];

  await setDoc(
    BRANCHES_DOC_REF(),
    {
      branches: updated,
      updatedAt: Date.now(),
    },
    { merge: true },
  );
}

/**
 * Remove a custom family branch
 */
export async function removeCustomBranch(branchId: string): Promise<void> {
  const docSnap = await getDoc(BRANCHES_DOC_REF());
  if (docSnap.exists()) {
    const existing = (docSnap.data().branches as CustomBranch[]) || [];
    const updated = existing.filter(b => b.id !== branchId);
    await setDoc(
      BRANCHES_DOC_REF(),
      {
        branches: updated,
        updatedAt: Date.now(),
      },
      { merge: true },
    );
  }
}

/**
 * Real-time listener for deleted member IDs (both default and custom)
 */
export function subscribeToDeletedIds(
  onUpdate: (deletedIds: Set<string>) => void,
): () => void {
  return onSnapshot(
    DELETED_DOC_REF(),
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const set = new Set<string>();
        for (const [key, value] of Object.entries(data)) {
          if (key !== "updatedAt" && value === true) {
            set.add(key);
          }
        }
        onUpdate(set);
      } else {
        onUpdate(new Set());
      }
    },
    (err) => {
      console.error("Firestore deleted_ids listener error:", err);
    },
  );
}

/**
 * Permanently mark a member or child as deleted
 */
export async function markMemberDeleted(memberId: string): Promise<void> {
  await setDoc(
    DELETED_DOC_REF(),
    {
      [memberId]: true,
      updatedAt: Date.now(),
    },
    { merge: true },
  );
  // Also clean up photo if exists
  await removeFamilyPhoto(memberId);
}

/**
 * Restore a deleted member if needed
 */
export async function restoreMember(memberId: string): Promise<void> {
  await updateDoc(DELETED_DOC_REF(), {
    [memberId]: deleteField(),
    updatedAt: Date.now(),
  });
}
