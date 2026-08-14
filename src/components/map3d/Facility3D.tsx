"use client";

// SketchUp-mockup-style interactive 3D facility: extruded floor plates from
// the traced plan geometry, massing models per machine, BGSU materials.
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Text, Html } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { FLOORPLANS, FLOORPLAN_W, FLOORPLAN_H, type LevelKey } from "@/data/floorplans";
import { STATUS_SHORT, STATUS_TONE, TONE_COLOR } from "@/lib/status";
import { EquipmentModel } from "./Equipment3D";
import type { MapEquipment } from "../map/FacilityMap";
import type { BuildingLevel } from "@/generated/prisma/enums";

// plan px → meters (building ≈ 140 m across the traced crop)
const S = 0.07598; // calibrated: 1/8-mile track lap = 201 m
const CX = 1202; // crop center in plan px
const CY = 856;

const LEVEL_OF: Record<BuildingLevel, LevelKey> = { ENTRY: "entry", BALCONY: "balcony", LOWER_2: "lower2" };
const LEVEL_Y: Record<LevelKey, number> = { lower2: 0, entry: 4.6, balcony: 9.2 };
const YAW: Record<LevelKey, number> = { entry: (-10 * Math.PI) / 180, balcony: Math.PI, lower2: (-45 * Math.PI) / 180 };

const TONE_3D: Record<string, string> = {
  up: "#34d399",
  warn: "#fbbf24",
  down: "#f87171",
  retired: "#64748b",
};

function toWorld(mapX: number, mapY: number): [number, number] {
  return [(mapX * FLOORPLAN_W - CX) * S, (mapY * FLOORPLAN_H - CY) * S];
}

function centroidOf(pts: number[][]): [number, number] {
  let sx = 0, sy = 0;
  for (const [x, y] of pts) { sx += x; sy += y; }
  return [sx / pts.length, sy / pts.length];
}

function scalePoly(pts: number[][], f: number): number[][] {
  const [cx, cy] = centroidOf(pts);
  return pts.map(([x, y]) => [cx + (x - cx) * f, cy + (y - cy) * f]);
}

