import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, Menu, Search, X } from "lucide-react";
import { useTasks } from "../context/useTasks";
import { useProfile } from "../context/useProfile";
import ProfileAvatar from "./ProfileAvatar";
import { isOverdue, localDateKey } from "../utils/tasks";

const titles = {
  "/": "Overview", "/tasks": "My tasks", "/board": "Board",
  "/calendar": "Calendar", "/planner": "Smart Planner", "/analytics": "Analytics",
  "/focus": "Focus mode", "/settings": "Settings",
};

export default function Navbar({ onMenu }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { search, setSearch, tasks, notify } = useTasks();
  const { profile } = useProfile();
  const [searchOpen, setSearchOpen] = useState(false);
  const profileName = profile?.displayName || profile?.fullName || "Your profile";
  const dueSoon = tasks.filter((task) => task.status !== "completed" && task.dueDate && task.dueDate === localDateKey()).length;
  const overdue = tasks.filter(isOverdue).length;

  return (
    <header className="topbar">
      <button className="icon-button menu-button" aria-label="Open navigation" onClick={onMenu}><Menu size={20} /></button>
      <div className="page-heading"><span className="eyebrow">MY WORKSPACE</span><h1>{titles[pathname] || "TaskFlow"}</h1></div>
      <div className={`topbar-actions ${searchOpen ? "searching" : ""}`}>
        {searchOpen && <input autoFocus aria-label="Search tasks" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => {
          if (event.key === "Escape") setSearchOpen(false);
          if (event.key === "Enter") { navigate("/tasks"); setSearchOpen(false); }
        }} placeholder="Search your tasks..." />}
        <button className="icon-button" aria-label={searchOpen ? "Close search" : "Search tasks"} onClick={() => { setSearchOpen((open) => !open); if (searchOpen) setSearch(""); }}>
          {searchOpen ? <X size={18} /> : <Search size={18} />}
        </button>
        <button className="icon-button notification-button" aria-label="Task reminders" onClick={() => notify(dueSoon ? `You have ${dueSoon} task${dueSoon === 1 ? "" : "s"} due today.` : overdue ? `You have ${overdue} overdue task${overdue === 1 ? "" : "s"}.` : "Nothing is due today.")}>
          <Bell size={18} />{dueSoon > 0 && <span className="notification-dot" />}
        </button>
        <div className="topbar-divider" />
        <button className="user-chip" aria-label="Open profile settings" onClick={() => navigate("/settings")}><ProfileAvatar name={profileName} photo={profile?.photo} className="small" /><span className="user-name">{profileName}</span></button>
      </div>
    </header>
  );
}