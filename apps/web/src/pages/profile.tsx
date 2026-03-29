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
    const [name, setName] = useState("Campus User");
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
    }

    const validateName = (value: string) => {
        if (value.trim() === "") {
            setNameError("Name cannot be empty");
            return false;
        }

        if (xssRegex.test(value)) {
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

        if (value && xssRegex.test(value.name)) {
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

            setName(profile.display_name);
            if (profile.bio !== null) {
                setBio(profile.bio);
            }
            if (profile.avatar_path !== null) {
                setAvatarUrl(`${getAvatarUrl(profile.avatar_path)}?t=${Date.now()}`);
            }
            if (profile.account_type === 'student') {
                setAccountTitle("Student");
            } else if (profile.account_type === 'business') {
                setAccountTitle("Business");
            }
        } catch (error) {
            console.error("Failed to load profile:", error);
        }
    };

    const saveProfile = async () => {
        if (!user) {
            return;
        }

        if (isEditing === false) {
            setIsEditing(true);
        }
        else {
            const isNameValid = validateName(name);
            const isBioValid = validateBio(bio);
            const isAvatarValid = validateAvatar(avatar);

            if (!isNameValid || !isBioValid || !isAvatarValid) {
                return;
            }

            try {
                let avatarPath: string | undefined;

                if (avatar) {
                    const updatedProfile = await uploadAvatar(user.id, avatar, avatar.type);
                    avatarPath = updatedProfile.avatar_path ?? undefined;

                    if (updatedProfile.avatar_path) {
                        setAvatarUrl(`${getAvatarUrl(updatedProfile.avatar_path)}?t=${Date.now()}`);
                    }
                }

                await updateProfile(user.id, {
                    display_name: name,
                    bio: bio,
                    ...(avatarPath ? { avatar_path: avatarPath } : {}),
                });
            } catch (error) {
                console.error("Failed to save profile:", error);
            }
            setIsEditing(false);
            setRefreshKey((prev) => prev + 1);
            onProfileSave?.();
        }
    };


    useEffect(() => {
        if (!user?.id) {
            return;
        }

        if (!viewedUserId && user.email) {
            setEmail(user.email);
        }

        void loadProfile(viewedUserId ?? user.id);
    }, [user, refreshKey, viewedUserId]);

    const hasValidationErrors = Boolean(nameError || bioError || avatarError);
    const isSaveDisabled = isEditing && hasValidationErrors;

    // Show sign-in prompt if user is not logged in.
    if (!user) {
        return (
            <div className="flex h-full min-h-[calc(100vh-64px)] w-full items-center justify-center bg-black/50">
                <div className="mx-auto w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
                    <h2 className="mb-4 text-2xl font-bold text-black">Sign In Required</h2>
                    <p className="mb-6 text-gray-700">
                        Please sign in to view and edit your profile.
                    </p>
                    <Link
                        to="/login"
                        className="inline-block w-full rounded bg-blue-600 px-4 py-2 text-center text-white hover:bg-blue-700 font-semibold"
                    >
                        Go to Log In
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
                            <p
                                id="accountTitle"
                                className="w-full rounded-2xl bg-white px-4 py-3 text-center text-3xl text-black outline-none"
                            >
                                {accountTitle}
                            </p>
                        </div>

                        <div className="grid gap-8 md:grid-cols-[1fr_1.3fr]">
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

                            <div className="space-y-5">
                                <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white">Name</p>
                                    <input
                                        id="name"
                                        type="text"
                                        value={name}
                                        readOnly={!isEditing}
                                        onChange={(e) => {
                                            setName(e.target.value);
                                            validateName(e.target.value);
                                        }}
                                        className="w-full rounded-xl bg-white px-4 py-3 text-sm text-black outline-none"
                                    />
                                    {nameError ? <p className="mt-2 text-xs text-white">{nameError}</p> : null}
                                </div>

                                <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white">Email</p>
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        readOnly={!isEditing}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full rounded-xl bg-white px-4 py-3 text-sm text-black outline-none"
                                    />
                                </div>

                                <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white">Bio</p>
                                    <textarea
                                        id="bio"
                                        rows={4}
                                        value={bio}
                                        readOnly={!isEditing}
                                        onChange={(e) => {
                                            setBio(e.target.value);
                                            validateBio(e.target.value);
                                        }}
                                        className="min-h-28 w-full resize-none rounded-2xl bg-white px-4 py-4 text-sm text-black outline-none"
                                    />
                                    {bioError ? <p className="mt-2 text-xs text-white">{bioError}</p> : null}
                                </div>
                            </div>
                        </div>

                        {avatarError ? <p className="text-sm text-white">{avatarError}</p> : null}

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
                                    onClick={() => saveProfile()}
                                    disabled={isSaveDisabled}
                                    className={`px-8 py-2 text-2xl text-black transition ${isSaveDisabled
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