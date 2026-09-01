let _admin: typeof import("firebase-admin/app") | null = null;

function getCreds() {
  const serviceAccountBase64 = process.env["FIREBASE_SERVICE_ACCOUNT_BASE64"];
  if (serviceAccountBase64) {
    try {
      const raw = Buffer.from(serviceAccountBase64, "base64").toString("utf-8");
      return JSON.parse(raw);
    } catch {
      /* fall through */
    }
  }
  const projectId =
    process.env["FIREBASE_PROJECT_ID"] || process.env["GOOGLE_CLOUD_PROJECT"] || "sajobshub-49a4c";
  const clientEmail = process.env["FIREBASE_CLIENT_EMAIL"];
  const privateKey = process.env["FIREBASE_PRIVATE_KEY"]?.replace(/\\n/g, "\n");
  if (clientEmail && privateKey) {
    return {
      type: "service_account",
      project_id: projectId,
      private_key_id: process.env["FIREBASE_PRIVATE_KEY_ID"],
      private_key: privateKey,
      client_email: clientEmail,
      client_id: process.env["FIREBASE_CLIENT_ID"],
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(clientEmail)}`,
      universe_domain: "googleapis.com",
    };
  }
  return null;
}

export async function getFirebaseAdmin() {
  if (_admin) return _admin;
  try {
    const admin = await import("firebase-admin/app");
    const creds = getCreds();
    if (!admin.getApps().length) {
      if (creds) {
        const cert = (await import("firebase-admin/credential")).cert;
        admin.initializeApp({ credential: cert(creds) });
      } else {
        admin.initializeApp();
      }
    }
    _admin = admin;
    return _admin;
  } catch (err) {
    console.warn(
      "[Firebase Admin] init failed, falling back to client SDK:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

export async function verifyIdTokenServer(idToken: string) {
  const admin = await getFirebaseAdmin();
  if (!admin) {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=AIzaSyB23OE4IFaKzDEPZKRSWGxguS2PfHb_nus`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      },
    );
    if (!res.ok) throw new Error("Token verification failed");
    const body = await res.json();
    const user = body.users?.[0];
    if (!user) throw new Error("Invalid token");
    return { uid: user.localId, email: user.email || null };
  }
  const { getAuth } = await import("firebase-admin/auth");
  const decoded = await getAuth().verifyIdToken(idToken);
  return { uid: decoded.uid, email: decoded.email || null };
}
