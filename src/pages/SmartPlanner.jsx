import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, BrainCircuit, CalendarClock, CalendarDays,
  Check, CircleCheck, Clock3, Flame, Plus, Sparkles, Target, Timer,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTasks } from "../context/useTasks";
import { isOverdue, localDateKey } from "../utils/tasks";
import TaskCard from "../components/TaskCard";
import TaskForm from "../components/TaskForm";

const PREFS_KEY = "taskflow-planner-preferences";
const priorityRank = { High: 0, Medium: 1, Low: 2 };
const defaultPreferences = { durations: {}, startTimes: {}, dailyGoal: 3 };

function readPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") || {};
    return {
      durations: saved.durations && typeof saved.durations === "object" ? saved.durations : {},
      startTimes: saved.startTimes && typeof saved.startTimes === "object" ? saved.startTimes : {},
      dailyGoal: Number.isInteger(saved.dailyGoal) && saved.dailyGoal > 0 ? saved.dailyGoal : defaultPreferences.dailyGoal,
    };
  } catch (error) {
    console.error("Could not read Smart Planner preferences.", error);
    return defaultPreferences;
  }
}

function sortByPriority(tasks) {
  return [...tasks].sort((a, b) => {
    const overdueDifference = Number(isOverdue(b)) - Number(isOverdue(a));
    if (overdueDifference) return overdueDifference;
    const priorityDifference = (priorityRank[a.priority] ?? 1) - (priorityRank[b.priority] ?? 1);
    if (priorityDifference) return priorityDifference;
    if (a.dueTime && b.dueTime) return a.dueTime.localeCompare(b.dueTime);
    if (a.dueTime) return -1;
    if (b.dueTime) return 1;
    return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
  });
}

function timeToMinutes(time) {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return null;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes) {
  const safeMinutes = Math.max(0, Math.min(1439, minutes));
  return `${String(Math.floor(safeMinutes / 60)).padStart(2, "0")}:${String(safeMinutes % 60).padStart(2, "0")}`;
}

