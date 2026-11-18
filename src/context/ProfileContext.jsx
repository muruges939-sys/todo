import { useCallback, useEffect, useMemo, useState } from "react";
import { ProfileContext } from "./profileContextValue";

const PROFILE_KEY = "taskflow-profile";

function readProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
    if (saved && typeof saved.fullName === "string" && saved.fullName.trim()) {
      return {
        fullName: saved.fullName.trim(),
        displayName: typeof saved.displayName === "string" ? saved.displayName.trim() : "",
        photo: typeof saved.photo === "string" ? saved.photo : "",
        preferences: saved.preferences && typeof saved.preferences === "object" ? saved.preferences : {},
      };
    }

    return null;
  } catch (error) {
    console.error("Could not read the saved profile.", error);
    return null;
  }
}

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(readProfile);

  useEffect(() => {
    const syncProfile = (event) => {
      if (event.key === PROFILE_KEY) setProfile(readProfile());
    };
    window.addEventListener("storage", syncProfile);
    return () => window.removeEventListener("storage", syncProfile);
  }, []);

  const saveProfile = useCallback((nextProfile) => {
    const normalized = {
      fullName: String(nextProfile.fullName || "").trim(),
      displayName: String(nextProfile.displayName || "").trim(),
      photo: typeof nextProfile.photo === "string" ? nextProfile.photo : "",
      preferences: nextProfile.preferences && typeof nextProfile.preferences === "object" ? nextProfile.preferences : {},
    };
    if (!normalized.fullName) return false;
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(normalized));
      setProfile(normalized);
      return true;
    } catch (error) {
      console.error("Could not save the profile.", error);
      return false;
    }
  }, []);

  const value = useMemo(() => ({ profile, saveProfile }), [profile, saveProfile]);
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}
