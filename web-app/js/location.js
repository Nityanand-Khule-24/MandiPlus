// ============================================================
// MandiPlus - Location Service
// ============================================================

const LocationState = {
    latitude: null,
    longitude: null,
    accuracy: null,
    initialized: false,
    detecting: false
};


// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function getLocationButton() {
    return document.getElementById("locationButton");
}


// ------------------------------------------------------------
// Update Location Button
// ------------------------------------------------------------

function updateLocationButton(text, loading = false) {

    const button = getLocationButton();

    if (!button) {
        console.warn("[Location] #locationButton not found.");
        return;
    }

    button.innerHTML = loading
        ? `📍 ${text}`
        : `📍 ${text}`;
}


// ------------------------------------------------------------
// Location Success
// ------------------------------------------------------------

function handleLocationSuccess(position) {

    const { latitude, longitude, accuracy } = position.coords;

    LocationState.latitude = latitude;
    LocationState.longitude = longitude;
    LocationState.accuracy = accuracy;
    LocationState.detecting = false;

    console.log("[Location] Location detected successfully.");

    console.log("[Location] Latitude:", latitude);
    console.log("[Location] Longitude:", longitude);
    console.log("[Location] Accuracy:", accuracy, "meters");


    // For now, show a simple confirmation.
    updateLocationButton("Location detected");


    // Make location available to other MandiPlus modules.
    document.dispatchEvent(
        new CustomEvent("mandiplus:location-detected", {
            detail: {
                latitude,
                longitude,
                accuracy
            }
        })
    );
}


// ------------------------------------------------------------
// Location Error
// ------------------------------------------------------------

function handleLocationError(error) {

    LocationState.detecting = false;

    console.error(
        "[Location] Location detection failed:",
        error
    );


    let message = "Location unavailable";

    switch (error.code) {

        case error.PERMISSION_DENIED:
            message = "Location permission denied";
            break;

        case error.POSITION_UNAVAILABLE:
            message = "Location unavailable";
            break;

        case error.TIMEOUT:
            message = "Location request timed out";
            break;
    }


    updateLocationButton(message);


    document.dispatchEvent(
        new CustomEvent("mandiplus:location-error", {
            detail: {
                code: error.code,
                message
            }
        })
    );
}


// ------------------------------------------------------------
// Detect Location
// ------------------------------------------------------------

function detectLocation() {

    if (LocationState.detecting) {
        return;
    }


    if (!("geolocation" in navigator)) {

        console.error(
            "[Location] Geolocation is not supported."
        );

        updateLocationButton("Location not supported");

        return;
    }


    LocationState.detecting = true;

    updateLocationButton(
        "Detecting...",
        true
    );


    console.log(
        "[Location] Requesting user location..."
    );


    navigator.geolocation.getCurrentPosition(
        handleLocationSuccess,
        handleLocationError,
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        }
    );
}


// ------------------------------------------------------------
// Initialize
// ------------------------------------------------------------

function initialize() {

    if (LocationState.initialized) {
        return;
    }


    const button = getLocationButton();

    if (!button) {

        console.warn(
            "[Location] Location button not found."
        );

        return;
    }


    button.addEventListener(
        "click",
        detectLocation
    );


    LocationState.initialized = true;


    console.log(
        "[MandiPlus] Location service initialized."
    );
}


// ------------------------------------------------------------
// Public API
// ------------------------------------------------------------

window.MandiPlusLocation = {
    initialize,
    detectLocation,
    getState: () => ({ ...LocationState })
};