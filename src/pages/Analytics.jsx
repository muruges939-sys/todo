import { lazy, Suspense, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { ArrowUpRight, CheckCircle2, Plus, Sparkles, Target } from "lucide-react";
import { useTasks } from "../context/useTasks";
import TaskForm from "../components/TaskForm";

const colors = ["#9c7bf6", "#66c9ac", "#6ea6f7"];
const SceneAccent = lazy(() => import("../components/SceneAccent"));
function getCompletionData(tasks, range, period) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  if (range === "7 days") start.setDate(start.getDate() - 6);
  else if (range === "30 days") start.setDate(start.getDate() - 29);
  else {
    const recordedDates = tasks.flatMap((task) => [task.createdAt, task.completedAt].filter(Boolean).map((value) => new Date(value)));
    if (recordedDates.length) {
      const earliest = new Date(Math.min(...recordedDates.map((date) => date.getTime())));
      start.setTime(earliest.getTime());
      start.setHours(0, 0, 0, 0);
    }
  }

  const cutoff = new Date(start);
  if (period === "Weekly") start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  if (period === "Monthly") start.setDate(1);
  const buckets = [];
  for (let cursor = new Date(start); cursor <= today; ) {
    const next = new Date(cursor);
    if (period === "Weekly") next.setDate(next.getDate() + 7);
    else if (period === "Monthly") next.setMonth(next.getMonth() + 1);
    else next.setDate(next.getDate() + 1);
    const label = period === "Monthly"
      ? cursor.toLocaleDateString(undefined, { month: "short", year: "2-digit" })
      : period === "Weekly"
        ? cursor.toLocaleDateString(undefined, { month: "short", day: "numeric" })
        : range === "7 days"
          ? cursor.toLocaleDateString(undefined, { weekday: "short" })
          : cursor.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const completed = tasks.filter((task) => {
      if (!task.completedAt) return false;
      const completedDate = new Date(task.completedAt);
      return completedDate >= cutoff && completedDate >= cursor && completedDate < next;
    }).length;
    buckets.push({ label, completed });
    cursor = next;
  }
  return buckets;
}

