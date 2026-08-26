import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';
import { LOCATIONS, classifyRisk } from '../data/mockData';

const RADIUS = 2.4;
const CLOSE_DISTANCE = 3.15; // zoomed-in, background hero framing
const FAR_DISTANCE = 6.4; // fully revealed, orbitable view

function latLngToVector3(lat, lng, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function Marker({ location, onSelect, active }) {
  const groupRef = useRef();
  const ringRef = useRef();
  const [hovered, setHovered] = useState(false);
  const risk = classifyRisk(
    Math.max(location.floodProbability, location.landslideProbability) * 100
  );
  const position = useMemo(
    () => latLngToVector3(location.lat, location.lng, RADIUS + 0.015),
    [location.lat, location.lng]
  );
  const normal = useMemo(() => position.clone().normalize(), [position]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulse = 1 + Math.sin(t * 2.4 + location.lat) * 0.18;
    if (ringRef.current) ringRef.current.scale.setScalar(pulse * (hovered ? 1.5 : 1));
    if (groupRef.current) {
      const s = hovered ? 1.6 : 1;
      groupRef.current.scale.lerp(new THREE.Vector3(s, s, s), 0.2);
    }
  });

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={(e) => {
        if (!active) return;
        e.stopPropagation();
        onSelect(location);
      }}
      onPointerOver={(e) => {
        if (!active) return;
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      <mesh
        ref={ringRef}
        quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)}
      >
        <ringGeometry args={[0.03, 0.045, 32]} />
        <meshBasicMaterial color={risk.color} transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.022, 16, 16]} />
        <meshStandardMaterial
          color={risk.color}
          emissive={risk.color}
          emissiveIntensity={hovered ? 1.4 : 0.7}
        />
      </mesh>
    </group>
  );
}

// A real earth texture (NASA Blue Marble derivative, via three.js example
// assets) dimmed to a near-black/navy base with the night-lights map driving
// emissive glow, for the "mysterious dark" planet-from-space look.
function EarthMesh() {
  const meshRef = useRef();
  const [dayMap, lightsMap, specularMap] = useTexture([
    '/textures/earth-day.jpg',
    '/textures/earth-lights.png',
    '/textures/earth-specular.jpg',
  ]);

  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.045;
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[RADIUS, 96, 96]} />
        <meshStandardMaterial
          map={dayMap}
          emissiveMap={lightsMap}
          emissive={new THREE.Color('#bcd9ff')}
          emissiveIntensity={1.1}
          roughnessMap={specularMap}
          roughness={0.9}
          metalness={0.15}
          color={new THREE.Color('#1c2f4a')}
        />
      </mesh>
      {/* thin blue atmosphere shell */}
      <mesh scale={1.03}>
        <sphereGeometry args={[RADIUS, 64, 64]} />
        <meshBasicMaterial color="#3f7fd1" transparent opacity={0.1} side={THREE.BackSide} />
      </mesh>
      <mesh scale={1.09}>
        <sphereGeometry args={[RADIUS, 64, 64]} />
        <meshBasicMaterial color="#1c3a6b" transparent opacity={0.06} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

function Starfield() {
  const pointsRef = useRef();
  const { positions, colors } = useMemo(() => {
    const count = 2600;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = [
      [1, 1, 1],
      [0.75, 0.85, 1],
      [0.6, 0.75, 1],
      [0.85, 0.8, 1],
    ];
    for (let i = 0; i < count; i++) {
      const r = 40 + Math.random() * 60;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = c[0];
      colors[i * 3 + 1] = c[1];
      colors[i * 3 + 2] = c[2];
    }
    return { positions, colors };
  }, []);

  useFrame((_, delta) => {
    if (pointsRef.current) pointsRef.current.rotation.y += delta * 0.003;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.22} vertexColors transparent opacity={0.85} sizeAttenuation depthWrite={false} />
    </points>
  );
}

// Drives camera distance from `zoomProgressRef` (0 = close hero framing,
// 1 = fully revealed) while OrbitControls is unmounted. Once `interactive`
// is true, this stops adjusting the camera and OrbitControls takes over.
function ZoomRig({ zoomProgressRef, interactive }) {
  const { camera } = useThree();
  const currentDistance = useRef(CLOSE_DISTANCE);

  useFrame(() => {
    if (interactive) return;
    const progress = zoomProgressRef?.current ?? 0;
    const target = THREE.MathUtils.lerp(CLOSE_DISTANCE, FAR_DISTANCE, progress);
    currentDistance.current = THREE.MathUtils.lerp(currentDistance.current, target, 0.08);
    const dir = camera.position.clone().normalize();
    camera.position.copy(dir.multiplyScalar(currentDistance.current));
    camera.lookAt(0, 0, 0);
  }, -1);

  return null;
}

function Scene({ onSelect, zoomProgressRef, interactive }) {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 2, 4]} intensity={1.3} color="#eaf2ff" />
      <pointLight position={[-6, -3, -4]} intensity={0.25} color="#3f7fd1" />

      <Starfield />
      <EarthMesh />

      {LOCATIONS.map((loc) => (
        <Marker key={loc.id} location={loc} onSelect={onSelect} active={interactive} />
      ))}

      <ZoomRig zoomProgressRef={zoomProgressRef} interactive={interactive} />
      {interactive && (
        <OrbitControls
          enablePan={false}
          minDistance={3.6}
          maxDistance={9}
          rotateSpeed={0.5}
          target={[0, 0, 0]}
        />
      )}
    </>
  );
}

export default function Globe({ className = '', zoomProgressRef, interactive = true }) {
  const navigate = useNavigate();
  const fallbackProgressRef = useRef(1);
  const progressRef = zoomProgressRef ?? fallbackProgressRef;

  const handleSelect = (location) => {
    navigate(`/map?location=${location.id}`);
  };

  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0.35, CLOSE_DISTANCE], fov: 42 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#04060c']} />
        <Scene onSelect={handleSelect} zoomProgressRef={progressRef} interactive={interactive} />
      </Canvas>
    </div>
  );
}
