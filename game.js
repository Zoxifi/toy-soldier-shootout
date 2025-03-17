// Import required modules
import { gameState, initGameState, calculateNextWaveDucks, isBossWave, getCurrentBoss } from './gameState.js';
import { initInput, updateCameraRotation, updatePlayerMovement } from './input.js';
import { scene, camera, renderer, initRenderer, createLighting, animate } from './renderer.js';
import { initUI, updateHUD } from './ui.js';
import { initAudio, playSound, stopAllMusic } from './audio.js';

// Game objects
let player;
let ducks = [];
let bullets = [];
let particleSystems = [];
let objects = [];
let currentBoss = null;

// Initialize game
async function initGame() {
    // Initialize all components
    await initGameState();
    initRenderer();
    initInput();
    initUI();
    await initAudio();
    
    // Create lighting
    createLighting();
    
    // Start game loop
    gameLoop();
}

// Game loop
function gameLoop() {
    if (!gameState.isPaused) {
        // Update game components
        updatePlayerMovement();
        updateCameraRotation();
        updateDucks();
        updateBullets();
        
        // Update boss if present
        if (currentBoss) {
            updateBoss();
        }
        
        // Update particle systems
        updateParticleSystems();
        
        // Update HUD
        updateHUD();
        
        // Check wave completion
        checkWaveCompletion();
    }
    
    // Render scene
    animate();
    
    // Continue game loop
    requestAnimationFrame(gameLoop);
}

// Create player
function createPlayer() {
    player = {
        position: new THREE.Vector3(0, 1.6, 0),
        lookDirection: new THREE.Vector3(0, 0, -1),
        isShooting: false,
        isAiming: false,
        shootingInterval: null
    };
    
    // Set initial camera position
    camera.position.copy(player.position);
}

// Create environment
function createEnvironment() {
    // Create floor
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x808080,
        roughness: 0.8,
        metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.userData.collidable = true;
    scene.add(floor);
    objects.push({ mesh: floor });
    
    // Create walls
    const wallGeometry = new THREE.BoxGeometry(50, 10, 1);
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0xa0a0a0,
        roughness: 0.7,
        metalness: 0.3
    });
    
    // North wall
    const northWall = new THREE.Mesh(wallGeometry, wallMaterial);
    northWall.position.set(0, 5, -25);
    northWall.receiveShadow = true;
    northWall.castShadow = true;
    northWall.userData.collidable = true;
    scene.add(northWall);
    objects.push({ mesh: northWall });
    
    // South wall
    const southWall = new THREE.Mesh(wallGeometry, wallMaterial);
    southWall.position.set(0, 5, 25);
    southWall.receiveShadow = true;
    southWall.castShadow = true;
    southWall.userData.collidable = true;
    scene.add(southWall);
    objects.push({ mesh: southWall });
    
    // East wall
    const eastWall = new THREE.Mesh(wallGeometry, wallMaterial);
    eastWall.rotation.y = Math.PI / 2;
    eastWall.position.set(25, 5, 0);
    eastWall.receiveShadow = true;
    eastWall.castShadow = true;
    eastWall.userData.collidable = true;
    scene.add(eastWall);
    objects.push({ mesh: eastWall });
    
    // West wall
    const westWall = new THREE.Mesh(wallGeometry, wallMaterial);
    westWall.rotation.y = Math.PI / 2;
    westWall.position.set(-25, 5, 0);
    westWall.receiveShadow = true;
    westWall.castShadow = true;
    westWall.userData.collidable = true;
    scene.add(westWall);
    objects.push({ mesh: westWall });
    
    // Add random decorative objects
    addDecorativeObjects();
}

// Add decorative objects
function addDecorativeObjects() {
    const objectCount = 20;
    const objectTypes = [
        {
            geometry: new THREE.BoxGeometry(1, 1, 1),
            material: new THREE.MeshStandardMaterial({ color: 0x8b4513 }),
            scale: new THREE.Vector3(1, 1, 1)
        },
        {
            geometry: new THREE.CylinderGeometry(0.5, 0.5, 2, 8),
            material: new THREE.MeshStandardMaterial({ color: 0x4a90e2 }),
            scale: new THREE.Vector3(1, 1, 1)
        },
        {
            geometry: new THREE.SphereGeometry(0.7, 16, 16),
            material: new THREE.MeshStandardMaterial({ color: 0xe74c3c }),
            scale: new THREE.Vector3(1, 1, 1)
        }
    ];
    
    for (let i = 0; i < objectCount; i++) {
        const type = objectTypes[Math.floor(Math.random() * objectTypes.length)];
        const object = new THREE.Mesh(type.geometry, type.material);
        
        // Random position within bounds
        object.position.set(
            (Math.random() - 0.5) * 40,
            type.scale.y / 2,
            (Math.random() - 0.5) * 40
        );
        
        object.scale.copy(type.scale);
        object.castShadow = true;
        object.receiveShadow = true;
        object.userData.collidable = true;
        
        scene.add(object);
        objects.push({ mesh: object });
    }
}