export default function Analytics() {
  const { tasks, addTask, notify } = useTasks();
  const [range, setRange] = useState("7 days");
  const [period, setPeriod] = useState("Daily");
  const [dialogOpen, setDialogOpen] = useState(false);
  const completed = tasks.filter((task) => task.status === "completed").length;
  const pending = tasks.length - completed;
  const rate = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const completionData = useMemo(() => getCompletionData(tasks, range, period), [tasks, range, period]);
  const priorityData = ["High", "Medium", "Low"].map((priority) => ({ name: priority, value: tasks.filter((task) => task.priority === priority).length }));
  const categoryData = [...new Set(tasks.map((task) => task.category))].map((category) => ({
    name: category, total: tasks.filter((task) => task.category === category).length,
    done: tasks.filter((task) => task.category === category && task.status === "completed").length,
  }));
  const pieData = [{ name: "Completed", value: completed }, { name: "Pending", value: pending }];
  const saveFirstTask = (task) => {
    addTask(task);
    setDialogOpen(false);
    notify("Task added to your workspace.");
  };

  return (
    <motion.div className="page-content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="page-intro-row analytics-intro"><div><span className="eyebrow">YOUR PROGRESS, IN PERSPECTIVE</span><h2>Analytics</h2><p>A closer look at how you make things happen.</p></div><div className="page-intro-actions analytics-intro-actions"><Suspense fallback={<div className="scene-accent-fallback" />}><SceneAccent variant="analytics" /></Suspense>{tasks.length > 0 && <label className="select-control"><span>Show</span><select value={range} onChange={(event) => setRange(event.target.value)}><option>7 days</option><option>30 days</option><option>All time</option></select></label>}</div></div>
      {tasks.length ? <>
      <section className="analytics-summary">
        <div className="analytics-highlight"><div className="highlight-icon"><Target size={19} /></div><div><span>Overall completion</span><strong>{rate}<small>%</small></strong></div><div className="highlight-trend"><ArrowUpRight size={14} /> Based on {tasks.length} tasks</div><div className="ring-wrap"><svg viewBox="0 0 42 42" className="progress-ring"><circle cx="21" cy="21" r="16" /><circle className="ring-value" cx="21" cy="21" r="16" style={{ strokeDasharray: `${rate} 100` }} /></svg></div></div>
        <div className="analytics-small"><CheckCircle2 size={18} /><span>Completed</span><strong>{completed}</strong><small>tasks finished</small></div>
        <div className="analytics-small pending-stat"><span className="pending-square" /><span>In your queue</span><strong>{pending}</strong><small>tasks remaining</small></div>
      </section>
      <div className="chart-grid">
        <section className="panel chart-panel chart-wide"><div className="chart-heading"><div><h3>Tasks completed</h3><p>Finished tasks over time</p></div><div className="chart-heading-actions"><div className="period-tabs">{["Daily", "Weekly", "Monthly"].map((item) => <button key={item} className={period === item ? "active" : ""} onClick={() => setPeriod(item)}>{item}</button>)}</div><div className="chart-legend"><i /> Completed</div></div></div>
          <div className="chart-area"><ResponsiveContainer width="100%" height="100%"><BarChart data={completionData} margin={{ top: 10, right: 6, left: -24, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--chart-grid)" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} dy={8} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} /><Tooltip cursor={{ fill: "rgba(142, 113, 220, .08)" }} contentStyle={{ background: "var(--surface-strong)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text)" }} /><Bar dataKey="completed" name="Completed" fill="#9c7bf6" radius={[5, 5, 0, 0]} maxBarSize={34} /></BarChart></ResponsiveContainer></div>
          {!tasks.length && <div className="chart-overlay">Your task activity will appear here.</div>}
        </section>
        <section className="panel chart-panel"><div className="chart-heading"><div><h3>Task status</h3><p>Completed vs. remaining</p></div></div><div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} dataKey="value" nameKey="name" innerRadius={61} outerRadius={83} paddingAngle={4} stroke="none">{pieData.map((item, index) => <Cell key={item.name} fill={index === 0 ? "#65c7a8" : "#e5e1ef"} />)}</Pie><Tooltip contentStyle={{ background: "var(--surface-strong)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text)" }} /></PieChart></ResponsiveContainer><div className="donut-center"><strong>{rate}%</strong><span>complete</span></div></div><div className="donut-legend"><span><i className="legend-green" />Completed <b>{completed}</b></span><span><i className="legend-gray" />Remaining <b>{pending}</b></span></div></section>
        <section className="panel chart-panel"><div className="chart-heading"><div><h3>Priority mix</h3><p>Tasks by importance</p></div></div><div className="priority-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={priorityData} layout="vertical" margin={{ top: 5, right: 16, left: 3, bottom: 0 }}><CartesianGrid horizontal={false} stroke="var(--chart-grid)" /><XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} /><YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} width={52} /><Tooltip contentStyle={{ background: "var(--surface-strong)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text)" }} /><Bar dataKey="value" name="Tasks" radius={[0, 5, 5, 0]} maxBarSize={19}>{priorityData.map((item, index) => <Cell key={item.name} fill={["#ed9a83", "#9c7bf6", "#75aaf0"][index]} />)}</Bar></BarChart></ResponsiveContainer></div></section>
        <section className="panel chart-panel category-panel"><div className="chart-heading"><div><h3>By category</h3><p>Progress across your focus areas</p></div></div>
          {categoryData.length ? <div className="category-bars">{categoryData.map((item, index) => <div className="category-bar-row" key={item.name}><div className="category-bar-label"><span>{item.name}</span><small>{item.done}/{item.total}</small></div><div className="category-track"><i style={{ width: `${item.total ? item.done / item.total * 100 : 0}%`, background: colors[index % colors.length] }} /></div></div>)}</div> : <div className="empty-chart">Create tasks to see category insights.</div>}
        </section>
      </div>
      </> : <section className="panel analytics-empty-workspace"><div className="analytics-empty-visual"><Sparkles size={26} /></div><span className="eyebrow">YOUR INSIGHTS WILL GROW WITH YOU</span><h3>Complete your first task to unlock productivity insights.</h3><p>Once you add tasks and make progress, your real activity will appear here.</p><button className="button button-primary" onClick={() => setDialogOpen(true)}><Plus size={16} />Add Your First Task</button></section>}
      {dialogOpen && <TaskForm onSave={saveFirstTask} onClose={() => setDialogOpen(false)} />}
    </motion.div>
  );
}