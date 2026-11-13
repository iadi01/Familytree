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

export type TreeMeta = {
  id: string; // unique slug e.g. "sharma", "verma-family"
  name: string; // e.g. "Sharma Family Tree"
  rootName: string; // "Nana"
  rootSpouse?: string; // "Nani"
  rootRelation?: string; // "Grandparents" / "Dada & Dadi" / "Nana & Nani"
  createdAt: number;
};

const getChildrenDocRef = (treeId: string) =>
  treeId === "sharma"
    ? doc(db, "family_data", "children")
    : doc(db, "trees_data", `${treeId}_children`);

const getBranchesDocRef = (treeId: string) =>
  treeId === "sharma"
    ? doc(db, "family_data", "custom_branches")
    : doc(db, "trees_data", `${treeId}_branches`);

const getDeletedDocRef = (treeId: string) =>
  treeId === "sharma"
    ? doc(db, "family_data", "deleted_ids")
    : doc(db, "trees_data", `${treeId}_deleted_ids`);

/**
 * Save tree metadata
 */
export async function createOrUpdateTree(meta: TreeMeta): Promise<void> {
  const treeRef = doc(db, "trees_metadata", meta.id);
  await setDoc(treeRef, meta, { merge: true });
}

/**
 * Subscribe to all public / available trees
 */
export function subscribeToAllTrees(
  onUpdate: (trees: TreeMeta[]) => void,
): () => void {
  return onSnapshot(
    collection(db, "trees_metadata"),
    (snapshot) => {
      const trees: TreeMeta[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as TreeMeta;
        if (data && data.name) {
          trees.push(data);
        }
      });
      // Sort newest first
      trees.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      onUpdate(trees);
    },
    (err) => {
      console.error("Firestore trees_metadata listener error:", err);
    },
  );
}

/**
 * Subscribe to a specific tree's metadata
 */
export function subscribeToTreeMeta(
  treeId: string,
  onUpdate: (meta: TreeMeta | null) => void,
): () => void {
  const treeRef = doc(db, "trees_metadata", treeId);
  return onSnapshot(
    treeRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as TreeMeta);
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.error(`Firestore tree meta listener error for ${treeId}:`, err);
    },
  );
}

/**
 * Save a family member's photo directly into Firestore.
 */
export async function uploadFamilyPhoto(
  memberId: string,
  base64Photo: string,
  treeId: string = "sharma",
): Promise<string> {
  if (treeId === "sharma") {
    const photoDocRef = doc(db, "family_photos", memberId);
    await setDoc(photoDocRef, {
      photo: base64Photo,
      updatedAt: Date.now(),
    });
  } else {
    const photoDocRef = doc(db, "trees_photos", `${treeId}__${memberId}`);
    await setDoc(photoDocRef, {
      treeId,
      memberId,
      photo: base64Photo,
      updatedAt: Date.now(),
    });
  }
  return base64Photo;
}

/**
 * Remove/reset custom photo for a family member
 */
export async function removeFamilyPhoto(
  memberId: string,
  treeId: string = "sharma",
): Promise<void> {
  if (treeId === "sharma") {
    const photoDocRef = doc(db, "family_photos", memberId);
    await deleteDoc(photoDocRef);
  } else {
    const photoDocRef = doc(db, "trees_photos", `${treeId}__${memberId}`);
    await deleteDoc(photoDocRef);
  }
}

/**
 * Real-time listener for all family photos across all devices
 */