// Start game
function startGame() {
    // Reset game state
    gameState.isGameActive = true;
    gameState.isPaused = false;
    gameState.isGameOver = false;
    gameState.startTime = Date.now();
    
    // Start first wave
    startWave();
    
    // Start animation loop
    animate();
}

// Start wave
function startWave() {
    // Clear existing ducks
    clearDucks();
    
    if (isBossWave()) {
        // Spawn boss
        spawnBoss();
    } else {
        // Spawn ducks
        const duckCount = calculateNextWaveDucks();
        spawnDucks(duckCount);
    }
    
    // Update wave display
    updateHUD();
    
    // Play wave start sound
    playSound('waveStart');
}

// Spawn ducks
function spawnDucks(count) {
    for (let i = 0; i < count; i++) {
        // Random duck type
        const duckType = gameState.duckTypes[Math.floor(Math.random() * gameState.duckTypes.length)];
        
        // Create duck mesh
        const duck = createDuck(duckType);
        
        // Random position around the arena
        const angle = (Math.random() * Math.PI * 2);
        const radius = 20 + Math.random() * 5;
        duck.mesh.position.set(
            Math.cos(angle) * radius,
            1,
            Math.sin(angle) * radius
        );
        
        // Add to scene and ducks array
        scene.add(duck.mesh);
        ducks.push(duck);
    }
}

// Create duck
function createDuck(duckType) {
    // Create duck body
    const bodyGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: duckType.color,
        roughness: 0.7,
        metalness: 0.3
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    
    // Create duck head
    const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    head.position.set(0.4, 0.3, 0);
    body.add(head);
    
    // Create duck beak
    const beakGeometry = new THREE.ConeGeometry(0.1, 0.3, 8);
    const beakMaterial = new THREE.MeshStandardMaterial({
        color: 0xff9900,
        roughness: 0.7,
        metalness: 0.3
    });
    const beak = new THREE.Mesh(beakGeometry, beakMaterial);
    beak.rotation.z = Math.PI / 2;
    beak.position.set(0.6, 0.3, 0);
    body.add(beak);
    
    // Create duck group
    const duckGroup = new THREE.Group();
    duckGroup.add(body);
    duckGroup.scale.multiplyScalar(duckType.scale);
    
    // Enable shadows
    duckGroup.traverse((object) => {
        if (object.isMesh) {
            object.castShadow = true;
            object.receiveShadow = true;
        }
    });
    
    // Create duck object
    const duck = {
        mesh: duckGroup,
        type: duckType,
        health: duckType.health,
        isHit: false,
        value: duckType.value,
        speed: duckType.speed,
        direction: new THREE.Vector3()
    };
    
    return duck;
}

// Update ducks
function updateDucks() {
    ducks.forEach(duck => {
        if (!duck.isHit) {
            // Calculate direction towards player
            duck.direction.subVectors(player.position, duck.mesh.position);
            duck.direction.y = 0; // Keep ducks at same height
            duck.direction.normalize();
            
            // Move duck
            duck.mesh.position.add(duck.direction.multiplyScalar(duck.speed));
            
            // Rotate duck to face direction
            duck.mesh.lookAt(player.position);
            
            // Check if duck is too close to player
            if (duck.mesh.position.distanceTo(player.position) < 2) {
                // Damage player
                damagePlayer(duck.type.damage);
            }
        }
    });
}

// Clear ducks
function clearDucks() {
    ducks.forEach(duck => {
        scene.remove(duck.mesh);
    });
    ducks = [];
}

// Spawn boss
function spawnBoss() {
    const boss = getCurrentBoss();
    if (!boss) return;
    
    // Create boss mesh based on type
    currentBoss = createBoss(boss);
    
    // Position boss
    currentBoss.mesh.position.set(0, boss.scale, -20);
    
    // Add to scene
    scene.add(currentBoss.mesh);
    
    // Play boss music
    if (boss.isFinalBoss) {
        playSound('finalBossMusic');
    } else {
        playSound('bossMusic');
    }
}

