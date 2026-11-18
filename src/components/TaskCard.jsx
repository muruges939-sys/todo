import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Clock3, Pencil, Trash2 } from "lucide-react";
import { formatDue, isOverdue, localDateKey } from "../utils/tasks";

const priorityLabel = { High: "HIGH PRIORITY", Medium: "MEDIUM PRIORITY", Low: "LOW PRIORITY" };

function dueLabel(task, overdue) {
  if (overdue) return "Overdue";
  if (!task.dueDate) return "";
  if (task.status === "completed") return formatDue(task);
  if (task.dueDate === localDateKey()) return "Due Today";
  return "Upcoming";
}

export default function TaskCard({
  task, onToggle, onEdit, onDelete, onDragStart, onDragEnd, draggable = false, compact = false,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const timer = useRef(null);
  const overdue = isOverdue(task);
  const done = task.status === "completed";
  const priority = task.priority || "Medium";
  const priorityClass = `priority-${priority.toLowerCase()}`;
  const dueText = dueLabel(task, overdue);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const toggle = () => {
    if (!done) {
      setCelebrating(true);
      timer.current = window.setTimeout(() => setCelebrating(false), 1050);
    }
    onToggle(task);
  };

  const confirmRemoval = () => {
    setRemoving(true);
    timer.current = window.setTimeout(() => onDelete(task), 240);
  };

  const tilt = (event) => {
    if (draggable || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    event.currentTarget.style.setProperty("--tilt-x", `${(0.5 - y) * 2.2}deg`);
    event.currentTarget.style.setProperty("--tilt-y", `${(x - 0.5) * 2.6}deg`);
  };

  return (
    <motion.article
      layout
      className={`task-card ${priorityClass}-card ${done ? "task-completed" : ""} ${compact ? "task-card-compact" : ""} ${removing ? "task-removing" : ""} ${celebrating ? "task-celebrating" : ""}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onMouseMove={tilt}
      onMouseLeave={(event) => {
        event.currentTarget.style.setProperty("--tilt-x", "0deg");
        event.currentTarget.style.setProperty("--tilt-y", "0deg");
      }}
      transition={{ layout: { duration: 0.24, ease: "easeOut" } }}
    >
      <button
        className={`task-check ${done ? "checked" : ""}`}
        onClick={toggle}
        aria-label={done ? "Mark as not completed" : "Mark as completed"}
        title={done ? "Mark as not completed" : "Mark as completed"}
      >
        {done && <motion.svg viewBox="0 0 16 16" aria-hidden="true"><motion.path d="m3.3 8.2 3.1 3.1 6.4-6.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.24 }} /></motion.svg>}
      </button>
      <div className="task-main">
        <div className="task-title-line">
          <h3>{task.title}</h3>
          <span className={`priority-pill ${priorityClass}`} title={`${priority} priority`}>{priorityLabel[priority] || priorityLabel.Medium}</span>
        </div>
        <p className="task-notes">{task.notes?.trim() || "No description added."}</p>
        <div className="task-meta">
          <span className="category-label"><span className={`category-dot dot-${(task.category || "Personal").toLowerCase().replace(/[^a-z]/g, "")}`} />{task.category || "Personal"}</span>
          {task.dueDate && <span className={`due-label ${overdue ? "overdue" : ""}`} title={formatDue(task)}><CalendarDays size={13} />{dueText} · {formatDue(task)}</span>}
          {Number(task.durationMinutes) >= 5 && <span className="duration-label"><Clock3 size={12} />{task.durationMinutes} min</span>}
          {task.status === "in-progress" && <span className="status-label"><Clock3 size={12} />In progress</span>}
        </div>
      </div>
      <div className="task-actions">
        <button className="task-action-button" onClick={() => onEdit(task)} aria-label="Edit task" title="Edit task"><Pencil size={15} /></button>
        <button className="task-action-button delete-action" onClick={() => setConfirmDelete(true)} aria-label="Delete task" title="Delete task"><Trash2 size={15} /></button>
      </div>
      {confirmDelete && !removing && (
        <div className="task-delete-confirm" role="alertdialog" aria-label="Confirm task deletion">
          <span>Are you sure you want to delete this task?</span>
          <div>
            <button className="confirm-cancel" onClick={() => setConfirmDelete(false)}>Cancel</button>
            <button className="confirm-delete" onClick={confirmRemoval}>Delete</button>
          </div>
        </div>
      )}
      {celebrating && <div className="task-confetti" aria-hidden="true">{Array.from({ length: 7 }, (_, index) => <i key={index} style={{ "--confetti-index": index }} />)}</div>}
    </motion.article>
  );
}