function signedArea(pts: number[][]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

// Chaikin corner-cutting: turns traced polygons into smooth curves.
function chaikin(pts: number[][], iterations: number): number[][] {
  let out = pts;
  for (let it = 0; it < iterations; it++) {
    const next: number[][] = [];
    for (let i = 0; i < out.length; i++) {
      const [ax, ay] = out[i];
      const [bx, by] = out[(i + 1) % out.length];
      next.push([0.75 * ax + 0.25 * bx, 0.75 * ay + 0.25 * by]);
      next.push([0.25 * ax + 0.75 * bx, 0.25 * ay + 0.75 * by]);
    }
    out = next;
  }
  return out;
}

// Parallel offset of a closed polygon along vertex normals (px units).
function offsetPoly(pts: number[][], d: number): number[][] {
  const n = pts.length;
  const sign = signedArea(pts) > 0 ? 1 : -1;
  return pts.map((_, i) => {
    const [px, py] = pts[i];
    const [ax, ay] = pts[(i - 1 + n) % n];
    const [bx, by] = pts[(i + 1) % n];
    let e1x = px - ax, e1y = py - ay;
    let e2x = bx - px, e2y = by - py;
    const l1 = Math.hypot(e1x, e1y) || 1, l2 = Math.hypot(e2x, e2y) || 1;
    e1x /= l1; e1y /= l1; e2x /= l2; e2y /= l2;
    let nx = (e1y + e2y) / 2 * sign, ny = -(e1x + e2x) / 2 * sign;
    const ln = Math.hypot(nx, ny) || 1;
    return [px + (nx / ln) * d, py + (ny / ln) * d];
  });
}

// The track infield: the entry-level courts diamond, shrunk and smoothed into
// a clean curve. Used as the plate hole and the lane-line guide.
const INFIELD = chaikin(scalePoly(FLOORPLANS.entry.courts![0], 0.88), 3);

function polyShape(pts: number[][]): THREE.Shape {
  const shape = new THREE.Shape();
  pts.forEach(([x, y], i) => {
    const wx = (x - CX) * S;
    const wy = (y - CY) * S;
    if (i === 0) shape.moveTo(wx, wy);
    else shape.lineTo(wx, wy);
  });
  shape.closePath();
  return shape;
}

function FloorPlate({ level, faded }: { level: LevelKey; faded: boolean }) {
  const plan = FLOORPLANS[level];
  const y = LEVEL_Y[level];
  const geoms = useMemo(() => {
    // The balcony is a mezzanine ring: its plate is only the cardio deck +
    // track (the traced fitness poly), leaving the atrium open to the entry
    // floor below — like the architectural rendering. Other levels extrude
    // their full silhouette.
    const plateSrc = level === "balcony" ? (plan.fitness ?? []).map((pts) => chaikin(pts, 2)) : plan.silhouette ?? [];
    const sil = plateSrc.map((pts) => {
      const shape = polyShape(pts);
      if (level === "balcony") {
        // open the court well: hole wound opposite to the outer boundary
        const holePts = signedArea(pts) * signedArea(INFIELD) > 0 ? [...INFIELD].reverse() : INFIELD;
        const hole = new THREE.Path();
        holePts.forEach(([x, y], i) => {
          const wx = (x - CX) * S;
          const wy = (y - CY) * S;
          if (i === 0) hole.moveTo(wx, wy);
          else hole.lineTo(wx, wy);
        });
        hole.closePath();
        shape.holes.push(hole);
      }
      return new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: false });
    });
    const fit = level === "balcony" ? [] : (plan.fitness ?? []).map((pts) => new THREE.ShapeGeometry(polyShape(pts)));
    const courts = (plan.courts ?? []).map((pts) => new THREE.ShapeGeometry(polyShape(pts)));
    // real-material tints for the support spaces we traced from the plans
    const ZONE_MATS: [keyof typeof plan, string][] = [
      ["lounge", "#8a8178"],
      ["multi", "#7d7484"],
      ["offices", "#717a74"],
      ["locker", "#6f7a81"],
      ["restroom", "#857b71"],
    ];
    const zones = ZONE_MATS.flatMap(([k, c]) =>
      ((plan[k] as number[][][] | undefined) ?? []).map((pts) => ({ geo: new THREE.ShapeGeometry(polyShape(pts)), c })),
    );
    return { sil, fit, courts, zones };
  }, [plan, level]);
  const opacity = faded ? 0.12 : 1;
  return (
    <group position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
      {geoms.sil.map((g, i) => (
        <mesh key={`s${i}`} geometry={g} receiveShadow>
          <meshLambertMaterial color={level === "balcony" ? "#75838d" : "#9c948b"} transparent opacity={opacity} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {geoms.fit.map((g, i) => (
        <mesh key={`f${i}`} geometry={g} position={[0, 0, -0.02]}>
          <meshLambertMaterial color="#63503f" transparent opacity={faded ? 0.1 : 0.95} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {geoms.courts.map((g, i) => (
        <mesh key={`c${i}`} geometry={g} position={[0, 0, -0.02]}>
          <meshLambertMaterial color="#c9a06a" transparent opacity={faded ? 0.1 : 0.95} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {geoms.zones.map(({ geo, c }, i) => (
        <mesh key={`z${i}`} geometry={geo} position={[0, 0, -0.02]}>
          <meshLambertMaterial color={c} transparent opacity={faded ? 0.08 : 0.9} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

// Mezzanine rail along the cardio deck edge (posts + top rail), like the photos.
function Rail({ faded }: { faded: boolean }) {
  const y = LEVEL_Y.balcony;
  const [x0] = toWorld(875 / FLOORPLAN_W, 1052 / FLOORPLAN_H);
  const [x1, z] = toWorld(1495 / FLOORPLAN_W, 1052 / FLOORPLAN_H);
  const posts = [];
  for (let x = x0; x <= x1; x += 1.8) posts.push(x);
  const opacity = faded ? 0.1 : 1;
  return (
    <group>
      {posts.map((x) => (
        <mesh key={x} position={[x, y + 0.55, z]}>
          <cylinderGeometry args={[0.03, 0.03, 1.1, 6]} />
          <meshLambertMaterial color="#9a958f" transparent opacity={opacity} />
        </mesh>
      ))}
      <mesh position={[(x0 + x1) / 2, y + 1.1, z]}>
        <boxGeometry args={[x1 - x0, 0.07, 0.07]} />
        <meshLambertMaterial color="#b3aca4" transparent opacity={opacity} />
      </mesh>
    </group>
  );
}

function Unit({
  e, focusLevel, selected, hovered, arrange, onSelect, onHover, onDragEnd,
}: {
  e: MapEquipment;
  focusLevel: LevelKey | null;
  selected: boolean;
  hovered: boolean;
  arrange: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onDragEnd: (id: string, mapX: number, mapY: number) => void;
}) {
  const lk = LEVEL_OF[e.level];
  const faded = focusLevel !== null && focusLevel !== lk;
  const [wx, wz] = toWorld(e.mapX, e.mapY);
  const y = LEVEL_Y[lk];
  const tone = STATUS_TONE[e.status];
  const attention = tone === "down" || tone === "warn";
  const group = useRef<THREE.Group>(null);
  const drag = useRef<{ plane: THREE.Plane; active: boolean }>({ plane: new THREE.Plane(), active: false });
  const { camera, raycaster, pointer, gl } = useThree();

  useFrame(({ clock }) => {
    if (drag.current.active && group.current) {
      raycaster.setFromCamera(pointer, camera);
      const hit = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(drag.current.plane, hit)) {
        group.current.position.set(hit.x, y, hit.z);
      }
    }
    // pulse attention halo
    if (attention && group.current) {
      const halo = group.current.getObjectByName("halo") as THREE.Mesh | undefined;
      if (halo) (halo.material as THREE.MeshBasicMaterial).opacity = 0.35 + 0.3 * Math.sin(clock.elapsedTime * 3);
    }
  });

  if (faded) return null;

  function down(ev: ThreeEvent<PointerEvent>) {
    if (!arrange) return;
    ev.stopPropagation();
    drag.current.plane.set(new THREE.Vector3(0, 1, 0), -y);
    drag.current.active = true;
    gl.domElement.setPointerCapture(ev.pointerId);
  }
  function up(ev: ThreeEvent<PointerEvent>) {
    if (!drag.current.active || !group.current) return;
    drag.current.active = false;
    const p = group.current.position;
    onDragEnd(e.id, (p.x / S + CX) / FLOORPLAN_W, (p.z / S + CY) / FLOORPLAN_H);
    ev.stopPropagation();
  }

  return (
    <group
      ref={group}
      position={[wx, y, wz]}
      rotation={[0, YAW[lk], 0]}
      onClick={(ev) => {
        ev.stopPropagation();
        if (!arrange) onSelect(e.id);
      }}
      onPointerOver={(ev) => {
        ev.stopPropagation();
        onHover(e.id);
      }}
      onPointerOut={() => onHover(null)}
      onPointerDown={down}
      onPointerUp={up}
    >
      <EquipmentModel category={e.iconCategory} />
      {/* status ring on the floor */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.65, 0.82, 24]} />
        <meshBasicMaterial color={TONE_3D[tone]} transparent opacity={attention ? 0.85 : 0.35} />
      </mesh>
      {attention && (
        <mesh name="halo" position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.1, 24]} />
          <meshBasicMaterial color={TONE_3D[tone]} transparent opacity={0.4} />
        </mesh>
      )}
      {(selected || hovered) && (
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.9, 1.02, 24]} />
          <meshBasicMaterial color="#fe5000" transparent opacity={0.95} />
        </mesh>
      )}
      {hovered && !arrange && (
        <Html position={[0, 2.6, 0]} center distanceFactor={26} zIndexRange={[50, 40]}>
          <div className="pointer-events-none whitespace-nowrap rounded-lg border border-line bg-bg-raised/95 px-3 py-2 shadow-2xl">
            <p className="text-[13px] font-medium leading-tight text-ink">{e.name}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-secondary">
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: TONE_COLOR[tone] }} />
              {STATUS_SHORT[e.status]} <span className="text-[color:var(--text-faint)]">· #{e.itemId}</span>
            </p>
          </div>
        </Html>
      )}
    </group>
  );
}

const CAMS: Record<string, { pos: [number, number, number]; tgt: [number, number, number] }> = {
  all: { pos: [-42, 92, 128], tgt: [0, 4, 6] },
  entry: { pos: [7, 44, 68], tgt: [7, 4.6, 16] },
  balcony: { pos: [-1, 46, 60], tgt: [-1, 9.2, 9] },
  lower2: { pos: [46, 32, 36], tgt: [42, 0, -5] },
};

// White lane lines looping the track ring.
function TrackLanes({ faded }: { faded: boolean }) {
  const loops = useMemo(
    () =>
      [16, 34, 52].map((d) => {
        const pts = offsetPoly(INFIELD, d);
        return new Float32Array(pts.flatMap(([px, py]) => [(px - CX) * S, LEVEL_Y.balcony + 0.04, (py - CY) * S]));
      }),
    [],
  );
  return (
    <>
      {loops.map((arr, i) => (
        <lineLoop key={i}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[arr, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color="#eef2f5" transparent opacity={faded ? 0.06 : 0.75} />
        </lineLoop>
      ))}
    </>
  );
}

// The natatorium: pool water, deck, and lane ropes in the west hall.
function Pool({ faded }: { faded: boolean }) {
  const [x, z] = toWorld(770 / FLOORPLAN_W, 815 / FLOORPLAN_H);
  const lanes = [-7.8, -5.2, -2.6, 0, 2.6, 5.2, 7.8];
  return (
    <group position={[x, LEVEL_Y.entry + 0.02, z]} rotation={[0, Math.PI / 4, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[26, 54]} />
        <meshLambertMaterial color="#a9b2b5" transparent opacity={faded ? 0.08 : 0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[21, 47]} />
        <meshLambertMaterial color="#4d7fa6" transparent opacity={faded ? 0.1 : 0.97} />
      </mesh>
      {lanes.map((lx) => (
        <mesh key={lx} position={[lx, 0.04, 0]}>
          <boxGeometry args={[0.14, 0.02, 45]} />
          <meshLambertMaterial color="#d8e8f2" transparent opacity={faded ? 0.1 : 0.9} />
        </mesh>
      ))}
    </group>
  );
}

// Orange court rectangles on the entry floor, seen through the track well.
function Courts({ faded }: { faded: boolean }) {
  const courts: { c: [number, number]; }[] = [
    { c: [1590, 660] },
    { c: [1775, 830] },
    { c: [1960, 1000] },
  ];
  return (
    <>
      {courts.map(({ c }, i) => {
        const [x, z] = toWorld(c[0] / FLOORPLAN_W, c[1] / FLOORPLAN_H);
        return (
          <mesh key={i} position={[x, LEVEL_Y.entry + 0.03, z]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
            <planeGeometry args={[15, 26]} />
            <meshLambertMaterial color="#b5682f" transparent opacity={faded ? 0.08 : 0.9} />
          </mesh>
        );
      })}
    </>
  );
}

function Diag() {
  const { scene } = useThree();
  const n = useRef(0);
  useFrame(() => {
    n.current++;
    if (n.current % 30 === 1) {
      let meshes = 0;
      scene.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes++; });
      document.body.dataset.r3fFrames = String(n.current);
      document.body.dataset.r3fMeshes = String(meshes);
    }
  });
  return null;
}

function CameraRig({ focus, controls }: { focus: LevelKey | null; controls: React.RefObject<OrbitControlsImpl | null> }) {
  const { camera } = useThree();
  const animating = useRef(false);
  const target = CAMS[focus ?? "all"];

  useEffect(() => {
    animating.current = true;
  }, [focus]);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const cancel = () => {
      animating.current = false;
    };
    c.addEventListener("start", cancel);
    return () => c.removeEventListener("start", cancel);
  }, [controls]);

  useFrame(() => {
    if (!controls.current || !animating.current) return;
    const pos = new THREE.Vector3(...target.pos);
    const tgt = new THREE.Vector3(...target.tgt);
    camera.position.lerp(pos, 0.08);
    controls.current.target.lerp(tgt, 0.08);
    controls.current.update();
    if (camera.position.distanceTo(pos) < 0.2 && controls.current.target.distanceTo(tgt) < 0.2) {
      animating.current = false;
    }
  });
  return null;
}

function Caption({ text, at, y }: { text: string; at: [number, number]; y: number }) {
  const [x, z] = at;
  return (
    <Text
      position={[x, y + 0.06, z]}
      rotation={[-Math.PI / 2, 0, 0]}
      fontSize={1.5}
      letterSpacing={0.35}
      color="#d9d4cc"
      fillOpacity={0.65}
      anchorX="center"
    >
      {text}
    </Text>
  );
}

export function Facility3D({
  equipment, selectedId, onSelect, arrange, onMove, focus, onContextLost,
}: {
  equipment: MapEquipment[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  arrange: boolean;
  onMove: (id: string, x: number, y: number) => void;
  focus: LevelKey | null;
  onContextLost?: () => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const controls = useRef<OrbitControlsImpl | null>(null);

  const capt = (px: number, py: number): [number, number] => [(px - CX) * S, (py - CY) * S];

  return (
    <Canvas
      shadows
      camera={{ position: CAMS.all.pos, fov: 42 }}
      onPointerMissed={() => onSelect(null)}
      onCreated={({ scene, camera, gl: renderer }) => {
        document.body.dataset.r3fCreated = "1";
        renderer.domElement.addEventListener("webglcontextlost", (ev) => {
          ev.preventDefault();
          onContextLost?.();
        });
        (window as unknown as Record<string, unknown>).__scene = scene;
        (window as unknown as Record<string, unknown>).__cam = camera;
      }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.9} color="#fff2e2" />
      <directionalLight
        position={[-30, 55, 25]}
        intensity={1.9}
        color="#ffe8d0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
      />
      <hemisphereLight intensity={0.35} color="#ffe0c2" groundColor="#2a1c12" />

      <mesh position={[0, -0.9, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[130, 48]} />
        <meshLambertMaterial color="#151110" />
      </mesh>
      {(["lower2", "entry", "balcony"] as LevelKey[]).map((lk) => (
        <FloorPlate key={lk} level={lk} faded={focus !== null && focus !== lk} />
      ))}
      <Rail faded={focus !== null && focus !== "balcony"} />
      <TrackLanes faded={focus !== null && focus !== "balcony"} />
      <Pool faded={focus !== null && focus !== "entry"} />
      <Courts faded={focus !== null && focus !== "entry"} />

      {(focus === null || focus === "entry") && (
        <>
          <Caption text="FREE WEIGHTS" at={capt(1075, 935)} y={LEVEL_Y.entry} />
          <Caption text="STRENGTH" at={capt(1460, 935)} y={LEVEL_Y.entry} />
          <Caption text="SWIMMING" at={capt(560, 560)} y={LEVEL_Y.entry} />
          <Caption text="COURTS" at={capt(1720, 560)} y={LEVEL_Y.entry} />
          <Caption text="CLIMBING WALL" at={capt(420, 1090)} y={LEVEL_Y.entry} />
          <Caption text="LOUNGE" at={capt(1180, 1180)} y={LEVEL_Y.entry} />
        </>
      )}
      {(focus === null || focus === "balcony") && (
        <>
          <Caption text="CARDIO DECK" at={capt(1185, 830)} y={LEVEL_Y.balcony} />
          <Caption text="TRACK" at={capt(1900, 690)} y={LEVEL_Y.balcony} />
        </>
      )}
      {(focus === null || focus === "lower2") && (
        <Caption text="FUNCTIONAL TRAINING" at={capt(1866, 620)} y={LEVEL_Y.lower2} />
      )}

      {equipment.map((e) => (
        <Unit
          key={e.id}
          e={e}
          focusLevel={focus}
          selected={selectedId === e.id}
          hovered={hovered === e.id}
          arrange={arrange}
          onSelect={onSelect}
          onHover={setHovered}
          onDragEnd={onMove}
        />
      ))}

      <OrbitControls
        ref={controls}
        enabled={!arrange}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        zoomSpeed={0.9}
        zoomToCursor
        minPolarAngle={0.25}
        maxPolarAngle={1.25}
        minDistance={12}
        maxDistance={240}
      />
      <CameraRig focus={focus} controls={controls} />
      <Diag />
    </Canvas>
  );
}
