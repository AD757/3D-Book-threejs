import { useState, useEffect } from "react";
import { Environment, Float, OrbitControls } from "@react-three/drei";
import { Book } from "./Book";

const SHADOW_MAP_SIZE = 2048;
const FLOOR_SIZE = 100;

export const Experience = () => {
  const [scale, setScale] = useState(1.2);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const handleMediaQueryChange = (e) => {
      setScale(e.matches ? 0.8 : 1.2);
    };
    mediaQuery.addListener(handleMediaQueryChange);
    handleMediaQueryChange(mediaQuery);
    return () => mediaQuery.removeListener(handleMediaQueryChange);
  }, []);

  return (
    <>
      <Float
        rotation-x={-Math.PI / 4}
        floatIntensity={1}
        speed={2}
        rotationIntensity={2}
      >
        <Book scale={scale} />
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