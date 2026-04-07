import { useEffect, useState, type ChangeEvent } from "react";
import { useNavigate, useOutletContext, Link, useParams } from "react-router-dom";
import { getProfile, updateProfile, uploadAvatar, getAvatarUrl } from "@campus-marketplace/backend";
import type { SessionUser } from "../features/types";

type OutletContext = {
    user: SessionUser | null;
    onProfileSave?: () => void;
};

const xssRegex = /<[^>]*>|javascript\s*:|vbscript\s*:|data\s*:\s*text\/html|on[a-z]+\s*=/i;

export default function Profile() {
    const { user, onProfileSave } = useOutletContext<OutletContext>();
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [accountTitle, setAccountTitle] = useState("Student Account");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("student@university.edu");
    const [bio, setBio] = useState("Buyer and seller on campus marketplace.");
    const [avatar, setAvatar] = useState<File | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string>("");
    const [nameError, setNameError] = useState("");
    const [bioError, setBioError] = useState("");
    const [avatarError, setAvatarError] = useState("");
    const { userId: viewedUserId } = useParams<{ userId: string }>();
    const isOwner = !viewedUserId || viewedUserId === user?.id;

    const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setAvatar(file);
        setAvatarUrl(file ? URL.createObjectURL(file) : "");
    };

    const validateName = () => {
        if (!firstName.trim() && !lastName.trim()) {
            setNameError("First or last name is required");
            return false;
        }
        if (xssRegex.test(firstName) || xssRegex.test(lastName)) {
            setNameError("Name contains potentially unsafe content");
            return false;
        }
        setNameError("");
        return true;
    };

    const validateBio = (value: string) => {
        if (xssRegex.test(value)) {
            setBioError("Bio contains potentially unsafe content");
            return false;
        }
        setBioError("");
        return true;
    };

    const validateAvatar = (value: File | null) => {
        const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
        const minSizeInBytes = 10 * 1024; // 10KB

        if (!value) {
            setAvatarError("");
            return true;
        }
        if (xssRegex.test(value.name)) {
            setAvatarError("Avatar contains potentially unsafe content");
            return false;
        }
        if (!["image/png", "image/jpeg", "image/webp"].includes(value.type)) {
            setAvatarError("Avatar must be a PNG, JPG, JPEG, or WEBP file");
            return false;
        }
        if (value.size > maxSizeInBytes) {
            setAvatarError("Avatar file size must be less than 5MB");
            return false;
        }
        if (value.size < minSizeInBytes) {
            setAvatarError("Avatar file size must be greater than 10KB");
            return false;
        }
        setAvatarError("");
        return true;
    };

    const loadProfile = async (userId: string) => {
        try {
            const profile = await getProfile(userId);

            // Populate first/last name; fall back to splitting display_name for existing accounts.
            if (profile.first_name) setFirstName(profile.first_name);
            if (profile.last_name) setLastName(profile.last_name);
            if (!profile.first_name && !profile.last_name && profile.display_name) {
                const parts = profile.display_name.trim().split(/\s+/);
                setFirstName(parts[0] ?? "");
                setLastName(parts.slice(1).join(" "));
            }

            if (profile.bio !== null) setBio(profile.bio);
            if (profile.avatar_path !== null) {
                setAvatarUrl(`${getAvatarUrl(profile.avatar_path)}?t=${Date.now()}`);
            }
            if (profile.account_type === "student") {
                setAccountTitle("Student");
            } else if (profile.account_type === "business") {
                setAccountTitle("Business");
            }
        } catch (error) {
            console.error("Failed to load profile:", error);
        }
    };

    const saveProfile = async () => {
        if (!user) return;

        if (!isEditing) {
            setIsEditing(true);
            return;
        }

        const isNameValid = validateName();
        const isBioValid = validateBio(bio);
        const isAvatarValid = validateAvatar(avatar);
        if (!isNameValid || !isBioValid || !isAvatarValid) return;

        try {
            let avatarPath: string | undefined;

            if (avatar) {
                const updatedProfile = await uploadAvatar(user.id, avatar, avatar.type);
                avatarPath = updatedProfile.avatar_path ?? undefined;
                if (updatedProfile.avatar_path) {
                    setAvatarUrl(`${getAvatarUrl(updatedProfile.avatar_path)}?t=${Date.now()}`);
                }
            }

            const displayName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");

            await updateProfile(user.id, {
                display_name: displayName,
                first_name: firstName.trim() || null,
                last_name: lastName.trim() || null,
                bio,
                ...(avatarPath ? { avatar_path: avatarPath } : {}),
            });
        } catch (error) {
            console.error("Failed to save profile:", error);
        }

        setIsEditing(false);
        setRefreshKey((prev) => prev + 1);
        onProfileSave?.();
    };

    useEffect(() => {
        if (!user?.id) return;
        if (!viewedUserId && user.email) setEmail(user.email);
        void loadProfile(viewedUserId ?? user.id);
    }, [user, refreshKey, viewedUserId]);

    const hasValidationErrors = Boolean(nameError || bioError || avatarError);
    const isSaveDisabled = isEditing && hasValidationErrors;

    if (!user) {
        return (
            <div className="flex h-full min-h-[calc(100vh-64px)] w-full items-center justify-center bg-black/50">
                <div className="mx-auto w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
                    <h2 className="mb-4 text-center text-2xl font-bold text-black">Sign in required</h2>
                    <p className="mb-6 text-center text-gray-600">
                        Please sign in to view and edit your profile.
                    </p>
                    <Link
                        to="/login"
                        className="block rounded bg-[var(--color-primary)] px-4 py-2 text-center font-semibold text-[var(--color-text-on-primary)]"
                    >
                        Go to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-gray-600/55" onClick={() => navigate(-1)} />

            <section className="relative z-10 w-full p-6 sm:p-8">
                <div className="overflow-y-auto mx-auto w-full max-w-3xl rounded-sm bg-[var(--color-primary)] p-6 shadow-lg sm:p-10">
                    <div className="space-y-8">
                        <div className="mx-auto w-full max-w-sm">
                            <p className="mb-2 text-center text-sm font-semibold uppercase tracking-wide text-white">Profile</p>
                            <p className="w-full rounded-2xl bg-white px-4 py-3 text-center text-3xl text-black outline-none">
                                {accountTitle}
                            </p>
                        </div>

                        <div className="grid gap-8 md:grid-cols-[1fr_1.3fr]">
                            {/* Avatar */}
                            <div>
                                <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-white">Avatar</p>
                                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[var(--color-accent)] text-center text-sm uppercase text-black">
                                    <img src={avatarUrl || undefined} alt="Avatar" className="h-full w-full object-cover" />
                                    {isEditing && (
                                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                                            <label className="cursor-pointer rounded bg-white px-3 py-2 text-xs font-semibold text-black hover:bg-neutral-100">
                                                Choose Image
                                                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Fields */}
                            <div className="space-y-5">
                                {/* First + Last name */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white">First Name</p>
                                        <input
                                            id="firstName"
                                            type="text"
                                            value={firstName}
                                            readOnly={!isEditing}
                                            onChange={(e) => { setFirstName(e.target.value); setNameError(""); }}
                                            className="w-full rounded-xl bg-white px-4 py-3 text-sm text-black outline-none"
                                        />
                                    </div>
                                    <div>
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white">Last Name</p>
                                        <input
                                            id="lastName"
                                            type="text"
                                            value={lastName}
                                            readOnly={!isEditing}
                                            onChange={(e) => { setLastName(e.target.value); setNameError(""); }}
                                            className="w-full rounded-xl bg-white px-4 py-3 text-sm text-black outline-none"
                                        />
                                    </div>
                                </div>
                                {nameError && <p className="mt-1 text-xs text-white">{nameError}</p>}

                                {/* Email */}
                                <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white">Email</p>
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        readOnly
                                        className="w-full rounded-xl bg-white px-4 py-3 text-sm text-black outline-none opacity-70"
                                    />
                                </div>

                                {/* Bio */}
                                <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white">Bio</p>
                                    <textarea
                                        id="bio"
                                        rows={4}
                                        value={bio}
                                        readOnly={!isEditing}
                                        onChange={(e) => { setBio(e.target.value); validateBio(e.target.value); }}
                                        className="min-h-28 w-full resize-none rounded-2xl bg-white px-4 py-4 text-sm text-black outline-none"
                                    />
                                    {bioError && <p className="mt-2 text-xs text-white">{bioError}</p>}
                                </div>
                            </div>
                        </div>

                        {avatarError && <p className="text-sm text-white">{avatarError}</p>}

                        <div className="flex items-center justify-between pt-4">
                            <button
                                type="button"
                                className="bg-[var(--color-accent)] px-8 py-2 text-2xl text-black transition hover:bg-white"
                                onClick={() => navigate(-1)}
                            >
                                back
                            </button>
                            {isOwner && (
                                <button
                                    type="button"
                                    onClick={saveProfile}
                                    disabled={isSaveDisabled}
                                    className={`px-8 py-2 text-2xl text-black transition ${
                                        isSaveDisabled
                                            ? "cursor-not-allowed bg-neutral-400 text-neutral-700"
                                            : "bg-[var(--color-accent)] hover:bg-white"
                                    }`}
                                >
                                    {isEditing ? "save" : "edit"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
