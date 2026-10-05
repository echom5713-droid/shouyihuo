import { Component, createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { Attempt, PartId } from '../domain/types';
import { flows } from '../domain/engine';
import { PARTS } from '../domain/course';
import { useLocale } from '../i18n';
import { Sleeve, Fastener, ThreadBands, LinkedChain, createBraidNormalMap } from './model/MechanicalDetails';

type Vec3 = [number, number, number];
export type CameraView = 'overview' | 'top' | 'focus';
export interface CameraCommand { type: CameraView; token: number; part?: PartId }
interface ModelProps {
  attempt: Attempt; selected: PartId | null; onSelect: (id: PartId, source?: string) => void;
  cutaway: boolean; exploded: boolean; labels: boolean; resetToken: number; compact?: boolean;
  viewCommand?: CameraCommand; onRendererChange?: (renderer: 'webgl' | 'fallback') => void;
  onFocus?: (id: PartId) => void;
}
const SceneContext = createContext<{ selected: PartId | null; hovered: PartId | null; setHovered: (id: PartId | null) => void; onSelect: ModelProps['onSelect']; onFocus?: ModelProps['onFocus'] }>({ selected: null, hovered: null, setHovered: () => {}, onSelect: () => {} });
const PartContext = createContext<PartId>('tank');
const MotionContext = createContext(false);
function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return reduced;
}
function Material({ color = '#dbe1d8', metal = 0, roughness = 0.46, side = THREE.FrontSide, normalMap, finish }: { color?: string; metal?: number; roughness?: number; side?: THREE.Side; normalMap?: THREE.Texture | null; finish?: 'matte' }) {
  const id = useContext(PartContext);
  const { selected, hovered } = useContext(SceneContext);
  const active = selected === id, over = hovered === id;
  const tint = useMemo(() => new THREE.Color(color).lerp(new THREE.Color('#39836c'), active ? 0.32 : over ? 0.16 : 0), [color, active, over]);
  const ceramic = (id === 'tank' || id === 'lid') && finish !== 'matte';
  return <meshPhysicalMaterial color={tint} side={side} normalMap={normalMap} normalScale={[0.23, 0.23]} roughness={ceramic && metal === 0 ? 0.29 : roughness} metalness={metal} clearcoat={ceramic && metal === 0 ? 0.32 : 0} clearcoatRoughness={0.3} emissive={active || over ? '#205c45' : '#000'} emissiveIntensity={active ? 0.075 : over ? 0.025 : 0} />;
}
function Box({ position = [0, 0, 0], size, color, radius = 0.04, metal }: { position?: Vec3; size: Vec3; color?: string; radius?: number; metal?: number }) {
  const geo = useMemo(() => new RoundedBoxGeometry(...size, 3, radius), [size[0], size[1], size[2], radius]);
  useEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} position={position} castShadow receiveShadow><Material color={color} metal={metal} /></mesh>;
}
function Cylinder({ position = [0, 0, 0], radius = 0.12, height = 1, color, rotation = [0, 0, 0], metal = 0, roughness = 0.46, segments = 32, hollow = false }: { position?: Vec3; radius?: number; height?: number; color?: string; rotation?: Vec3; metal?: number; roughness?: number; segments?: number; hollow?: boolean }) {
  return <mesh position={position} rotation={rotation} castShadow receiveShadow><cylinderGeometry args={[radius, radius, height, segments, 1, hollow]} /><Material color={color} metal={metal} roughness={roughness} side={hollow ? THREE.DoubleSide : THREE.FrontSide} /></mesh>;
}
function Pipe({ points, radius = 0.06, color = '#b3c2b6', metal = 0.1, braided = false }: { points: Vec3[]; radius?: number; color?: string; metal?: number; braided?: boolean }) {
  const data = JSON.stringify(points);
  const geo = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 32, radius, 12, false), [data, radius]);
  const normalMap = useMemo(() => braided ? createBraidNormalMap() : null, [braided]);
  useEffect(() => () => geo.dispose(), [geo]);
  useEffect(() => () => normalMap?.dispose(), [normalMap]);
  return <mesh geometry={geo} castShadow><Material color={color} metal={metal} normalMap={normalMap} roughness={metal > 0.4 ? 0.3 : 0.47} /></mesh>;
}
function Part({ id, target = [0, 0, 0], children, partRefs }: { id: PartId; target?: Vec3; children: ReactNode; partRefs: React.RefObject<Partial<Record<PartId, THREE.Group>>> }) {
  const group = useRef<THREE.Group>(null);
  const ctx = useContext(SceneContext);
  const reduced = useContext(MotionContext);
  const invalidate = useThree(state => state.invalidate);
  const destination = useMemo(() => new THREE.Vector3(...target), [target[0], target[1], target[2]]);
  useEffect(() => { if (group.current) partRefs.current[id] = group.current; }, [id, partRefs]);
  useEffect(() => { invalidate(); }, [destination, reduced, invalidate]);
  useFrame((_, dt) => {
    if (!group.current) return;
    if (reduced || group.current.position.distanceToSquared(destination) < 0.000001) group.current.position.copy(destination);
    else { group.current.position.lerp(destination, 1 - Math.exp(-Math.min(dt, 0.05) * 8)); invalidate(); }
  });
  const click = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (e.delta > 4) return; ctx.onSelect(id, 'model'); };
  const focus = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (e.delta <= 4) ctx.onFocus?.(id); };
  return <PartContext.Provider value={id}><group ref={group} userData={{ partId: id }} onClick={click} onDoubleClick={focus} onPointerOver={e => { e.stopPropagation(); ctx.setHovered(id); document.body.style.cursor = 'pointer'; }} onPointerOut={() => { ctx.setHovered(null); document.body.style.cursor = ''; }}>{children}</group></PartContext.Provider>;
}
// Presentation-only camera commands never dispatch an event to the simulation.
function Controls({ resetToken, viewCommand, exploded, selected, partRefs }: Pick<ModelProps, 'resetToken' | 'viewCommand' | 'exploded' | 'selected'> & { partRefs: React.RefObject<Partial<Record<PartId, THREE.Group>>> }) {
  const { camera, gl, size, invalidate } = useThree();
  const reduced = useContext(MotionContext);
  const controls = useMemo(() => new OrbitControls(camera, gl.domElement), [camera, gl]);
  const selectedRef = useRef(selected); selectedRef.current = selected;
  const view = useRef<CameraView>('overview');
  const focused = useRef<PartId | null>(null);
  const moving = useRef(false);
  const destination = useMemo(() => ({ eye: new THREE.Vector3(), target: new THREE.Vector3() }), []);
  const bounds = useMemo(() => new THREE.Box3(), []);
  const dimensions = useMemo(() => new THREE.Vector3(), []);
  const direction = useMemo(() => new THREE.Vector3(0.32, 0.34, 0.89).normalize(), []);
  const cameraRight = useMemo(() => new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize(), [direction]);
  const cameraUp = useMemo(() => new THREE.Vector3().crossVectors(direction, cameraRight).normalize(), [direction, cameraRight]);
  useEffect(() => {
    controls.enablePan = false;
    controls.dampingFactor = 0.09;
    controls.minDistance = 2; controls.maxDistance = 19;
    controls.maxPolarAngle = Math.PI * 0.49; controls.minPolarAngle = 0.035;
    // Single-finger scrolling remains available on a narrow page. Two fingers operate the model.
    controls.touches.ONE = null; controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
    gl.domElement.style.touchAction = 'pan-y';
    const interrupt = () => { moving.current = false; gl.domElement.dataset.cameraMoving = 'false'; gl.domElement.dataset.cameraView = 'manual'; };
    controls.addEventListener('start', interrupt);
    // OrbitControls mutates the camera outside React. Its change event wakes the
    // demand loop, including damping, then lets the renderer sleep at rest.
    const changed = () => invalidate();
    controls.addEventListener('change', changed);
    return () => { controls.removeEventListener('start', interrupt); controls.removeEventListener('change', changed); controls.dispose(); document.body.style.cursor = ''; };
  }, [controls, gl, invalidate]);
  useEffect(() => { controls.enableDamping = !reduced; }, [controls, reduced]);
  const frame = (type: CameraView, id: PartId | null) => {
    view.current = type;
    const aspect = Math.max(0.35, size.width / Math.max(1, size.height));
    const fov = (camera as THREE.PerspectiveCamera).fov * Math.PI / 180;
    let distance: number;
    if (type === 'focus' && id && partRefs.current[id]) {
      focused.current = id;
      bounds.setFromObject(partRefs.current[id]!);
      bounds.getCenter(destination.target); bounds.getSize(dimensions);
      // Fit all eight bounding-box corners in camera space, including perspective depth.
      // A width/height-only fit can crop the near corner of the shell or a wide lid.
      const corner = new THREE.Vector3();
      distance = 2.2;
      for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
        corner.set(dimensions.x * x / 2, dimensions.y * y / 2, dimensions.z * z / 2);
        const horizontal = Math.abs(corner.dot(cameraRight)) * 1.14 / (Math.tan(fov / 2) * aspect);
        const vertical = Math.abs(corner.dot(cameraUp)) * 1.14 / Math.tan(fov / 2);
        distance = Math.max(distance, Math.max(horizontal, vertical) + corner.dot(direction));
      }
      destination.eye.copy(direction).multiplyScalar(distance).add(destination.target);
    } else {
      focused.current = null;
      destination.target.set(-0.12, exploded ? 1.65 : 1.42, 0);
      const vertical = exploded ? 5.85 : 5.1;
      const horizontal = exploded ? 6.3 : 5.65;
      distance = Math.max(vertical / (2 * Math.tan(fov / 2)), horizontal / (2 * Math.tan(fov / 2) * aspect));
      if (type === 'top') {
        distance = Math.max(10.7, horizontal / (2 * Math.tan(fov / 2) * aspect) + 2.2);
        destination.target.set(-0.05, 1.25, -0.85);
        destination.eye.set(0.05, distance, 0.38).add(destination.target);
      } else destination.eye.copy(direction).multiplyScalar(distance).add(destination.target);
    }
    controls.maxDistance = Math.max(19, distance * 1.5);
    gl.domElement.dataset.cameraView = type;
    gl.domElement.dataset.focusPart = focused.current ?? '';
    moving.current = true;
    if (reduced) {
      camera.position.copy(destination.eye); controls.target.copy(destination.target); controls.update();
      moving.current = false;
    }
    gl.domElement.dataset.cameraMoving = String(moving.current);
    invalidate();
  };
  // Deliberately exclude selected: selecting a part must not move the camera.
  useEffect(() => { frame(viewCommand?.type ?? 'overview', viewCommand?.part ?? selectedRef.current); }, [viewCommand?.token, viewCommand?.type, viewCommand?.part]);
  useEffect(() => { frame('overview', null); }, [resetToken, exploded]);
  useEffect(() => { frame(view.current, focused.current); }, [size.width, size.height]);
  useFrame((_, dt) => {
    if (moving.current) {
      const alpha = reduced ? 1 : 1 - Math.exp(-Math.min(dt, 0.05) * 6);
      camera.position.lerp(destination.eye, alpha); controls.target.lerp(destination.target, alpha);
      if (camera.position.distanceToSquared(destination.eye) < 0.00008 && controls.target.distanceToSquared(destination.target) < 0.00008) {
        camera.position.copy(destination.eye); controls.target.copy(destination.target); moving.current = false;
        gl.domElement.dataset.cameraMoving = 'false';
      }
      if (moving.current) invalidate();
    }
    controls.update();
    const position = `${camera.position.x.toFixed(2)},${camera.position.y.toFixed(2)},${camera.position.z.toFixed(2)}`;
    const target = `${controls.target.x.toFixed(2)},${controls.target.y.toFixed(2)},${controls.target.z.toFixed(2)}`;
    if (gl.domElement.dataset.cameraPosition !== position) gl.domElement.dataset.cameraPosition = position;
    if (gl.domElement.dataset.cameraTarget !== target) gl.domElement.dataset.cameraTarget = target;
  });
  return null;
}
const ANCHORS: Record<PartId, Vec3> = {
  tank: [-1.78, 1.65, 0.5], lid: [0.55, 2.68, 0.25], pipe: [-1.65, -0.43, 0.82],
  inlet: [-1.12, 1.95, 0], float: [-0.23, 1.65, 0.12], drain: [0.45, 0.39, 0.25],
  overflow: [1.05, 2.065, -0.2], supply: [-2.12, 0.23, 1.27], water: [1.58, 1.4, 0.67]
};
function LabelPositions({ partRefs, labelsRef, selected, attempt, labels, leaderRefs, locale, occlusionKey }: { partRefs: React.RefObject<Partial<Record<PartId, THREE.Group>>>; labelsRef: React.RefObject<Partial<Record<PartId, HTMLButtonElement>>>; selected: PartId | null; attempt: Attempt; labels: boolean; leaderRefs: React.RefObject<Partial<Record<PartId, SVGLineElement>>>; locale: string; occlusionKey: string }) {
  const { camera, size, invalidate, gl } = useThree();
  const world = useMemo(() => new THREE.Vector3(), []);
  const projected = useMemo(() => new THREE.Vector3(), []);
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const direction = useMemo(() => new THREE.Vector3(), []);
  const previous = useRef('');
  const layouts = useRef(0);
  useEffect(() => { previous.current = ''; invalidate(); }, [locale, selected, labels, occlusionKey, invalidate]);
  useFrame(() => {
    // Flow markers alone do not move labels. Recompute projections/occlusion
    // only when the camera, layout or component geometry actually changes.
    const signature = [size.width, size.height, selected, labels, locale, occlusionKey, attempt.water,
      ...camera.position.toArray(), ...camera.quaternion.toArray(),
      ...Object.values(partRefs.current).flatMap(group => group?.position.toArray() ?? []),
      partRefs.current.float?.children[0]?.position.y].join('|');
    if (signature === previous.current) return;
    previous.current = signature;
    gl.domElement.dataset.labelLayouts = String(++layouts.current);
    const placed: { left: number; top: number; right: number; bottom: number }[] = [];
    const ids = Object.keys(ANCHORS) as PartId[];
    if (selected) { ids.splice(ids.indexOf(selected), 1); ids.unshift(selected); }
    const objects = Object.values(partRefs.current).filter((group): group is THREE.Group => !!group);
    // useFrame runs before the renderer updates world matrices. A newly added
    // cutaway wall otherwise retains its previous transform for this raycast,
    // and the settled demand loop would cache that stale visibility forever.
    camera.updateMatrixWorld();
    for (const object of objects) object.updateWorldMatrix(true, true);
    for (const key of ids) {
      const node = labelsRef.current[key], group = partRefs.current[key];
      if (!node || !group) continue;
      if (key === 'float' && group.children[0]) { world.set(-0.23, 0, 0.12); group.children[0].localToWorld(world); }
      else if (key === 'water') { world.set(1.58, 0.16 + attempt.water * 2.2, 0.67); group.localToWorld(world); }
      else { world.set(...ANCHORS[key]); group.localToWorld(world); }
      projected.copy(world).project(camera);
      const x = (projected.x + 1) * size.width / 2, y = (-projected.y + 1) * size.height / 2;
      // Keep exact mesh coordinates independent of the label's collision offset.
      node.dataset.x = x.toFixed(1); node.dataset.y = y.toFixed(1);
      let visible = labels && projected.z > -1 && projected.z < 1 && x > 12 && x < size.width - 12 && y > 18 && y < size.height - 18;
      if (visible) {
        direction.copy(world).sub(camera.position); const distance = direction.length(); direction.normalize();
        ray.set(camera.position, direction); ray.far = distance + 0.015;
        const first = ray.intersectObjects(objects, true)[0];
        if (first && first.distance < distance - 0.055) {
          let owner: THREE.Object3D | null = first.object;
          while (owner && !owner.userData.partId) owner = owner.parent;
          if (owner?.userData.partId !== key) visible = false;
        }
      }
      const width = node.offsetWidth || 78, height = node.offsetHeight || 30;
      let chosen: { left: number; top: number; right: number; bottom: number } | null = null;
      if (visible) {
        const candidates = [[0, 0], [0, -height - 7], [width * 0.62, 0], [-width * 0.62, 0], [0, height + 10]];
        for (const [dx, dy] of candidates) {
          const left = Math.max(10, Math.min(size.width - width - 10, x + dx - width / 2));
          const top = y + dy - height * 1.3;
          const rect = { left, top, right: left + width, bottom: top + height };
          if (top < 15 || rect.bottom > size.height - 18) continue;
          if (placed.some(other => rect.left < other.right + 7 && rect.right > other.left - 7 && rect.top < other.bottom + 6 && rect.bottom > other.top - 6)) continue;
          chosen = rect; break;
        }
      }
      visible = visible && !!chosen;
      if (chosen) {
        node.style.left = `${chosen.left + width / 2}px`; node.style.top = `${chosen.top + height * 1.3}px`;
        placed.push(chosen);
      }
      const leader = leaderRefs.current[key];
      if (leader) {
        leader.style.visibility = visible && chosen ? 'visible' : 'hidden';
        if (chosen) {
          leader.setAttribute('x1', String(x)); leader.setAttribute('y1', String(y));
          leader.setAttribute('x2', String(chosen.left + width / 2)); leader.setAttribute('y2', String(chosen.bottom));
        }
      }
      node.style.visibility = visible ? 'visible' : 'hidden';
      node.dataset.visible = String(visible);
      node.setAttribute('aria-hidden', String(!visible));
      node.tabIndex = visible && node.parentElement?.getAttribute('aria-hidden') !== 'true' ? 0 : -1;
    }
  });
  return null;
}
function Water({ attempt }: { attempt: Attempt }) {
  const body = useRef<THREE.Mesh>(null); const top = useRef<THREE.Mesh>(null);
  const reduced = useContext(MotionContext);
  const invalidate = useThree(state => state.invalidate);
  const height = useRef(Math.max(0.008, attempt.water * 2.2));
  const target = Math.max(0.008, attempt.water * 2.2);
  useEffect(() => { invalidate(); }, [target, reduced, invalidate]);
  useFrame((_, dt) => {
    if (reduced || Math.abs(height.current - target) < 0.0005) height.current = target;
    else { height.current = THREE.MathUtils.lerp(height.current, target, 1 - Math.exp(-Math.min(dt, 0.05) * 10)); invalidate(); }
    if (body.current) { body.current.scale.y = height.current; body.current.position.y = 0.16 + height.current / 2; }
    if (top.current) top.current.position.y = 0.16 + height.current;
  });
  return <>
    <mesh ref={body} position={[0, 0.16, 0]} raycast={() => {}}><boxGeometry args={[3.34, 1, 1.44]} /><meshPhysicalMaterial color="#65aabd" transparent opacity={0.16} roughness={0.12} metalness={0.05} depthWrite={false} side={THREE.DoubleSide} /></mesh>
    <mesh ref={top} rotation={[-Math.PI / 2, 0, 0]} raycast={() => {}}><planeGeometry args={[3.34, 1.44]} /><meshStandardMaterial color="#80bfd0" transparent opacity={0.21} roughness={0.12} metalness={0.12} depthWrite={false} side={THREE.DoubleSide} /></mesh>
    <mesh position={[1.58, 0.16 + attempt.water * 2.2, 0.67]}><sphereGeometry args={[0.065, 12, 12]} /><meshBasicMaterial color="#3a8091" /></mesh>
  </>;
}
function Flow({ from, to, active }: { from: Vec3; to: Vec3; active: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const reduced = useContext(MotionContext);
  const invalidate = useThree(state => state.invalidate);
  useEffect(() => { invalidate(); }, [active, reduced, invalidate]);
  useFrame(({ clock }) => {
    if (!active) return;
    ref.current?.children.forEach((child, i) => {
      const t = reduced ? (i + 0.5) / 5 : ((clock.elapsedTime * 0.65 + i / 5) % 1);
      child.position.set(THREE.MathUtils.lerp(from[0], to[0], t), THREE.MathUtils.lerp(from[1], to[1], t), THREE.MathUtils.lerp(from[2], to[2], t));
    });
    if (!reduced) invalidate();
  });
  return <group ref={ref} visible={active}>{Array.from({ length: 5 }, (_, i) => <mesh key={i} raycast={() => {}}><sphereGeometry args={[0.044, 8, 8]} /><meshBasicMaterial color="#369bb2" transparent opacity={0.75} /></mesh>)}</group>;
}
function Float({ attempt }: { attempt: Attempt }) {
  const ball = useRef<THREE.Group>(null);
  const rod = useRef<THREE.Mesh>(null);
  const reduced = useContext(MotionContext);
  const { invalidate, gl } = useThree();
  const pivot = useMemo(() => new THREE.Vector3(-1.12, 1.87, -0.035), []);
  const length = 1.62;
  const target = Math.min(2.12, 0.44 + attempt.water * 1.82);
  const xAt = (y: number) => pivot.x + Math.sqrt(length * length - (y - pivot.y) ** 2 - (0.12 - pivot.z) ** 2);
  const initial = useRef<Vec3>([xAt(target) + 0.23, target, 0]);
  const vectors = useMemo(() => ({ center: new THREE.Vector3(), direction: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), start: new THREE.Vector3(), end: new THREE.Vector3(), actualCenter: new THREE.Vector3() }), []);
  useEffect(() => { invalidate(); }, [target, reduced, invalidate]);
  useFrame((_, dt) => {
    if (!ball.current || !rod.current) return;
    if (reduced || Math.abs(ball.current.position.y - target) < 0.0005) ball.current.position.y = target;
    else { ball.current.position.y = THREE.MathUtils.lerp(ball.current.position.y, target, 1 - Math.exp(-Math.min(dt, 0.05) * 8)); invalidate(); }
    const y = ball.current.position.y;
    ball.current.position.x = xAt(y) + 0.23;
    vectors.center.set(xAt(y), y, 0.12);
    vectors.direction.copy(vectors.center).sub(pivot).normalize();
    rod.current.position.copy(pivot).add(vectors.center).multiplyScalar(0.5);
    rod.current.quaternion.setFromUnitVectors(vectors.up, vectors.direction);
    // Inspect the rendered meshes' world transforms, including assembly offsets,
    // rather than publishing a second copy of the requested simulation state.
    rod.current.updateWorldMatrix(true, false); ball.current.updateWorldMatrix(true, false);
    vectors.start.set(0, -length / 2, 0).applyMatrix4(rod.current.matrixWorld);
    vectors.end.set(0, length / 2, 0).applyMatrix4(rod.current.matrixWorld);
    vectors.actualCenter.set(-0.23, 0, 0.12).applyMatrix4(ball.current.matrixWorld);
    gl.domElement.dataset.floatPivot = vectors.start.toArray().map(n => n.toFixed(4)).join(',');
    gl.domElement.dataset.floatTip = vectors.end.toArray().map(n => n.toFixed(4)).join(',');
    gl.domElement.dataset.floatCenter = vectors.actualCenter.toArray().map(n => n.toFixed(4)).join(',');
  });
  return <>
    <group ref={ball} position={initial.current}>
      <mesh position={[-0.23, 0, 0.12]} castShadow><sphereGeometry args={[0.29, 40, 28]} /><Material color="#486958" roughness={0.38} /></mesh>
      <mesh position={[-0.23, 0, 0.12]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.289, 0.006, 6, 40]} /><Material color="#91a795" /></mesh>
    </group>
    <mesh ref={rod} castShadow><cylinderGeometry args={[0.018, 0.018, length, 16]} /><Material color="#b5a078" metal={0.68} roughness={0.32} /></mesh>
    <Cylinder position={[-1.12, 1.87, -0.035]} radius={0.067} height={0.13} rotation={[Math.PI / 2, 0, 0]} color="#b6b8a6" metal={0.6} />
    <Cylinder position={[-1.12, 1.87, 0.036]} radius={0.036} height={0.025} rotation={[Math.PI / 2, 0, 0]} color="#697467" metal={0.7} segments={6} />
  </>;
}
function StudioLighting() {
  const { gl, scene, invalidate } = useThree();
  useEffect(() => {
    // A small, procedural studio reflection map. No HDRI, texture download or
    // post-processing pass; the generator and its room geometry are disposed.
    const room = new RoomEnvironment();
    const generator = new THREE.PMREMGenerator(gl);
    const environment = generator.fromScene(room, 0.04, 0.1, 100, { size: 128 });
    const previous = scene.environment;
    const intensity = scene.environmentIntensity;
    scene.environment = environment.texture; scene.environmentIntensity = 0.5;
    room.dispose(); generator.dispose(); invalidate();
    return () => { scene.environment = previous; scene.environmentIntensity = intensity; environment.dispose(); };
  }, [gl, scene, invalidate]);
  return <>
    <ambientLight intensity={0.18} />
    <hemisphereLight args={['#f8fbfa', '#a6b3aa', 0.45]} />
    <directionalLight position={[-2, 10, 3]} intensity={1.8} color="#fff8ec" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0003} shadow-normalBias={0.025} shadow-radius={3} shadow-camera-left={-4.5} shadow-camera-right={4.5} shadow-camera-top={6} shadow-camera-bottom={-3.5} />
    <directionalLight position={[5, 4, -3]} intensity={0.75} color="#dce8f4" />
  </>;
}
function RenderMetrics() {
  // These are WebGLRenderer's counters from the preceding completed frame,
  // exposed for repeatable browser checks, not a fabricated FPS rating.
  useFrame(({ gl }) => {
    gl.domElement.dataset.renderedFrames = String(gl.info.render.frame);
    gl.domElement.dataset.drawCalls = String(gl.info.render.calls);
    gl.domElement.dataset.triangles = String(gl.info.render.triangles);
  });
  return null;
}
type SceneProps = ModelProps & { labelsRef: React.RefObject<Partial<Record<PartId, HTMLButtonElement>>>; leaderRefs: React.RefObject<Partial<Record<PartId, SVGLineElement>>>; locale: string };
// Keep the business clock running without redrawing an unchanged scene. This
// projection contains every Attempt field the geometry and flows read; it never
// caches or substitutes business state, diagnostics, logs or assessment scores.
function visualState(a: Attempt) {
  return [a.water, a.supplyOpen, a.lidOpen, a.drainRemaining > 0, a.defects.inlet, a.defects.seal,
    a.assembly.inlet.installed, a.assembly.inlet.replaced, a.assembly.drain.installed, a.assembly.drain.replaced].join('|');
}
const Scene = memo(function Scene({ attempt: a, cutaway, exploded, selected, onSelect, onFocus, resetToken, viewCommand, labels, labelsRef, leaderRefs, locale }: SceneProps) {
  const [hovered, setHovered] = useState<PartId | null>(null);
  const partRefs = useRef<Partial<Record<PartId, THREE.Group>>>({});
  const f = flows(a);
  const inletOffset: Vec3 = !a.assembly.inlet.installed ? [-1.15, 0.95, 0.5] : exploded ? [-0.72, 0.6, 0] : [0, 0, 0];
  const drainOffset: Vec3 = !a.assembly.drain.installed ? [1.4, 0.75, 0.45] : exploded ? [0.25, 1, 0.15] : [0, 0, 0];
  return <SceneContext.Provider value={{ selected, hovered, setHovered, onSelect, onFocus }}>
    <Controls resetToken={resetToken} viewCommand={viewCommand} exploded={exploded} selected={selected} partRefs={partRefs} />
    <StudioLighting />
    <RenderMetrics />
    <group position={[0, 0, 0]}>
      <Part id="tank" partRefs={partRefs}>
        <Box position={[0, 0.07, 0]} size={[3.65, 0.2, 1.82]} color="#f1f1ed" />
        <Box position={[0, 1.28, -0.83]} size={[3.65, 2.45, 0.16]} color="#dedfdc" />
        <Box position={[-1.76, 1.28, 0]} size={[0.15, 2.45, 1.82]} color="#eeeeea" />
        <Box position={[1.76, 1.28, 0]} size={[0.15, 2.45, 1.82]} color="#f5f5f1" />
        {!cutaway && <Box position={[0, 1.28, 0.83]} size={[3.65, 2.45, 0.16]} color="#f5f5f1" />}
        {cutaway && <Box position={[0, 0.27, 0.83]} size={[3.65, 0.24, 0.16]} color="#e5e7df" />}
        <Box position={[0, 2.48, -0.83]} size={[3.65, 0.1, 0.19]} radius={0.035} color="#eeeee7" />
        {[-1.76, 1.76].map(x => <Box key={x} position={[x, 2.48, 0]} size={[0.19, 0.1, 1.77]} radius={0.035} color="#eeeee7" />)}
        {!cutaway && <Box position={[0, 2.48, 0.83]} size={[3.65, 0.1, 0.19]} radius={0.035} color="#eeeee7" />}
        <Cylinder position={[0.5, -0.25, 0.22]} radius={0.25} height={0.55} color="#e6e7de" />
        <Cylinder position={[0.5, -0.52, 0.22]} radius={0.28} height={0.1} color="#bcc3b7" />
        <Box position={[-1.36, -0.1, -0.5]} size={[0.23, 0.2, 0.23]} color="#cacabd" />
        <Box position={[1.35, -0.1, -0.5]} size={[0.23, 0.2, 0.23]} color="#cacabd" />
        {[-1.36, 1.35].map(x => <group key={x}>
          <Sleeve position={[x, 0.184, -0.5]} outer={0.115} inner={0.03} height={0.025}><Material color="#4d5550" finish="matte" roughness={0.86} /></Sleeve>
          <Fastener position={[x, 0.201, -0.5]}><Material color="#aab2a8" metal={0.74} roughness={0.32} /></Fastener>
        </group>)}
      </Part>
      <Part id="lid" target={[0, exploded ? 1.25 : a.lidOpen ? 0.72 : 0, exploded || a.lidOpen ? -1.95 : 0]} partRefs={partRefs}>
        <Box position={[0, 2.57, 0]} size={[3.83, 0.2, 1.99]} color="#f5f5f1" radius={0.08} />
        <Box position={[0, 2.46, 0]} size={[3.35, 0.065, 1.48]} color="#dcdfd6" radius={0.025} />
        {[-0.63, 0.63].map(z => <Box key={z} position={[0, 2.412, z]} size={[3.12, 0.09, 0.075]} radius={0.02} color="#e1e3d9" />)}
        {[-1.53, 1.53].map(x => <Box key={x} position={[x, 2.412, 0]} size={[0.075, 0.09, 1.27]} radius={0.02} color="#e1e3d9" />)}
        {[-1.43, 1.43].flatMap(x => [-0.54, 0.54].map(z => <mesh key={`${x},${z}`} position={[x, 2.411, z]}><cylinderGeometry args={[0.064, 0.064, 0.036, 16]} /><Material color="#606861" finish="matte" roughness={0.86} /></mesh>))}
        <Sleeve position={[0.95, 2.68, 0.08]} outer={0.21} inner={0.177} height={0.034}><Material color="#c5cdc5" metal={0.85} roughness={0.24} /></Sleeve>
        <Cylinder position={[0.95, 2.701, 0.08]} radius={0.176} height={0.041} color="#b5c0b9" metal={0.72} roughness={0.23} />
        <Cylinder position={[0.95, 2.73, 0.08]} radius={0.144} height={0.025} color="#d2d8d3" metal={0.67} roughness={0.23} />
      </Part>
      <Part id="pipe" partRefs={partRefs}>
        <Pipe points={[[-2.12, 0.12, 1.27], [-2.1, -0.38, 1.27], [-1.63, -0.51, 0.8], [-1.12, -0.28, 0], [-1.12, 0.26, 0]]} radius={0.063} color="#a3aca8" metal={0.72} braided />
        <Cylinder position={[-1.12, -0.07, 0]} radius={0.12} height={0.12} color="#bea66d" metal={0.7} segments={6} />
        <Cylinder position={[-1.12, -0.18, 0]} radius={0.083} height={0.075} color="#b1b9b3" metal={0.78} />
        <ThreadBands position={[-1.12, 0.057, 0]} radius={0.095} count={5} spacing={0.017}><Material color="#b7a16c" metal={0.62} /></ThreadBands>
        <Sleeve position={[-1.12, 0.169, 0]} outer={0.137} inner={0.073} height={0.036}><Material color="#444f47" roughness={0.88} /></Sleeve>
        <Cylinder position={[-2.12, -0.096, 1.27]} radius={0.128} height={0.117} color="#b6bdb4" metal={0.72} segments={6} />
        <Cylinder position={[-2.12, -0.19, 1.27]} radius={0.076} height={0.073} color="#b1b9b3" metal={0.78} />
      </Part>
      <Part id="supply" partRefs={partRefs}>
        <Cylinder position={[-2.12, 0.06, 1.27]} radius={0.11} height={0.3} color="#b7a16e" metal={0.65} />
        <Cylinder position={[-2.12, 0.14, 1.27]} radius={0.134} height={0.048} color="#a38c5a" metal={0.62} segments={6} />
        <ThreadBands position={[-2.12, 0.016, 1.27]} radius={0.112} count={4} spacing={0.026}><Material color="#bcaa7a" metal={0.65} /></ThreadBands>
        <group position={[-2.12, 0.23, 1.27]} rotation={[0, a.supplyOpen ? 0 : Math.PI / 2, 0]}>
          <Box size={[0.48, 0.08, 0.12]} radius={0.04} color="#2b6455" />
          {[-0.16, 0.16].map(x => <Box key={x} position={[x, 0.044, 0]} size={[0.053, 0.012, 0.075]} radius={0.004} color="#3c7864" />)}
        </group>
        <Cylinder position={[-2.12, 0.29, 1.27]} radius={0.04} height={0.04} color="#b5baad" metal={0.6} />
      </Part>
      <Part id="inlet" target={inletOffset} partRefs={partRefs}>
        <Cylinder position={[-1.12, 0.98, 0]} radius={0.1} height={1.65} color="#d9dfcf" />
        <Cylinder position={[-1.12, 0.24, 0]} radius={0.18} height={0.16} color="#556e5e" />
        <Sleeve position={[-1.12, 0.345, 0]} outer={0.137} inner={0.101} height={0.034}><Material color="#c7cdbd" /></Sleeve>
        <Cylinder position={[-1.12, 0.52, 0]} radius={0.114} height={0.075} color="#aab7a4" />
        <Cylinder position={[-1.12, 1.61, 0]} radius={0.143} height={0.07} color="#b1bca8" />
        <Cylinder position={[-1.12, 1.85, 0]} radius={0.22} height={0.32} color={a.assembly.inlet.replaced ? '#719688' : '#697d69'} />
        <Cylinder position={[-1.12, 2.02, 0]} radius={0.245} height={0.1} color="#4d6556" />
        <Sleeve position={[-1.12, 1.695, 0]} outer={0.231} inner={0.212} height={0.028}><Material color="#495b4e" roughness={0.72} /></Sleeve>
        <Cylinder position={[-1.12, 2.075, 0]} radius={0.156} height={0.018} color="#789080" />
        {[-1.24, -1].map(x => <Fastener key={x} position={[x, 2.074, 0]}><Material color="#bbc3b4" metal={0.55} /></Fastener>)}
        <Pipe points={[[-1.12, 1.82, 0], [-0.98, 1.87, 0.23], [-0.89, 1.64, 0.29]]} radius={0.072} color="#b8c9b3" />
        <Sleeve position={[-0.89, 1.629, 0.29]} outer={0.077} inner={0.049} height={0.031}><Material color="#d5dfce" /></Sleeve>
      </Part>
      <Part id="float" target={inletOffset} partRefs={partRefs}><Float attempt={a} /></Part>
      <Part id="drain" target={drainOffset} partRefs={partRefs}>
        <Sleeve position={[0.45, 0.25, 0.25]} outer={0.33} inner={0.225} height={0.17}><Material color="#667069" roughness={0.7} /></Sleeve>
        <Sleeve position={[0.45, 0.19, 0.25]} outer={0.367} inner={0.224} height={0.035}><Material color="#bec7b9" /></Sleeve>
        <mesh position={[0.45, 0.35, 0.25]} rotation={[Math.PI / 2, 0, 0]} castShadow><torusGeometry args={[0.265, 0.051, 12, 40]} /><Material color="#454e48" roughness={0.88} /></mesh>
        <group position={[0.45, 0.39, 0.05]} rotation={[a.drainRemaining > 0 ? -1.05 : 0, 0, 0]}>
          <Cylinder position={[0, 0, 0.2]} radius={0.275} height={0.07} color={a.assembly.drain.replaced ? '#bcad87' : '#ab9973'} roughness={0.62} />
          <Sleeve position={[0, 0.044, 0.2]} outer={0.206} inner={0.182} height={0.014}><Material color="#c6b691" roughness={0.66} /></Sleeve>
          <Box position={[0, 0, 0]} size={[0.12, 0.08, 0.22]} color="#7e7c60" />
          <Cylinder position={[0, 0, 0]} radius={0.035} height={0.22} rotation={[0, 0, Math.PI / 2]} color="#a8b1a5" metal={0.7} />
        </group>
        <LinkedChain points={[[0.45, a.drainRemaining > 0 ? 0.602 : 0.451, a.drainRemaining > 0 ? 0.147 : 0.25], [0.88, 1.0, 0.37], [1.22, 1.67, 0.24], [1.29, 2.25, 0.02]]}><Material color="#aab2a4" metal={0.7} roughness={0.32} /></LinkedChain>
        <Box position={[1.29, 2.25, -0.699]} size={[0.14, 0.15, 0.1]} color="#7e8d7d" radius={0.015} />
        <Cylinder position={[1.29, 2.25, -0.326]} radius={0.022} height={0.712} rotation={[Math.PI / 2, 0, 0]} color="#b4bdae" metal={0.65} />
        <mesh position={[1.29, 2.25, 0.02]}><torusGeometry args={[0.031, 0.009, 6, 16]} /><Material color="#b4bdae" metal={0.65} /></mesh>
      </Part>
      <Part id="overflow" target={exploded ? [0.5, 0.3, 0] : [0, 0, 0]} partRefs={partRefs}>
        <Sleeve position={[1.05, 1.1, -0.2]} outer={0.15} inner={0.104} height={1.9}><Material color="#d1d7c3" /></Sleeve>
        <Sleeve position={[1.05, 2.041, -0.2]} outer={0.17} inner={0.104} height={0.038}><Material color="#ebeadd" /></Sleeve>
        <Sleeve position={[1.05, 0.319, -0.2]} outer={0.174} inner={0.104} height={0.07}><Material color="#afbaa7" /></Sleeve>
        <Pipe points={[[1.05, 0.25, -0.2], [1.03, 0.23, 0.1], [0.56, 0.23, 0.22]]} radius={0.12} color="#cdd4c1" />
      </Part>
      <Part id="water" partRefs={partRefs}><Water attempt={a} /></Part>
      <Flow active={f.incoming && a.assembly.inlet.installed && !exploded} from={[-0.88, 1.62, 0.29]} to={[-0.88, Math.min(1.42, Math.max(0.22, a.water * 2.2)), 0.29]} />
      <Flow active={(f.leaking || f.draining) && !exploded} from={[0.45, 0.27, 0.25]} to={[0.5, -0.65, 0.25]} />
      <Flow active={f.overflowing && !exploded} from={[1.05, 2.12, -0.2]} to={[1.05, 0.38, -0.2]} />
    </group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.73, 0]} receiveShadow><circleGeometry args={[5.5, 80]} /><shadowMaterial transparent opacity={0.055} /></mesh>
    <LabelPositions partRefs={partRefs} labelsRef={labelsRef} selected={selected} attempt={a} labels={labels} leaderRefs={leaderRefs} locale={locale} occlusionKey={`${cutaway}|${visualState(a)}`} />
  </SceneContext.Provider>;
}, (before, next) => visualState(before.attempt) === visualState(next.attempt)
  && before.selected === next.selected && before.cutaway === next.cutaway && before.exploded === next.exploded
  && before.labels === next.labels && before.resetToken === next.resetToken && before.locale === next.locale
  && before.viewCommand?.type === next.viewCommand?.type && before.viewCommand?.token === next.viewCommand?.token && before.viewCommand?.part === next.viewCommand?.part
  && before.onSelect === next.onSelect && before.onFocus === next.onFocus && before.labelsRef === next.labelsRef && before.leaderRefs === next.leaderRefs);
