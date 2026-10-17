import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function RealEarthGlobe({ mouseOffset = { x: 0, y: 0 }, className = '' }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 440;
    const height = container.clientHeight || 440;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 1000);
    camera.position.set(0, 0, 7.0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // 2. Earth Group (holds Earth, clouds, orbits, swath, reticles)
    const earthGroup = new THREE.Group();
    // Default initial rotation showing Asia/Himalayas/Indian Ocean centered
    earthGroup.rotation.y = -Math.PI * 0.42;
    earthGroup.rotation.x = 0.22;
    scene.add(earthGroup);

    // 3. Texture Loading
    const textureLoader = new THREE.TextureLoader();
    const earthMap = textureLoader.load('/textures/earth_atmos_2048.jpg');
    const earthNormal = textureLoader.load('/textures/earth_normal_2048.jpg');
    const earthSpec = textureLoader.load('/textures/earth_specular_2048.jpg');
    const cloudsMap = textureLoader.load('/textures/earth_clouds_1024.png');

    // 4. Earth Sphere
    const earthRadius = 1.72;
    const earthGeo = new THREE.SphereGeometry(earthRadius, 64, 64);
    const earthMat = new THREE.MeshPhongMaterial({
      map: earthMap,
      normalMap: earthNormal,
      normalScale: new THREE.Vector2(0.7, 0.7),
      specularMap: earthSpec,
      specular: new THREE.Color(0x182c44),
      shininess: 72,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthGroup.add(earthMesh);

    // 5. Cloud Sphere Layer (Decreased atmospheric fog & clouds)
    const cloudsGeo = new THREE.SphereGeometry(earthRadius * 1.012, 64, 64);
    const cloudsMat = new THREE.MeshStandardMaterial({
      map: cloudsMap,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const cloudsMesh = new THREE.Mesh(cloudsGeo, cloudsMat);
    earthGroup.add(cloudsMesh);

    // 6. Atmospheric Halo Outer Glow (Crisp, thin limb ring without foggy surface bleed)
    const atmosGeo = new THREE.SphereGeometry(earthRadius * 1.07, 64, 64);
    const atmosMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(max(0.0, 0.46 - dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.4);
          gl_FragColor = vec4(0.20, 0.55, 0.95, 1.0) * intensity * 0.65;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
    scene.add(atmosMesh);

    // 7. Dual Glowing Red Target Reticles on Earth's Surface
    const createTargetReticle = (latDeg, lonDeg) => {
      const lat = latDeg * (Math.PI / 180);
      const lon = lonDeg * (Math.PI / 180);
      const r = earthRadius * 1.025;
      const pos = new THREE.Vector3(
        -r * Math.cos(lat) * Math.cos(lon),
        r * Math.sin(lat),
        r * Math.cos(lat) * Math.sin(lon)
      );

      const reticleGroup = new THREE.Group();
      reticleGroup.position.copy(pos);
      reticleGroup.lookAt(pos.clone().multiplyScalar(2));

      // Outer ring
      const ringGeo = new THREE.RingGeometry(0.08, 0.095, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xe11d48,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      reticleGroup.add(ring);

      // Inner ring
      const innerRingGeo = new THREE.RingGeometry(0.04, 0.05, 32);
      const innerRingMat = new THREE.MeshBasicMaterial({
        color: 0xfb7185,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75,
      });
      const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
      reticleGroup.add(innerRing);

      // Core dot
      const dotGeo = new THREE.CircleGeometry(0.022, 16);
      const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      reticleGroup.add(dot);

      return { group: reticleGroup, ring };
    };

    // Target 1: Himalayan / Indian Subcontinent Observation Target
    const reticle1 = createTargetReticle(28, 84);
    earthGroup.add(reticle1.group);

    // Target 2: Southern Oceanic InSAR Calibration Target
    const reticle2 = createTargetReticle(-22, 68);
    earthGroup.add(reticle2.group);

    // 9. 3D Inclined Orbital Ellipse Tracks with Satellite Nodes
    const createOrbitTrack = (radiusX, radiusZ, rotX, rotZ, nodeCount = 3) => {
      const orbitGroup = new THREE.Group();
      orbitGroup.rotation.x = rotX;
      orbitGroup.rotation.z = rotZ;

      const curve = new THREE.EllipseCurve(0, 0, radiusX, radiusZ, 0, 2 * Math.PI, false, 0);
      const points = curve.getPoints(128);
      const orbitGeo = new THREE.BufferGeometry().setFromPoints(
        points.map((p) => new THREE.Vector3(p.x, 0, p.y))
      );
      const orbitMat = new THREE.LineDashedMaterial({
        color: 0xffffff,
        dashSize: 0.12,
        gapSize: 0.08,
        transparent: true,
        opacity: 0.22,
      });
      const orbitLine = new THREE.Line(orbitGeo, orbitMat);
      orbitLine.computeLineDistances();
      orbitGroup.add(orbitLine);

      // Satellite Nodes (Simple clean white dots along the orbit)
      for (let i = 0; i < nodeCount; i++) {
        const u = i / nodeCount + 0.18;
        const pt = curve.getPoint(u);
        const nodeGeo = new THREE.SphereGeometry(0.025, 16, 16);
        const nodeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
        nodeMesh.position.set(pt.x, 0, pt.y);
        orbitGroup.add(nodeMesh);
      }

      return orbitGroup;
    };

    // Track 1 (-24 deg tilt)
    scene.add(createOrbitTrack(2.26, 2.16, -0.42, 0.18, 3));
    // Track 2 (+34 deg tilt)
    scene.add(createOrbitTrack(2.32, 2.20, 0.58, -0.22, 3));
    // Track 3 (Subtle near-equatorial tilt)
    scene.add(createOrbitTrack(2.38, 2.26, 0.08, 0.05, 2));

    // 10. Lighting (Sun key light, rim fill, ambient space bounce)
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
    sunLight.position.set(5, 3, 5);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.85);
    rimLight.position.set(-5, 1, -4);
    scene.add(rimLight);

    const redAccentLight = new THREE.DirectionalLight(0xe11d48, 0.75);
    redAccentLight.position.set(0, -4, 3);
    scene.add(redAccentLight);

    const ambientLight = new THREE.AmbientLight(0x060e1d, 0.55);
    scene.add(ambientLight);

    // 11. Animation Loop
    let animId;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Slow realistic planetary rotation
      earthGroup.rotation.y += 0.001;
      cloudsMesh.rotation.y += 0.0014;

      // Reticle pulsation
      const s1 = 1 + Math.sin(elapsed * 3) * 0.2;
      reticle1.ring.scale.set(s1, s1, 1);
      const s2 = 1 + Math.sin(elapsed * 2.5 + 1) * 0.22;
      reticle2.ring.scale.set(s2, s2, 1);

      // Subtle mouse interaction
      scene.rotation.y = mouseOffset.x * 0.22;
      scene.rotation.x = mouseOffset.y * -0.16;

      renderer.render(scene, camera);
    };
    animate();

    // 12. Dynamic Resize with Horizontal Span Protection (Prevents any side clipping)
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;

      const aspect = w / h;
      camera.aspect = aspect;

      // Protect horizontal visible span so globe (radius 1.72) and orbits are NEVER cut off sideways
      const requiredHalfWidth = 2.65;
      const minTanV = requiredHalfWidth / (camera.position.z * aspect);
      const baseTanV = Math.tan((36 * Math.PI) / 360);
      const effectiveTanV = Math.max(baseTanV, minTanV);
      camera.fov = (2 * Math.atan(effectiveTanV) * 180) / Math.PI;

      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    handleResize();

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 13. Cleanup
    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      earthGeo.dispose();
      earthMat.dispose();
      cloudsGeo.dispose();
      cloudsMat.dispose();
      atmosGeo.dispose();
      atmosMat.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`relative w-full max-w-[700px] h-[380px] sm:h-[430px] lg:h-[470px] xl:h-[510px] mx-auto flex items-center justify-center select-none cursor-grab active:cursor-grabbing ${className}`}
    >
      {/* Background Atmospheric Radial Glow */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full blur-[90px]"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(225,29,72,0.18) 0%, rgba(37,99,235,0.2) 40%, rgba(139,92,246,0.1) 65%, transparent 75%)',
        }}
      />
    </div>
  );
}
