import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, MeshDistortMaterial } from "@react-three/drei";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Camera, Check, Sparkles, UserRound } from "lucide-react";
import * as THREE from "three";

function SceneObjects({ reducedMotion }) {
  const group = useRef(null);
  const { pointer, setFrameloop } = useThree();
  const particles = useMemo(() => {
    const points = new Float32Array(150 * 3);
    for (let index = 0; index < points.length; index += 3) {
      const noise = (seed) => {
        const value = Math.sin(seed * 78.233) * 43758.5453;
        return value - Math.floor(value);
      };
      points[index] = (noise(index + 1) - 0.5) * 11;
      points[index + 1] = (noise(index + 2) - 0.5) * 7;
      points[index + 2] = (noise(index + 3) - 0.5) * 5;
    }
    return points;
  }, []);

  useEffect(() => {
    const updateRendering = () => setFrameloop(document.hidden ? "never" : reducedMotion ? "demand" : "always");
    updateRendering();
    document.addEventListener("visibilitychange", updateRendering);
    return () => document.removeEventListener("visibilitychange", updateRendering);
  }, [reducedMotion, setFrameloop]);

  useFrame((state, delta) => {
    if (document.hidden || !group.current) return;
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, pointer.x * 0.19, 3, delta);
    group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, -pointer.y * 0.15, 3, delta);
    group.current.position.y = Math.sin(state.clock.elapsedTime * 0.35) * 0.06;
  });

  return (
    <group ref={group}>
      <points>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[particles, 3]} /></bufferGeometry>
        <pointsMaterial color="#b9a0ff" size={0.018} transparent opacity={0.7} sizeAttenuation />
      </points>
      <Float speed={1.1} rotationIntensity={0.25} floatIntensity={0.22}>
        <mesh position={[0, 0, 0]}>
          <icosahedronGeometry args={[0.94, 4]} />
          <MeshDistortMaterial color="#985bfa" emissive="#47128e" emissiveIntensity={0.55} roughness={0.16} metalness={0.48} distort={0.22} speed={1.4} />
        </mesh>
      </Float>
      <mesh rotation={[0.65, 0.35, 0]} scale={1.55}>
        <torusGeometry args={[1.1, 0.014, 8, 120]} />
        <meshBasicMaterial color="#e687ff" transparent opacity={0.85} />
      </mesh>
      <mesh rotation={[1.15, 0.1, 0.3]} scale={1.78}>
        <torusGeometry args={[1.1, 0.006, 6, 120]} />
        <meshBasicMaterial color="#6e98ff" transparent opacity={0.62} />
      </mesh>
      <Float speed={1.8} rotationIntensity={0.7} floatIntensity={0.6}>
        <mesh position={[-1.42, 0.75, 0.12]} rotation={[0.5, 0.6, 0]}>
          <octahedronGeometry args={[0.16, 0]} />
          <meshStandardMaterial color="#b6a0ff" emissive="#7851e7" emissiveIntensity={1.7} metalness={0.45} roughness={0.2} />
        </mesh>
      </Float>
      <Float speed={1.3} rotationIntensity={0.55} floatIntensity={0.45}>
        <mesh position={[1.42, -0.78, 0.3]}>
          <icosahedronGeometry args={[0.19, 1]} />
          <meshStandardMaterial color="#ff83e1" emissive="#8f236e" emissiveIntensity={1.3} metalness={0.35} roughness={0.25} />
        </mesh>
      </Float>
      <mesh position={[-1.7, -0.55, -0.4]}>
        <sphereGeometry args={[0.09, 24, 24]} />
        <meshBasicMaterial color="#82d8ff" />
      </mesh>
      <pointLight position={[0, 0, 1.4]} color="#bd69ff" intensity={20} distance={5} />
      <pointLight position={[1.7, -0.2, 1]} color="#ec57c9" intensity={12} distance={4} />
      <ambientLight intensity={0.6} />
    </group>
  );
}

function IntroScene({ reducedMotion }) {
  return (
    <div className="intro-scene" aria-hidden="true">
      <Suspense fallback={<div className="intro-orb-fallback" />}>
        <Canvas camera={{ position: [0, 0, 5.2], fov: 42 }} dpr={[1, 1.3]} frameloop={reducedMotion ? "demand" : "always"} gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}>
          <SceneObjects reducedMotion={reducedMotion} />
        </Canvas>
      </Suspense>
    </div>
  );
}

const enterTransition = { duration: 0.65, ease: [0.2, 0.75, 0.25, 1] };