function formatTime(time) {
  if (!time) return "Not scheduled";
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function slotOverlaps(start, duration, slots) {
  const end = start + duration;
  return slots.some((slot) => start < slot.start + slot.duration && end > slot.start);
}

function taskDuration(task, preferences) {
  return Number(preferences.durations[task.id] ?? task.durationMinutes);
}

function findOpenSlot(duration, slots, earliest, latestFinish = 1440) {
  for (let start = earliest; start + duration <= latestFinish && start + duration <= 1440; start += 15) {
    if (!slotOverlaps(start, duration, slots)) return start;
  }
  return null;
}

function startOfWeek(date) {
  const result = new Date(date);
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  result.setHours(0, 0, 0, 0);
  return result;
}

function getSchedule(tasks, preferences, selectedDate) {
  const ordered = sortByPriority(tasks);
  const scheduled = [];
  const needsDuration = [];
  const hasDuration = [];

  for (const task of ordered) {
    const duration = taskDuration(task, preferences);
    if (!Number.isFinite(duration) || duration < 5) {
      needsDuration.push(task);
      continue;
    }
    hasDuration.push({ task, duration, key: `${selectedDate}:${task.id}`, manualTime: preferences.startTimes[`${selectedDate}:${task.id}`] });
  }

  for (const entry of hasDuration) {
    const manualStart = timeToMinutes(entry.manualTime);
    if (manualStart === null || slotOverlaps(manualStart, entry.duration, scheduled)) continue;
    scheduled.push({ ...entry, start: manualStart, manual: true });
  }

  const now = new Date();
  const today = selectedDate === localDateKey();
  const currentMinute = now.getHours() * 60 + now.getMinutes();
  const earliest = today ? Math.ceil(currentMinute / 15) * 15 : 9 * 60;
  for (const entry of hasDuration) {
    if (scheduled.some((item) => item.task.id === entry.task.id)) continue;
    const deadline = entry.task.dueTime ? timeToMinutes(entry.task.dueTime) : 1440;
    const beforeDeadline = !isOverdue(entry.task) && deadline > earliest
      ? findOpenSlot(entry.duration, scheduled, earliest, deadline)
      : null;
    const start = beforeDeadline ?? findOpenSlot(entry.duration, scheduled, earliest);
    if (start === null) {
      scheduled.push({ ...entry, start: null, manual: false, noRoom: true });
      continue;
    }
    scheduled.push({ ...entry, start, manual: false, late: deadline < start + entry.duration && !isOverdue(entry.task) });
  }

  scheduled.sort((a, b) => (a.start ?? 1440) - (b.start ?? 1440));
  return { scheduled, needsDuration };
}

function getUpcomingDeadlines(tasks) {
  const now = Date.now();
  const end = now + 24 * 60 * 60 * 1000;
  return tasks.filter((task) => {
    if (task.status === "completed" || !task.dueDate || isOverdue(task)) return false;
    const deadline = new Date(`${task.dueDate}T${task.dueTime || "23:59"}`).getTime();
    return deadline >= now && deadline <= end;
  });
}

function dateLabel(date, options) {
  return date.toLocaleDateString(undefined, options);
}

export default function SmartPlanner() {
  const { tasks, addTask, updateTask, deleteTask: removeTask, notify } = useTasks();
  const [preferences, setPreferences] = useState(readPreferences);
  const [selectedDate, setSelectedDate] = useState(localDateKey());
  const [dialog, setDialog] = useState(null);
  const [rescheduleTask, setRescheduleTask] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const selectedDateObject = new Date(`${selectedDate}T00:00:00`);
  const dayTasks = useMemo(() => tasks.filter((task) => task.dueDate === selectedDate), [tasks, selectedDate]);
  const globalOverdue = useMemo(() => tasks.filter(isOverdue), [tasks]);
  const planTasks = useMemo(() => {
    if (selectedDate !== localDateKey()) return dayTasks;
    return [...new Map([...dayTasks, ...globalOverdue].map((task) => [task.id, task])).values()];
  }, [dayTasks, globalOverdue, selectedDate]);
  const orderedTasks = useMemo(() => sortByPriority(planTasks), [planTasks]);
  const upcoming = useMemo(() => getUpcomingDeadlines(tasks), [tasks]);
  const schedule = useMemo(() => getSchedule(planTasks, preferences, selectedDate), [planTasks, preferences, selectedDate]);
  const completed = dayTasks.filter((task) => task.status === "completed").length;
  const pending = dayTasks.length - completed;
  const dailyProgress = dayTasks.length ? Math.round((completed / dayTasks.length) * 100) : null;
  const highPriorityTasks = dayTasks.filter((task) => task.priority === "High");
  const highCompleted = highPriorityTasks.filter((task) => task.status === "completed").length;
  const highProgress = highPriorityTasks.length ? Math.round((highCompleted / highPriorityTasks.length) * 100) : null;
  const goalProgress = dayTasks.length ? Math.min(100, Math.round((completed / preferences.dailyGoal) * 100)) : null;
  const recommendedTask = orderedTasks.find((task) => task.status !== "completed");
  const week = useMemo(() => {
    const start = startOfWeek(new Date(`${selectedDate}T00:00:00`));
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = localDateKey(date);
      return { date, key, count: tasks.filter((task) => task.dueDate === key).length };
    });
  }, [selectedDate, tasks]);

  const storePreferences = (next) => {
    setPreferences(next);
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); }
    catch (error) {
      console.error("Could not save Smart Planner preferences.", error);
      notify("Could not save your planner settings. Check browser storage.");
    }
  };

  const updateDuration = (task, rawValue) => {
    if (rawValue && (!/^\d+$/.test(rawValue) || Number(rawValue) < 5 || Number(rawValue) > 480)) {
      notify("Enter a duration between 5 and 480 minutes.");
      return;
    }
    const durations = { ...preferences.durations };
    if (rawValue) durations[task.id] = Number(rawValue);
    else delete durations[task.id];
    updateTask(task.id, { durationMinutes: rawValue ? Number(rawValue) : "" });
    storePreferences({ ...preferences, durations });
  };

  const updateStartTime = (task, time) => {
    const key = `${selectedDate}:${task.id}`;
    const duration = taskDuration(task, preferences);
    if (time && duration >= 5) {
      const start = timeToMinutes(time);
      const collidingManual = planTasks.some((other) => {
        if (other.id === task.id) return false;
        const otherStart = timeToMinutes(preferences.startTimes[`${selectedDate}:${other.id}`]);
        const otherDuration = taskDuration(other, preferences);
        return otherStart !== null && otherDuration > 0 && start < otherStart + otherDuration && start + duration > otherStart;
      });
      if (collidingManual) {
        notify("That time overlaps another manually scheduled task.");
        return;
      }
    }
    const startTimes = { ...preferences.startTimes };
    if (time) startTimes[key] = time;
    else delete startTimes[key];
    storePreferences({ ...preferences, startTimes });
  };

  const saveTask = (data) => {
    if (dialog?.task) {
      updateTask(dialog.task.id, data);
      notify("Task updated.");
    } else {
      addTask(data);
      notify("Task added to your workspace.");
    }
    setDialog(null);
  };

  const toggleTask = (task) => {
    const completing = task.status !== "completed";
    updateTask(task.id, { status: completing ? "completed" : "todo" });
    notify(completing ? "Great job! Task completed!" : "Task marked as pending.");
  };

  const deleteTask = (task) => {
    removeTask(task.id);
    notify("Task deleted successfully.");
  };

  const reschedule = (event) => {
    event.preventDefault();
    if (!rescheduleTask || !rescheduleDate) return;
    updateTask(rescheduleTask.id, { dueDate: rescheduleDate });
    notify(`Rescheduled for ${dateLabel(new Date(`${rescheduleDate}T00:00:00`), { month: "short", day: "numeric" })}.`);
    setRescheduleTask(null);
  };

  const recommendations = [];
  if (globalOverdue.length) recommendations.push({ icon: Flame, title: "Clear overdue tasks first", detail: `${globalOverdue.length} overdue ${globalOverdue.length === 1 ? "task needs" : "tasks need"} your attention.`, tone: "urgent" });
  const highPending = orderedTasks.find((task) => task.priority === "High" && task.status !== "completed");
  if (highPending) recommendations.push({ icon: Target, title: "Start with your highest priority", detail: highPending.title, tone: "high" });
  if (upcoming.length) recommendations.push({ icon: CalendarClock, title: "Deadlines approaching", detail: `You have ${upcoming.length} upcoming deadline${upcoming.length === 1 ? "" : "s"} within 24 hours.`, tone: "deadline" });
  if (completed > 0 && pending > 0) recommendations.push({ icon: Sparkles, title: "You're making good progress", detail: `${completed} of ${dayTasks.length} tasks on this day are complete. Keep it up!`, tone: "progress" });
  if (!recommendations.length && pending > 0) recommendations.push({ icon: BrainCircuit, title: "Your next step", detail: recommendedTask?.title || "Choose a task to get started.", tone: "high" });
  if (!recommendations.length && !dayTasks.length) recommendations.push({ icon: Sparkles, title: "Make a plan for this day", detail: "Add a task to get recommendations based on your deadlines and priorities.", tone: "progress" });
  if (!recommendations.length && dayTasks.length && pending === 0) recommendations.push({ icon: CircleCheck, title: "A plan well done", detail: "Every scheduled task is complete. Enjoy the breathing room.", tone: "progress" });

  const moveWeek = (delta) => {
    const date = new Date(`${selectedDate}T00:00:00`);
    date.setDate(date.getDate() + delta * 7);
    setSelectedDate(localDateKey(date));
  };

  return (
    <motion.div className="page-content planner-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
      <section className="planner-hero">
        <div className="planner-hero-copy">
          <span className="eyebrow"><BrainCircuit size={14} /> YOUR DAY, WITH A LITTLE MORE CLARITY</span>
          <h2>Smart Planner</h2>
          <p>Make a thoughtful plan. Focus on the next right thing.</p>
        </div>
        <div className="planner-date-card"><CalendarDays size={18} /><div><span>{dateLabel(selectedDateObject, { weekday: "long" })}</span><strong>{dateLabel(selectedDateObject, { month: "long", day: "numeric", year: "numeric" })}</strong></div></div>
        <div className="planner-hero-glow" />
      </section>

      <section className="planner-overview" aria-label="Daily overview">
        <div className="planner-progress-card">
          <div className="planner-progress-top"><div><span className="eyebrow">DAILY PROGRESS</span><strong>{dailyProgress === null ? "—" : `${dailyProgress}%`}</strong></div><div className="planner-ring" style={{ "--progress": `${dailyProgress ?? 0}%` }}><CircleCheck size={19} /></div></div>
          <div className="planner-progress-track" {...(dailyProgress === null ? {} : { role: "progressbar", "aria-label": "Daily completion", "aria-valuenow": dailyProgress, "aria-valuemin": 0, "aria-valuemax": 100 })}><span style={{ width: `${dailyProgress ?? 0}%` }} /></div>
          <p>{dayTasks.length ? `${completed} of ${dayTasks.length} scheduled tasks completed` : "Add a task to start tracking daily progress."}</p>
        </div>
        <div className="planner-metric"><span className="planner-metric-icon violet"><CalendarClock size={17} /></span><span className="planner-metric-label">Scheduled</span><strong>{dayTasks.length}</strong><small>on this day</small></div>
        <div className="planner-metric"><span className="planner-metric-icon green"><Check size={17} /></span><span className="planner-metric-label">Completed</span><strong>{completed}</strong><small>{pending} remaining</small></div>
        <div className="planner-metric"><span className="planner-metric-icon red"><Flame size={17} /></span><span className="planner-metric-label">Overdue</span><strong>{globalOverdue.length}</strong><small>across your tasks</small></div>
      </section>

      <div className="planner-quick-actions">
        <button className="button button-primary" onClick={() => setDialog({ task: null })}><Plus size={16} />Add New Task</button>
        <button className="button button-outline" disabled={!recommendedTask} onClick={() => recommendedTask && toggleTask(recommendedTask)}><Check size={15} />Mark as Completed</button>
        <button className="button button-outline" disabled={!recommendedTask} onClick={() => { if (!recommendedTask) return; setRescheduleTask(recommendedTask); setRescheduleDate(recommendedTask.dueDate || selectedDate); }}><CalendarClock size={15} />Reschedule Task</button>
        <Link className="button button-outline" to="/focus"><Timer size={15} />Start Focus Session</Link>
        <Link className="planner-view-all" to="/tasks">View All Tasks <ArrowRight size={14} /></Link>
      </div>

      <div className="planner-main-grid">
        <section className="panel planner-schedule">
          <div className="planner-section-heading"><div><span className="eyebrow">A GENTLE GAME PLAN</span><h3>Recommended daily schedule</h3><p>High priority and urgent deadlines rise to the top. Add a duration for a time suggestion.</p></div><span className="planner-count">{planTasks.length} to plan</span></div>
          <div className="planner-order-note"><Sparkles size={14} /><span>Suggested order: overdue first, then high, medium and low priority. Your original task details stay unchanged.</span></div>
          {planTasks.length ? (
            <div className="planner-timeline">
              {schedule.scheduled.map(({ task, duration, start, manual, late, noRoom }, index) => {
                const overdue = isOverdue(task);
                const imminent = !overdue && upcoming.some((item) => item.id === task.id);
                const startTime = start === null ? "" : minutesToTime(start);
                return (
                  <motion.div className="planner-timeline-row" key={task.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * .035, .24) }}>
                    <div className="planner-time-rail"><span>{startTime ? formatTime(startTime) : "—"}</span><i className={`timeline-dot ${task.status === "completed" ? "done" : `priority-${(task.priority || "Medium").toLowerCase()}`}`} /></div>
                    <div className="planner-task-block">
                      {(overdue || imminent) && <span className={`planner-alert ${overdue ? "is-overdue" : ""}`}>{overdue ? "OVERDUE · COMPLETE FIRST" : "DEADLINE WITHIN 24 HOURS"}</span>}
                      {noRoom && <span className="planner-alert is-overdue">NO OPEN SLOT — ADJUST A TIME</span>}
                      {late && <span className="planner-alert is-overdue">SUGGESTED SLOT ENDS AFTER DUE TIME</span>}
                      <TaskCard task={task} onToggle={toggleTask} onEdit={(item) => setDialog({ task: item })} onDelete={deleteTask} />
                      <div className="planner-slot-controls">
                        <label className="planner-input-label"><Clock3 size={14} /><span>Estimated duration</span><input aria-label={`Estimated duration for ${task.title} in minutes`} type="number" min="5" max="480" step="5" placeholder="Minutes" value={preferences.durations[task.id] ?? task.durationMinutes ?? ""} onChange={(event) => updateDuration(task, event.target.value)} /><small>min</small></label>
                        <label className="planner-input-label"><CalendarClock size={14} /><span>{manual ? "Adjust time" : "Suggested start"}</span><input aria-label={`Suggested start time for ${task.title}`} type="time" value={startTime} disabled={!duration} onChange={(event) => updateStartTime(task, event.target.value)} /></label>
                        <span className="planner-duration-note">{duration ? `${duration} min${manual ? " · adjusted" : " · suggested"}` : "Duration not set"}</span>
                        {task.dueTime && <span className="planner-due-time">Due {formatTime(task.dueTime)}</span>}
                        <button className="planner-reschedule" onClick={() => { setRescheduleTask(task); setRescheduleDate(task.dueDate || selectedDate); }}>Reschedule Task</button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              {schedule.needsDuration.map((task, index) => {
                const overdue = isOverdue(task);
                const imminent = !overdue && upcoming.some((item) => item.id === task.id);
                return (
                  <motion.div className="planner-timeline-row needs-duration-row" key={task.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min((schedule.scheduled.length + index) * .035, .24) }}>
                    <div className="planner-time-rail"><span>—</span><i className={`timeline-dot priority-${(task.priority || "Medium").toLowerCase()}`} /></div>
                    <div className="planner-task-block">
                      {(overdue || imminent) && <span className={`planner-alert ${overdue ? "is-overdue" : ""}`}>{overdue ? "OVERDUE · COMPLETE FIRST" : "DEADLINE WITHIN 24 HOURS"}</span>}
                      <TaskCard task={task} onToggle={toggleTask} onEdit={(item) => setDialog({ task: item })} onDelete={deleteTask} />
                      <div className="planner-slot-controls">
                        <label className="planner-input-label"><Clock3 size={14} /><span>Estimated duration</span><input aria-label={`Estimated duration for ${task.title} in minutes`} type="number" min="5" max="480" step="5" placeholder="Enter minutes" value={preferences.durations[task.id] ?? task.durationMinutes ?? ""} onChange={(event) => updateDuration(task, event.target.value)} /><small>min</small></label>
                        <span className="planner-duration-note">Add a duration to suggest a start time.</span>
                        {task.dueTime && <span className="planner-due-time">Due {formatTime(task.dueTime)}</span>}
                        <button className="planner-reschedule" onClick={() => { setRescheduleTask(task); setRescheduleDate(task.dueDate || selectedDate); }}>Reschedule Task</button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="planner-empty"><div className="empty-icon"><CalendarDays size={20} /></div><h4>No tasks scheduled for this day</h4><p>Add a task with a due date to build a daily plan.</p><button className="button button-primary button-small" onClick={() => setDialog({ task: null })}><Plus size={15} />Add New Task</button></div>
          )}
        </section>

        <aside className="planner-side-column">
          <section className="panel planner-calendar">
            <div className="planner-side-heading"><div><span className="eyebrow">YOUR WEEK</span><h3>Daily calendar</h3></div><div className="planner-week-arrows"><button className="icon-button" aria-label="Previous week" onClick={() => moveWeek(-1)}><ArrowLeft size={15} /></button><button className="icon-button" aria-label="Next week" onClick={() => moveWeek(1)}><ArrowRight size={15} /></button></div></div>
            <div className="planner-week-days">
              {week.map(({ date, key, count }) => <button key={key} className={`planner-day ${key === selectedDate ? "selected" : ""} ${key === localDateKey() ? "is-today" : ""}`} onClick={() => setSelectedDate(key)} aria-pressed={key === selectedDate} aria-label={`${dateLabel(date, { weekday: "long", month: "long", day: "numeric" })}: ${count} task${count === 1 ? "" : "s"}`}>
                <span>{dateLabel(date, { weekday: "short" })}</span><strong>{date.getDate()}</strong><small>{count}</small>{count > 0 && <i />}
              </button>)}
            </div>
            <button className="planner-today-link" onClick={() => setSelectedDate(localDateKey())}>Jump to today</button>
          </section>

          <section className="panel planner-insights">
            <div className="planner-side-heading"><div><span className="eyebrow">CLEAR, PRACTICAL, PERSONAL</span><h3>Today's Smart Suggestions</h3></div><Sparkles size={17} /></div>
            <div className="planner-recommendations">
              {recommendations.map(({ icon: Icon, title, detail, tone }) => <div className={`planner-recommendation tone-${tone}`} key={title}><span><Icon size={15} /></span><div><strong>{title}</strong><p>{detail}</p></div></div>)}
            </div>
          </section>

          <section className="panel planner-scorecard">
            <div className="planner-side-heading"><div><span className="eyebrow">SMALL STEPS ADD UP</span><h3>Progress & goals</h3></div><Target size={17} /></div>
            <div className="planner-score-row"><span>High-priority completion</span><strong>{highPriorityTasks.length ? `${highProgress}%` : "—"}</strong></div>
            <div className="planner-small-track"><i className="high-track-fill" style={{ width: `${highProgress ?? 0}%` }} /></div>
            <div className="planner-score-row"><span>Productivity score</span><strong>{dayTasks.length ? `${dailyProgress}%` : "—"}</strong></div>
            <div className="planner-score-row goal-row"><label htmlFor="daily-goal">Daily task goal</label><div><input id="daily-goal" type="number" min="1" max="50" value={preferences.dailyGoal} onChange={(event) => {
              const nextGoal = Math.max(1, Math.min(50, Number(event.target.value) || 1));
              storePreferences({ ...preferences, dailyGoal: nextGoal });
            }} /><span>tasks</span></div></div>
            <div className="planner-small-track"><i className="goal-track-fill" style={{ width: `${goalProgress ?? 0}%` }} /></div>
            <p className="goal-caption">{dayTasks.length ? `${completed} of ${preferences.dailyGoal} tasks toward your daily goal` : "Add tasks to track your daily goal."}</p>
            <div className="remaining-callout"><span><Clock3 size={14} /></span>{pending} {pending === 1 ? "task" : "tasks"} remaining for {selectedDate === localDateKey() ? "today" : dateLabel(selectedDateObject, { weekday: "long" })}</div>
          </section>
        </aside>
      </div>

      {dialog && <TaskForm task={dialog.task} onSave={saveTask} onClose={() => setDialog(null)} />}
      {rescheduleTask && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setRescheduleTask(null)}><form className="task-modal planner-reschedule-modal" role="dialog" aria-modal="true" aria-labelledby="reschedule-title" onSubmit={reschedule}><div className="modal-heading"><div><span className="eyebrow">UPDATE YOUR PLAN</span><h2 id="reschedule-title">Reschedule task</h2></div><button type="button" className="icon-button" aria-label="Close" onClick={() => setRescheduleTask(null)}>×</button></div><p className="reschedule-task-title">{rescheduleTask.title}</p><label className="field-label" htmlFor="reschedule-date">New due date</label><input id="reschedule-date" type="date" min={localDateKey()} value={rescheduleDate} onChange={(event) => setRescheduleDate(event.target.value)} required /><div className="modal-actions"><button type="button" className="button button-quiet" onClick={() => setRescheduleTask(null)}>Cancel</button><button type="submit" className="button button-primary">Save new date</button></div></form></div>}
    </motion.div>
  );
}