export function subscribeToPhotos(
  onUpdate: (photos: Record<string, string>) => void,
  treeId: string = "sharma",
): () => void {
  if (treeId === "sharma") {
    return onSnapshot(
      collection(db, "family_photos"),
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

  // Multi-tree photos
  return onSnapshot(
    collection(db, "trees_photos"),
    (snapshot) => {
      const photos: Record<string, string> = {};
      const prefix = `${treeId}__`;
      snapshot.forEach((d) => {
        if (d.id.startsWith(prefix)) {
          const rawMemberId = d.id.slice(prefix.length);
          const data = d.data();
          if (data && typeof data.photo === "string") {
            photos[rawMemberId] = data.photo;
          }
        }
      });
      onUpdate(photos);
    },
    (err) => {
      console.error(`Firestore tree photos listener error for ${treeId}:`, err);
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
  children?: CustomChild[];
};

/**
 * Real-time listener for custom added children
 */
export function subscribeToChildren(
  onUpdate: (childrenMap: Record<string, CustomChild[]>) => void,
  treeId: string = "sharma",
): () => void {
  return onSnapshot(
    getChildrenDocRef(treeId),
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
      console.error(`Firestore children listener error for ${treeId}:`, err);
    },
  );
}

/**
 * Add a custom child under a parent branch and save to Firestore
 */
export async function saveCustomChild(
  parentId: string,
  child: CustomChild,
  treeId: string = "sharma",
): Promise<void> {
  const targetRef = getChildrenDocRef(treeId);
  const docSnap = await getDoc(targetRef);
  const existing = docSnap.exists()
    ? (docSnap.data()[parentId] as CustomChild[]) || []
    : [];
  const updated = [...existing.filter((c) => c.id !== child.id), child];

  await setDoc(
    targetRef,
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
  treeId: string = "sharma",
): Promise<void> {
  const targetRef = getChildrenDocRef(treeId);
  const docSnap = await getDoc(targetRef);
  if (docSnap.exists()) {
    const existing = (docSnap.data()[parentId] as CustomChild[]) || [];
    const updated = existing.filter((c) => c.id !== childId);
    await setDoc(
      targetRef,
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
  treeId: string = "sharma",
): () => void {
  return onSnapshot(
    getBranchesDocRef(treeId),
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        onUpdate((data?.branches as CustomBranch[]) || []);
      } else {
        onUpdate([]);
      }
    },
    (err) => {
      console.error(`Firestore branches listener error for ${treeId}:`, err);
    },
  );
}

/**
 * Add a new custom family branch (couple or generation 2 child)
 */
export async function saveCustomBranch(
  branch: CustomBranch,
  treeId: string = "sharma",
): Promise<void> {
  const targetRef = getBranchesDocRef(treeId);
  const docSnap = await getDoc(targetRef);
  const existing = docSnap.exists()
    ? (docSnap.data().branches as CustomBranch[]) || []
    : [];
  const updated = [...existing.filter((b) => b.id !== branch.id), branch];

  await setDoc(
    targetRef,
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
export async function removeCustomBranch(
  branchId: string,
  treeId: string = "sharma",
): Promise<void> {
  const targetRef = getBranchesDocRef(treeId);
  const docSnap = await getDoc(targetRef);
  if (docSnap.exists()) {
    const existing = (docSnap.data().branches as CustomBranch[]) || [];
    const updated = existing.filter((b) => b.id !== branchId);
    await setDoc(
      targetRef,
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
  treeId: string = "sharma",
): () => void {
  return onSnapshot(
    getDeletedDocRef(treeId),
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
      console.error(`Firestore deleted_ids listener error for ${treeId}:`, err);
    },
  );
}

/**
 * Permanently mark a member or child as deleted
 */
export async function markMemberDeleted(
  memberId: string,
  treeId: string = "sharma",
): Promise<void> {
  const targetRef = getDeletedDocRef(treeId);
  await setDoc(
    targetRef,
    {
      [memberId]: true,
      updatedAt: Date.now(),
    },
    { merge: true },
  );
  // Also clean up photo if exists
  await removeFamilyPhoto(memberId, treeId);
}

/**
 * Restore a deleted member if needed
 */
export async function restoreMember(
  memberId: string,
  treeId: string = "sharma",
): Promise<void> {
  const targetRef = getDeletedDocRef(treeId);
  await updateDoc(targetRef, {
    [memberId]: deleteField(),
    updatedAt: Date.now(),
  });
}
