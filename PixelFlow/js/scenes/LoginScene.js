class LoginScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LoginScene' });
    }

    create() {
        this.cameras.main.setBackgroundColor('#2c3e50');

        this.add.text(540, 200, 'Pixel Flow', {
            fontSize: '100px', fill: '#f1c40f', fontStyle: 'bold', stroke: '#000000', strokeThickness: 8
        }).setOrigin(0.5);

        // Highscore Display
        const hs = localStorage.getItem('pixelFlowHS') || 0;
        this.add.text(540, 350, `🏆 Highscore: ${hs}`, {
            fontSize: '50px', fill: '#f39c12', fontStyle: 'bold'
        }).setOrigin(0.5);

        const currentLevel = parseInt(localStorage.getItem('pixelFlowLevel')) || 1;
        const currentScore = parseInt(localStorage.getItem('pixelFlowScore')) || 0;

        const loginBtn = this.add.rectangle(540, 960, 500, 100, 0x3498db).setInteractive();
        loginBtn.setStrokeStyle(4, 0xffffff);

        this.add.text(540, 960, 'Nueva Partida (Borrar Progreso)', {
            fontSize: '30px', fill: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5);

        loginBtn.on('pointerdown', () => {
            const username = prompt("Ingresa tu nombre de jugador (se reiniciará tu nivel actual):");
            if (username && username.trim().length > 0) {
                localStorage.setItem('pixelFlowUser', username.trim());
                this.scene.start('GameScene', {reset: true});
            } else if (username !== null) {
                alert("Nombre inválido, intenta de nuevo.");
            }
        });

        const currentUser = localStorage.getItem('pixelFlowUser');
        if (currentUser) {
            this.add.text(540, 1150, `Jugador: ${currentUser}\nNivel Actual: ${currentLevel} | Puntos: ${currentScore}`, {
                fontSize: '30px', fill: '#bdc3c7', align: 'center'
            }).setOrigin(0.5);
            
            const startBtn = this.add.rectangle(540, 1350, 500, 120, 0x2ecc71).setInteractive();
            startBtn.setStrokeStyle(6, 0xffffff);
            this.add.text(540, 1350, '▶ CONTINUAR PARTIDA ▶', {
                fontSize: '40px', fill: '#ffffff', fontStyle: 'bold'
            }).setOrigin(0.5);

            startBtn.on('pointerdown', () => {
                this.scene.start('GameScene'); // Lanza usando el localStorage
            });
        }
    }
}
