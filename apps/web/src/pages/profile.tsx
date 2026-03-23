import { useEffect, useState, type ChangeEvent } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { getProfile, updateProfile } from "@campus-marketplace/backend";
import type { SessionUser } from "../features/types";

type OutletContext = {
  user: SessionUser | null;
};

export default function Profile() {
    const { user } = useOutletContext<OutletContext>();
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [accountTitle, setAccountTitle] = useState("Student Account");
    const [name, setName] = useState("Campus User");
    const [email, setEmail] = useState("student@university.edu");
    const [bio, setBio] = useState("Buyer and seller on campus marketplace.");
    const [avatar, setAvatar] = useState("profile picture");

    const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            setAvatar(selectedFile.name);
        }
    };

    const loadProfile = async () => {
        try {
            const profile = await getProfile(user?.id || "");

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

    useEffect(() => {
        loadProfile();
    }, []);


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-gray-600/55" onClick={() => navigate(-1)} />

            <section className="relative z-10 w-full p-6 sm:p-8">
                <div className="mx-auto w-full max-w-3xl rounded-sm bg-[#a50f1a] p-6 shadow-lg sm:p-10">
                    <div className="space-y-8">
                        <div className="mx-auto w-full max-w-sm">
                            <p className="mb-2 text-center text-sm font-semibold uppercase tracking-wide text-white">Profile</p>
                            <input
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
                                        type="text"
                                        value={name}
                                        readOnly={!isEditing}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full rounded-xl bg-white px-4 py-3 text-sm text-black outline-none"
                                    />
                                </div>

                                <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white">Email</p>
                                    <input
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
                                        rows={4}
                                        value={bio}
                                        readOnly={!isEditing}
                                        onChange={(e) => setBio(e.target.value)}
                                        className="min-h-28 w-full resize-none rounded-2xl bg-white px-4 py-4 text-sm text-black outline-none"
                                    />
                                </div>
                            </div>
                        </div>

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
                                onClick={() => setIsEditing((prev) => !prev)}
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