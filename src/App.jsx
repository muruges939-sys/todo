import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { TaskProvider } from "./context/TaskContext";
import { ProfileProvider } from "./context/ProfileContext";
import { useProfile } from "./context/useProfile";
import { useTasks } from "./context/useTasks";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import "./App.css";

const WelcomeIntro = lazy(() => import("./components/WelcomeIntro"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const MyTasks = lazy(() => import("./pages/MyTasks"));
const Kanban = lazy(() => import("./pages/Kanban"));
const Calendar = lazy(() => import("./pages/Calendar"));
const SmartPlanner = lazy(() => import("./pages/SmartPlanner"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Focus = lazy(() => import("./pages/Focus"));
const Settings = lazy(() => import("./pages/Settings"));

function Workspace() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { tasks, toast, notify } = useTasks();
  const reminded = useRef(new Set());
  const location = useLocation();

  useEffect(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem("taskflow-preferences") || "{}");
      document.documentElement.dataset.theme = prefs.theme || "light";
    } catch (error) {
      console.error("Could not apply saved appearance settings.", error);
    }
  }, []);

  useEffect(() => {
    const checkDeadlines = () => {
      let preferences;
      try { preferences = JSON.parse(localStorage.getItem("taskflow-preferences") || "{}"); }
      catch (error) { console.error("Could not read reminder preferences.", error); return; }
      if (preferences.reminders === false) return;
      const now = new Date();
      const ending = new Date(now.getTime() + 60_000);
      const due = tasks.find((task) => {
        if (task.status === "completed" || !task.dueDate) return false;
        const deadline = new Date(`${task.dueDate}T${task.dueTime || "23:59"}`);
        const key = `${task.id}:${task.dueDate}:${task.dueTime}`;
        return deadline >= now && deadline < ending && !reminded.current.has(key);
      });
      if (due) {
        reminded.current.add(`${due.id}:${due.dueDate}:${due.dueTime}`);
        notify(`Due now: ${due.title}`);
      }
    };
    checkDeadlines();
    const timer = window.setInterval(checkDeadlines, 60_000);
    return () => window.clearInterval(timer);
  }, [tasks, notify]);

  useEffect(() => {
    const handleStorageError = () => notify("Unable to save changes. Check your browser storage.");
    window.addEventListener("taskflow-storage-error", handleStorageError);
    return () => window.removeEventListener("taskflow-storage-error", handleStorageError);
  }, [notify]);

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="main-shell">
        <Navbar onMenu={() => setSidebarOpen(true)} />
        <div className="route-frame">
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname} className="route-content" initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
              <Suspense fallback={<div className="page-loading"><span className="loading-dot" />Loading your workspace</div>}>
                <Routes location={location}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/tasks" element={<MyTasks />} />
                  <Route path="/board" element={<Kanban />} />
                  <Route path="/calendar" element={<Calendar />} />
                  <Route path="/planner" element={<SmartPlanner />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/focus" element={<Focus />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<div className="panel not-found"><h2>Page not found</h2><p>That page doesn't exist in this workspace.</p></div>} />
                </Routes>
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
        <footer className="app-footer"><span>Taskflow</span><span>Make every day a little more intentional.</span></footer>
      </main>
      {toast && <div className="toast-message" role="status"><span className="toast-mark">✓</span>{toast}<button aria-label="Dismiss notification" onClick={() => notify("")}><X size={15} /></button></div>}
    </div>
  );
}

function AppExperience() {
  const { profile, saveProfile } = useProfile();
  const navigate = useNavigate();
  const [introOpen, setIntroOpen] = useState(() => {
    try { return localStorage.getItem("taskflow-intro-complete") !== "true"; }
    catch (error) { console.error("Could not read the welcome preference.", error); return false; }
  });

  useEffect(() => {
    const replay = () => setIntroOpen(true);
    window.addEventListener("taskflow-replay-intro", replay);
    return () => window.removeEventListener("taskflow-replay-intro", replay);
  }, []);

  const finishIntro = (newProfile) => {
    const completingOnboarding = !profile;
    if (completingOnboarding && (!newProfile || !saveProfile(newProfile))) return false;
    try { localStorage.setItem("taskflow-intro-complete", "true"); }
    catch (error) { console.error("Could not save the welcome preference.", error); }
    if (completingOnboarding) navigate("/", { replace: true });
    setIntroOpen(false);
    return true;
  };

  return (
    <AnimatePresence mode="wait">
      {!profile || introOpen
        ? <motion.div key="welcome" className="intro-transition" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.035, filter: "blur(8px)" }} transition={{ duration: 0.55, ease: [0.2, 0.75, 0.25, 1] }}><Suspense fallback={<div className="intro-loading" />}><WelcomeIntro requiresProfile={!profile} onComplete={finishIntro} /></Suspense></motion.div>
        : <Workspace key="workspace" />}
    </AnimatePresence>
  );
}

export default function App() {
  return <BrowserRouter><TaskProvider><ProfileProvider><AppExperience /></ProfileProvider></TaskProvider></BrowserRouter>;
}
