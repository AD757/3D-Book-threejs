import { Environment, Float, OrbitControls } from "@react-three/drei";
import { Book } from "./Book";

const SHADOW_MAP_SIZE = 2048;
const FLOOR_SIZE = 100;

export const Experience = () => {
  return (
    <>
      <Float
        rotation-x={-Math.PI / 4}
        floatIntensity={1}
        speed={2}
        rotationIntensity={2}
      >
        <Book scale={1.5} />
      </Float>

      <OrbitControls />
      <Environment preset="city" />

      <directionalLight
        position={[2, 5, 2]}
        intensity={2.5}
        castShadow
        shadow-mapSize={[SHADOW_MAP_SIZE, SHADOW_MAP_SIZE]}
        shadow-bias={-0.0001}
      />

      <mesh 
        position-y={-1.5} 
        rotation-x={-Math.PI / 2} 
        receiveShadow
      >
        <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
        <shadowMaterial transparent opacity={0.2} />
      </mesh>
    </>
  );
};