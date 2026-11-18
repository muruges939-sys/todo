import { useEffect, useState } from "react";
import { X } from "lucide-react";

const blankTask = { title: "", category: "Personal", priority: "Medium", dueDate: "", dueTime: "", durationMinutes: "", notes: "" };

export default function TaskForm({ task, initialValues, onSave, onClose }) {
  const [form, setForm] = useState(task ? { ...blankTask, ...task } : { ...blankTask, ...initialValues });
  const [error, setError] = useState("");

  useEffect(() => {
    const handleKeyDown = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const change = (event) => {
    setError("");
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };
  const submit = (event) => {
    event.preventDefault();
    if (!form.title.trim()) { setError("Give your task a name to get started."); return; }
    if (form.durationMinutes && (!/^\d+$/.test(String(form.durationMinutes)) || Number(form.durationMinutes) < 5 || Number(form.durationMinutes) > 480)) {
      setError("Estimated duration must be between 5 and 480 minutes.");
      return;
    }
    if (form.dueDate && form.dueTime && new Date(`${form.dueDate}T${form.dueTime}`) < new Date() && (!task || task.dueDate !== form.dueDate || task.dueTime !== form.dueTime)) {
      setError("Choose a due date and time in the future."); return;
    }
    onSave({ ...form, title: form.title.trim(), durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : "" });
  };

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="task-modal" role="dialog" aria-modal="true" aria-labelledby="task-modal-title" onSubmit={submit} noValidate>
        <div className="modal-heading"><div><span className="eyebrow">TASK DETAILS</span><h2 id="task-modal-title">{task ? "Edit task" : "Create a task"}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button></div>
        <label className="field-label" htmlFor="task-title">Task name</label>
        <input id="task-title" name="title" value={form.title} onChange={change} maxLength={120} placeholder="What needs to get done?" autoFocus />
        <div className="form-grid">
          <div><label className="field-label" htmlFor="task-category">Category</label><select id="task-category" name="category" value={form.category} onChange={change}><option>Personal</option><option>Work</option><option>Learning</option><option>Health</option><option>Development</option><option>Other</option></select></div>
          <div><label className="field-label" htmlFor="task-priority">Priority</label><select id="task-priority" name="priority" value={form.priority} onChange={change}><option>Low</option><option>Medium</option><option>High</option></select></div>
          <div><label className="field-label" htmlFor="task-date">Due date</label><input id="task-date" name="dueDate" type="date" value={form.dueDate} onChange={change} /></div>
          <div><label className="field-label" htmlFor="task-time">Due time</label><input id="task-time" name="dueTime" type="time" value={form.dueTime} onChange={change} /></div>
          <div><label className="field-label" htmlFor="task-duration">Estimated duration <span className="optional">(optional, minutes)</span></label><input id="task-duration" name="durationMinutes" type="number" min="5" max="480" step="5" value={form.durationMinutes || ""} onChange={change} placeholder="e.g. 30" /></div>
        </div>
        <label className="field-label" htmlFor="task-notes">Description <span className="optional">(optional)</span></label>
        <textarea id="task-notes" name="notes" value={form.notes || ""} onChange={change} rows="3" maxLength={500} placeholder="Add a little more context..." />
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button type="submit" className="button button-primary">{task ? "Save changes" : "Create task"}</button></div>
      </form>
    </div>
  );
}
