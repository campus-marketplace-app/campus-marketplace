import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { createListing, upsertItemDetails, upsertServiceDetails } from '@campus-marketplace/backend';
import type { ItemCondition } from '@campus-marketplace/backend';
import type { ListingType, SessionUser } from './types';

type FormProps = {
    showForm: boolean;
    user: SessionUser | null;
    onClose: () => void;
    onSubmitSuccess?: () => void;
};

const getCurrentDateTimeLocal = () => {
    const now = new Date();
    const timezoneOffsetMs = now.getTimezoneOffset() * 60 * 1000;
    return new Date(now.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
};

export default function Form({
    showForm,
    user,
    onClose,
    onSubmitSuccess,
}: FormProps) {
    const [listingTitle, setListingTitle] = useState('LISTINGS.title');
    const [listingPrice, setListingPrice] = useState(0);
    const [listingCategory, setListingCategory] = useState('');
    const [listingCondition, setListingCondition] = useState<ItemCondition>('good');
    const [listingDate, setListingDate] = useState(getCurrentDateTimeLocal);
    const [listingDescription, setListingDescription] = useState('LISTINGS.description');
    const [listingImageLabel, setListingImageLabel] = useState('picture of the product');
    const [durationMinutes] = useState(60);
    const [availableFrom] = useState(getCurrentDateTimeLocal);
    const [availableTo] = useState(getCurrentDateTimeLocal);
    const [listingQuantity, setListingQuantity] = useState(1);
    const [listingType] = useState<ListingType>('item');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleListingImageChange = (event: ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            setListingImageLabel(selectedFile.name);
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        setIsSubmitting(true);

        if (!user) {
            alert('You must be logged in to create a listing.');
            setIsSubmitting(false);
            return;
        }

        if(listingCategory === '') {
            alert('Please select a category for your listing.');
            setIsSubmitting(false);
            return;
        }

        try {
            const newlisting = await createListing({
                user_id: user.id,
                title: listingTitle,
                type: listingType,
                price: listingPrice,
                description: listingDescription,
                category_id: listingCategory,
                price_unit: '$',
            });

            console.log('Listing created successfully:', newlisting);

            if (listingType === 'item') {
                await upsertItemDetails(newlisting.id, user.id, {
                    quantity: listingQuantity,
                    condition: listingCondition,
                });
            } else if (listingType === 'service') {
                await upsertServiceDetails(newlisting.id, user.id, {
                    duration_minutes: durationMinutes,
                    price_unit: '',
                    available_from: availableFrom,
                    available_to: availableTo,
                });
            }
            onSubmitSuccess?.();
            setIsSubmitting(false);
            onClose();
        } catch (error) {
            console.error('Error creating listing:', error);
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;

        if (showForm) {
            document.body.style.overflow = 'hidden';
            setListingDate(getCurrentDateTimeLocal());
        }

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [showForm]);

    if (!showForm) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/50"
                onClick={() => {
                    if (!isSubmitting) {
                        onClose();
                    }
                }}
            />

            <div className="relative z-10 mx-4 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-sm bg-[#a50f1a] p-6 shadow-lg sm:p-10">
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="mx-auto w-full max-w-sm">
                        <label htmlFor="title" className="mb-2 block text-center text-sm font-semibold uppercase tracking-wide text-white">
                            Title
                        </label>
                        <div className="rounded-2xl bg-white px-4 py-3 text-center text-3xl">
                            <input
                                id="title"
                                type="text"
                                value={listingTitle}
                                onChange={(e) => setListingTitle(e.target.value)}
                                className="w-full bg-transparent text-center text-3xl outline-none placeholder:text-black"
                            />
                        </div>
                    </div>

                    <div className="grid gap-8 md:grid-cols-[1.1fr_1.4fr]">
                        <div>
                            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-white">Product Image</p>
                            <div className="flex min-h-72 flex-col items-center justify-center gap-4 bg-[#f1b7be] p-6 text-center text-sm uppercase text-black">
                                <span>{listingImageLabel}</span>
                                <label className="cursor-pointer rounded bg-white px-3 py-2 text-xs font-semibold text-black hover:bg-neutral-100">
                                    Choose Image
                                    <input type="file" accept="image/*" className="hidden" onChange={handleListingImageChange} />
                                </label>
                            </div>
                        </div>

                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="price" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-white">
                                        Price
                                    </label>
                                    <div className="relative rounded-xl bg-white">
                                        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-black">$</span>
                                        <input
                                            id="price"
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            value={listingPrice}
                                            onChange={(e) => setListingPrice(parseFloat(e.target.value))}
                                            className="w-full rounded-xl bg-transparent py-3 pl-7 pr-4 text-sm outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="category" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-white">
                                        Category
                                    </label>
                                    <select
                                        id="category"
                                        value={listingCategory}
                                        onChange={(e) => setListingCategory(e.target.value)}
                                        className="w-full overflow-y-auto rounded-xl bg-white px-4 py-3 text-sm outline-none"
                                        size={1}
                                    >
                                        <option value="">-- Select --</option>
                                        <option value="6a90f825-6c3c-4060-b5e1-ff394162bb6c">Furniture</option>
                                        <option value="716836e6-f8a2-4cba-aa63-36445e70496e">School Supplies</option>
                                        <option value="854c925a-84f6-4280-9c9e-b1452167bb33">Free Stuff</option>
                                        <option value="95fe7a36-cb29-4c97-9a4d-56dccc56a7de">Transportation</option>
                                        <option value="9f280f6c-d4f8-4178-8e61-059243d5c930">Clothing</option>
                                        <option value="b87122bf-36dc-418c-a489-cb8ad0497f34">Electronics</option>
                                        <option value="be4cc965-718d-4e7d-939f-9ace4dcc837c">Sports & Fitness</option>
                                        <option value="cf2121d7-22b7-4e87-ab1b-801d55ebd4fe">Services</option>
                                        <option value="dc2b319a-1068-4b06-bcb3-11c1f3dd3fa2">Textbooks</option>
                                        <option value="744ab09f-350d-4f75-8b4a-cb84016545ef">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="condition" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-white">
                                        Condition
                                    </label>
                                    <select
                                        id="condition"
                                        value={listingCondition}
                                        onChange={(e) => setListingCondition(e.target.value as ItemCondition)}
                                        className="w-full rounded-xl bg-white px-4 py-3 text-sm outline-none placeholder:text-black"
                                    >
                                        <option value="new">New</option>
                                        <option value="like_new">Like New</option>
                                        <option value="good">Good</option>
                                        <option value="fair">Fair</option>
                                        <option value="poor">Poor</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="date" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-white">
                                        Date
                                    </label>
                                    <input
                                        id="date"
                                        type="datetime-local"
                                        readOnly={true}
                                        value={listingDate}
                                        className="w-full rounded-xl bg-white px-4 py-3 text-sm outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="quantity" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-white">
                                    Quantity
                                </label>
                                <input
                                    id="quantity"
                                    type="number"
                                    value={listingQuantity}
                                    onChange={(e) => setListingQuantity(parseInt(e.target.value, 10))}
                                    className="w-full rounded-xl bg-white px-4 py-3 text-sm outline-none placeholder:text-black"
                                    min={1}
                                    max={99}
                                />
                            </div>

                            <div>
                                <label htmlFor="description" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-white">
                                    Description
                                </label>
                                <textarea
                                    id="description"
                                    rows={5}
                                    value={listingDescription}
                                    onChange={(e) => setListingDescription(e.target.value)}
                                    className="w-full resize-none rounded-2xl bg-white px-4 py-4 text-sm outline-none placeholder:text-black"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-8">
                        <button
                            type="button"
                            disabled={isSubmitting}
                            className="bg-[#f1b7be] px-8 py-2 text-2xl text-black transition hover:bg-white disabled:cursor-not-allowed disabled:bg-gray-400 disabled:text-gray-700 disabled:hover:bg-gray-400"
                            onClick={onClose}
                        >
                            back
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-[#f1b7be] px-8 py-2 text-2xl text-black transition hover:bg-white disabled:cursor-not-allowed disabled:bg-gray-400 disabled:text-gray-700 disabled:hover:bg-gray-400"
                        >
                            Save draft
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
