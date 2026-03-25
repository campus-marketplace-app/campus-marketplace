import type { getSessionFromTokens } from "@campus-marketplace/backend";

export type SessionUser = Awaited<ReturnType<typeof getSessionFromTokens>>["user"];

export type OutletContext = {
    user: SessionUser | null;
};
