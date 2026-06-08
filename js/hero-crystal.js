// =============================================================================
//  FH Studio – Hero-Orb: interaktiver 3D-Kristall (Three.js, buildless ES-Modul)
//  Zum Drehen ziehen. Importmap (in index.html) liefert 'three' + 'three/addons/'.
// =============================================================================
  try {
    const canvas = document.getElementById('hero3d');
    if (canvas) {
      let sentReady = false;
      const THREE = await import('three');
      const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
      const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
      const renderer = new THREE.WebGLRenderer({ canvas, alpha:true, antialias:true });
      renderer.setPixelRatio(Math.min(devicePixelRatio||1, 2));
      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      const cam = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      cam.position.set(0, 0, 4.2);
      const geo = new THREE.IcosahedronGeometry(1.3, 0);
      const mat = new THREE.MeshPhysicalMaterial({
        color: 0xeaf0ff, metalness: 0.0, roughness: 0.12,
        clearcoat: 1, clearcoatRoughness: 0.18,
        iridescence: 1, iridescenceIOR: 1.5, sheen: 1, sheenColor: 0x8fd8ff,
        flatShading: true, envMapIntensity: 0.6
      });
      const crystal = new THREE.Mesh(geo, mat);
      scene.add(crystal);
      // technische Wireframe-Kanten (igloo-Anmutung)
      crystal.add(new THREE.LineSegments(
        new THREE.WireframeGeometry(geo),
        new THREE.LineBasicMaterial({ color: 0x6b4eff, transparent:true, opacity:0.3 })
      ));
      scene.add(new THREE.AmbientLight(0xffffff, 0.28));
      [[0x7c5cff,3,2,3],[0x16e0c7,-3,-1,2],[0xff4d8d,0,3,-2],[0x2f6bdc,2,-3,1]].forEach(([c,x,y,z])=>{
        const p = new THREE.DirectionalLight(c, 2.4); p.position.set(x,y,z); scene.add(p);
      });
      let rx=0.2, ry=0, trx=0.2, trY=0, drag=false, lx=0, ly=0;
      canvas.addEventListener('pointerdown', e=>{ drag=true; lx=e.clientX; ly=e.clientY; });
      addEventListener('pointermove', e=>{ if(!drag) return; trY+=(e.clientX-lx)*0.01; trx+=(e.clientY-ly)*0.01; trx=Math.max(-1.2,Math.min(1.2,trx)); lx=e.clientX; ly=e.clientY; });
      addEventListener('pointerup', ()=>{ drag=false; });
      const rotOut = document.getElementById('orbRot');
      function resize(){ const s = canvas.clientWidth || 300; renderer.setSize(s, s, false); cam.aspect=1; cam.updateProjectionMatrix(); }
      resize(); addEventListener('resize', resize);
      function loop(){
        if(!drag) trY += reduce ? 0.0015 : 0.004;
        rx += (trx-rx)*0.08; ry += (trY-ry)*0.08;
        crystal.rotation.x = rx; crystal.rotation.y = ry;
        if(rotOut){ const deg=((Math.round(ry*57.2958)%360)+360)%360; rotOut.textContent=String(deg).padStart(3,'0')+'°'; }
        renderer.render(scene, cam);
        if(!sentReady){ sentReady = true; dispatchEvent(new Event('fh:scene-ready')); }  // erster Frame -> Loader darf weichen
        requestAnimationFrame(loop);
      }
      loop();
    }
  } catch(err) { console.warn('3D-Kristall konnte nicht geladen werden:', err); }
