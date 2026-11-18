import { NavLink } from "react-router-dom";
import { useProfile } from "../context/useProfile";
import ProfileAvatar from "./ProfileAvatar";
import {
  LayoutDashboard, CheckSquare, Columns3, CalendarDays,
  ChartNoAxesCombined, Timer, Settings, Sparkles, X, BrainCircuit,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "My tasks", to: "/tasks", icon: CheckSquare },
  { label: "Board", to: "/board", icon: Columns3 },
  { label: "Calendar", to: "/calendar", icon: CalendarDays },
  { label: "Smart Planner", to: "/planner", icon: BrainCircuit },
  { label: "Analytics", to: "/analytics", icon: ChartNoAxesCombined },
  { label: "Focus mode", to: "/focus", icon: Timer },
];

export default function Sidebar({ open, onClose }) {
  const { profile } = useProfile();
  const profileName = profile?.displayName || profile?.fullName || "Your profile";
  return (
    <>
      {open && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={onClose} />}
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark"><Sparkles size={19} /></div>
          <span className="brand-name">taskflow<span>.</span></span>
          <button className="icon-button sidebar-close" onClick={onClose} aria-label="Close navigation"><X size={18} /></button>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map(({ label, to, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/"} onClick={onClose} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
              {label === "My tasks" && <span className="nav-shortcut">↵</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-note">
          <div className="note-icon"><Sparkles size={17} /></div>
          <div><strong>Make space to focus</strong><p>Small steps make big things happen.</p></div>
        </div>
        <NavLink to="/settings" onClick={onClose} className={({ isActive }) => `nav-link settings-link ${isActive ? "active" : ""}`}>
          <Settings size={18} strokeWidth={1.8} /><span>Settings</span>
        </NavLink>
        <div className="sidebar-profile">
          <ProfileAvatar name={profileName} photo={profile?.photo} /><div><strong>{profileName}</strong><small>Personal workspace</small></div>
        </div>
      </aside>
    </>
  );
}