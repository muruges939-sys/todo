import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Pause, Play, RotateCcw, Sparkles, Timer, Volume2 } from "lucide-react";
import { useTasks } from "../context/useTasks";
import { localDateKey } from "../utils/tasks";

const modes = [{ id: "Focus", minutes: 25 }, { id: "Short break", minutes: 5 }, { id: "Long break", minutes: 15 }];
const SESSIONS_KEY = "taskflow-focus-sessions";
const SceneAccent = lazy(() => import("../components/SceneAccent"));

function readSessions() {
  try {
    const saved = JSON.parse(localStorage.getItem(SESSIONS_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  }
  catch (error) { console.error("Could not read focus session history.", error); return []; }
}

function playChime() {
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return;
  const audioContext = new AudioContextClass();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.frequency.value = 880;
  gain.gain.setValueAtTime(0.08, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.45);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.onended = () => audioContext.close();
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.45);
}

export default function Focus() {
  const { tasks, notify } = useTasks();
  const [mode, setMode] = useState(modes[0]);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(readSessions);
  const [selectedTask, setSelectedTask] = useState("");
  const [muted, setMuted] = useState(false);
  const totalSeconds = mode.minutes * 60;
  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100;
  const todaySessions = useMemo(() => sessions.filter((session) => session.date === localDateKey()).length, [sessions]);
  const remainingTasks = tasks.filter((task) => task.status !== "completed");
  const selectedTitle = remainingTasks.find((task) => String(task.id) === selectedTask)?.title;

  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setTimeout(() => {
      if (secondsLeft > 1) {
        setSecondsLeft(secondsLeft - 1);
        return;
      }
      setSecondsLeft(0);
      setRunning(false);
      if (mode.id === "Focus") {
        const next = [...readSessions(), { date: localDateKey(), endedAt: new Date().toISOString() }];
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(next));
        setSessions(next);
        notify("Focus session complete. Take a well-earned break!");
      } else notify("Break's over. Ready to focus again?");
      if (!muted) playChime();
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [running, secondsLeft, mode, notify, muted]);

  const chooseMode = (next) => {
    setMode(next); setRunning(false); setSecondsLeft(next.minutes * 60);
  };
  const reset = () => { setRunning(false); setSecondsLeft(totalSeconds); };
  const start = () => {
    if (secondsLeft === 0) setSecondsLeft(totalSeconds);
    setRunning(true);
  };
  const formatTime = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;

  return (
    <motion.div className="page-content focus-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="page-intro-row focus-page-intro"><div><span className="eyebrow">LESS SCROLLING, MORE FLOW</span><h2>Focus mode</h2><p>Give one thing your full attention.</p></div><div className="page-intro-actions"><Suspense fallback={<div className="scene-accent-fallback" />}><SceneAccent variant="focus" /></Suspense><button className={`icon-button sound-toggle ${muted ? "muted" : ""}`} onClick={() => setMuted((value) => !value)} aria-label={muted ? "Enable sound" : "Mute sound"}><Volume2 size={18} /></button></div></div>
      <div className="focus-layout">
        <section className="focus-card">
          <div className="focus-glow" />
          <div className="mode-tabs">{modes.map((item) => <button key={item.id} className={mode.id === item.id ? "active" : ""} onClick={() => chooseMode(item)}>{item.id}</button>)}</div>
          <div className="timer-wrap">
            <svg className="timer-ring" viewBox="0 0 260 260"><circle className="timer-track" cx="130" cy="130" r="115" /><circle className="timer-value" cx="130" cy="130" r="115" style={{ strokeDasharray: `${Math.min(progress, 100) * 7.23} 723` }} /></svg>
            <div className="timer-readout"><span>{mode.id === "Focus" ? "TIME TO FOCUS" : "TAKE A BREATHER"}</span><strong>{formatTime}</strong><em>{running ? "You're in the zone" : secondsLeft === 0 ? "Session complete" : "Ready when you are"}</em></div>
          </div>
          <div className="timer-controls"><button className="button button-primary timer-start" onClick={() => running ? setRunning(false) : start()}>{running ? <><Pause size={17} />Pause</> : <><Play size={17} fill="currentColor" />{secondsLeft === totalSeconds ? "Start focusing" : "Resume"}</>}</button><button className="icon-button reset-button" onClick={reset} aria-label="Reset timer"><RotateCcw size={17} /></button></div>
          <div className="focus-task-select"><label htmlFor="focus-task">FOCUSING ON</label><select id="focus-task" value={selectedTask} onChange={(event) => setSelectedTask(event.target.value)}><option value="">Choose a task (optional)</option>{remainingTasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></div>
        </section>
        <aside className="focus-aside">
          <section className="panel focus-stat-panel"><span className="eyebrow">TODAY'S MOMENTUM</span><div className="focus-session-number"><strong>{todaySessions}</strong><span>focus sessions</span><div className="focus-session-icon"><Timer size={19} /></div></div><div className="session-progress">{[0, 1, 2, 3].map((item) => <i key={item} className={item < Math.min(todaySessions, 4) ? "filled" : ""} />)}</div><p>{todaySessions ? "You're building a good rhythm." : "One session is a great place to start."}</p></section>
          <section className="focus-quote"><div className="quote-spark"><Sparkles size={16} /></div><blockquote>“The secret of getting ahead is getting started.”</blockquote><span>MARK TWAIN</span></section>
          {selectedTitle && <div className="focus-current"><span className="eyebrow">YOUR INTENTION</span><p><Check size={14} />{selectedTitle}</p></div>}
        </aside>
      </div>
    </motion.div>
  );
}
