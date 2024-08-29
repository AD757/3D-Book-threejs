import { useCursor, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useAtom } from "jotai";
import { easing } from "maath";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from 'three';
import { degToRad } from "three/src/math/MathUtils.js";
import { pageAtom, pages } from "./UI";

// Constants
const PAGE_DIMENSIONS = { WIDTH: 1.28, HEIGHT: 1.71, DEPTH: 0.003 };
const PAGE_SEGMENTS = 30;
const SEGMENT_WIDTH = PAGE_DIMENSIONS.WIDTH / PAGE_SEGMENTS;
const EASING = { FACTOR: 0.5, FOLD: 0.3 };
const CURVE_STRENGTH = { INSIDE: 0.18, OUTSIDE: 0.05, TURNING: 0.09 };

// Utility functions
const createPageGeometry = () => {
  const geometry = new THREE.BoxGeometry(
    PAGE_DIMENSIONS.WIDTH,
    PAGE_DIMENSIONS.HEIGHT,
    PAGE_DIMENSIONS.DEPTH,
    PAGE_SEGMENTS,
    2
  );
  geometry.translate(PAGE_DIMENSIONS.WIDTH / 2, 0, 0);
  return geometry;
};

const createSkinningData = (geometry) => {
  const { position } = geometry.attributes;
  const skinIndexes = [];
  const skinWeights = [];

  for (let i = 0; i < position.count; i++) {
    const vertex = new THREE.Vector3().fromBufferAttribute(position, i);
    const x = vertex.x;
    const skinIndex = Math.max(0, Math.floor(x / SEGMENT_WIDTH));
    let skinWeight = (x % SEGMENT_WIDTH) / SEGMENT_WIDTH;

    skinIndexes.push(skinIndex, skinIndex + 1, 0, 0);
    skinWeights.push(1 - skinWeight, skinWeight, 0, 0);
  }

  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndexes, 4));
  geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(skinWeights, 4));
};

const createPageMaterials = (front, back, number, picture, picture2, pictureRoughness) => {
  const whiteMaterial = new THREE.MeshStandardMaterial({ color: 'white' });
  const emissiveColor = new THREE.Color('orange');

  return [
    whiteMaterial,
    new THREE.MeshStandardMaterial({ color: "#111" }),
    whiteMaterial,
    whiteMaterial,
    new THREE.MeshStandardMaterial({
      color: 'white',
      map: picture,
      ...(number === 0 ? { roughnessMap: pictureRoughness } : { roughness: 0.1 }),
      emissive: emissiveColor,
      emissiveIntensity: 0,
    }),
    new THREE.MeshStandardMaterial({
      color: 'white',
      map: picture2,
      ...(number === pages.length - 1 ? { roughnessMap: pictureRoughness } : { roughness: 0.1 }),
      emissive: emissiveColor,
      emissiveIntensity: 0,
    }),
  ];
};

const createBones = () => {
  const bones = [];
  for (let i = 0; i <= PAGE_SEGMENTS; i++) {
    let bone = new THREE.Bone();
    bone.position.x = i === 0 ? 0 : SEGMENT_WIDTH;
    if (i > 0) bones[i - 1].add(bone);
    bones.push(bone);
  }
  return bones;
};

// Preload textures
pages.forEach((page) => {
  useTexture.preload(`/textures/${page.front}.jpg`);
  useTexture.preload(`/textures/${page.back}.jpg`);
  useTexture.preload(`/textures/book-cover-roughness.jpg`);
});

