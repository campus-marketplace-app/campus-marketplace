import { useEffect, useState, type ChangeEvent } from "react";
import { useNavigate, useOutletContext, Link, useParams } from "react-router-dom";
import { getAvatarUrl } from "@campus-marketplace/backend";
import type { SessionUser } from "../features/types";
import { useProfile, useUpdateProfile, useUploadAvatar } from "../hooks/useProfile";
import { useListingsByUser } from "../hooks/useListings";
import { useConfirm } from "../contexts/ConfirmContext";
import { useDeactivateAccount } from "../hooks/useAccount";

type OutletContext = {
    user: SessionUser | null;
    onProfileSave?: () => void;
};

const xssRegex = /<[^>]*>|javascript\s*:|vbscript\s*:|data\s*:\s*text\/html|on[a-z]+\s*=/i;

export default function Profile() {
    const { user, onProfileSave } = useOutletContext<OutletContext>();
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [accountTitle, setAccountTitle] = useState("Student Account");
    const [displayName, setDisplayName] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("student@university.edu");
    const [bio, setBio] = useState("Buyer and seller on campus marketplace.");
    const [avatar, setAvatar] = useState<File | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string>("");
    const [nameError, setNameError] = useState("");
    const [bioError, setBioError] = useState("");
    const [avatarError, setAvatarError] = useState("");
    const [usernameError, setUsernameError] = useState("");
    const { userId: viewedUserId } = useParams<{ userId: string }>();
    const isOwner = !viewedUserId || viewedUserId === user?.id;

    const { data: userListings } = useListingsByUser(viewedUserId ?? user?.id);
    const listingStats = {
        draft: userListings?.filter((l) => l.status === "draft").length ?? 0,
        published: userListings?.filter((l) => l.status === "active").length ?? 0,
        total: userListings?.length ?? 0,
    };

    const { mutateAsync: updateProfileMutation } = useUpdateProfile();
    const { mutateAsync: uploadAvatarMutation } = useUploadAvatar();
    // Fetch the profile for whoever we're viewing (own profile or another user's).
    const { data: profileData } = useProfile(viewedUserId ?? user?.id);
    const { confirm, alert: showAlert } = useConfirm();
    const { mutateAsync: deactivateAccountMutation, isPending: isDeactivating } = useDeactivateAccount();

    const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setAvatar(file);
        setAvatarUrl(file ? URL.createObjectURL(file) : "");
    };

    const validateUsername = () => {
        if (!displayName.trim()) {
            setUsernameError("Username is required");
            return false;
        }
        if (displayName.trim().length > 30) {
            setUsernameError("Username must be 30 characters or less");
            return false;
        }
        if (xssRegex.test(displayName)) {
            setUsernameError("Username contains potentially unsafe content");
            return false;
        }
        setUsernameError("");
        return true;
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

    // Populate form fields whenever the cached profile data loads or changes.
    // setState calls here are intentional — syncing server data into local form state.
    useEffect(() => {
        if (!profileData) return;

        /* eslint-disable react-hooks/set-state-in-effect */
        if (profileData.first_name) setFirstName(profileData.first_name);
        if (profileData.last_name) setLastName(profileData.last_name);
        if (!profileData.first_name && !profileData.last_name && profileData.display_name) {
            const parts = profileData.display_name.trim().split(/\s+/);
            setFirstName(parts[0] ?? "");
            setLastName(parts.slice(1).join(" "));
        }

        if (profileData.display_name) setDisplayName(profileData.display_name);
        if (profileData.bio !== null) setBio(profileData.bio);
        if (profileData.avatar_path !== null) {
            setAvatarUrl(`${getAvatarUrl(profileData.avatar_path)}?t=${Date.now()}`);
        }
        if (profileData.account_type === "student") {
            setAccountTitle("Student");
        } else if (profileData.account_type === "business") {
            setAccountTitle("Business");
        }
        /* eslint-enable react-hooks/set-state-in-effect */
    }, [profileData]);

    useEffect(() => {
        /* eslint-disable-next-line react-hooks/set-state-in-effect */
        if (!viewedUserId && user?.email) setEmail(user.email);
    }, [user, viewedUserId]);

    const saveProfile = async () => {
        if (!user) return;

        if (!isEditing) {
            setIsEditing(true);
            return;
        }

        const isUsernameValid = validateUsername();
        const isNameValid = validateName();
        const isBioValid = validateBio(bio);
        const isAvatarValid = validateAvatar(avatar);
        if (!isUsernameValid || !isNameValid || !isBioValid || !isAvatarValid) return;

        try {
            let avatarPath: string | undefined;

            if (avatar) {
                const updatedProfile = await uploadAvatarMutation({ userId: user.id, file: avatar, contentType: avatar.type });
                avatarPath = updatedProfile.avatar_path ?? undefined;
                if (updatedProfile.avatar_path) {
                    setAvatarUrl(`${getAvatarUrl(updatedProfile.avatar_path)}?t=${Date.now()}`);
                }
            }

            await updateProfileMutation({
                userId: user.id,
                updates: {
                    display_name: displayName,
                    first_name: firstName.trim() || null,
                    last_name: lastName.trim() || null,
                    bio,
                    ...(avatarPath ? { avatar_path: avatarPath } : {}),
                },
            });
        } catch (error) {
            console.error("Failed to save profile:", error);
            await showAlert("Error", "Failed to save profile. Please try again.");
            return;
        }

        setIsEditing(false);
        onProfileSave?.();
    };

    const handleDeactivate = async () => {
        if (!user) return;
        const accessToken = localStorage.getItem('access_token');
        const refreshToken = localStorage.getItem('refresh_token');
        if (!accessToken || !refreshToken) return;

        const confirmed = await confirm(
            'Deactivate Your Account',
            'Are you sure you want to deactivate your account?\n\n' +
            'Your listings will be hidden and you will not be able to log in. ' +
            'Contact support to restore access.',
            'Deactivate',
        );
        if (!confirmed) return;

        try {
            await deactivateAccountMutation({ userId: user.id, accessToken, refreshToken });
        } catch (error) {
            console.error('Failed to deactivate account:', error);
        }
    };

    const hasValidationErrors = Boolean(usernameError || nameError || bioError || avatarError);
    const isSaveDisabled = isEditing && hasValidationErrors;

    if (!user) {
        return (
            <div className="flex h-full min-h-[calc(100vh-64px)] w-full items-center justify-center bg-black/50">
                <div className="mx-auto w-full max-w-md rounded-xl p-8 shadow-lg" style={{ backgroundColor: "var(--color-surface)" }}>
                    <h2 className="mb-4 text-center text-2xl font-bold" style={{ color: "var(--color-text)" }}>Sign in required</h2>
                    <p className="mb-6 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
                        Please sign in to view and edit your profile.
                    </p>
                    <Link
                        to="/login"
                        className="block rounded-lg px-4 py-2 text-center font-semibold"
                        style={{ backgroundColor: "var(--color-primary)", color: "var(--color-text-on-primary)" }}
                    >
                        Go to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/45" onClick={() => navigate(-1)} />

            <section className="relative z-10 w-full p-4 sm:p-6">
                <div className="mx-auto max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border bg-[var(--color-secondary)] shadow-xl" style={{ borderColor: "var(--color-border)" }}>
                    <div className="flex items-start justify-between gap-4 p-5 sm:p-6">
                        <div>
                            <h1 className="text-4xl font-semibold text-[var(--color-text)]">Profile</h1>
                            <p className="text-sm text-[var(--color-text-muted)]">Manage your account information</p>
                        </div>
                        {isOwner && (
                            <button
                                type="button"
                                onClick={saveProfile}
                                disabled={isSaveDisabled}
                                className={`rounded-[var(--radius-sm)] px-4 py-2 text-sm font-semibold transition ${
                                    isSaveDisabled
                                        ? "cursor-not-allowed bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]"
                                        : "bg-[var(--color-primary)] text-[var(--color-text-on-primary)] hover:opacity-90"
                                }`}
                            >
                                {isEditing ? "Save Profile" : "Edit Profile"}
                            </button>
                        )}
                    </div>

                    <div className="h-18 bg-[var(--color-primary)] sm:h-20" />

                    <div className="relative px-5 pb-6 sm:px-6 sm:pb-7">
                        <div className="-mt-10 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-[var(--color-secondary)] bg-[var(--color-surface)] shadow-sm sm:h-24 sm:w-24">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                            ) : (
                                <svg viewBox="0 0 24 24" className="h-10 w-10 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                                    <circle cx="12" cy="8" r="4" />
                                    <path d="M4 20c0-4.2 3.6-6 8-6s8 1.8 8 6" />
                                </svg>
                            )}
                        </div>

                        {isEditing && (
                            <div className="mt-3">
                                <label className="inline-flex cursor-pointer rounded-[var(--radius-sm)] border bg-[var(--color-background)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface)]" style={{ borderColor: "var(--color-border)" }}>
                                    Change avatar
                                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                                </label>
                            </div>
                        )}

                        {avatarError && <p className="mt-2 text-sm text-[var(--color-primary)]">{avatarError}</p>}

                        <div className="mt-4 flex gap-2">
                            <span className={`rounded-[var(--radius-sm)] px-3 py-1 text-sm font-medium ${accountTitle === "Student" ? "bg-[var(--color-primary)] text-[var(--color-text-on-primary)]" : "bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]"}`}>
                                Student
                            </span>
                            <span className={`rounded-[var(--radius-sm)] px-3 py-1 text-sm font-medium ${accountTitle === "Business" ? "bg-[var(--color-primary)] text-[var(--color-text-on-primary)]" : "bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]"}`}>
                                Business
                            </span>
                        </div>

                        <div className="mt-5 space-y-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Username</p>
                                    <input
                                        id="displayName"
                                        type="text"
                                        value={displayName}
                                        readOnly={!isEditing}
                                        onChange={(e) => { setDisplayName(e.target.value); setUsernameError(""); }}
                                        className="w-full rounded-[var(--radius-sm)] border bg-[var(--color-secondary)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none"
                                        style={{ borderColor: "var(--color-border)" }}
                                    />
                                </div>
                                <div>
                                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Email</p>
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        readOnly
                                        className="w-full rounded-[var(--radius-sm)] border bg-[var(--color-background)] px-3.5 py-2.5 text-sm text-[var(--color-text)] opacity-80 outline-none"
                                        style={{ borderColor: "var(--color-border)" }}
                                    />
                                </div>
                            </div>

                            {usernameError && <p className="text-xs text-[var(--color-primary)]">{usernameError}</p>}

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">First Name</p>
                                    <input
                                        id="firstName"
                                        type="text"
                                        value={firstName}
                                        readOnly={!isEditing}
                                        onChange={(e) => { setFirstName(e.target.value); setNameError(""); }}
                                        className="w-full rounded-[var(--radius-sm)] border bg-[var(--color-secondary)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none"
                                        style={{ borderColor: "var(--color-border)" }}
                                    />
                                </div>
                                <div>
                                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Last Name</p>
                                    <input
                                        id="lastName"
                                        type="text"
                                        value={lastName}
                                        readOnly={!isEditing}
                                        onChange={(e) => { setLastName(e.target.value); setNameError(""); }}
                                        className="w-full rounded-[var(--radius-sm)] border bg-[var(--color-secondary)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none"
                                        style={{ borderColor: "var(--color-border)" }}
                                    />
                                </div>
                            </div>

                            {nameError && <p className="text-xs text-[var(--color-primary)]">{nameError}</p>}

                            {/* Location — TODO: wire to backend before re-enabling
                            <div>
                                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Location</p>
                                <input
                                    id="location"
                                    type="text"
                                    value="Campus Center"
                                    readOnly
                                    className="w-full rounded-[var(--radius-sm)] border bg-[var(--color-background)] px-3.5 py-2.5 text-sm text-[var(--color-text)] opacity-80 outline-none"
                                    style={{ borderColor: "var(--color-border)" }}
                                />
                            </div>
                            */}

                            <div>
                                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Bio</p>
                                <textarea
                                    id="bio"
                                    rows={4}
                                    value={bio}
                                    readOnly={!isEditing}
                                    onChange={(e) => { setBio(e.target.value); validateBio(e.target.value); }}
                                    className="min-h-28 w-full resize-none rounded-[var(--radius-sm)] border bg-[var(--color-secondary)] px-3.5 py-2.5 text-sm text-[var(--color-text)] outline-none"
                                    placeholder="Tell us about yourself..."
                                    style={{ borderColor: "var(--color-border)" }}
                                />
                                {bioError && <p className="mt-1.5 text-xs text-[var(--color-primary)]">{bioError}</p>}
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-3 overflow-hidden rounded-[var(--radius-sm)] border" style={{ borderColor: "var(--color-border)" }}>
                            <div className="border-r px-3 py-4 text-center" style={{ borderColor: "var(--color-border)" }}>
                                <p className="text-3xl font-semibold text-[var(--color-text)]">{listingStats.draft}</p>
                                <p className="text-xs text-[var(--color-text-muted)]">Draft</p>
                            </div>
                            <div className="border-r px-3 py-4 text-center" style={{ borderColor: "var(--color-border)" }}>
                                <p className="text-3xl font-semibold text-[var(--color-text)]">{listingStats.published}</p>
                                <p className="text-xs text-[var(--color-text-muted)]">Published</p>
                            </div>
                            <div className="px-3 py-4 text-center">
                                <p className="text-3xl font-semibold text-[var(--color-text)]">{listingStats.total}</p>
                                <p className="text-xs text-[var(--color-text-muted)]">Total Listing</p>
                            </div>
                        </div>

                        <div className="mt-4">
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                className="rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-text-on-primary)] transition hover:bg-[var(--color-primary-dark)]"
                            >
                                Back
                            </button>
                        </div>

                        {isOwner && isEditing && (
                            <div className="mt-6 rounded-[var(--radius-sm)] border border-red-200 bg-red-50 p-4">
                                <p className="mb-1 text-sm font-semibold text-red-700">Danger Zone</p>
                                <p className="mb-3 text-xs text-red-600">
                                    Deactivating your account will hide your profile and all listings.
                                    You will be signed out immediately.
                                </p>
                                <button
                                    type="button"
                                    onClick={handleDeactivate}
                                    disabled={isDeactivating}
                                    className={`rounded-[var(--radius-sm)] px-4 py-2 text-sm font-semibold transition ${
                                        isDeactivating
                                            ? 'cursor-not-allowed bg-red-200 text-red-400'
                                            : 'bg-red-600 text-white hover:bg-red-700'
                                    }`}
                                >
                                    {isDeactivating ? 'Deactivating…' : 'Deactivate Account'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
