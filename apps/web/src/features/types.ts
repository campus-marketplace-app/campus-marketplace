import type { getSessionFromTokens, getProfile} from "@campus-marketplace/backend";

export type SessionUser = Awaited<ReturnType<typeof getSessionFromTokens>>["user"];
export type UserProfile = Awaited<ReturnType<typeof getProfile>>;

export type OutletContext = {
    user: SessionUser | null;
    profile: UserProfile | null;
};
