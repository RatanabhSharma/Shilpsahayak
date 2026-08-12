import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

/**
 * Calculate volume of an STL file in cm³
 */
export async function calculateSTLVolume(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const loader = new STLLoader();
        const geometry = loader.parse(arrayBuffer);

        // Ensure geometry has computed volumes
        geometry.computeBoundingBox();

        // Calculate volume using signed tetrahedron method
        const position = geometry.attributes.position;
        let volume = 0;

        const p1 = new THREE.Vector3();
        const p2 = new THREE.Vector3();
        const p3 = new THREE.Vector3();

        for (let i = 0; i < position.count; i += 3) {
          p1.fromBufferAttribute(position, i);
          p2.fromBufferAttribute(position, i + 1);
          p3.fromBufferAttribute(position, i + 2);

          volume += signedVolumeOfTriangle(p1, p2, p3);
        }

        // Convert from mm³ to cm³ (STL is usually in mm)
        const volumeCm3 = Math.abs(volume) / 1000;
        resolve(volumeCm3);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

function signedVolumeOfTriangle(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  p3: THREE.Vector3
): number {
  return p1.dot(p2.cross(p3)) / 6.0;
}