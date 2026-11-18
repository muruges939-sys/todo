import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CalendarDays, ChevronDown, Plus } from "lucide-react";
import { useTasks } from "../context/useTasks";
import TaskForm from "../components/TaskForm";

const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export default function Calendar() {
  const { tasks, addTask, notify } = useTasks();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState(new Date());
  const [view, setView] = useState("Month");
  const [dialogOpen, setDialogOpen] = useState(false);
  const monthDays = useMemo(() => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const first = new Date(start);
    first.setDate(1 - ((start.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(first);
      date.setDate(first.getDate() + index);
      return date;
    });
  }, [month]);
  const displayedDays = view === "Day" ? [selected] : view === "Week" ? monthDays.filter((date) => {
    const start = new Date(selected); start.setDate(selected.getDate() - ((selected.getDay() + 6) % 7));
    const end = new Date(start); end.setDate(start.getDate() + 7);
    return date >= start && date < end;
  }) : monthDays;
  const selectedTasks = tasks.filter((task) => task.dueDate && sameDay(new Date(`${task.dueDate}T00:00:00`), selected));
  const dateTasks = (date) => tasks.filter((task) => task.dueDate && sameDay(new Date(`${task.dueDate}T00:00:00`), date));
  const moveMonth = (amount) => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  const isCurrentMonth = (date) => date.getMonth() === month.getMonth();
  const saveTask = (task) => {
    addTask(task);
    setDialogOpen(false);
    notify("Task added to your workspace.");
  };

  return (
    <motion.div className="page-content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="page-intro-row"><div><span className="eyebrow">MAKE TIME FOR WHAT MATTERS</span><h2>Calendar</h2><p>Your deadlines, thoughtfully laid out.</p></div><div className="page-intro-actions"><button className="button button-primary" onClick={() => setDialogOpen(true)}><Plus size={16} />Add New Task</button><button className="button button-outline" onClick={() => { const today = new Date(); setSelected(today); setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); }}>Today</button></div></div>
      <div className="calendar-layout">
        <section className="panel calendar-panel">
          <div className="calendar-toolbar"><div className="calendar-month"><CalendarDays size={18} /><h3>{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h3><div className="calendar-arrows"><button className="icon-button" aria-label="Previous month" onClick={() => moveMonth(-1)}><ArrowLeft size={16} /></button><button className="icon-button" aria-label="Next month" onClick={() => moveMonth(1)}><ArrowRight size={16} /></button></div></div><label className="view-select"><select value={view} onChange={(event) => setView(event.target.value)}><option>Month</option><option>Week</option><option>Day</option></select><ChevronDown size={14} /></label></div>
          {view !== "Day" && <div className="calendar-weekdays">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span key={day}>{day}</span>)}</div>}
          <div className={`calendar-grid ${view === "Week" ? "week-view" : ""} ${view === "Day" ? "day-view" : ""}`}>
            {displayedDays.map((date) => {
              const dateItems = dateTasks(date);
              return <button key={date.toISOString()} className={`calendar-day ${!isCurrentMonth(date) && view === "Month" ? "outside-month" : ""} ${sameDay(date, selected) ? "selected-day" : ""} ${sameDay(date, new Date()) ? "today-day" : ""}`} onClick={() => { setSelected(date); if (!isCurrentMonth(date)) setMonth(new Date(date.getFullYear(), date.getMonth(), 1)); }}>
                <span className="day-number">{date.getDate()}</span>
                <span className="day-events">{dateItems.slice(0, 2).map((task) => <span key={task.id} className={`day-event priority-event-${(task.priority || "Medium").toLowerCase()} ${task.status === "completed" ? "event-done" : ""}`} title={`${task.title} · ${task.priority || "Medium"} priority`}>{task.title}</span>)}{dateItems.length > 2 && <small>+{dateItems.length - 2} more</small>}</span>
                {dateItems.length > 0 && <span className="mobile-event-dot" />}
              </button>;
            })}
          </div>
        </section>
        <aside className="panel date-detail-panel"><div className="detail-date"><span className="eyebrow">{selected.toLocaleDateString(undefined, { weekday: "long" }).toUpperCase()}</span><strong>{selected.getDate()}</strong><span>{selected.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span></div>
          <div className="detail-divider" /><div className="detail-tasks-head"><h3>Tasks</h3><span>{selectedTasks.length}</span></div>
            {selectedTasks.length ? <div className="date-task-list">{selectedTasks.map((task) => <div className="date-task" key={task.id}><span className={`date-task-indicator ${task.status === "completed" ? "done" : ""}`} /><div><strong>{task.title}</strong><span>{task.dueTime || "All day"} · {task.category}</span></div></div>)}</div> : <div className="date-empty"><div className="empty-icon subtle"><CalendarDays size={18} /></div><p>{tasks.length ? "No tasks due on this day." : "Your calendar is waiting for your plans."}</p>{!tasks.length && <button className="button button-primary button-small" onClick={() => setDialogOpen(true)}><Plus size={15} />Add your first task</button>}</div>}
        </aside>
      </div>
        {dialogOpen && <TaskForm onSave={saveTask} onClose={() => setDialogOpen(false)} />}
    </motion.div>
  );
}
