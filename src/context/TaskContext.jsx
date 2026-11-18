import { useCallback, useEffect, useMemo, useState } from "react";
import { TaskContext } from "./taskContextValue";

const STORAGE_KEY = "taskflow-tasks";
const DEMO_TASK_TITLES = new Set([
  "complete react project",
  "practice java programming",
  "update github profile",
  "review internship concepts",
]);

function readTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(saved)) return [];
    return saved
      .filter((task) => !DEMO_TASK_TITLES.has(String(task.title || "").trim().toLowerCase()))
      .map((task) => ({
      ...task,
      status: task.status || (task.done ? "completed" : "todo"),
      dueDate: task.dueDate || "",
      dueTime: task.dueTime || "",
      priority: task.priority || "Medium",
      category: task.category || "Personal",
      createdAt: task.createdAt || new Date().toISOString(),
      }));
  } catch (error) {
    console.error("Could not read saved tasks.", error);
    return [];
  }
}

export function TaskProvider({ children }) {
  const [tasks, setTasks] = useState(readTasks);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error("Could not save tasks to local storage.", error);
      window.dispatchEvent(new CustomEvent("taskflow-storage-error"));
    }
  }, [tasks]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const addTask = useCallback((task) => {
    const savedTask = {
      ...task,
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      status: "todo",
      done: false,
      createdAt: new Date().toISOString(),
    };
    setTasks((current) => [savedTask, ...current]);
    return savedTask;
  }, []);

  const updateTask = useCallback((id, changes) => {
    setTasks((current) => current.map((task) => {
      if (task.id !== id) return task;
      const updated = { ...task, ...changes };
      if (changes.status) {
        updated.done = changes.status === "completed";
        updated.completedAt = updated.done ? new Date().toISOString() : "";
      }
      if (typeof changes.done === "boolean") {
        updated.status = changes.done ? "completed" : "todo";
        updated.completedAt = changes.done ? new Date().toISOString() : "";
      }
      return updated;
    }));
  }, []);

  const deleteTask = useCallback((id) => {
    setTasks((current) => current.filter((task) => task.id !== id));
  }, []);

  const clearTasks = useCallback(() => setTasks([]), []);
  const notify = useCallback((message) => setToast(message), []);
  const value = useMemo(() => ({
    tasks, setTasks, addTask, updateTask, deleteTask, clearTasks,
    search, setSearch, toast, notify,
  }), [tasks, addTask, updateTask, deleteTask, clearTasks, search, toast, notify]);

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}
