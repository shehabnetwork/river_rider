export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOverScene");
  }

  init(data) {
    this.finalScore = data.score ?? 0;
    this.finalLevel = data.level ?? 1;
  }

  create() {
    this.add.tileSprite(0, 0, 480, 720, "terrain-tile").setOrigin(0).setTint(0x4c2633);

    this.add.rectangle(240, 360, 480, 720, 0x061018, 0.64);
    this.add.text(240, 206, "SKY RIVER RUN", {
      fontFamily: "monospace",
      fontSize: "31px",
      color: "#72f7ff",
      stroke: "#091118",
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(240, 270, "GAME OVER", {
      fontFamily: "monospace",
      fontSize: "42px",
      color: "#ff5b70",
      stroke: "#160a12",
      strokeThickness: 7,
    }).setOrigin(0.5);

    this.add.text(240, 340, `SCORE ${this.finalScore}\nLEVEL ${this.finalLevel}`, {
      fontFamily: "monospace",
      fontSize: "22px",
      color: "#f8fbff",
      align: "center",
      lineSpacing: 12,
    }).setOrigin(0.5);

    const restart = this.add.text(240, 452, "RESTART", {
      fontFamily: "monospace",
      fontSize: "24px",
      color: "#07151d",
      backgroundColor: "#6ff8a4",
      padding: { x: 28, y: 14 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    restart.on("pointerover", () => restart.setStyle({ backgroundColor: "#ffe176" }));
    restart.on("pointerout", () => restart.setStyle({ backgroundColor: "#6ff8a4" }));
    restart.on("pointerdown", () => this.scene.start("GameScene"));

    this.input.keyboard.once("keydown-SPACE", () => this.scene.start("GameScene"));
    this.input.keyboard.once("keydown-ENTER", () => this.scene.start("GameScene"));
  }
}
