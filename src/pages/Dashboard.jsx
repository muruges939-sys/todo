import { lazy, Suspense, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Check, CheckCheck, CircleCheck, Flame, Plus, Sparkles, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { useTasks } from "../context/useTasks";
import { useProfile } from "../context/useProfile";
import { isOverdue, localDateKey } from "../utils/tasks";
import TaskForm from "../components/TaskForm";
import TaskCard from "../components/TaskCard";
const ProductivityOrb = lazy(() => import("../components/ProductivityOrb"));

const todayKey = () => localDateKey();

function getStreak(tasks) {
  const completedDays = new Set(tasks.filter((task) => task.completedAt).map((task) => localDateKey(new Date(task.completedAt))));
  let date = new Date();
  if (!completedDays.has(todayKey())) date.setDate(date.getDate() - 1);
  let streak = 0;
  while (completedDays.has(localDateKey(date))) {
    streak += 1;
    date.setDate(date.getDate() - 1);
  }
  return streak;
}

export default function Dashboard() {
  const { tasks, addTask, updateTask, deleteTask, notify } = useTasks();
  const { profile } = useProfile();
  const [dialog, setDialog] = useState(null);
  const profileName = profile?.displayName?.trim() || profile?.fullName?.trim().split(/\s+/)[0] || "";
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const completed = tasks.filter((task) => task.status === "completed").length;
  const pending = tasks.filter((task) => task.status !== "completed").length;
  const overdue = tasks.filter(isOverdue).length;
  const todayTasks = tasks.filter((task) => task.dueDate === todayKey());
  const todayDone = todayTasks.filter((task) => task.status === "completed").length;
  const todayTotal = todayTasks.length;
  const dailyProgress = todayTotal ? Math.round((todayDone / todayTotal) * 100) : null;
  const upcoming = useMemo(() => tasks.filter((task) => task.status !== "completed" && task.dueDate).sort((a, b) => `${a.dueDate}${a.dueTime}`.localeCompare(`${b.dueDate}${b.dueTime}`)).slice(0, 3), [tasks]);
  const recent = tasks.slice(0, 4);
  const stats = [
    { title: "Total tasks", value: tasks.length, note: "In your workspace", icon: Target, tone: "violet" },
    { title: "Completed", value: completed, note: "Tasks finished", icon: CircleCheck, tone: "green" },
    { title: "In progress", value: tasks.filter((task) => task.status === "in-progress").length, note: `${pending} not completed`, icon: CheckCheck, tone: "blue" },
    { title: "Overdue", value: overdue, note: overdue ? "Tasks past their due date" : "No overdue tasks", icon: Flame, tone: "orange" },
  ];

  const saveTask = (task) => {
    if (dialog?.task) { updateTask(dialog.task.id, task); notify("Task updated."); }
    else { addTask(task); notify("Task added to your list."); }
    setDialog(null);
  };
  const toggle = (task) => {
    const finishing = task.status !== "completed";
    updateTask(task.id, { status: finishing ? "completed" : "todo" });
    if (finishing) notify("Great job! Task completed!");
  };
  const remove = (task) => { deleteTask(task.id); notify("Task deleted successfully."); };

  return (
    <motion.div className="page-content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <section className="welcome-panel">
        <div className="welcome-copy">
          <div className="welcome-kicker"><span className="kicker-spark"><Sparkles size={14} /></span> {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }).toUpperCase()}</div>
          <h2>{profileName ? `${timeGreeting},` : "Welcome back,"}<br /><span>{profileName || "let's begin"}.</span></h2>
          <p>{tasks.length ? "Ready to achieve your goals today?" : "Your productivity journey starts here!"}</p>
          <button className="button button-light" onClick={() => setDialog({ task: null })}><Plus size={17} />{tasks.length ? "Add New Task" : "Add Your First Task"}</button>
        </div>
        <div className="welcome-metrics">
          <div className="welcome-mini"><span>DAILY PROGRESS</span><strong>{dailyProgress === null ? "—" : <>{dailyProgress}<small>%</small></>}</strong><div className="mini-progress"><i style={{ width: `${dailyProgress ?? 0}%` }} /></div><em>{dailyProgress === null ? "No tasks scheduled today" : `${todayDone} of ${todayTotal} due today done`}</em></div>
          <div className="welcome-mini streak-mini"><span>YOUR STREAK</span><strong><Flame size={25} />{getStreak(tasks)}<small> days</small></strong><em>Keep showing up</em></div>
        </div>
        <Suspense fallback={<div className="hero-orb orb-placeholder" aria-hidden="true" />}><ProductivityOrb /></Suspense>
        <div className="welcome-shine" />
      </section>

      <section className="stats-grid" aria-label="Task statistics">
        {stats.map(({ title, value, note, icon: Icon, tone }, index) => (
          <motion.article key={title} className={`stat-card stat-${tone}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}>
            <div className="stat-top"><span>{title}</span><div className="stat-icon"><Icon size={17} /></div></div>
            <strong>{value}</strong><p>{note}</p>
          </motion.article>
        ))}
      </section>

      <section className="dashboard-columns">
        <div className="panel recent-panel">
          <div className="section-head"><div><span className="eyebrow">YOUR WORKSPACE</span><h2>Recent Tasks</h2></div><Link to="/tasks" className="text-link">View all <ArrowRight size={15} /></Link></div>
          {recent.length ? <div className="task-list">{recent.map((task) => <TaskCard key={task.id} task={task} compact onToggle={toggle} onEdit={(item) => setDialog({ task: item })} onDelete={remove} />)}</div> : <div className="empty-state"><div className="empty-icon"><Check size={22} /></div><h3>No tasks yet!</h3><p>Your workspace is ready. Create your first task to get started.</p><button className="button button-primary button-small" onClick={() => setDialog({ task: null })}><Plus size={15} />Add Your First Task</button></div>}
        </div>
        <div className="panel upcoming-panel">
          <div className="section-head"><div><span className="eyebrow">DON'T MISS A THING</span><h2>Upcoming</h2></div><Link to="/calendar" className="icon-link" aria-label="Open calendar"><ArrowUpRight size={17} /></Link></div>
          {upcoming.length ? <div className="upcoming-list">{upcoming.map((task) => {
            const date = new Date(`${task.dueDate}T00:00:00`);
            return <div className="upcoming-item" key={task.id}><div className="date-block"><b>{date.getDate()}</b><span>{date.toLocaleDateString(undefined, { month: "short" })}</span></div><div className="upcoming-title"><strong>{task.title}</strong><span>{task.dueTime || "All day"} · {task.category}</span></div><span className={`priority-mark priority-${(task.priority || "Medium").toLowerCase()}`} title={`${task.priority || "Medium"} priority`} /></div>;
          })}</div> : <div className="upcoming-empty"><div className="empty-icon subtle"><Sparkles size={18} /></div><p>No upcoming deadlines.</p></div>}
          <div className="streak-callout"><div className="callout-icon"><Flame size={17} /></div><div><strong>{getStreak(tasks) ? `${getStreak(tasks)} day streak` : "Start a new streak"}</strong><span>Consistency beats intensity.</span></div></div>
          <div className="achievement-row" aria-label="Achievements">
            <span className={`achievement-badge ${completed > 0 ? "earned" : ""}`} title={completed > 0 ? "First task completed" : "Complete your first task"}><Check size={12} />First step</span>
            <span className={`achievement-badge ${getStreak(tasks) >= 3 ? "earned" : ""}`} title="Complete a task on 3 consecutive days"><Flame size={12} />In rhythm</span>
            <span className={`achievement-badge ${completed >= 10 ? "earned" : ""}`} title="Complete 10 tasks"><Sparkles size={12} />Tenacity</span>
          </div>
        </div>
      </section>
      {dialog && <TaskForm task={dialog.task} onSave={saveTask} onClose={() => setDialog(null)} />}
    </motion.div>
  );
}