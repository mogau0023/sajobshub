import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

export const requireFirebaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const PROJECT_ID = process.env["FIREBASE_PROJECT_ID"] || "sajobshub-49a4c";
    const request = getRequest();

    if (!request?.headers) {
      throw new Error("Unauthorized: No request headers available");
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Unauthorized: No authorization header provided");
    }
    if (!authHeader.startsWith("Bearer ")) {
      throw new Error("Unauthorized: Only Bearer tokens are supported");
    }

    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      throw new Error("Unauthorized: No token provided");
    }

    let userId: string | null = null;
    let email: string | null = null;

    try {
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=AIzaSyB23OE4IFaKzDEPZKRSWGxguS2PfHb_nus`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: token }),
        },
      );
      if (!res.ok) throw new Error("Token verification failed");
      const body = await res.json();
      const user = body.users?.[0];
      if (!user) throw new Error("Invalid token");
      userId = user.localId;
      email = user.email || null;
    } catch {
      throw new Error("Unauthorized: Invalid token");
    }

    if (!userId) {
      throw new Error("Unauthorized: No user ID found in token");
    }

    return next({
      context: {
        userId,
        email,
        claims: { sub: userId, email },
      },
    });
  },
);
