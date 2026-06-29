import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/** Throw animation state machine */
export interface ThrowAnimState {
  phase: "idle" | "windup" | "throw" | "recover";
  elapsed: number;
  playerGroup: THREE.Group | null;
}

const WINDUP_DURATION = 0.15; // seconds
const THROW_DURATION = 0.15;
const RECOVER_DURATION = 0.3;
const WINDUP_ANGLE = -0.18; // radians (lean back)
const THROW_ANGLE = 0.25; // radians (lean forward)

let playerModel: THREE.Group | null = null;

export const throwAnimState: ThrowAnimState = {
  phase: "idle",
  elapsed: 0,
  playerGroup: null,
};

/**
 * Load the GLTF basketball player model and add it to the scene.
 * Returns a promise that resolves when loading is complete.
 */
export async function loadPlayer(scene: THREE.Scene): Promise<void> {
  const loader = new GLTFLoader();

  return new Promise<void>((resolve, reject) => {
    loader.load(
      "/src/assets/v0_basketball_player_free/scene.gltf",
      (gltf) => {
        playerModel = new THREE.Group();
        playerModel.name = "playerModel";
        playerModel.add(gltf.scene);

        // The model's local Y spans roughly [-0.95, 0.95] (total ~1.9 units).
        // Scale to ~1.85m real-world height → factor ~0.97
        // Position at launch origin, standing on the court floor (y = 0)
        playerModel.scale.set(0.95, 0.95, 0.95);
        playerModel.position.set(0, 1, 0);

        // Face the hoop (+X direction) — model default faces +X after GLTF transform
        playerModel.rotation.y = Math.PI / 2;

        // Enable shadow casting on all child meshes
        playerModel.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        scene.add(playerModel);
        throwAnimState.playerGroup = playerModel;

        resolve();
      },
      undefined,
      (error) => {
        console.error("Failed to load player model:", error);
        reject(error);
      },
    );
  });
}

/** Trigger the throw animation sequence. */
export function triggerThrowAnim() {
  if (!playerModel) return;
  throwAnimState.phase = "windup";
  throwAnimState.elapsed = 0;
}

/** Smooth easing function (ease-in-out quadratic). */
function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Update the throw animation each frame.
 * Call this from the main animate() loop.
 */
export function updateThrowAnim(dt: number) {
  if (throwAnimState.phase === "idle" || !playerModel) return;

  throwAnimState.elapsed += dt;

  switch (throwAnimState.phase) {
    case "windup": {
      const progress = Math.min(throwAnimState.elapsed / WINDUP_DURATION, 1);
      playerModel.rotation.x = easeInOutQuad(progress) * WINDUP_ANGLE;

      if (progress >= 1) {
        throwAnimState.phase = "throw";
        throwAnimState.elapsed = 0;
      }
      break;
    }

    case "throw": {
      const progress = Math.min(throwAnimState.elapsed / THROW_DURATION, 1);
      const eased = easeInOutQuad(progress);
      playerModel.rotation.x =
        WINDUP_ANGLE + eased * (THROW_ANGLE - WINDUP_ANGLE);

      if (progress >= 1) {
        throwAnimState.phase = "recover";
        throwAnimState.elapsed = 0;
      }
      break;
    }

    case "recover": {
      const progress = Math.min(throwAnimState.elapsed / RECOVER_DURATION, 1);
      const eased = easeInOutQuad(progress);
      playerModel.rotation.x = THROW_ANGLE * (1 - eased);

      if (progress >= 1) {
        playerModel.rotation.x = 0;
        throwAnimState.phase = "idle";
        throwAnimState.elapsed = 0;
      }
      break;
    }
  }
}
