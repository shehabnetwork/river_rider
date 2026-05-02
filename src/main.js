import BootScene from "./scenes/BootScene.js";
import DifficultyScene from "./scenes/DifficultyScene.js";
import GameScene from "./scenes/GameScene.js";
import GameOverScene from "./scenes/GameOverScene.js";

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: 480,
  height: 720,
  backgroundColor: "#07151d",
  pixelArt: true,
  roundPixels: true,
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, DifficultyScene, GameScene, GameOverScene],
};

new Phaser.Game(config);
