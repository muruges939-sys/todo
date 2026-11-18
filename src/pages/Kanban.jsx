import { useState } from "react";
import { motion } from "framer-motion";
import { Columns3, Plus, Sparkles } from "lucide-react";
import { useTasks } from "../context/useTasks";
import TaskCard from "../components/TaskCard";
import TaskForm from "../components/TaskForm";

const columns = [
  { id: "todo", title: "To do", color: "violet" },
  { id: "in-progress", title: "In progress", color: "blue" },
  { id: "completed", title: "Completed", color: "green" },
];

export default function Kanban() {
  const { tasks, search, addTask, updateTask, deleteTask, notify } = useTasks();
  const [dragging, setDragging] = useState(null);
  const [dialog, setDialog] = useState(null);
  const filtered = tasks.filter((task) => task.title.toLowerCase().includes(search.toLowerCase()));
  const moveTask = (task, status) => {
    if (task.status !== status) {
      updateTask(task.id, { status });
      notify(`Moved to ${columns.find((column) => column.id === status).title}.`);
    }
  };
  const toggle = (task) => {
    const completing = task.status !== "completed";
    updateTask(task.id, { status: completing ? "completed" : "todo" });
    notify(completing ? "Great job! Task completed!" : "Task moved back to To do.");
  };
  const remove = (task) => { deleteTask(task.id); notify("Task deleted successfully."); };
  const save = (data) => {
    if (dialog?.task) { updateTask(dialog.task.id, data); notify("Task updated."); }
    else { addTask(data); notify("Task added to your board."); }
    setDialog(null);
  };

  return (
    <motion.div className="page-content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="page-intro-row"><div><span className="eyebrow">SEE THE WHOLE PICTURE</span><h2>Project board</h2><p>Drag a task between columns to update its status.</p></div><button className="button button-primary" onClick={() => setDialog({ task: null })}><Plus size={17} />New task</button></div>
      {!tasks.length ? <section className="panel board-empty-workspace"><div className="board-empty-visual"><Columns3 size={25} /><Sparkles size={13} /></div><span className="eyebrow">A FRESH START</span><h3>Your board is ready.</h3><p>Add your first task and it will appear here, ready for you to organize.</p><button className="button button-primary" onClick={() => setDialog({ task: null })}><Plus size={16} />Add Your First Task</button></section> : <div className="kanban-board">
        {columns.map((column) => {
          const items = filtered.filter((task) => task.status === column.id);
          return <section key={column.id} className={`kanban-column column-${column.color}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const task = tasks.find((item) => item.id === dragging); if (task) moveTask(task, column.id); setDragging(null); }}>
            <div className="column-heading"><div><span className={`column-dot ${column.color}`} /><h3>{column.title}</h3><span className="column-count">{items.length}</span></div><button className="icon-button column-add" aria-label={`Add task to ${column.title}`} onClick={() => setDialog({ task: null })}><Plus size={16} /></button></div>
            <div className="column-content">
              {items.map((task) => <TaskCard key={task.id} task={task} draggable onDragStart={() => setDragging(task.id)} onDragEnd={() => setDragging(null)} onToggle={toggle} onEdit={(item) => setDialog({ task: item })} onDelete={remove} />)}
              {!items.length && <div className="column-empty">Drop tasks here</div>}
            </div>
          </section>;
        })}
      </div>}
      {dialog && <TaskForm task={dialog.task} onSave={save} onClose={() => setDialog(null)} />}
    </motion.div>
  );
}