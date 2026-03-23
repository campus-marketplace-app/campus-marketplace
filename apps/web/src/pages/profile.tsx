import { useEffect, useState, type ChangeEvent } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { getProfile, updateProfile } from "@campus-marketplace/backend";
import type { SessionUser } from "../features/types";

type OutletContext = {
    user: SessionUser | null;
};

const xssRegex = /<[^>]*>|javascript\s*:|vbscript\s*:|data\s*:\s*text\/html|on[a-z]+\s*=/i;

export default function Profile() {
    const { user } = useOutletContext<OutletContext>();
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [accountTitle, setAccountTitle] = useState("Student Account");
    const [name, setName] = useState("Campus User");
    const [email, setEmail] = useState("student@university.edu");
    const [bio, setBio] = useState("Buyer and seller on campus marketplace.");
    const [avatar, setAvatar] = useState("profile picture");
    const [nameError, setNameError] = useState("");
    const [bioError, setBioError] = useState("");
    const [avatarError, setAvatarError] = useState("");

    const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            setAvatar(selectedFile.name);
            validateAvatar(selectedFile.name);
        }
    };

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

    const validateAvatar = (value: string) => {
        if (value.trim() === "") {
            setAvatarError("Avatar cannot be empty");
            return false;
        }

        if (xssRegex.test(value)) {
            setAvatarError("Avatar contains potentially unsafe content");
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
                setAvatar(profile.avatar_path);
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
                await updateProfile(user.id, {
                    display_name: name,
                    bio: bio,
                    avatar_path: avatar,
                });
            } catch (error) {
                console.error("Failed to save profile:", error);
            }
            setIsEditing(false);
        }
    };


    useEffect(() => {
        if (!user?.id) {
            return;
        }

        if (user.email) {
            setEmail(user.email);
        }

        void loadProfile(user.id);
    }, [user]);


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-gray-600/55" onClick={() => navigate(-1)} />

            <section className="relative z-10 w-full p-6 sm:p-8">
                <div className="overflow-y-auto mx-auto w-full max-w-3xl rounded-sm bg-[#a50f1a] p-6 shadow-lg sm:p-10">
                    <div className="space-y-8">
                        <div className="mx-auto w-full max-w-sm">
                            <p className="mb-2 text-center text-sm font-semibold uppercase tracking-wide text-white">Profile</p>
                            <input
                                id="accountTitle"
                                type="text"
                                value={accountTitle}
                                readOnly={!isEditing}
                                onChange={(e) => setAccountTitle(e.target.value)}
                                className="w-full rounded-2xl bg-white px-4 py-3 text-center text-3xl text-black outline-none"
                            />
                        </div>

                        <div className="grid gap-8 md:grid-cols-[1fr_1.3fr]">
                            <div>
                                <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-white">Avatar</p>
                                <div className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-xl bg-[#f1b7be] p-6 text-center text-sm uppercase text-black">
                                    <span>{avatar}</span>
                                    {isEditing && (
                                        <label className="cursor-pointer rounded bg-white px-3 py-2 text-xs font-semibold text-black hover:bg-neutral-100">
                                            Choose Image
                                            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                                        </label>
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
                                className="bg-[#f1b7be] px-8 py-2 text-2xl text-black transition hover:bg-white"
                                onClick={() => navigate(-1)}
                            >
                                back
                            </button>
                            <button
                                type="button"
                                onClick={() => saveProfile()}
                                disabled={Boolean(nameError || bioError || avatarError)}
                                className="bg-[#f1b7be] px-8 py-2 text-2xl text-black transition hover:bg-white"
                            >
                                {isEditing ? "save" : "edit"}
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}