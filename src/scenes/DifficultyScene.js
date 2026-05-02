const DIFFICULTY_OPTIONS = [
  {
    key: "mist",
    name: "MIST CRUISE",
    accent: 0x6ff8a4,
    text: "#07151d",
    note: "OPEN RIVER",
  },
  {
    key: "rapids",
    name: "RAPID DASH",
    accent: 0x72f7ff,
    text: "#07151d",
    note: "CLASSIC RUN",
  },
  {
    key: "storm",
    name: "STORM ACE",
    accent: 0xff5b70,
    text: "#fff6f7",
    note: "FULL THROTTLE",
  },
];

export default class DifficultyScene extends Phaser.Scene {
  constructor() {
    super("DifficultyScene");
  }

  create() {
    this.add.tileSprite(0, 0, 480, 720, "terrain-tile").setOrigin(0).setTint(0x3c6a4b);
    this.add.tileSprite(240, 0, 210, 720, "water-tile").setOrigin(0.5, 0).setAlpha(0.86);
    this.add.rectangle(240, 360, 480, 720, 0x061018, 0.46);

    this.add.text(240, 118, "SKY RIVER RUN", {
      fontFamily: "monospace",
      fontSize: "34px",
      color: "#72f7ff",
      stroke: "#071019",
      strokeThickness: 7,
    }).setOrigin(0.5);

    this.add.text(240, 172, "SELECT ROUTE", {
      fontFamily: "monospace",
      fontSize: "19px",
      color: "#fff5ae",
      stroke: "#071019",
      strokeThickness: 4,
    }).setOrigin(0.5);

    DIFFICULTY_OPTIONS.forEach((option, index) => {
      const y = 270 + index * 108;
      const button = this.add.container(240, y);
      const bg = this.add.rectangle(0, 0, 300, 72, option.accent, 0.94)
        .setStrokeStyle(3, 0xffffff, 0.64);
      const label = this.add.text(0, -12, option.name, {
        fontFamily: "monospace",
        fontSize: "24px",
        color: option.text,
      }).setOrigin(0.5);
      const note = this.add.text(0, 18, option.note, {
        fontFamily: "monospace",
        fontSize: "13px",
        color: option.text,
      }).setOrigin(0.5).setAlpha(0.78);

      button.add([bg, label, note]);
      button.setSize(300, 72);
      button.setInteractive({ useHandCursor: true });
      button.on("pointerover", () => {
        bg.setScale(1.04, 1.08);
        label.setScale(1.04);
      });
      button.on("pointerout", () => {
        bg.setScale(1);
        label.setScale(1);
      });
      button.on("pointerdown", () => this.startRun(option.key));
    });

    this.add.sprite(240, 620, "player").setScale(1.35);

    this.input.keyboard.once("keydown-ONE", () => this.startRun("mist"));
    this.input.keyboard.once("keydown-TWO", () => this.startRun("rapids"));
    this.input.keyboard.once("keydown-THREE", () => this.startRun("storm"));
  }

  startRun(difficulty) {
    this.scene.start("GameScene", { difficulty });
  }
}
