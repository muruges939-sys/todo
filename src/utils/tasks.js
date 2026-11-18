export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function isOverdue(task) {
  if (task.status === "completed" || !task.dueDate) return false;
  const deadline = new Date(`${task.dueDate}T${task.dueTime || "23:59"}`);
  return deadline.getTime() < Date.now();
}

export function formatDue(task) {
  if (!task.dueDate) return "No due date";
  const date = new Date(`${task.dueDate}T00:00:00`);
  const day = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return task.dueTime ? `${day} · ${task.dueTime}` : day;
}
