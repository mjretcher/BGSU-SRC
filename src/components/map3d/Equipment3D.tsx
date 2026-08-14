"use client";

// Low-poly massing models per equipment category, SketchUp-mockup style:
// grey steel frames, dark platforms, BGSU-orange pads. Units are meters;
// each assembly rests on y=0, centered at origin, long axis along Z.
import type { IconCategory } from "@/generated/prisma/enums";

const FRAME = "#8f8b86";
const DARK = "#33302c";
const PAD = "#e85d10";
const BELT = "#211f1c";

function Box({ p, s, c }: { p: [number, number, number]; s: [number, number, number]; c: string }) {
  return (
    <mesh position={p} castShadow>
      <boxGeometry args={s} />
      <meshLambertMaterial color={c} />
    </mesh>
  );
}

function Post({ p, h, r = 0.04, c = FRAME }: { p: [number, number, number]; h: number; r?: number; c?: string }) {
  return (
    <mesh position={[p[0], p[1] + h / 2, p[2]]} castShadow>
      <cylinderGeometry args={[r, r, h, 6]} />
      <meshLambertMaterial color={c} />
    </mesh>
  );
}

export function EquipmentModel({ category }: { category: IconCategory }) {
  switch (category) {
    case "TREADMILL":
    case "CURVED_TREADMILL":
      return (
        <group>
          <Box p={[0, 0.08, 0.15]} s={[0.8, 0.16, 1.9]} c={DARK} />
          <Box p={[0, 0.17, 0.2]} s={[0.6, 0.04, 1.5]} c={BELT} />
          <Post p={[-0.3, 0.1, -0.75]} h={1.1} />
          <Post p={[0.3, 0.1, -0.75]} h={1.1} />
          <Box p={[0, 1.25, -0.75]} s={[0.75, 0.3, 0.12]} c={DARK} />
          <Box p={[0, 0.95, -0.72]} s={[0.7, 0.05, 0.3]} c={FRAME} />
        </group>
      );
    case "ELLIPTICAL":
    case "ARC_TRAINER":
      return (
        <group>
          <Box p={[0, 0.15, 0.2]} s={[0.65, 0.3, 1.5]} c={DARK} />
          <Post p={[-0.22, 0.3, -0.45]} h={1.0} />
          <Post p={[0.22, 0.3, -0.45]} h={1.0} />
          <Box p={[0, 1.35, -0.5]} s={[0.55, 0.25, 0.1]} c={DARK} />
          <Box p={[-0.18, 0.45, 0.35]} s={[0.12, 0.06, 0.75]} c={FRAME} />
          <Box p={[0.18, 0.45, 0.35]} s={[0.12, 0.06, 0.75]} c={FRAME} />
        </group>
      );
    case "BIKE":
      return (
        <group>
          <Box p={[0, 0.1, 0]} s={[0.45, 0.2, 1.15]} c={DARK} />
          <Post p={[0, 0.2, 0.3]} h={0.55} r={0.05} />
          <Box p={[0, 0.82, 0.32]} s={[0.32, 0.1, 0.34]} c={PAD} />
          <Box p={[0, 1.02, 0.42]} s={[0.34, 0.34, 0.08]} c={PAD} />
          <Post p={[0, 0.2, -0.32]} h={0.7} r={0.05} />
          <Box p={[0, 0.95, -0.35]} s={[0.4, 0.06, 0.14]} c={FRAME} />
        </group>
      );
    case "ROWER_SKI":
      return (
        <group>
          <Box p={[0, 0.22, 0.35]} s={[0.16, 0.1, 1.7]} c={FRAME} />
          <Post p={[-0.2, 0, 1.1]} h={0.24} />
          <Post p={[0.2, 0, 1.1]} h={0.24} />
          <Box p={[0, 0.34, 0.55]} s={[0.3, 0.07, 0.3]} c={DARK} />
          <Box p={[0, 0.45, -0.55]} s={[0.42, 0.62, 0.28]} c={DARK} />
        </group>
      );
    case "STAIR_CLIMBER":
      return (
        <group>
          <Box p={[0, 0.35, 0.25]} s={[0.85, 0.7, 0.7]} c={DARK} />
          <Box p={[0, 0.62, 0.05]} s={[0.7, 0.18, 0.3]} c={FRAME} />
          <Box p={[0, 0.85, -0.15]} s={[0.7, 0.18, 0.3]} c={FRAME} />
          <Box p={[0, 1.08, -0.35]} s={[0.7, 0.18, 0.3]} c={FRAME} />
          <Post p={[-0.35, 0.7, -0.5]} h={0.8} />
          <Post p={[0.35, 0.7, -0.5]} h={0.8} />
          <Box p={[0, 1.55, -0.5]} s={[0.8, 0.2, 0.1]} c={DARK} />
        </group>
      );
    case "BENCH":
      return (
        <group>
          <Box p={[0, 0.42, 0]} s={[0.34, 0.09, 1.25]} c={PAD} />
          <Post p={[0, 0.02, -0.45]} h={0.4} r={0.05} />
          <Post p={[0, 0.02, 0.45]} h={0.4} r={0.05} />
          <Box p={[0, 0.02, 0]} s={[0.42, 0.05, 1.1]} c={FRAME} />
        </group>
      );
    case "RACK_SMITH":
      return (
        <group>
          <Post p={[-0.6, 0, -0.6]} h={2.35} r={0.06} />
          <Post p={[0.6, 0, -0.6]} h={2.35} r={0.06} />
          <Post p={[-0.6, 0, 0.6]} h={2.35} r={0.06} />
          <Post p={[0.6, 0, 0.6]} h={2.35} r={0.06} />
          <Box p={[0, 2.35, 0]} s={[1.4, 0.1, 1.4]} c={FRAME} />
          <mesh position={[0, 1.05, 0.62]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.03, 0.03, 1.7, 6]} />
            <meshLambertMaterial color={DARK} />
          </mesh>
          <Box p={[0, 0.42, -0.15]} s={[0.32, 0.08, 1.0]} c={PAD} />
        </group>
      );
    case "LEG_MACHINE":
      return (
        <group>
          <Box p={[0, 0.06, 0]} s={[0.9, 0.12, 1.2]} c={DARK} />
          <Box p={[0, 0.5, 0.3]} s={[0.5, 0.14, 0.7]} c={PAD} />
          <Box p={[0, 0.85, -0.35]} s={[0.5, 0.75, 0.16]} c={PAD} />
          <Box p={[0, 0.7, -0.55]} s={[0.6, 1.15, 0.2]} c={DARK} />
        </group>
      );
    case "CABLE_PULLEY":
      return (
        <group>
          <Box p={[-1.15, 1.05, 0]} s={[0.5, 2.1, 0.45]} c={DARK} />
          <Box p={[1.15, 1.05, 0]} s={[0.5, 2.1, 0.45]} c={DARK} />
          <Box p={[0, 2.12, 0]} s={[2.85, 0.14, 0.3]} c={FRAME} />
        </group>
      );
    case "SELECTORIZED_UPPER":
      return (
        <group>
          <Box p={[0, 0.06, 0]} s={[0.85, 0.12, 1.05]} c={DARK} />
          <Box p={[0, 0.5, 0.25]} s={[0.42, 0.12, 0.42]} c={PAD} />
          <Box p={[0, 0.95, 0.42]} s={[0.42, 0.8, 0.1]} c={PAD} />
          <Box p={[0, 0.8, -0.4]} s={[0.55, 1.45, 0.3]} c={DARK} />
        </group>
      );
    case "DUMBBELL_RACK":
      return (
        <group>
          <Box p={[0, 0.35, 0.12]} s={[2.4, 0.08, 0.45]} c={FRAME} />
          <Box p={[0, 0.7, -0.08]} s={[2.4, 0.08, 0.45]} c={FRAME} />
          <Box p={[-1.1, 0.35, 0]} s={[0.1, 0.7, 0.55]} c={DARK} />
          <Box p={[1.1, 0.35, 0]} s={[0.1, 0.7, 0.55]} c={DARK} />
          <Box p={[0, 0.44, 0.12]} s={[2.1, 0.1, 0.3]} c={DARK} />
          <Box p={[0, 0.79, -0.08]} s={[2.1, 0.1, 0.3]} c={DARK} />
        </group>
      );
    case "FUNCTIONAL_TOOL":
      return (
        <group>
          <Box p={[0, 0.3, 0]} s={[0.9, 0.6, 0.9]} c={DARK} />
          <Box p={[0, 0.66, 0]} s={[0.6, 0.12, 0.6]} c={PAD} />
        </group>
      );
    case "SPECIALTY":
      return (
        <group>
          <Box p={[0, 0.45, 0]} s={[0.8, 0.9, 0.8]} c={DARK} />
          <Box p={[0, 0.95, 0]} s={[0.5, 0.1, 0.5]} c={FRAME} />
        </group>
      );
  }
}
