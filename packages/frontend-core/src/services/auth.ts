import { apiUrl, apiFetch } from "./api";

export async function login(credentials?: { username: string; password: string }) {
    let res;
    if (credentials) {
        // Regular login
        res = await apiFetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...credentials })
        });
    } else {
        // Guest login
        res = await apiFetch("/api/auth/guest", { method: "POST" });
    }

    if (!res.ok) {
        throw new Error(`Login failed: ${res.status}`);
    }
}

export async function logout() {
    // Use sendBeacon for logout to ensure the request is sent even if the page is being unloaded
    try {
        navigator.sendBeacon(apiUrl('/api/auth/logout'));
    } catch {
        try {
            apiFetch("/api/auth/logout", { method: "POST", keepalive: true });
        } catch { /* ignore */ }
    }
}

export async function getProfile() {
    const res = await apiFetch("/api/auth/profile");

    if (!res.ok) {
        throw new Error(`Failed to fetch profile: ${res.status}`);
    }

    const { ok, message, user } = res;

    return user;
}

export default {
    login,
    logout,
    getProfile,
};