export default function WelcomeIntro({ onComplete, requiresProfile = false }) {
  const reducedMotion = useReducedMotion();
  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [photo, setPhoto] = useState("");
  const [formError, setFormError] = useState("");

  const choosePhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFormError("Choose an image file for your profile picture.");
      return;
    }
    if (file.size > 1_500_000) {
      setFormError("Choose an image smaller than 1.5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPhoto(reader.result);
        setFormError("");
      }
    };
    reader.onerror = () => setFormError("This image could not be loaded. Please try another.");
    reader.readAsDataURL(file);
  };

  const submitProfile = (event) => {
    event.preventDefault();
    const name = fullName.trim();
    if (!name) {
      setFormError("Enter your full name to get started.");
      return;
    }
    const saved = onComplete({
      fullName: name,
      displayName: displayName.trim(),
      photo,
      preferences: {},
    });
    if (saved === false) setFormError("Your profile could not be saved. Check browser storage and try again.");
  };

  return (
    <motion.main className={`intro-screen ${requiresProfile ? "onboarding-screen" : ""}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.04, filter: "blur(8px)" }} transition={enterTransition}>
      <div className="intro-aurora aurora-one" />
      <div className="intro-aurora aurora-two" />
      <div className="intro-stars" />
      <div className="intro-grid" />
      <IntroScene reducedMotion={reducedMotion} />
      <motion.header className="intro-header" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...enterTransition, delay: 0.12 }}>
        <div className="intro-brand"><span className="intro-brand-icon"><Sparkles size={17} /></span><span>TASKFLOW<span className="intro-brand-dot">.</span></span></div>
        {!requiresProfile && <button className="intro-skip" onClick={() => onComplete()}>Skip intro <ArrowRight size={14} /></button>}
      </motion.header>
      <div className={`intro-content ${requiresProfile ? "onboarding-content" : ""}`}>
        {requiresProfile ? (
          <>
            <motion.div className="intro-orbit-label" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...enterTransition, delay: 0.3 }}>
              <span className="intro-live-dot" /> YOUR SPACE TO DO GREAT THINGS
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 22, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ ...enterTransition, delay: 0.45 }}>
              Welcome to<br /><span>TASKFLOW</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...enterTransition, delay: 0.6 }}>
              Your productivity journey starts here.
            </motion.p>
            <motion.form className="onboarding-form" onSubmit={submitProfile} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...enterTransition, delay: 0.7 }}>
              <label className="onboarding-field"><span>Full name <b>Required</b></span><input autoComplete="name" maxLength={80} required value={fullName} onChange={(event) => { setFullName(event.target.value); setFormError(""); }} placeholder="What should we call you?" /></label>
              <label className="onboarding-field"><span>Preferred display name <b>Optional</b></span><input autoComplete="nickname" maxLength={40} value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="How would you like to be greeted?" /></label>
              <label className="onboarding-photo">
                <span className="onboarding-photo-preview">{photo ? <img src={photo} alt="" /> : <UserRound size={20} />}</span>
                <span><strong>{photo ? "Change profile picture" : "Add a profile picture"}</strong><small>Optional · Image up to 1.5 MB</small></span>
                <Camera size={17} />
                <input type="file" accept="image/*" aria-label="Upload an optional profile picture" onChange={choosePhoto} />
              </label>
              {formError && <p className="onboarding-error" role="alert">{formError}</p>}
              <button className="intro-start" type="submit">Get Started <ArrowRight size={17} /></button>
              <span className="intro-private"><Check size={13} /> Your profile and tasks stay private on this device</span>
            </motion.form>
          </>
        ) : (
          <>
            <motion.div className="intro-orbit-label" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...enterTransition, delay: 0.3 }}>
              <span className="intro-live-dot" /> YOUR SPACE TO DO GREAT THINGS
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 22, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ ...enterTransition, delay: 0.45 }}>
              WELCOME TO<br /><span>TASKFLOW</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...enterTransition, delay: 0.6 }}>
              Organize Your Life. Focus on Your Goals.<br className="intro-mobile-break" /> Achieve More.
            </motion.p>
            <motion.div className="intro-actions" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...enterTransition, delay: 0.76 }}>
              <button className="intro-start" onClick={() => onComplete()}>Get started <ArrowRight size={17} /></button>
              <span className="intro-private"><Check size={13} /> Your tasks stay private on this device</span>
            </motion.div>
          </>
        )}
      </div>
      <motion.div className="intro-bottom-note" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1, duration: 0.7 }}>
        {requiresProfile ? "YOUR PROFILE STAYS ON THIS DEVICE" : "MADE FOR MOMENTUM"} <span /> BUILT FOR YOU
      </motion.div>
    </motion.main>
  );
}
