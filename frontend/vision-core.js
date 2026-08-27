/**
 * VISION SENSE — 3D VISION CORE VISUALIZATION ENGINE
 * Three.js Powered Cybernetic Security Core
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.VisionCore = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  // Color schemes according to security threat status
  const COLOR_THEMES = {
    NORMAL: {
      core: 0x06b6d4,       // Electric Cyan
      coreInner: 0x38bdf8,
      rings: 0x0284c7,      // Deep Sky Blue
      particles: 0x38bdf8,
      lasers: 0x06b6d4,
      nodes: 0x10b981,      // Green nodes (healthy)
      speedMultiplier: 1.0,
      lightIntensity: 2.2
    },
    WARNING: {
      core: 0xf59e0b,       // Amber
      coreInner: 0xfbbf24,
      rings: 0xd97706,
      particles: 0xfde68a,
      lasers: 0xf59e0b,
      nodes: 0xf59e0b,      // Amber nodes
      speedMultiplier: 2.0,
      lightIntensity: 3.0
    },
    CRITICAL: {
      core: 0xef4444,       // Crimson Red
      coreInner: 0xf87171,
      rings: 0xdc2626,
      particles: 0xfca5a5,
      lasers: 0xef4444,
      nodes: 0xef4444,      // Red alarm nodes
      speedMultiplier: 3.5,
      lightIntensity: 4.5
    }
  };

  class VisionCoreInstance {
    constructor(canvas, options = {}) {
      this.canvas = canvas;
      this.options = Object.assign({
        interactive: true,
        showNodes: true,
        particleCount: 220,
        initialStatus: 'NORMAL'
      }, options);

      this.currentStatus = this.options.initialStatus;
      this.theme = COLOR_THEMES[this.currentStatus] || COLOR_THEMES.NORMAL;
      this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
      this.animId = null;
      this.time = 0;

      this.init();
    }

    init() {
      if (typeof THREE === 'undefined') {
        console.warn('Three.js library is required for VisionCore');
        return;
      }

      const width = this.canvas.clientWidth || 600;
      const height = this.canvas.clientHeight || 350;

      // 1. Scene & Camera Setup
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      this.camera.position.z = 18;

      // 2. WebGL Renderer
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: true,
        antialias: true
      });
      this.renderer.setSize(width, height, false);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      // 3. Lighting
      this.ambientLight = new THREE.AmbientLight(0x0f172a, 1.5);
      this.scene.add(this.ambientLight);

      this.pointLight = new THREE.PointLight(this.theme.core, this.theme.lightIntensity, 50);
      this.pointLight.position.set(0, 0, 0);
      this.scene.add(this.pointLight);

      this.topLight = new THREE.DirectionalLight(0xffffff, 0.8);
      this.topLight.position.set(5, 10, 7);
      this.scene.add(this.topLight);

      // 4. Build Core Geometries
      this.coreGroup = new THREE.Group();
      this.scene.add(this.coreGroup);

      this.buildInnerCore();
      this.buildOrbitalRings();
      this.buildParticleCloud();
      this.buildScanPlane();
      if (this.options.showNodes) {
        this.buildCameraNodes();
      }

      // 5. Events
      this.setupEvents();

      // 6. Animation Loop
      this.animate = this.animate.bind(this);
      this.animate();
    }

    buildInnerCore() {
      // Inner glowing core
      const coreGeo = new THREE.IcosahedronGeometry(2.8, 2);
      this.coreMat = new THREE.MeshStandardMaterial({
        color: this.theme.core,
        emissive: this.theme.core,
        emissiveIntensity: 0.5,
        wireframe: true,
        roughness: 0.2,
        metalness: 0.8
      });
      this.innerCore = new THREE.Mesh(coreGeo, this.coreMat);
      this.coreGroup.add(this.innerCore);

      // Deep solid glowing nucleus
      const nucleusGeo = new THREE.SphereGeometry(1.5, 32, 32);
      this.nucleusMat = new THREE.MeshBasicMaterial({
        color: this.theme.coreInner,
        wireframe: false
      });
      this.nucleus = new THREE.Mesh(nucleusGeo, this.nucleusMat);
      this.coreGroup.add(this.nucleus);
    }

    buildOrbitalRings() {
      this.rings = [];
      const ringConfigs = [
        { radius: 4.6, tube: 0.04, rotX: Math.PI / 3, rotY: 0, speed: 0.008 },
        { radius: 5.6, tube: 0.03, rotX: -Math.PI / 4, rotY: Math.PI / 6, speed: -0.012 },
        { radius: 6.8, tube: 0.05, rotX: Math.PI / 2.2, rotY: -Math.PI / 4, speed: 0.006 }
      ];

      ringConfigs.forEach((cfg) => {
        const ringGeo = new THREE.TorusGeometry(cfg.radius, cfg.tube, 16, 100);
        const ringMat = new THREE.MeshStandardMaterial({
          color: this.theme.rings,
          emissive: this.theme.rings,
          emissiveIntensity: 0.4,
          roughness: 0.3,
          metalness: 0.9
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = cfg.rotX;
        ring.rotation.y = cfg.rotY;
        ring.userData = { speed: cfg.speed };
        this.rings.push(ring);
        this.coreGroup.add(ring);
      });
    }

    buildParticleCloud() {
      const pCount = this.options.particleCount;
      const positions = new Float32Array(pCount * 3);

      for (let i = 0; i < pCount; i++) {
        const r = 4.0 + Math.random() * 5.5;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);

        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
      }

      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      this.particleMat = new THREE.PointsMaterial({
        color: this.theme.particles,
        size: 0.18,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending
      });

      this.particles = new THREE.Points(pGeo, this.particleMat);
      this.coreGroup.add(this.particles);
    }

    buildScanPlane() {
      const planeGeo = new THREE.RingGeometry(0.5, 7.5, 64);
      this.scanMat = new THREE.MeshBasicMaterial({
        color: this.theme.lasers,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending
      });
      this.scanPlane = new THREE.Mesh(planeGeo, this.scanMat);
      this.scanPlane.rotation.x = Math.PI / 2;
      this.coreGroup.add(this.scanPlane);
    }

    buildCameraNodes() {
      this.cameraNodes = [];
      const nodeCount = 6;
      const nodeGeo = new THREE.SphereGeometry(0.22, 16, 16);

      for (let i = 0; i < nodeCount; i++) {
        const angle = (i / nodeCount) * Math.PI * 2;
        const radius = 5.2;
        const nodeMat = new THREE.MeshStandardMaterial({
          color: this.theme.nodes,
          emissive: this.theme.nodes,
          emissiveIntensity: 0.8
        });
        const node = new THREE.Mesh(nodeGeo, nodeMat);
        node.position.set(
          Math.cos(angle) * radius,
          Math.sin(angle * 2) * 1.5,
          Math.sin(angle) * radius
        );
        node.userData = { angle, radius, speed: 0.01 + (i * 0.002) };
        this.cameraNodes.push(node);
        this.coreGroup.add(node);
      }
    }

    setupEvents() {
      if (this.options.interactive) {
        this.canvas.addEventListener('mousemove', (e) => {
          const rect = this.canvas.getBoundingClientRect();
          this.mouse.targetX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
          this.mouse.targetY = -((e.clientY - rect.top) / rect.height - 0.5) * 2;
        });

        this.canvas.addEventListener('mouseleave', () => {
          this.mouse.targetX = 0;
          this.mouse.targetY = 0;
        });
      }

      this.resizeObserver = new ResizeObserver(() => {
        this.handleResize();
      });
      this.resizeObserver.observe(this.canvas);
    }

    handleResize() {
      if (!this.renderer || !this.camera) return;
      const width = this.canvas.clientWidth || 600;
      const height = this.canvas.clientHeight || 350;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height, false);
    }

    setStatus(status) {
      if (!COLOR_THEMES[status]) return;
      this.currentStatus = status;
      this.theme = COLOR_THEMES[status];

      // Update materials color smoothly
      if (this.coreMat) {
        this.coreMat.color.setHex(this.theme.core);
        this.coreMat.emissive.setHex(this.theme.core);
      }
      if (this.nucleusMat) {
        this.nucleusMat.color.setHex(this.theme.coreInner);
      }
      if (this.pointLight) {
        this.pointLight.color.setHex(this.theme.core);
        this.pointLight.intensity = this.theme.lightIntensity;
      }
      if (this.particleMat) {
        this.particleMat.color.setHex(this.theme.particles);
      }
      if (this.scanMat) {
        this.scanMat.color.setHex(this.theme.lasers);
      }
      this.rings.forEach(ring => {
        ring.material.color.setHex(this.theme.rings);
        ring.material.emissive.setHex(this.theme.rings);
      });
      if (this.cameraNodes) {
        this.cameraNodes.forEach(node => {
          node.material.color.setHex(this.theme.nodes);
          node.material.emissive.setHex(this.theme.nodes);
        });
      }
    }

    animate() {
      this.animId = requestAnimationFrame(this.animate);
      this.time += 0.015 * this.theme.speedMultiplier;

      // Mouse Parallax
      this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.05;
      this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.05;

      this.coreGroup.rotation.y = this.time * 0.3 + this.mouse.x * 0.4;
      this.coreGroup.rotation.x = Math.sin(this.time * 0.2) * 0.15 + this.mouse.y * 0.3;

      // Inner core breathing scale
      const pulse = 1 + Math.sin(this.time * 2.5) * (this.currentStatus === 'CRITICAL' ? 0.12 : 0.05);
      this.innerCore.scale.set(pulse, pulse, pulse);
      this.innerCore.rotation.x += 0.005 * this.theme.speedMultiplier;
      this.innerCore.rotation.y += 0.008 * this.theme.speedMultiplier;

      // Orbit rings
      this.rings.forEach((ring, idx) => {
        ring.rotation.z += ring.userData.speed * this.theme.speedMultiplier;
        ring.rotation.y += (idx % 2 === 0 ? 0.003 : -0.003) * this.theme.speedMultiplier;
      });

      // Scan plane vertical sweep
      if (this.scanPlane) {
        this.scanPlane.position.y = Math.sin(this.time * 1.5) * 2.5;
        this.scanPlane.rotation.z += 0.02 * this.theme.speedMultiplier;
      }

      // Camera Nodes
      if (this.cameraNodes) {
        this.cameraNodes.forEach(node => {
          node.userData.angle += node.userData.speed * this.theme.speedMultiplier;
          node.position.x = Math.cos(node.userData.angle) * node.userData.radius;
          node.position.z = Math.sin(node.userData.angle) * node.userData.radius;
        });
      }

      // Particles gentle drift
      if (this.particles) {
        this.particles.rotation.y -= 0.001 * this.theme.speedMultiplier;
      }

      this.renderer.render(this.scene, this.camera);
    }

    dispose() {
      if (this.animId) cancelAnimationFrame(this.animId);
      if (this.resizeObserver) this.resizeObserver.disconnect();
      if (this.renderer) this.renderer.dispose();
    }
  }

  return {
    init: function (canvas, options) {
      return new VisionCoreInstance(canvas, options);
    }
  };
}));
