import { useLayoutEffect, useMemo, useEffect, useRef, type ReactNode } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

type Vec3 = [number, number, number];

// Illustration details belong to their existing selectable parent component.
// They introduce no new course parts, operation rules or repair events.
export function Sleeve({ position, outer, inner, height, children }: { position: Vec3; outer: number; inner: number; height: number; children: ReactNode }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, outer, 0, Math.PI * 2, false);
    const bore = new THREE.Path();
    bore.absarc(0, 0, inner, 0, Math.PI * 2, true);
    shape.holes.push(bore);
    const result = new THREE.ExtrudeGeometry(shape, { depth: height, steps: 1, bevelEnabled: false, curveSegments: 20 });
    result.translate(0, 0, -height / 2);
    return result;
  }, [outer, inner, height]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} position={position} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>{children}</mesh>;
}

export function Fastener({ position, children }: { position: Vec3; children: ReactNode }) {
  return <group position={position}>
    <mesh position={[0, 0.035, 0]} castShadow><cylinderGeometry args={[0.052, 0.052, 0.07, 6]} />{children}</mesh>
    <mesh position={[0, -0.045, 0]} castShadow><cylinderGeometry args={[0.021, 0.021, 0.13, 12]} />{children}</mesh>
    <Sleeve position={[0, 0.002, 0]} outer={0.081} inner={0.026} height={0.018}>{children}</Sleeve>
  </group>;
}

// Instancing keeps repeated thread bands and links to one draw per material.
export function ThreadBands({ position, radius, count = 7, spacing = 0.024, children }: { position: Vec3; radius: number; count?: number; spacing?: number; children: ReactNode }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const invalidate = useThree(state => state.invalidate);
  useLayoutEffect(() => {
    const transform = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      transform.position.set(0, (i - (count - 1) / 2) * spacing, 0);
      transform.rotation.set(Math.PI / 2, 0, 0);
      transform.updateMatrix(); mesh.current?.setMatrixAt(i, transform.matrix);
    }
    if (mesh.current) { mesh.current.instanceMatrix.needsUpdate = true; mesh.current.computeBoundingSphere(); }
    invalidate();
  }, [count, spacing, invalidate]);
  return <instancedMesh ref={mesh} args={[undefined, undefined, count]} position={position} castShadow>
    <torusGeometry args={[radius, 0.006, 4, 24]} />{children}
  </instancedMesh>;
}

export function LinkedChain({ points, children }: { points: Vec3[]; children: ReactNode }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const signature = JSON.stringify(points);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point))), [signature]);
  const count = 39;
  const invalidate = useThree(state => state.invalidate);
  useLayoutEffect(() => {
    const transform = new THREE.Object3D();
    const up = new THREE.Vector3(0, 1, 0);
    const twist = new THREE.Quaternion();
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      transform.position.copy(curve.getPointAt(t));
      transform.quaternion.setFromUnitVectors(up, curve.getTangentAt(t));
      twist.setFromAxisAngle(up, i % 2 ? Math.PI / 2 : 0);
      transform.quaternion.multiply(twist);
      transform.scale.set(1, 1.5, 1);
      transform.updateMatrix(); mesh.current?.setMatrixAt(i, transform.matrix);
    }
    if (mesh.current) { mesh.current.instanceMatrix.needsUpdate = true; mesh.current.computeBoundingSphere(); }
    invalidate();
  }, [curve, invalidate]);
  return <instancedMesh ref={mesh} args={[undefined, undefined, count]} castShadow>
    <torusGeometry args={[0.025, 0.0038, 4, 12]} />{children}
  </instancedMesh>;
}

// A repeatable crossed-weave normal map generated entirely in memory.
// It adds hose surface detail without downloaded textures or more hose meshes.
export function createBraidNormalMap() {
  const size = 64, pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size * Math.PI * 2, v = y / size * Math.PI * 2;
    const crossing = Math.cos(u + v) * Math.sin(u - v);
    const dx = (Math.cos(u + v) + Math.cos(u - v) + crossing * 0.2) * 0.5;
    const dy = (Math.cos(u + v) - Math.cos(u - v) - crossing * 0.2) * 0.5;
    const length = Math.hypot(dx, dy, 2);
    const index = (y * size + x) * 4;
    pixels[index] = Math.round((dx / length * 0.5 + 0.5) * 255);
    pixels[index + 1] = Math.round((dy / length * 0.5 + 0.5) * 255);
    pixels[index + 2] = Math.round((2 / length * 0.5 + 0.5) * 255);
    pixels[index + 3] = 255;
  }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(72, 10);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}