function Fallback({ attempt, onSelect, selected }: Pick<ModelProps, 'attempt' | 'onSelect' | 'selected'>) {
  const { t } = useLocale();
  return <div className="fallback" data-testid="webgl-fallback">
    <p><strong>{t('WebGL 不可用，已切换二维交互')}</strong><br />{t('可继续全部规则训练；二维示意不代表 3D 已成功加载。')}</p>
    <svg viewBox="0 0 440 330" role="img" aria-label={t('二维水箱交互示意图')}>
      <path d="M60 50v235h320V50" fill="#edf0e6" stroke="#738573" strokeWidth="8" />
      <rect x="66" y={278 - attempt.water * 230} width="308" height={Math.max(3, attempt.water * 230)} fill="#95cad6" opacity=".6" />
      {([{ id: 'lid', x: 50, y: attempt.lidOpen ? 12 : 40, w: 340, h: 16 }, { id: 'inlet', x: 94, y: 82, w: 25, h: 195 }, { id: 'float', x: 152, y: 243 - attempt.water * 200, w: 46, h: 38 }, { id: 'overflow', x: 304, y: 71, w: 22, h: 208 }, { id: 'drain', x: 207, y: 260, w: 50, h: 20 }, { id: 'supply', x: 10, y: 250, w: 33, h: 25 }] as const).map(p => <g key={p.id} role="button" tabIndex={0} aria-label={t(PARTS.find(i => i.id === p.id)?.name ?? '')} onClick={() => onSelect(p.id, '2d')} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onSelect(p.id, '2d'); }}><rect x={p.x} y={p.y} width={p.w} height={p.h} rx="6" fill={selected === p.id ? '#226953' : '#829480'} /><title>{t(PARTS.find(i => i.id === p.id)?.name ?? '')}</title></g>)}
    </svg>
    <small>{t('可使用部件列表选择、检查和操作。二维模式不支持镜头工具；旋转、俯视与聚焦需 WebGL。')}</small>
  </div>;
}
class ModelBoundary extends Component<{ children: ReactNode; fallback: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
function supportsWebGL() {
  try { const canvas = document.createElement('canvas'); const context = canvas.getContext('webgl2'); if (!context) return false; context.getExtension('WEBGL_lose_context')?.loseContext(); return true; } catch { return false; }
}
export function TankModel(props: ModelProps) {
  const { t, locale } = useLocale();
  const onSelectRef = useRef(props.onSelect); onSelectRef.current = props.onSelect;
  const select = useCallback<ModelProps['onSelect']>((id, source) => onSelectRef.current(id, source), []);
  const onFocusRef = useRef(props.onFocus); onFocusRef.current = props.onFocus;
  const focus = useCallback((id: PartId) => onFocusRef.current?.(id), []);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => { canvasRef.current?.setAttribute('aria-label', t('可旋转、缩放和点击部件的三维水箱')); }, [t]);
  const [supported] = useState(supportsWebGL);
  const [ready, setReady] = useState(false);
  const reduced = useReducedMotion();
  const [lost, setLost] = useState(false);
  const labelsRef = useRef<Partial<Record<PartId, HTMLButtonElement>>>({});
  const leaderRefs = useRef<Partial<Record<PartId, SVGLineElement>>>({});
  const fallback = <Fallback {...props} />;
  useEffect(() => {
    if (!supported || lost) props.onRendererChange?.('fallback');
    else if (ready) props.onRendererChange?.('webgl');
  }, [supported, lost, ready, props.onRendererChange]);
  return <div className={`tank-model ${props.compact ? 'compact-model' : ''}`} style={{ touchAction: 'pan-y' }} data-testid="tank-model" data-selected={props.selected ?? ''} data-reduced-motion={reduced} data-renderer={supported && ready && !lost ? 'webgl' : 'pending-or-fallback'} data-water-level={props.attempt.water.toFixed(3)} data-supply={props.attempt.supplyOpen ? 'open' : 'closed'} data-inlet-installed={props.attempt.assembly.inlet.installed} data-drain-installed={props.attempt.assembly.drain.installed}>
    {supported && !lost ? <ModelBoundary fallback={fallback} onFailure={() => setLost(true)}>
      <Canvas frameloop="demand" shadows={{ type: THREE.PCFShadowMap }} dpr={[1, 1.5]} camera={{ position: [3.8, 3.9, 8.1], fov: 36, near: 0.1, far: 60 }} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }} onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.93;
        gl.domElement.dataset.renderLoop = 'demand';
        canvasRef.current = gl.domElement;
        gl.domElement.setAttribute('aria-label', t('可旋转、缩放和点击部件的三维水箱'));
        gl.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); setLost(true); }, { once: true });
        setReady(true);
      }} fallback={fallback}>
        <MotionContext.Provider value={reduced}><Scene {...props} onSelect={select} onFocus={props.onFocus ? focus : undefined} labelsRef={labelsRef} leaderRefs={leaderRefs} locale={locale} /></MotionContext.Provider>
      </Canvas>
      <svg aria-hidden="true" className="model-label-leaders" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'hidden' }}>{Object.keys(ANCHORS).map(key => { const id = key as PartId; return <line key={id} ref={el => { if (el) leaderRefs.current[id] = el; }} stroke={props.selected === id ? '#22644d' : '#7c9086'} strokeWidth={props.selected === id ? 1.5 : 1} style={{ visibility: 'hidden' }} />; })}</svg>
      <div className={`model-labels ${props.labels ? '' : 'labels-hidden'}`} aria-hidden={!props.labels}>
        {Object.keys(ANCHORS).map(key => { const id = key as PartId; return <button key={id} type="button" tabIndex={props.labels ? 0 : -1} data-testid={`anchor-${id}`} ref={el => { if (el) labelsRef.current[id] = el; }} onClick={() => props.onSelect(id, 'label')} onDoubleClick={() => props.onFocus?.(id)} className={props.selected === id ? 'chosen' : ''}><span />{t(PARTS.find(p => p.id === id)?.short ?? '')}</button>; })}
      </div>
    </ModelBoundary> : fallback}
  </div>;
}