// Create boss
function createBoss(bossConfig) {
    let bossGeometry, bossMaterial;
    
    switch (bossConfig.name) {
        case "Giant Rubber Duck": {
            bossGeometry = new THREE.SphereGeometry(1, 32, 32);
            bossMaterial = new THREE.MeshStandardMaterial({
                color: bossConfig.color,
                roughness: 0.5,
                metalness: 0.3
            });
            break;
        }
        case "Toy Robot": {
            bossGeometry = new THREE.BoxGeometry(1, 2, 1);
            bossMaterial = new THREE.MeshStandardMaterial({
                color: bossConfig.color,
                roughness: 0.3,
                metalness: 0.7
            });
            break;
        }
        case "Teddy Bear": {
            bossGeometry = new THREE.SphereGeometry(1, 32, 32);
            bossMaterial = new THREE.MeshStandardMaterial({
                color: bossConfig.color,
                roughness: 0.9,
                metalness: 0.1
            });
            break;
        }
        case "RC Car": {
            bossGeometry = new THREE.BoxGeometry(2, 1, 3);
            bossMaterial = new THREE.MeshStandardMaterial({
                color: bossConfig.color,
                roughness: 0.4,
                metalness: 0.6
            });
            break;
        }
        case "Mega Toy Commander": {
            bossGeometry = new THREE.BoxGeometry(2, 3, 2);
            bossMaterial = new THREE.MeshStandardMaterial({
                color: bossConfig.color,
                roughness: 0.2,
                metalness: 0.8
            });
            break;
        }
        default: {
            bossGeometry = new THREE.BoxGeometry(1, 1, 1);
            bossMaterial = new THREE.MeshStandardMaterial({
                color: bossConfig.color
            });
        }
    }
    
    const bossMesh = new THREE.Mesh(bossGeometry, bossMaterial);
    bossMesh.scale.multiplyScalar(bossConfig.scale);
    bossMesh.castShadow = true;
    bossMesh.receiveShadow = true;
    
    // Create boss object
    const boss = {
        mesh: bossMesh,
        config: bossConfig,
        health: bossConfig.health,
        currentPhase: 0,
        lastAttack: 0,
        attackInterval: 2000
    };
    
    return boss;
}

// Update boss
function updateBoss() {
    if (!currentBoss) return;
    
    // Update boss position and behavior based on current phase
    const phase = currentBoss.config.phases[currentBoss.currentPhase];
    switch (phase.pattern) {
        case "circle": {
            circleBossPattern();
            break;
        }
        case "spiral": {
            spiralBossPattern();
            break;
        }
        case "cross": {
            crossBossPattern();
            break;
        }
        case "random": {
            randomBossPattern();
            break;
        }
    }
    
    // Check for phase transition
    if (currentBoss.health <= phase.healthThreshold) {
        currentBoss.currentPhase++;
        playSound('boss_phase_change');
    }
}

// Boss movement patterns
function circleBossPattern() {
    const time = Date.now() * 0.001;
    const radius = 10;
    currentBoss.mesh.position.x = Math.cos(time) * radius;
    currentBoss.mesh.position.z = Math.sin(time) * radius;
    currentBoss.mesh.lookAt(player.position);
}

function spiralBossPattern() {
    const time = Date.now() * 0.001;
    const radius = 5 + time % 5;
    currentBoss.mesh.position.x = Math.cos(time * 2) * radius;
    currentBoss.mesh.position.z = Math.sin(time * 2) * radius;
    currentBoss.mesh.lookAt(player.position);
}

function crossBossPattern() {
    const time = Date.now() * 0.001;
    if (Math.floor(time) % 2 === 0) {
        currentBoss.mesh.position.x = Math.cos(time * 4) * 10;
    } else {
        currentBoss.mesh.position.z = Math.sin(time * 4) * 10;
    }
    currentBoss.mesh.lookAt(player.position);
}

function randomBossPattern() {
    if (Date.now() - currentBoss.lastMove > 1000) {
        currentBoss.mesh.position.x += (Math.random() - 0.5) * 5;
        currentBoss.mesh.position.z += (Math.random() - 0.5) * 5;
        currentBoss.lastMove = Date.now();
    }
    currentBoss.mesh.lookAt(player.position);
}

// Check wave completion
function checkWaveCompletion() {
    if (ducks.length === 0 && !currentBoss) {
        if (isBossWave(gameState.currentWave)) {
            spawnBoss();
        } else {
            startNextWave();
        }
    }
}

// Start next wave
function startNextWave() {
    gameState.currentWave++;
    const ducksToSpawn = calculateNextWaveDucks();
    spawnDucks(ducksToSpawn);
    playSound('wave_start');
    updateHUD();
}

// Update particle systems
function updateParticleSystems() {
    for (let i = particleSystems.length - 1; i >= 0; i--) {
        const system = particleSystems[i];
        system.update();
        
        if (system.isDead()) {
            scene.remove(system.mesh);
            particleSystems.splice(i, 1);
        }
    }
}

// Start game
document.addEventListener('DOMContentLoaded', () => {
    initGame().catch(console.error);
});

// Export necessary functions and variables
export {
    initGame,
    gameLoop,
    scene,
    camera,
    renderer,
    player,
    ducks,
    bullets,
    particleSystems,
    objects,
    currentBoss
}; 