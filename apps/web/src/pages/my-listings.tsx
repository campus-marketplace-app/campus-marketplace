import React from "react";
import type { SessionUser } from "../features/types";

type OutletContext = {
    user: SessionUser | null;
};

const MyListings = () => {
    return (
        <div>
            <h1>My Listings</h1>
        </div>
    );
};

export default MyListings;
