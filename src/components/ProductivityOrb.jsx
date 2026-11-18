import { Canvas } from "@react-three/fiber";
import { Float, MeshDistortMaterial } from "@react-three/drei";

function Orb() {
  return (
    <Float speed={1.5} rotationIntensity={0.45} floatIntensity={0.8}>
      <mesh rotation={[0.2, 0.3, 0]}>
        <icosahedronGeometry args={[1.15, 5]} />
        <MeshDistortMaterial color="#a68bfa" roughness={0.22} metalness={0.25} distort={0.24} speed={1.8} />
      </mesh>
      <mesh rotation={[0.8, 0.3, 0]} scale={1.48}>
        <torusGeometry args={[1, 0.012, 8, 100]} />
        <meshBasicMaterial color="#dacdff" transparent opacity={0.46} />
      </mesh>
    </Float>
  );
}

export default function ProductivityOrb() {
  return <div className="hero-orb" aria-hidden="true"><Canvas camera={{ position: [0, 0, 4], fov: 40 }} dpr={[1, 1.5]}><ambientLight intensity={1.1} /><directionalLight position={[3, 4, 4]} intensity={3} /><Orb /></Canvas></div>;
}
