const WIDTH = 480;
const HEIGHT = 720;
const PLAYER_START = { x: WIDTH / 2, y: HEIGHT - 120 };
const MAX_FUEL = 100;
const DIFFICULTIES = {
  mist: {
    key: "mist",
    name: "MIST CRUISE",
    scrollSpeed: 98,
    spawnDelay: 1780,
    minSpawnDelay: 680,
    speedStep: 12,
    spawnStep: 65,
    bridgeDistance: 2200,
    bridgeStep: 210,
    fuelBurn: 2.25,
    fuelBurnStep: 0.18,
    extraLifeDropRange: [28, 38],
  },
  rapids: {
    key: "rapids",
    name: "RAPID DASH",
    scrollSpeed: 118,
    spawnDelay: 1460,
    minSpawnDelay: 560,
    speedStep: 15,
    spawnStep: 85,
    bridgeDistance: 2000,
    bridgeStep: 185,
    fuelBurn: 2.75,
    fuelBurnStep: 0.22,
    extraLifeDropRange: [31, 43],
  },
  storm: {
    key: "storm",
    name: "STORM ACE",
    scrollSpeed: 135,
    spawnDelay: 1200,
    minSpawnDelay: 470,
    speedStep: 18,
    spawnStep: 105,
    bridgeDistance: 1800,
    bridgeStep: 160,
    fuelBurn: 3.2,
    fuelBurnStep: 0.28,
    extraLifeDropRange: [34, 46],
  },
};

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  init(data = {}) {
    this.difficulty = DIFFICULTIES[data.difficulty] ?? DIFFICULTIES.storm;
    this.score = 0;
    this.nextExtraLifeScore = 10000;
    this.extraLifeDropCountdown = Phaser.Math.Between(...this.difficulty.extraLifeDropRange);
    this.lives = 3;
    this.level = 1;
    this.fuel = MAX_FUEL;
    this.scrollSpeed = this.difficulty.scrollSpeed;
    this.spawnDelay = this.difficulty.spawnDelay;
    this.distance = 0;
    this.nextBridgeDistance = this.difficulty.bridgeDistance;
    this.bridgeActive = false;
    this.invulnerable = false;
    this.waitingForRestart = false;
    this.gameEnded = false;
  }

  create() {
    this.createWorld();
    this.createActors();
    this.createControls();
    this.createHud();
    this.createTimers();
    this.registerCollisions();
  }

  update(time, delta) {
    if (this.gameEnded) {
      return;
    }

    if (this.waitingForRestart) {
      this.player.setVelocity(0, 0);
      this.updateHud();
      return;
    }

    const dt = delta / 1000;
    this.distance += this.scrollSpeed * dt;
    this.scrollTiles(dt);
    this.updateRiverPath(dt);
    this.updatePlayer(time, dt);
    this.updateMovingHazards(time, dt);
    this.updateFuelStations(dt);
    this.updateExtraLifePickups(dt);
    this.updateBridges();
    this.cleanupOffscreenObjects();
    this.consumeFuel(dt);

    if (!this.bridgeActive && this.distance >= this.nextBridgeDistance) {
      this.spawnBridge();
    }

    this.checkBankCollision();
    this.updateHud();
  }

  createWorld() {
    this.terrainA = this.add.tileSprite(0, 0, WIDTH, HEIGHT, "terrain-tile").setOrigin(0);
    this.waterA = this.add.tileSprite(0, 0, WIDTH, HEIGHT, "water-tile").setOrigin(0);

    this.bankGraphics = this.add.graphics();
    this.riverGraphics = this.add.graphics();
    this.riverSegments = [];
    this.pathTime = 0;

    // The river is a scrolling ribbon made from cross-sections; banks are checked
    // from the same data so visuals and danger zones stay aligned.
    const segmentHeight = 40;
    for (let y = -segmentHeight * 2; y <= HEIGHT + segmentHeight; y += segmentHeight) {
      this.riverSegments.push({
        y,
        center: WIDTH / 2,
        width: 232,
      });
    }

    this.redrawRiver();
  }

  createActors() {
    this.player = this.physics.add.sprite(PLAYER_START.x, PLAYER_START.y, "player");
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(20, 28).setOffset(8, 7);
    this.player.setDepth(10);

    this.bullets = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      maxSize: 24,
      runChildUpdate: false,
    });

    this.enemies = this.physics.add.group();
    this.fuels = this.physics.add.group();
    this.extraLives = this.physics.add.group();
    this.bridges = this.physics.add.group();

    // A single emitter handles small hit, pickup, and bridge explosions.
    this.explosions = this.add.particles(0, 0, "spark", {
      lifespan: 380,
      speed: { min: 40, max: 160 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.4, end: 0 },
      alpha: { start: 1, end: 0 },
      emitting: false,
      blendMode: Phaser.BlendModes.ADD,
    });
  }

  createControls() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      fire: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });
    this.input.keyboard.on("keydown", this.releaseRestartPause, this);
    this.lastShotAt = 0;
  }

  createHud() {
    this.hud = this.add.container(0, 0).setDepth(50);
    this.hudBg = this.add.rectangle(0, 0, WIDTH, 56, 0x06141c, 0.72).setOrigin(0);
    this.scoreText = this.add.text(14, 10, "SCORE 0", this.hudTextStyle());
    this.livesText = this.add.text(14, 31, "LIVES 3", this.hudTextStyle());
    this.levelText = this.add.text(WIDTH - 106, 10, "LEVEL 1", this.hudTextStyle());

    this.fuelLabel = this.add.text(WIDTH - 178, 31, "FUEL", this.hudTextStyle());
    this.fuelBack = this.add.rectangle(WIDTH - 126, 40, 112, 12, 0x14232f).setOrigin(0, 0.5);
    this.fuelFill = this.add.rectangle(WIDTH - 124, 40, 108, 8, 0x3dfc7b).setOrigin(0, 0.5);

    this.messageText = this.add.text(WIDTH / 2, 86, "", {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#fff5ae",
      stroke: "#101824",
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(51);

    this.hud.add([
      this.hudBg,
      this.scoreText,
      this.livesText,
      this.levelText,
      this.fuelLabel,
      this.fuelBack,
      this.fuelFill,
    ]);
  }

  hudTextStyle() {
    return {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#eafcff",
      stroke: "#06141c",
      strokeThickness: 3,
    };
  }

  createTimers() {
    this.spawnTimer = this.time.addEvent({
      delay: this.spawnDelay,
      loop: true,
      callback: () => this.spawnHazardWave(),
    });

    this.fuelTimer = this.time.addEvent({
      delay: 3100,
      loop: true,
      callback: () => this.spawnFuelStation(),
    });
  }

  registerCollisions() {
    this.physics.add.overlap(this.bullets, this.enemies, this.bulletHitsEnemy, undefined, this);
    this.physics.add.overlap(this.bullets, this.fuels, this.bulletHitsFuel, undefined, this);
    this.physics.add.overlap(this.bullets, this.bridges, this.bulletHitsBridge, undefined, this);
    this.physics.add.overlap(this.player, this.enemies, this.playerHitsDanger, undefined, this);
    this.physics.add.overlap(this.player, this.fuels, this.playerGetsFuel, undefined, this);
    this.physics.add.overlap(this.player, this.extraLives, this.playerGetsExtraLife, undefined, this);
    this.physics.add.overlap(this.player, this.bridges, this.playerHitsDanger, undefined, this);
  }

  scrollTiles(dt) {
    const scroll = this.scrollSpeed * dt;
    this.terrainA.tilePositionY -= scroll;
    this.waterA.tilePositionY -= scroll * 1.2;
  }

  updateRiverPath(dt) {
    const scroll = this.scrollSpeed * dt;
    this.pathTime += dt * (0.56 + this.level * 0.03);

    for (const segment of this.riverSegments) {
      segment.y += scroll;
      if (segment.y > HEIGHT + 48) {
        const highest = Math.min(...this.riverSegments.map((part) => part.y));
        segment.y = highest - 40;
        segment.center = WIDTH / 2 + Math.sin(this.pathTime * 1.7 + segment.y * 0.008) * 68;
        segment.width = Phaser.Math.Clamp(240 - this.level * 6 + Math.sin(this.pathTime + segment.y * 0.021) * 38, 168, 270);
      }
    }

    this.riverSegments.sort((a, b) => a.y - b.y);
    this.redrawRiver();
  }

  redrawRiver() {
    this.riverGraphics.clear();
    this.bankGraphics.clear();
    this.bankGraphics.fillStyle(0x173326, 0.75);
    this.bankGraphics.fillRect(0, 0, WIDTH, HEIGHT);

    const left = [];
    const right = [];
    for (const segment of this.riverSegments) {
      left.push(new Phaser.Geom.Point(segment.center - segment.width / 2, segment.y));
      right.push(new Phaser.Geom.Point(segment.center + segment.width / 2, segment.y));
    }

    const riverPoints = [...left, ...right.reverse()];
    this.bankGraphics.fillStyle(0x07151d, 0.16);
    this.bankGraphics.fillPoints(riverPoints, true);

    this.riverGraphics.fillStyle(0x19bcec, 0.95);
    this.riverGraphics.fillPoints(riverPoints, true);
    this.riverGraphics.lineStyle(4, 0x80fff9, 0.45);
    this.riverGraphics.strokePoints(left, false, false);
    this.riverGraphics.strokePoints(right.reverse(), false, false);

    this.riverGraphics.lineStyle(2, 0x0d72ad, 0.35);
    for (let i = 0; i < left.length; i += 2) {
      const segment = this.riverSegments[i];
      this.riverGraphics.lineBetween(segment.center - 42, segment.y + 10, segment.center + 40, segment.y + 5);
    }
  }

  updatePlayer(time, dt) {
    const speed = 230;
    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown || this.keys.left.isDown) {
      vx -= speed;
    }
    if (this.cursors.right.isDown || this.keys.right.isDown) {
      vx += speed;
    }
    if (this.cursors.up.isDown || this.keys.up.isDown) {
      vy -= speed;
    }
    if (this.cursors.down.isDown || this.keys.down.isDown) {
      vy += speed;
    }

    this.player.setVelocity(vx, vy);
    this.player.y = Phaser.Math.Clamp(this.player.y, HEIGHT * 0.48, HEIGHT - 54);

    const tilt = vx === 0 ? 0 : Phaser.Math.Clamp(vx / speed, -1, 1) * 0.22;
    this.player.rotation = Phaser.Math.Linear(this.player.rotation, tilt, 8 * dt);

    if (Phaser.Input.Keyboard.JustDown(this.cursors.space) || Phaser.Input.Keyboard.JustDown(this.keys.fire)) {
      this.fireBullet(time);
    }
  }

  fireBullet(time) {
    if (time - this.lastShotAt < 170) {
      return;
    }

    const bullet = this.bullets.get(this.player.x, this.player.y - 24, "bullet");
    if (!bullet) {
      return;
    }

    bullet.setActive(true).setVisible(true).setDepth(9);
    bullet.body.enable = true;
    bullet.body.setSize(6, 14).setOffset(2, 0);
    bullet.setVelocityY(-520);
    this.lastShotAt = time;
    this.playSfx("shoot");
  }

  spawnHazardWave() {
    if (this.bridgeActive || this.waitingForRestart || this.gameEnded) {
      return;
    }

    // Mix fixed obstacles with moving enemies so each run has a different rhythm.
    const roll = Phaser.Math.Between(0, 100);
    if (roll < 34) {
      this.spawnMovingEnemy("boat");
    } else if (roll < 62) {
      this.spawnMovingEnemy("helicopter");
    } else if (roll < 84) {
      this.spawnRock();
    } else {
      this.spawnBarrier();
    }
  }

  spawnMovingEnemy(kind) {
    const pos = this.randomRiverPoint(-50);
    const enemy = this.enemies.create(pos.x, -50, kind);
    const direction = Phaser.Math.Between(0, 1) === 0 ? -1 : 1;
    const sideSpeed = (kind === "helicopter" ? 105 : 70) + this.level * 7;
    enemy.setDepth(kind === "helicopter" ? 8 : 5);
    enemy.body.setSize(kind === "helicopter" ? 34 : 32, kind === "helicopter" ? 18 : 18);
    enemy.setData("points", kind === "helicopter" ? 180 : 120);
    enemy.setData("kind", kind);
    enemy.setData("drift", direction);
    enemy.setVelocity(direction * sideSpeed, this.scrollSpeed * 0.68);
  }

  spawnRock() {
    const pos = this.randomRiverPoint(-42);
    const rock = this.enemies.create(pos.x, -42, "rock");
    rock.setDepth(5);
    rock.body.setSize(26, 24).setOffset(7, 8);
    rock.setData("points", 80);
    rock.setData("kind", "rock");
    rock.setVelocity(0, this.scrollSpeed * 0.9);
  }

  spawnBarrier() {
    const pos = this.randomRiverPoint(-44);
    const barrier = this.enemies.create(pos.x, -44, "barrier");
    barrier.setDepth(5);
    barrier.body.setSize(90, 23).setOffset(3, 8);
    barrier.setData("points", 220);
    barrier.setData("kind", "barrier");
    barrier.setVelocity(0, this.scrollSpeed * 0.78);
  }

  spawnFuelStation() {
    if (this.bridgeActive || this.waitingForRestart || this.gameEnded || this.fuels.countActive(true) > 2) {
      return;
    }

    const pos = this.randomRiverPoint(-36);
    const fuel = this.fuels.create(pos.x, -36, "fuel");
    fuel.setDepth(6);
    fuel.body.setSize(24, 26).setOffset(6, 6);
    fuel.setData("laneOffset", Phaser.Math.Between(-38, 38));
    fuel.setVelocity(0, this.scrollSpeed * 0.44);
  }

  spawnBridge() {
    const pos = this.randomRiverPoint(-70);
    const bridge = this.bridges.create(pos.x, -70, "bridge");
    const river = this.getRiverBoundsAt(bridge.y);
    const bridgeWidth = Phaser.Math.Clamp(river.width + 34, 236, 318);

    bridge.setDepth(7);
    bridge.displayWidth = bridgeWidth;
    bridge.body.setSize(bridgeWidth - 16, 35).setOffset(8, 18);
    bridge.setData("hp", 3);
    bridge.setData("kind", "bridge");
    bridge.setData("laneOffset", 0);
    bridge.setVelocity(0, this.scrollSpeed);
    bridge.setImmovable(true);
    this.bridgeActive = true;
    this.showMessage("BRIDGE: 3 HITS");
  }

  randomRiverPoint(y) {
    const segment = this.riverSegments.reduce((closest, part) => {
      return Math.abs(part.y - y) < Math.abs(closest.y - y) ? part : closest;
    }, this.riverSegments[0]);

    const margin = 42;
    return {
      x: Phaser.Math.Between(segment.center - segment.width / 2 + margin, segment.center + segment.width / 2 - margin),
      y,
    };
  }

  updateMovingHazards(time, dt) {
    for (const enemy of this.enemies.getChildren()) {
      if (!enemy.active) {
        continue;
      }

      const kind = enemy.getData("kind");
      if (kind === "helicopter") {
        enemy.rotation = Math.sin(time * 0.008) * 0.08;
      }

      if (kind === "boat" || kind === "helicopter") {
        const banks = this.getRiverBoundsAt(enemy.y);
        if (enemy.x < banks.left + 24) {
          enemy.setVelocityX(Math.abs(enemy.body.velocity.x));
        }
        if (enemy.x > banks.right - 24) {
          enemy.setVelocityX(-Math.abs(enemy.body.velocity.x));
        }
      }
    }

    for (const bridge of this.bridges.getChildren()) {
      if (bridge.active && bridge.y > HEIGHT + 70) {
        this.bridgeActive = false;
        this.playerHitsDanger(this.player, bridge);
      }
    }
  }

  updateFuelStations(dt) {
    for (const fuel of this.fuels.getChildren()) {
      if (!fuel.active) {
        continue;
      }

      const bounds = this.getRiverBoundsAt(fuel.y);
      const margin = 36;
      const maxOffset = Math.max(0, bounds.width / 2 - margin);
      const laneOffset = Phaser.Math.Clamp(fuel.getData("laneOffset") ?? 0, -maxOffset, maxOffset);
      const targetX = Phaser.Math.Clamp(bounds.center + laneOffset, bounds.left + margin, bounds.right - margin);

      fuel.x = Phaser.Math.Linear(fuel.x, targetX, 5 * dt);
      fuel.x = Phaser.Math.Clamp(fuel.x, bounds.left + margin, bounds.right - margin);
      fuel.setVelocityY(this.scrollSpeed * 0.44);
    }
  }

  updateExtraLifePickups(dt) {
    for (const life of this.extraLives.getChildren()) {
      if (!life.active) {
        continue;
      }

      const bounds = this.getRiverBoundsAt(life.y);
      const margin = 34;
      const maxOffset = Math.max(0, bounds.width / 2 - margin);
      const laneOffset = Phaser.Math.Clamp(life.getData("laneOffset") ?? 0, -maxOffset, maxOffset);
      const targetX = Phaser.Math.Clamp(bounds.center + laneOffset, bounds.left + margin, bounds.right - margin);

      life.x = Phaser.Math.Linear(life.x, targetX, 5 * dt);
      life.x = Phaser.Math.Clamp(life.x, bounds.left + margin, bounds.right - margin);
      life.setVelocityY(this.scrollSpeed * 0.5);
    }
  }

  updateBridges() {
    for (const bridge of this.bridges.getChildren()) {
      if (!bridge.active) {
        continue;
      }

      const bounds = this.getRiverBoundsAt(bridge.y);
      const bridgeWidth = Phaser.Math.Clamp(bounds.width + 34, 236, 318);
      bridge.x = bounds.center;
      bridge.displayWidth = bridgeWidth;
      bridge.body.setSize(bridgeWidth - 16, 35).setOffset(8, 18);
      bridge.setVelocityY(this.scrollSpeed);
    }
  }

  cleanupOffscreenObjects() {
    this.bullets.children.each((bullet) => {
      if (bullet.active && bullet.y < -30) {
        bullet.setActive(false).setVisible(false);
        bullet.body.enable = false;
      }
    });

    [this.enemies, this.fuels, this.extraLives, this.bridges].forEach((group) => {
      group.children.each((item) => {
        if (item.active && item.y > HEIGHT + 80) {
          if (item.getData("kind") === "bridge") {
            this.bridgeActive = false;
          }
          this.tweens.killTweensOf(item);
          item.destroy();
        }
      });
    });
  }

  clearRunObjects() {
    [this.enemies, this.fuels, this.extraLives, this.bridges].forEach((group) => {
      group.children.each((item) => {
        this.tweens.killTweensOf(item);
      });
      group.clear(true, true);
    });

    this.bullets.children.each((bullet) => {
      if (bullet.active) {
        this.recycleBullet(bullet);
      }
    });
  }

  consumeFuel(dt) {
    this.fuel -= (this.difficulty.fuelBurn + this.level * this.difficulty.fuelBurnStep) * dt;
    if (this.fuel <= 0) {
      this.fuel = 0;
      this.loseLife("OUT OF FUEL");
    }
  }

  checkBankCollision() {
    if (this.invulnerable) {
      return;
    }

    const bounds = this.getRiverBoundsAt(this.player.y);
    const padding = 14;
    if (this.player.x < bounds.left + padding || this.player.x > bounds.right - padding) {
      this.loseLife("BANK HIT");
    }
  }

  getRiverBoundsAt(y) {
    const segments = this.riverSegments;
    let lower = segments[0];
    let upper = segments[segments.length - 1];

    for (let i = 0; i < segments.length - 1; i += 1) {
      if (y >= segments[i].y && y <= segments[i + 1].y) {
        lower = segments[i];
        upper = segments[i + 1];
        break;
      }
    }

    const t = Phaser.Math.Clamp((y - lower.y) / Math.max(1, upper.y - lower.y), 0, 1);
    const center = Phaser.Math.Linear(lower.center, upper.center, t);
    const width = Phaser.Math.Linear(lower.width, upper.width, t);
    return {
      left: center - width / 2,
      right: center + width / 2,
      center,
      width,
    };
  }

  bulletHitsEnemy(bullet, enemy) {
    this.recycleBullet(bullet);
    this.maybeSpawnExtraLife(enemy);
    this.addScore(enemy.getData("points") ?? 100);
    this.createExplosion(enemy.x, enemy.y, 14);
    enemy.destroy();
    this.playSfx("explosion");
  }

  bulletHitsFuel(bullet, fuel) {
    this.recycleBullet(bullet);
    this.addScore(40);
    this.createExplosion(fuel.x, fuel.y, 8);
    fuel.destroy();
    this.playSfx("explosion");
  }

  bulletHitsBridge(bullet, bridge) {
    this.recycleBullet(bullet);
    const hp = bridge.getData("hp") - 1;
    bridge.setData("hp", hp);
    bridge.setTint(hp % 2 === 0 ? 0xffdc90 : 0xffffff);
    this.time.delayedCall(70, () => {
      if (bridge.active) {
        bridge.clearTint();
      }
    });

    if (hp <= 0) {
      this.addScore(750 + this.level * 150);
      this.createExplosion(bridge.x, bridge.y, 42);
      bridge.destroy();
      this.bridgeActive = false;
      this.completeLevel();
      this.playSfx("explosion");
    }
  }

  playerHitsDanger(player, danger) {
    if (this.invulnerable || this.gameEnded) {
      return;
    }

    if (danger?.active) {
      this.createExplosion(danger.x, danger.y, 16);
      if (danger.getData("kind") === "bridge") {
        this.bridgeActive = false;
        this.distance = this.nextBridgeDistance - 420;
      }
      danger.destroy();
    }

    this.loseLife("AIRCRAFT HIT");
  }

  playerGetsFuel(player, fuel) {
    this.fuel = Phaser.Math.Clamp(this.fuel + 34, 0, MAX_FUEL);
    this.addScore(60);
    this.createExplosion(fuel.x, fuel.y, 10);
    fuel.destroy();
    this.playSfx("fuel");
    this.showMessage("FUEL +");
  }

  playerGetsExtraLife(player, life) {
    this.lives += 1;
    this.addScore(250);
    this.createExplosion(life.x, life.y, 12);
    this.tweens.killTweensOf(life);
    life.destroy();
    this.playSfx("fuel");
    this.showMessage("EXTRA LIFE");
  }

  recycleBullet(bullet) {
    bullet.setActive(false).setVisible(false);
    bullet.body.enable = false;
  }

  addScore(points) {
    this.score += points;

    while (this.score >= this.nextExtraLifeScore) {
      this.lives += 1;
      this.nextExtraLifeScore += 10000;
      this.playSfx("fuel");
      this.showMessage("EXTRA LIFE");
    }
  }

  maybeSpawnExtraLife(enemy) {
    this.extraLifeDropCountdown -= 1;
    if (this.extraLifeDropCountdown > 0) {
      return;
    }

    this.extraLifeDropCountdown = Phaser.Math.Between(...this.difficulty.extraLifeDropRange);
    const bounds = this.getRiverBoundsAt(enemy.y);
    const margin = 38;
    const x = Phaser.Math.Clamp(enemy.x, bounds.left + margin, bounds.right - margin);
    const life = this.extraLives.create(x, enemy.y, "life");

    life.setDepth(6);
    life.body.setSize(24, 24).setOffset(6, 7);
    life.setData("laneOffset", Phaser.Math.Clamp(x - bounds.center, -52, 52));
    life.setVelocity(0, this.scrollSpeed * 0.5);

    this.tweens.add({
      targets: life,
      scale: 1.18,
      yoyo: true,
      repeat: -1,
      duration: 360,
      ease: "Sine.easeInOut",
    });
  }

  loseLife(reason) {
    if (this.invulnerable || this.gameEnded) {
      return;
    }

    this.lives -= 1;
    this.playSfx("hit");
    this.createExplosion(this.player.x, this.player.y, 28);
    this.showMessage(reason);

    if (this.lives <= 0) {
      this.endGame();
      return;
    }

    this.resetLevelStart();
    this.enterRestartPause(`${reason} - PRESS A KEY`);
  }

  resetLevelStart() {
    this.clearRunObjects();
    this.bridgeActive = false;
    this.distance = 0;
    this.fuel = Math.max(54, this.fuel);
    this.player.setPosition(PLAYER_START.x, PLAYER_START.y);
    this.player.setVelocity(0, 0);
    this.player.setRotation(0);
  }

  enterRestartPause(message) {
    this.waitingForRestart = true;
    this.invulnerable = true;
    this.player.setAlpha(0.45);
    this.tweens.killTweensOf(this.messageText);
    this.messageText.setText(message);
    this.messageText.setAlpha(1);
    this.messageText.setY(86);
  }

  releaseRestartPause() {
    if (!this.waitingForRestart || this.gameEnded) {
      return;
    }

    this.waitingForRestart = false;
    this.invulnerable = false;
    this.player.setAlpha(1);
    this.tweens.killTweensOf(this.messageText);
    this.messageText.setText("");
  }

  completeLevel() {
    this.level += 1;
    this.scrollSpeed += this.difficulty.speedStep;
    this.spawnDelay = Math.max(this.difficulty.minSpawnDelay, this.spawnDelay - this.difficulty.spawnStep);
    this.spawnTimer.delay = this.spawnDelay;
    this.fuel = Phaser.Math.Clamp(this.fuel + 46, 0, MAX_FUEL);
    this.distance = 0;
    this.nextBridgeDistance = this.difficulty.bridgeDistance + this.level * this.difficulty.bridgeStep;
    this.showMessage(`LEVEL ${this.level}`);
  }

  endGame() {
    this.gameEnded = true;
    this.player.setTint(0xff5668);
    this.time.delayedCall(450, () => {
      this.scene.start("GameOverScene", {
        score: this.score,
        level: this.level,
        difficulty: this.difficulty.key,
        difficultyName: this.difficulty.name,
      });
    });
  }

  createExplosion(x, y, quantity) {
    this.explosions.explode(quantity, x, y);
  }

  showMessage(message) {
    this.messageText.setText(message);
    this.messageText.setAlpha(1);
    this.tweens.killTweensOf(this.messageText);
    this.tweens.add({
      targets: this.messageText,
      alpha: 0,
      y: 72,
      duration: 900,
      ease: "Sine.easeOut",
      onComplete: () => {
        this.messageText.setY(86);
      },
    });
  }

  updateHud() {
    this.scoreText.setText(`SCORE ${this.score}`);
    this.livesText.setText(`LIVES ${this.lives}`);
    this.levelText.setText(`LEVEL ${this.level}`);

    const width = Phaser.Math.Clamp(this.fuel / MAX_FUEL, 0, 1) * 108;
    this.fuelFill.displayWidth = width;
    this.fuelFill.fillColor = this.fuel > 45 ? 0x3dfc7b : this.fuel > 20 ? 0xffcf5e : 0xff5565;
  }

  playSfx(key) {
    // Placeholder audio hook: add matching loaded audio keys later and this works.
    if (this.cache.audio.exists(key)) {
      this.sound.play(key, { volume: 0.45 });
    }
  }
}
