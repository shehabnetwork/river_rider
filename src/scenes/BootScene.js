export default class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    this.load.audio("fire", "assets/sounds/fire.wav");
    this.load.audio("life-collected", "assets/sounds/life-collected.wav");
    this.load.audio("obstacle-destroyed", "assets/sounds/obstacle-destroyed.wav");
    this.load.audio("bridge-destroyed", "assets/sounds/bridge-destroyed.wav");
    this.load.audio("crash", "assets/sounds/crash.wav");
    this.load.audio("fuel-required", "assets/sounds/fuel-required.wav");
    this.load.audio("refuel", "assets/sounds/refuel.wav");
    this.load.audio("flying-loop", "assets/sounds/flying-loop.wav");
  }

  create() {
    // All first-version art is generated at runtime to keep the project asset-free.
    this.createTerrainTile();
    this.createWaterTile();
    this.createPlayerTexture();
    this.createBulletTexture();
    this.createEnemyTextures();
    this.createFuelTexture();
    this.createLifeTexture();
    this.createGiftTextures();
    this.createBridgeTexture();
    this.createParticleTexture();

    this.scene.start("DifficultyScene");
  }

  createTerrainTile() {
    const texture = this.textures.createCanvas("terrain-tile", 64, 64);
    const ctx = texture.getContext();

    ctx.fillStyle = "#264930";
    ctx.fillRect(0, 0, 64, 64);

    for (let y = 0; y < 64; y += 8) {
      for (let x = 0; x < 64; x += 8) {
        const n = (x * 11 + y * 7) % 5;
        ctx.fillStyle = ["#345f39", "#1f3d2d", "#5f6e32", "#274f45", "#47372f"][n];
        ctx.fillRect(x, y, 8, 8);
      }
    }

    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(10, 14, 12, 4);
    ctx.fillRect(42, 36, 10, 4);
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(26, 48, 18, 5);
    texture.refresh();
  }

  createWaterTile() {
    const texture = this.textures.createCanvas("water-tile", 64, 64);
    const ctx = texture.getContext();

    ctx.fillStyle = "#1aa7df";
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = "#52e8ff";
    ctx.fillRect(8, 10, 22, 3);
    ctx.fillRect(34, 34, 18, 3);
    ctx.fillStyle = "#1178bb";
    ctx.fillRect(2, 48, 24, 4);
    ctx.fillRect(42, 18, 14, 4);
    texture.refresh();
  }

  createPlayerTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x06131c, 0.35);
    g.fillEllipse(18, 35, 34, 10);
    g.fillStyle(0xe8f9ff);
    g.fillTriangle(18, 0, 7, 38, 29, 38);
    g.fillStyle(0xff4f66);
    g.fillTriangle(18, 4, 13, 24, 23, 24);
    g.fillStyle(0x70f5ff);
    g.fillRect(15, 18, 6, 9);
    g.fillStyle(0xffd35c);
    g.fillTriangle(8, 37, 18, 26, 18, 39);
    g.fillTriangle(28, 37, 18, 26, 18, 39);
    g.lineStyle(2, 0x123044, 1);
    g.strokeTriangle(18, 0, 7, 38, 29, 38);
    g.generateTexture("player", 36, 42);
    g.destroy();
  }

  createBulletTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xfff8a8);
    g.fillRect(3, 0, 4, 14);
    g.fillStyle(0xff7d42);
    g.fillRect(2, 9, 6, 5);
    g.generateTexture("bullet", 10, 16);
    g.destroy();
  }

  createEnemyTextures() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    g.fillStyle(0x123348, 0.35);
    g.fillEllipse(22, 31, 38, 9);
    g.fillStyle(0xffb84a);
    g.fillRoundedRect(4, 10, 36, 18, 4);
    g.fillStyle(0x6a3026);
    g.fillTriangle(4, 10, 22, 2, 40, 10);
    g.fillStyle(0xffffff);
    g.fillRect(11, 15, 7, 5);
    g.fillRect(24, 15, 7, 5);
    g.generateTexture("boat", 44, 36);
    g.clear();

    g.fillStyle(0x0b1622, 0.28);
    g.fillEllipse(24, 35, 40, 8);
    g.fillStyle(0xd84bff);
    g.fillRoundedRect(8, 16, 28, 13, 6);
    g.fillStyle(0x202040);
    g.fillRect(3, 9, 42, 3);
    g.fillRect(22, 3, 4, 16);
    g.fillStyle(0xaaf7ff);
    g.fillRect(29, 18, 7, 5);
    g.fillStyle(0xffd35c);
    g.fillRect(4, 22, 7, 4);
    g.generateTexture("helicopter", 48, 40);
    g.clear();

    g.fillStyle(0x08121b, 0.28);
    g.fillEllipse(20, 31, 31, 8);
    g.fillStyle(0x87909a);
    g.fillTriangle(19, 4, 5, 30, 34, 31);
    g.fillStyle(0x5d6873);
    g.fillTriangle(20, 8, 14, 29, 33, 31);
    g.fillStyle(0xb8c1ca);
    g.fillRect(15, 12, 6, 4);
    g.generateTexture("rock", 40, 36);
    g.clear();

    g.fillStyle(0x2f1d23, 0.35);
    g.fillRect(0, 28, 94, 7);
    g.fillStyle(0xf0444c);
    for (let x = 0; x < 96; x += 16) {
      g.fillRect(x, 7, 10, 24);
      g.fillStyle(0xffffff);
      g.fillRect(x + 10, 7, 6, 24);
      g.fillStyle(0xf0444c);
    }
    g.generateTexture("barrier", 96, 38);
    g.destroy();
  }

  createFuelTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x09141f, 0.3);
    g.fillEllipse(18, 31, 30, 8);
    g.fillStyle(0x23e06f);
    g.fillRoundedRect(7, 6, 22, 24, 4);
    g.fillStyle(0xf7ff7a);
    g.fillRect(12, 10, 12, 5);
    g.fillStyle(0x0b5f39);
    g.fillRect(15, 18, 6, 9);
    g.lineStyle(2, 0xd9ffd5);
    g.strokeRoundedRect(7, 6, 22, 24, 4);
    g.generateTexture("fuel", 36, 38);
    g.destroy();
  }

  createLifeTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x09141f, 0.28);
    g.fillEllipse(18, 32, 31, 8);
    g.fillStyle(0xff4f7b);
    g.fillCircle(13, 15, 8);
    g.fillCircle(23, 15, 8);
    g.fillTriangle(6, 18, 30, 18, 18, 32);
    g.fillStyle(0xffd6e2);
    g.fillRect(16, 10, 4, 17);
    g.fillRect(10, 16, 16, 4);
    g.lineStyle(2, 0xffffff, 0.85);
    g.strokeCircle(13, 15, 8);
    g.strokeCircle(23, 15, 8);
    g.generateTexture("life", 36, 38);
    g.destroy();
  }

  createGiftTextures() {
    this.createGiftTexture("gift-clear", 0xff5b70, 0xfff3a0, (g) => {
      g.fillCircle(18, 18, 8);
      g.lineStyle(3, 0xfff3a0);
      for (let i = 0; i < 8; i += 1) {
        const angle = i * Math.PI / 4;
        g.lineBetween(18 + Math.cos(angle) * 11, 18 + Math.sin(angle) * 11, 18 + Math.cos(angle) * 16, 18 + Math.sin(angle) * 16);
      }
    });

    this.createGiftTexture("gift-shield", 0x72f7ff, 0x06141c, (g) => {
      g.fillStyle(0xeafcff);
      g.fillTriangle(18, 8, 8, 13, 10, 23);
      g.fillTriangle(18, 8, 28, 13, 26, 23);
      g.fillTriangle(10, 23, 26, 23, 18, 31);
      g.fillStyle(0x06141c, 0.78);
      g.fillTriangle(18, 13, 13, 16, 14, 22);
      g.fillTriangle(18, 13, 23, 16, 22, 22);
      g.fillTriangle(14, 22, 22, 22, 18, 26);
    });

    this.createGiftTexture("gift-auto", 0xffd35c, 0x06141c, (g) => {
      g.fillRect(12, 8, 4, 20);
      g.fillRect(20, 8, 4, 20);
      g.fillStyle(0xffffff);
      g.fillRect(11, 7, 6, 4);
      g.fillRect(19, 7, 6, 4);
    });

    this.createGiftTexture("gift-fork", 0xd84bff, 0xffffff, (g) => {
      g.lineStyle(4, 0xffffff);
      g.lineBetween(18, 29, 18, 8);
      g.lineBetween(18, 29, 8, 10);
      g.lineBetween(18, 29, 28, 10);
      g.fillTriangle(18, 5, 14, 13, 22, 13);
      g.fillTriangle(5, 8, 7, 17, 13, 12);
      g.fillTriangle(31, 8, 29, 17, 23, 12);
    });
  }

  createGiftTexture(key, fill, ribbon, drawIcon) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x09141f, 0.3);
    g.fillEllipse(18, 33, 31, 8);
    g.fillStyle(fill);
    g.fillRoundedRect(5, 8, 26, 25, 4);
    g.fillStyle(ribbon, 0.9);
    g.fillRect(16, 8, 4, 25);
    g.fillRect(5, 17, 26, 4);
    g.fillTriangle(16, 8, 11, 4, 10, 10);
    g.fillTriangle(20, 8, 25, 4, 26, 10);
    drawIcon(g);
    g.lineStyle(2, 0xffffff, 0.8);
    g.strokeRoundedRect(5, 8, 26, 25, 4);
    g.generateTexture(key, 36, 40);
    g.destroy();
  }

  createBridgeTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x321d20, 0.36);
    g.fillRect(0, 54, 240, 10);
    g.fillStyle(0x9d6a4f);
    g.fillRect(0, 18, 240, 34);
    g.fillStyle(0x4d332a);
    for (let x = 0; x < 240; x += 30) {
      g.fillRect(x + 4, 20, 10, 30);
      g.fillRect(x + 18, 20, 8, 30);
    }
    g.lineStyle(4, 0xe2b17d);
    g.beginPath();
    g.moveTo(0, 20);
    for (let x = 0; x <= 240; x += 30) {
      g.lineTo(x + 15, 48);
      g.lineTo(x + 30, 20);
    }
    g.strokePath();
    g.generateTexture("bridge", 240, 66);
    g.destroy();
  }

  createParticleTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xfff3a0);
    g.fillRect(0, 0, 6, 6);
    g.generateTexture("spark", 6, 6);
    g.destroy();
  }
}
