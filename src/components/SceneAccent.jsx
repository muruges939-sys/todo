import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";

function FloatingShape({ variant }) {
  const group = useRef(null);
  const { pointer, setFrameloop } = useThree();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const updateRendering = () => setFrameloop(document.hidden ? "never" : reducedMotion ? "demand" : "always");
    updateRendering();
    document.addEventListener("visibilitychange", updateRendering);
    return () => document.removeEventListener("visibilitychange", updateRendering);
  }, [reducedMotion, setFrameloop]);

  useFrame((_, delta) => {
    if (!group.current || document.hidden) return;
    group.current.rotation.y += ((pointer.x * 0.18) - group.current.rotation.y) * Math.min(delta * 2, 1);
    group.current.rotation.x += ((-pointer.y * 0.12) - group.current.rotation.x) * Math.min(delta * 2, 1);
  });

  if (variant === "focus") {
    return (
      <group ref={group}>
        <Float speed={0.8} rotationIntensity={0.12} floatIntensity={0.16}>
          <mesh rotation={[0.72, 0.28, 0]}>
            <torusGeometry args={[0.82, 0.045, 12, 72]} />
            <meshStandardMaterial color="#c68cff" emissive="#7b35db" emissiveIntensity={1.35} metalness={0.7} roughness={0.22} />
          </mesh>
          <mesh rotation={[1.2, 0.48, 0.2]}>
            <torusGeometry args={[0.96, 0.012, 8, 72]} />
            <meshBasicMaterial color="#fa82d6" transparent opacity={0.82} />
          </mesh>
          <mesh position={[0, 0, 0.05]}>
            <sphereGeometry args={[0.39, 32, 32]} />
            <meshStandardMaterial color="#382161" emissive="#6c3cb6" emissiveIntensity={0.62} roughness={0.2} metalness={0.4} />
          </mesh>
          <mesh position={[0.97, 0.45, 0.1]}>
            <sphereGeometry args={[0.085, 20, 20]} />
            <meshBasicMaterial color="#9ee6ff" />
          </mesh>
        </Float>
        <pointLight position={[0, 0, 1]} color="#bd68ff" intensity={6} distance={3.5} />
      </group>
    );
  }

  if (variant === "analytics") {
    return (
      <group ref={group}>
        <Float speed={0.75} rotationIntensity={0.1} floatIntensity={0.12}>
          {[
            { x: -0.66, height: 0.7, color: "#8e6bf1" },
            { x: -0.22, height: 1.15, color: "#bb70ed" },
            { x: 0.22, height: 0.9, color: "#e96fc9" },
            { x: 0.66, height: 1.42, color: "#76c9f3" },
          ].map(({ x, height, color }) => (
            <mesh key={x} position={[x, height / 2 - 0.32, 0]}>
              <boxGeometry args={[0.22, height, 0.18]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.56} metalness={0.46} roughness={0.24} />
            </mesh>
          ))}
          <mesh rotation={[1.14, 0.15, 0.2]} position={[0, 0.24, -0.18]}>
            <torusGeometry args={[0.98, 0.012, 8, 80]} />
            <meshBasicMaterial color="#d58dff" transparent opacity={0.65} />
          </mesh>
        </Float>
        <pointLight position={[0, 1, 1]} color="#b76aff" intensity={5} distance={4} />
      </group>
    );
  }

  return (
    <group ref={group}>
      <Float speed={0.85} rotationIntensity={0.18} floatIntensity={0.15}>
        <mesh rotation={[0.12, -0.15, 0.04]}>
          <boxGeometry args={[1.28, 0.84, 0.12]} />
          <meshStandardMaterial color="#342253" emissive="#49277f" emissiveIntensity={0.36} metalness={0.38} roughness={0.28} />
        </mesh>
        {[0.25, 0, -0.25].map((y, index) => (
          <mesh key={y} position={[-0.13, y, 0.075]}>
            <boxGeometry args={[0.68 - index * 0.1, 0.035, 0.02]} />
            <meshBasicMaterial color={index === 0 ? "#fa86d8" : "#b2a1ff"} transparent opacity={0.9} />
          </mesh>
        ))}
        <mesh position={[0.88, 0.58, 0.04]} rotation={[0.3, 0.1, 0.64]}>
          <octahedronGeometry args={[0.22, 0]} />
          <meshStandardMaterial color="#de83fa" emissive="#8c44ce" emissiveIntensity={1.2} metalness={0.48} roughness={0.18} />
        </mesh>
        <mesh rotation={[0.7, 0.2, 0]}>
          <torusGeometry args={[1.12, 0.012, 8, 80]} />
          <meshBasicMaterial color="#75cfff" transparent opacity={0.56} />
        </mesh>
      </Float>
      <pointLight position={[0, 0, 1]} color="#a460ff" intensity={4} distance={3.5} />
    </group>
  );
}

export default function SceneAccent({ variant = "tasks", className = "" }) {
  return (
    <div className={`scene-accent scene-accent-${variant} ${className}`} aria-hidden="true">
      <Suspense fallback={<span className="scene-accent-fallback" />}>
        <Canvas dpr={[1, 1.25]} camera={{ position: [0, 0, 4], fov: 40 }} gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}>
          <ambientLight intensity={0.75} />
          <FloatingShape variant={variant} />
        </Canvas>
      </Suspense>
    </div>
  );
}