const Page = ({ number, front, back, page, opened, bookClosed, ...props }) => {
  const [picture, picture2, pictureRoughness] = useTexture([
    `/textures/${front}.jpg`,
    `/textures/${back}.jpg`,
    ...(number === 0 || number === pages.length - 1 ? [`/textures/book-cover-roughness.jpg`] : []),
  ]);
  picture.colorSpace = picture2.colorSpace = THREE.SRGBColorSpace;

  const group = useRef();
  const turnedAt = useRef(0);
  const lastOpened = useRef(opened);
  const skinnedMeshRef = useRef();

  const [highlighted, setHighlighted] = useState(false);
  const [_, setPage] = useAtom(pageAtom);

  const manualSkinnedMesh = useMemo(() => {
    const pageGeometry = createPageGeometry();
    createSkinningData(pageGeometry);

    const bones = createBones();
    const skeleton = new THREE.Skeleton(bones);

    const materials = createPageMaterials(front, back, number, picture, picture2, pictureRoughness);
    const mesh = new THREE.SkinnedMesh(pageGeometry, materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.add(skeleton.bones[0]);
    mesh.bind(skeleton);
    return mesh;
  }, []);

  useFrame((_, delta) => {
    if (!skinnedMeshRef.current) return;

    // Update emissive intensity
    const emissiveIntensity = highlighted ? 0.22 : 0;
    [4, 5].forEach(index => {
      skinnedMeshRef.current.material[index].emissiveIntensity = THREE.MathUtils.lerp(
        skinnedMeshRef.current.material[index].emissiveIntensity,
        emissiveIntensity,
        0.1
      );
    });

    // Handle page turning
    if (lastOpened.current !== opened) {
      turnedAt.current = Date.now();
      lastOpened.current = opened;
    }
    let turningTime = Math.min(400, Date.now() - turnedAt.current) / 400;
    turningTime = Math.sin(turningTime * Math.PI);

    let targetRotation = opened ? -Math.PI / 2 : Math.PI / 2;
    if (!bookClosed) targetRotation += degToRad(number * 0.8);

    const bones = skinnedMeshRef.current.skeleton.bones;
    bones.forEach((bone, i) => {
      const target = i === 0 ? group.current : bone;

      const insideCurveIntensity = i < 8 ? Math.sin(i * 0.2 + 0.25) : 0;
      const outsideCurveIntensity = i >= 8 ? Math.cos(i * 0.3 + 0.09) : 0;
      const turningIntensity = Math.sin(i * Math.PI * (1 / bones.length)) * turningTime;

      let rotationAngle = (
        CURVE_STRENGTH.INSIDE * insideCurveIntensity * targetRotation -
        CURVE_STRENGTH.OUTSIDE * outsideCurveIntensity * targetRotation +
        CURVE_STRENGTH.TURNING * turningIntensity * targetRotation
      );

      let foldRotationAngle = degToRad(Math.sign(targetRotation) * 2);

      if (bookClosed) {
        if (i === 0) {
          rotationAngle = targetRotation;
          foldRotationAngle = 0;
        } else {
          rotationAngle = 0;
          foldRotationAngle = 0;
        }
      }

      easing.dampAngle(target.rotation, "y", rotationAngle, EASING.FACTOR, delta);

      const foldIntensity = i > 8 ? Math.sin(i * Math.PI * (1 / bones.length) - 0.5) * turningTime : 0;
      easing.dampAngle(target.rotation, "x", foldRotationAngle * foldIntensity, EASING.FOLD, delta);
    });
  });

  useCursor(highlighted);

  return (
    <group
      {...props}
      ref={group}
      onPointerEnter={(e) => { e.stopPropagation(); setHighlighted(true); }}
      onPointerLeave={(e) => { e.stopPropagation(); setHighlighted(false); }}
      onClick={(e) => {
        e.stopPropagation();
        setPage(opened ? number : number + 1);
        setHighlighted(false);
      }}
    >
      <primitive
        object={manualSkinnedMesh}
        ref={skinnedMeshRef}
        position-z={-number * PAGE_DIMENSIONS.DEPTH + page * PAGE_DIMENSIONS.DEPTH}
      />
    </group>
  );
};

export const Book = ({ ...props }) => {
  const [page] = useAtom(pageAtom);
  const [delayedPage, setDelayedPage] = useState(page);

  useEffect(() => {
    let timeout;
    const goToPage = () => {
      setDelayedPage((delayedPage) => {
        if (page === delayedPage) return delayedPage;
        
        timeout = setTimeout(
          goToPage,
          Math.abs(page - delayedPage) > 2 ? 50 : 150
        );
        return page > delayedPage ? delayedPage + 1 : delayedPage - 1;
      });
    };
    goToPage();
    return () => clearTimeout(timeout);
  }, [page]);

  return (
    <group {...props} rotation-y={-Math.PI / 2}>
      {pages.map((pageData, index) => (
        <Page
          key={index}
          page={delayedPage}
          number={index}
          opened={delayedPage > index}
          bookClosed={delayedPage === 0 || delayedPage === pages.length}
          {...pageData}
        />
      ))}
    </group>
  );
};