import { lazy, Suspense, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ListFilter, Plus, SlidersHorizontal } from "lucide-react";
import { useTasks } from "../context/useTasks";
import TaskCard from "../components/TaskCard";
import TaskForm from "../components/TaskForm";

const SceneAccent = lazy(() => import("../components/SceneAccent"));

export default function MyTasks() {
  const { tasks, search, addTask, updateTask, deleteTask, notify } = useTasks();
  const [filter, setFilter] = useState("All tasks");
  const [category, setCategory] = useState("All categories");
  const [sort, setSort] = useState("Due date");
  const [dialog, setDialog] = useState(null);
  const filters = ["All tasks", "To do", "In progress", "Completed"];
  const visible = useMemo(() => {
    const result = tasks.filter((task) => {
      const stateMatch = filter === "All tasks" || (filter === "Completed" ? task.status === "completed" : filter === "In progress" ? task.status === "in-progress" : task.status !== "completed");
      const categoryMatch = category === "All categories" || task.category === category;
      return stateMatch && categoryMatch && task.title.toLowerCase().includes(search.toLowerCase());
    });
    return result.sort((a, b) => sort === "Priority" ? ["High", "Medium", "Low"].indexOf(a.priority) - ["High", "Medium", "Low"].indexOf(b.priority) : sort === "Recently added" ? new Date(b.createdAt) - new Date(a.createdAt) : (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
  }, [tasks, filter, category, sort, search]);
  const saveTask = (data) => {
    if (dialog?.task) { updateTask(dialog.task.id, data); notify("Task updated."); }
    else { addTask(data); notify("Task created."); }
    setDialog(null);
  };
  const toggle = (task) => {
    const done = task.status !== "completed";
    updateTask(task.id, { status: done ? "completed" : "todo" });
    if (done) notify("Great job! Task completed!");
  };
  const remove = (task) => { deleteTask(task.id); notify("Task deleted successfully."); };
  const completed = tasks.filter((task) => task.status === "completed").length;

  return (
    <motion.div className="page-content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
      <div className="page-intro-row task-page-intro"><div><span className="eyebrow">THE BIG AND THE SMALL</span><h2>All tasks</h2><p>Keep everything moving, one task at a time.</p></div><div className="page-intro-actions"><Suspense fallback={<div className="scene-accent-fallback" />}><SceneAccent variant="tasks" /></Suspense><button className="button button-primary" onClick={() => setDialog({ task: null })}><Plus size={17} />Add New Task</button></div></div>
      <div className="tasks-summary"><div><span className="summary-dot dot-violet" /><strong>{tasks.length}</strong><span>total</span></div><div><span className="summary-dot dot-green" /><strong>{completed}</strong><span>completed</span></div><div><span className="summary-dot dot-orange" /><strong>{tasks.length - completed}</strong><span>remaining</span></div></div>
      <div className="task-toolbar">
        <div className="filter-tabs" role="tablist" aria-label="Filter tasks">{filters.map((item) => <button key={item} role="tab" aria-selected={filter === item} className={filter === item ? "selected" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div>
        <div className="sort-controls"><label><ListFilter size={15} /><select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)}><option>All categories</option>{[...new Set(tasks.map((task) => task.category))].map((item) => <option key={item}>{item}</option>)}</select></label><label><SlidersHorizontal size={15} /><select aria-label="Sort tasks" value={sort} onChange={(event) => setSort(event.target.value)}><option>Due date</option><option>Priority</option><option>Recently added</option></select></label></div>
      </div>
      <div className="task-list page-task-list">
        {visible.map((task) => <TaskCard key={task.id} task={task} onToggle={toggle} onEdit={(item) => setDialog({ task: item })} onDelete={remove} />)}
        {!visible.length && <div className="empty-state task-empty"><div className="empty-icon"><Plus size={21} /></div><h3>{tasks.length ? "No tasks match" : "No tasks yet!"}</h3><p>{tasks.length ? "Try a different filter or search phrase." : "Create your first task and make this workspace yours."}</p>{!tasks.length && <button className="button button-primary button-small" onClick={() => setDialog({ task: null })}><Plus size={15} />Add New Task</button>}</div>}
      </div>
      {dialog && <TaskForm task={dialog.task} onSave={saveTask} onClose={() => setDialog(null)} />}
    </motion.div>
  );
}