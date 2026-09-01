import { createMiddleware } from "@tanstack/react-start";
import { getIdTokenString } from "./client";

export const attachFirebaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const token = await getIdTokenString();
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);
