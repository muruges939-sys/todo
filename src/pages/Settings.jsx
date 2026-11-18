import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Camera, Check, Download, Moon, Play, Sun, Trash2, UserRound } from "lucide-react";
import { useTasks } from "../context/useTasks";
import { useProfile } from "../context/useProfile";
import ProfileAvatar from "../components/ProfileAvatar";

const PREFS_KEY = "taskflow-preferences";
function loadPreferences() {
  try {
    const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") || {};
    return { theme: prefs.theme || "light", reminders: prefs.reminders ?? true, weeklySummary: prefs.weeklySummary ?? false };
  } catch (error) {
    console.error("Could not read preferences.", error);
    return { theme: "light", reminders: true, weeklySummary: false };
  }
}

function downloadCSV(tasks) {
  const columns = ["Title", "Description", "Category", "Priority", "Status", "Due date", "Due time", "Estimated duration (minutes)"];
  const escape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const lines = [columns.map(escape).join(","), ...tasks.map((task) => [task.title, task.notes, task.category, task.priority, task.status, task.dueDate, task.dueTime, task.durationMinutes].map(escape).join(","))];
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8" }));
  link.download = "taskflow-tasks.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function Settings() {
  const { tasks, clearTasks, notify } = useTasks();
  const { profile, saveProfile } = useProfile();
  const [profileDraft, setProfileDraft] = useState(() => ({
    fullName: profile?.fullName || "",
    displayName: profile?.displayName || "",
    photo: profile?.photo || "",
    preferences: profile?.preferences || {},
  }));
  const [preferences, setPreferences] = useState(loadPreferences);
  const [saved, setSaved] = useState(false);
  useEffect(() => { document.documentElement.dataset.theme = preferences.theme; }, [preferences.theme]);
  const changePreference = (key, value) => { setSaved(false); setPreferences((current) => ({ ...current, [key]: value })); };
  const changeProfile = (key, value) => { setSaved(false); setProfileDraft((current) => ({ ...current, [key]: value })); };
  const changePhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { notify("Choose an image file for your profile picture."); return; }
    if (file.size > 1_500_000) { notify("Choose an image smaller than 1.5 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") changeProfile("photo", reader.result);
    };
    reader.onerror = () => notify("This image could not be loaded. Please try another.");
    reader.readAsDataURL(file);
  };
  const save = (event) => {
    event.preventDefault();
    const fullName = profileDraft.fullName.trim();
    if (!fullName) {
      notify("Enter your full name before saving."); return;
    }
    const cleanedProfile = { ...profileDraft, fullName, displayName: profileDraft.displayName.trim() };
    if (!saveProfile(cleanedProfile)) { notify("Could not save your profile. Check browser storage."); return; }
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(preferences));
      setSaved(true);
      notify("Your profile and settings have been saved.");
    } catch (error) {
      console.error("Could not save application settings.", error);
      notify("Your profile was saved, but settings could not be saved.");
    }
  };
  const clear = () => {
    if (window.confirm("Clear all tasks? This permanently removes your task list from this browser.")) {
      clearTasks(); notify("All tasks have been cleared.");
    }
  };
  return (
    <motion.div className="page-content settings-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="page-intro-row"><div><span className="eyebrow">MAKE IT YOURS</span><h2>Settings</h2><p>A few details to make Taskflow feel like home.</p></div></div>
      <form className="settings-layout" onSubmit={save}>
        <div className="settings-main">
          <section className="panel settings-section"><div className="settings-section-head"><div className="settings-icon"><UserRound size={18} /></div><div><h3>Profile</h3><p>Your name and picture personalize your workspace.</p></div></div><div className="profile-picture-row"><ProfileAvatar name={profileDraft.displayName || profileDraft.fullName} photo={profileDraft.photo} className="profile-large" /><label className="button button-outline profile-upload"><Camera size={15} />{profileDraft.photo ? "Change picture" : "Upload picture"}<input type="file" accept="image/*" aria-label="Upload a profile picture" onChange={changePhoto} /></label><span className="profile-photo-hint">Optional · Image up to 1.5 MB</span></div><div className="settings-form-grid"><div><label className="field-label" htmlFor="profile-full-name">Full name</label><input id="profile-full-name" autoComplete="name" value={profileDraft.fullName} onChange={(event) => changeProfile("fullName", event.target.value)} maxLength={80} required /></div><div><label className="field-label" htmlFor="profile-display-name">Preferred display name <span className="optional">(optional)</span></label><input id="profile-display-name" autoComplete="nickname" value={profileDraft.displayName} onChange={(event) => changeProfile("displayName", event.target.value)} maxLength={40} /></div></div></section>
          <section className="panel settings-section"><div className="settings-section-head"><div className="settings-icon"><Bell size={18} /></div><div><h3>Notifications</h3><p>Choose the nudges you want to receive.</p></div></div><div className="preference-row"><div><strong>Deadline reminders</strong><span>Get a reminder when a task is due today.</span></div><button type="button" className={`toggle ${preferences.reminders ? "on" : ""}`} aria-pressed={preferences.reminders} onClick={() => changePreference("reminders", !preferences.reminders)}><i /></button></div><div className="preference-row"><div><strong>Weekly progress summary</strong><span>A gentle recap of your completed tasks.</span></div><button type="button" className={`toggle ${preferences.weeklySummary ? "on" : ""}`} aria-pressed={preferences.weeklySummary} onClick={() => changePreference("weeklySummary", !preferences.weeklySummary)}><i /></button></div></section>
          <section className="panel settings-section"><div className="settings-section-head"><div className="settings-icon"><Download size={18} /></div><div><h3>Your data</h3><p>Your tasks stay in this browser. Export a copy whenever you like.</p></div></div><div className="data-actions"><div><strong>{tasks.length} tasks saved locally</strong><span>No account sync required.</span></div><button type="button" className="button button-outline" onClick={() => downloadCSV(tasks)}><Download size={15} />Export CSV</button></div><div className="danger-row"><div><strong>Clear all tasks</strong><span>This action cannot be undone.</span></div><button type="button" className="button button-danger" onClick={clear}><Trash2 size={15} />Clear data</button></div></section>
          <section className="panel settings-section"><div className="settings-section-head"><div className="settings-icon"><Play size={18} /></div><div><h3>Welcome experience</h3><p>Revisit the Taskflow introduction and 3D welcome screen.</p></div></div><button type="button" className="button button-outline replay-intro-button" onClick={() => window.dispatchEvent(new CustomEvent("taskflow-replay-intro"))}><Play size={14} />Replay welcome intro</button></section>
        </div>
        <aside className="settings-aside">
          <section className="panel theme-section"><div className="settings-section-head"><div className="settings-icon"><Moon size={18} /></div><div><h3>Appearance</h3><p>Set the tone of your workspace.</p></div></div><div className="theme-choices"><button type="button" className={`theme-option ${preferences.theme === "light" ? "chosen" : ""}`} onClick={() => changePreference("theme", "light")}><span className="theme-preview light-preview"><i /><i /><i /></span><span><Sun size={14} />Light</span>{preferences.theme === "light" && <Check size={15} />}</button><button type="button" className={`theme-option ${preferences.theme === "dark" ? "chosen" : ""}`} onClick={() => changePreference("theme", "dark")}><span className="theme-preview dark-preview"><i /><i /><i /></span><span><Moon size={14} />Dark</span>{preferences.theme === "dark" && <Check size={15} />}</button></div></section>
          <div className="settings-tip"><div className="tip-glow" /><span className="eyebrow">A LITTLE REMINDER</span><p>Your attention is your most valuable resource. Spend it well.</p></div>
        </aside>
        <div className="settings-save-row"><span>{saved && <><Check size={15} /> Changes saved</>}</span><button type="submit" className="button button-primary">Save changes</button></div>
      </form>
    </motion.div>
  );
}