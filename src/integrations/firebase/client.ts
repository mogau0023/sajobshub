import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  getIdToken,
  type Auth,
  type User,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAt,
  startAfter,
  or,
  and,
  getCountFromServer,
  documentId,
  type Firestore,
  type CollectionReference,
  type QueryConstraint,
  type QueryCompositeFilterConstraint,
  type DocumentData,
  type DocumentReference,
} from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

export type AppRole = "admin" | "user";

export type JobData = Omit<Job, "id">;
export type ContactMessageData = Omit<ContactMessage, "id">;
export type JobReportData = Omit<JobReport, "id">;
export type PageEventData = Omit<PageEvent, "id">;
export type UserRoleData = Omit<UserRole, "id">;

export type Job = {
  id: string;
  slug: string;
  title: string;
  company: string;
  company_logo_url: string;
  category: string;
  province: string;
  city: string;
  location: string;
  employment_type: string;
  experience_level: string;
  education_requirement: string;
  salary: string;
  salary_min: number | null;
  salary_max: number | null;
  reference_number: string;
  posted_at: string;
  closing_date: string | null;
  description: string;
  responsibilities: string;
  requirements: string;
  qualifications: string;
  additional_information: string;
  how_to_apply: string;
  application_method: string;
  application_email: string;
  application_url: string;
  source_url: string;
  featured: boolean;
  urgent: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export type ContactMessage = {
  id: string;
  created_at: string;
  email: string;
  enquiry_type: string;
  message: string;
  name: string;
  subject: string;
};

export type JobReport = {
  id: string;
  created_at: string;
  details: string;
  job_id: string | null;
  reason: string;
  reporter_email: string;
};

export type PageEvent = {
  id: string;
  category: string;
  created_at: string;
  event_type: "page_view" | "job_view" | "apply_click";
  job_id: string | null;
  path: string;
  province: string;
  referrer: string;
  session_id: string;
  visitor_hash: string;
};

export type UserRole = {
  id: string;
  created_at: string;
  role: AppRole;
  user_id: string;
};

const firebaseConfig = {
  apiKey: "AIzaSyB23OE4IFaKzDEPZKRSWGxguS2PfHb_nus",
  authDomain: "sajobshub-49a4c.firebaseapp.com",
  projectId: "sajobshub-49a4c",
  storageBucket: "sajobshub-49a4c.firebasestorage.app",
  messagingSenderId: "201503131624",
  appId: "1:201503131624:web:ab24d60e09d07fd207c65d",
  measurementId: "G-7582XX6EH4",
};

function getFirebaseApp(): FirebaseApp {
  if (getApps().length === 0) {
    return initializeApp(firebaseConfig);
  }
  return getApp();
}

let _app: FirebaseApp | undefined;
let _auth: Auth | undefined;
let _db: Firestore | undefined;
let _storage: FirebaseStorage | undefined;

function app() {
  if (!_app) _app = getFirebaseApp();
  return _app;
}

export function fbAuth(): Auth {
  if (!_auth) _auth = getAuth(app());
  return _auth;
}

export function fbDb(): Firestore {
  if (!_db) _db = getFirestore(app());
  return _db;
}

export function fbStorage(): FirebaseStorage {
  if (!_storage) _storage = getStorage(app());
  return _storage;
}

export type JobsCollection = CollectionReference<JobData>;
export const jobsCol = () => collection(fbDb(), "jobs") as JobsCollection;

export type ContactMessagesCollection = CollectionReference<ContactMessageData>;
export const contactMessagesCol = () => collection(fbDb(), "contact_messages") as ContactMessagesCollection;

export type JobReportsCollection = CollectionReference<JobReportData>;
export const jobReportsCol = () => collection(fbDb(), "job_reports") as JobReportsCollection;

export type PageEventsCollection = CollectionReference<PageEventData>;
export const pageEventsCol = () => collection(fbDb(), "page_events") as PageEventsCollection;

export type UserRolesCollection = CollectionReference<UserRoleData>;
export const userRolesCol = () => collection(fbDb(), "user_roles") as UserRolesCollection;

export async function getCurrentUser(): Promise<User | null> {
  const auth = fbAuth();
  if (auth.currentUser) return auth.currentUser;
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user);
    });
  });
}

export async function getIdTokenString(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return getIdToken(user);
}

export async function isUserAdmin(userId: string): Promise<boolean> {
  const roleQuery = query(
    userRolesCol(),
    where("user_id", "==", userId),
    where("role", "==", "admin"),
    limit(1),
  );
  const snap = await getDocs(roleQuery);
  return !snap.empty;
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  return isUserAdmin(user.uid);
}

export {
  signInWithEmailAndPassword as fbSignIn,
  createUserWithEmailAndPassword as fbSignUp,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthChanged,
  doc as fbDoc,
  getDoc as fbGetDoc,
  getDocs as fbGetDocs,
  setDoc as fbSetDoc,
  addDoc as fbAddDoc,
  updateDoc as fbUpdateDoc,
  deleteDoc as fbDeleteDoc,
  query as fbQuery,
  where as fbWhere,
  orderBy as fbOrderBy,
  limit as fbLimit,
  startAt as fbStartAt,
  startAfter as fbStartAfter,
  or as fbOr,
  and as fbAnd,
  getCountFromServer as fbGetCount,
  documentId as fbDocumentId,
  type QueryConstraint,
  type QueryCompositeFilterConstraint,
  type DocumentData,
  type DocumentReference,
};
