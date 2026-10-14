class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.colors = [0xe74c3c, 0x2ecc71, 0x3498db, 0xf1c40f, 0x9b59b6, 0x1abc9c];
        this.colorEmojis = {
            [0xe74c3c]: '🦊', 
            [0x2ecc71]: '🐸', 
            [0x3498db]: '🐳', 
            [0xf1c40f]: '🐱', 
            [0x9b59b6]: '🐷', 
            [0x1abc9c]: '🐰'  
        };

        this.blockSize = 60;
        this.gridSizeX = 10;
        this.gridSizeY = 10;
        this.gridStartX = 0;
        this.gridStartY = 0;
    }

    init(data) {
        this.grid = [];
        this.baseMaxTraySlots = 7;
        this.maxTraySlots = 7;
        this.comboActive = false;
        this.isPaused = false;
        
        if (this.comboTimer) {
            this.comboTimer.remove();
            this.comboTimer = null;
        }

        if (this.levelTimerEvent) {
            this.levelTimerEvent.remove();
            this.levelTimerEvent = null;
        }

        this.tray = []; 
        this.conveyorQueues = [[], [], [], [], []]; 
        this.conveyorSprites = [];
        this.gameOver = false;
        this.currentSeed = 1;

        if (data && data.reset) {
            this.level = 1;
            this.score = 0;
            localStorage.setItem('pixelFlowLevel', 1);
            localStorage.setItem('pixelFlowScore', 0);
        } else {
            this.level = parseInt(localStorage.getItem('pixelFlowLevel')) || 1;
            this.score = parseInt(localStorage.getItem('pixelFlowScore')) || 0;
        }
        
        // Tiempo base del nivel (ej. 90 s, disminuye un poco cada nivel)
        this.timeLeft = Math.max(30, 90 - (this.level * 2));
    }

    preload() {}

    create() {
        this.cameras.main.setBackgroundColor('#2c3e50');
        
        // Contenedor principal donde se aloja el juego para poder ocultarlo al pausar
        this.gameplayContainer = this.add.container(0, 0);

        // UI Header
        this.add.text(540, 100, `Nivel ${this.level}`, {
            fontSize: '64px', fill: '#ecf0f1', fontFamily: 'Arial, sans-serif', fontStyle: 'bold'
        }).setOrigin(0.5);

        const user = localStorage.getItem('pixelFlowUser') || 'Jugador';
        this.scoreText = this.add.text(540, 160, `${user} | Puntos: ${this.score}`, {
            fontSize: '40px', fill: '#f1c40f', fontFamily: 'Arial, sans-serif', fontStyle: 'bold'
        }).setOrigin(0.5);

        this.timeText = this.add.text(540, 220, `⏳ Tiempo: ${this.timeLeft}s`, {
            fontSize: '45px', fill: '#e74c3c', fontStyle: 'bold'
        }).setOrigin(0.5);

        this.comboText = this.add.text(540, 280, '', {
            fontSize: '36px', fill: '#e74c3c', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.gameplayContainer.add(this.comboText);

        this.gridStartX = 540 - (this.gridSizeX * this.blockSize) / 2 + this.blockSize / 2;
        this.gridStartY = 680 - (this.gridSizeY * this.blockSize) / 2 + this.blockSize / 2;

        this.createGrid();

        // UI de la bandeja (Tray)
        this.gameplayContainer.add(this.add.text(540, 1150, 'Bandeja de Espera (Slots)', {
            fontSize: '40px', fill: '#ffffff'
        }).setOrigin(0.5));
        
        this.drawTrayBackground();

        // UI de la zona de Cañones (Queues/Stacks)
        this.gameplayContainer.add(this.add.text(540, 1400, 'Cañones (En Cola - Toca o pulsa 1-5)', {
            fontSize: '36px', fill: '#ffffff'
        }).setOrigin(0.5));
        
        this.renderConveyor();

        // Elementos de PAUSA (Inicialmente ocultos)
        this.pauseOverlay = this.add.rectangle(540, 960, 1080, 1920, 0x000000, 0.9).setVisible(false);
        this.pauseTextAlert = this.add.text(540, 960, '⚙ PAUSADO ⚙\nPresiona ESC para continuar', { 
            fontSize: '60px', fill: '#ffffff', stroke: '#000000', strokeThickness: 6, align: 'center'
        }).setOrigin(0.5).setVisible(false);
        this.pauseHelp = this.add.text(540, 1160, '(Teclas 1-5 para seleccionar cañones)', { 
            fontSize: '35px', fill: '#bdc3c7', align: 'center'
        }).setOrigin(0.5).setVisible(false);


        // Eventos de Teclado (ESC y números 1-5)
        this.input.keyboard.on('keydown', (event) => {
            if (this.gameOver) return;
            
            if (event.code === 'Escape') {
                this.togglePause();
            } else if (!this.isPaused && event.key >= '1' && event.key <= '5' && !event.repeat) {
                const index = parseInt(event.key) - 1;
                const queue = this.conveyorQueues[index];
                if (queue && queue.length > 0) {
                    const item = queue[0]; // The front item
                    const currentUsedSlots = this.getTrayUsedSlots();
                    if (currentUsedSlots + item.size <= this.maxTraySlots) {
                        this.moveCannonToTray(index);
                    } else {
                        this.cameras.main.shake(100, 0.01);
                    }
                }
            }
        });

        // Iniciar Temporizador
        this.levelTimerEvent = this.time.addEvent({
            delay: 1000,
            callback: this.tickTimer,
            callbackScope: this,
            loop: true
        });
    }

    tickTimer() {
        if (this.gameOver || this.isPaused) return;

        this.timeLeft--;
        this.timeText.setText(`⏳ Tiempo: ${this.timeLeft}s`);

        if (this.timeLeft <= 10) {
            this.timeText.setFill('#ff0000');
            this.cameras.main.shake(100, 0.002);
            if (this.timeLeft % 2 === 0) {
               this.timeText.setScale(1.2); 
            } else {
               this.timeText.setScale(1);  
            }
        }

        if (this.timeLeft <= 0) {
            this.gameOver = true;
            this.timeText.setText(`⏳ Tiempo: 0s`);
            this.checkGameOver("¡SE ACABÓ EL TIEMPO!");
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            this.gameplayContainer.setVisible(false);
            this.pauseOverlay.setVisible(true);
            this.pauseTextAlert.setVisible(true);
            this.pauseHelp.setVisible(true);
        } else {
            this.gameplayContainer.setVisible(true);
            this.pauseOverlay.setVisible(false);
            this.pauseTextAlert.setVisible(false);
            this.pauseHelp.setVisible(false);
            
            // Re-evaluar por si se pausó antes de un disparo
            this.time.delayedCall(50, () => this.tryShoot());
        }
    }

    seededRandom() {
        this.currentSeed = (this.currentSeed * 9301 + 49297) % 233280;
        return this.currentSeed / 233280;
    }

    deterministicShuffle(array) {
        let currentIndex = array.length, randomIndex;
        while (currentIndex !== 0) {
            randomIndex = Math.floor(this.seededRandom() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }
    }

    createGrid() {
        this.totalBlocks = 0;
        const colorCounts = {};
        this.colors.forEach(c => colorCounts[c] = 0);
        
        this.currentSeed = this.level * 999;
        
        const ringColors = [...this.colors];
        this.deterministicShuffle(ringColors);

        for (let y = 0; y < this.gridSizeY; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.gridSizeX; x++) {
                const fillSize = Math.min(4 + Math.floor(this.level / 2), 10);
                const offset = Math.floor((10 - fillSize) / 2);
                
                let isBlock = (x >= offset && x < offset + fillSize && y >= offset && y < offset + fillSize);
                if (isBlock && this.seededRandom() > 0.95) { // Agujeros mucho menos frecuentes para forzar la estrategia de anillos
                    isBlock = false; 
                }
                
                if (isBlock) {
                    // Calculamos anillos concéntricos
                    const centerX = this.gridSizeX / 2 - 0.5;
                    const centerY = this.gridSizeY / 2 - 0.5;
                    const dist = Math.max(Math.abs(x - centerX), Math.abs(y - centerY));
                    const ringIndex = Math.floor(dist);
                    
                    let color = ringColors[ringIndex % ringColors.length];
                    // Un poco de ruido para no hacerlo perfecto siempre, aumenta con el nivel
                    if(this.seededRandom() > 0.85) {
                         color = this.colors[Math.floor(this.seededRandom() * this.colors.length)];
                    }

                    colorCounts[color]++;
                    this.totalBlocks++;
                    
                    const block = this.add.rectangle(
                        this.gridStartX + x * this.blockSize,
                        this.gridStartY + y * this.blockSize,
                        this.blockSize - 4, this.blockSize - 4, color
                    );
                    block.gridX = x;
                    block.gridY = y;
                    block.color = color;
                    this.gameplayContainer.add(block);
                    this.grid[y][x] = block;
                } else {
                    this.grid[y][x] = null;
                }
            }
        }
        
        this.deck = [];
        Object.keys(colorCounts).forEach(colorStr => {
            let count = colorCounts[colorStr];
            const color = parseInt(colorStr);
            while(count > 0) {
                if (this.level >= 3 && count >= 2 && this.seededRandom() > 0.7) {
                    this.deck.push({ color: color, size: 2 });
                    count -= 2;
                } else {
                    this.deck.push({ color: color, size: 1 });
                    count -= 1;
                }
            }
        });
        this.deterministicShuffle(this.deck);
        
        // Repartir aleatoriamente el deck en las 5 colas
        let q = 0;
        this.conveyorQueues = [[], [], [], [], []];
        while (this.deck.length > 0) {
            this.conveyorQueues[q].push(this.deck.pop());
            q = (q + 1) % 5;
        }

        this.updateOuterLayer();
    }

    drawTrayBackground() {
        const maxDraw = 10;
        const slotSize = 80;
        const startX = 540 - (maxDraw * slotSize) / 2 + slotSize / 2;
        const y = 1250;

        for (let i = 0; i < maxDraw; i++) {
            const isComboSlot = i >= this.baseMaxTraySlots;
            const bg = this.add.rectangle(startX + i * slotSize, y, slotSize - 10, slotSize - 10, 0x1a252f);
            bg.setStrokeStyle(4, isComboSlot ? 0xe74c3c : 0x7f8c8d);
            this.gameplayContainer.add(bg);
            
            if (isComboSlot) {
                const t = this.add.text(startX + i * slotSize, y, '⚡', {fontSize: '30px'}).setOrigin(0.5).setAlpha(0.3);
                this.gameplayContainer.add(t);
            }
        }
    }

    renderConveyor() {
        this.conveyorSprites.forEach(s => s.destroy());
        this.conveyorSprites = [];

        const slotSize = 110;
        const startX = 540 - (5 * slotSize) / 2 + slotSize / 2;
        const baseY = 1530; // Posición base del primer cañón de cada cola

        for (let i = 0; i < 5; i++) {
            const queue = this.conveyorQueues[i];
            
            // Renderizamos desde el último al primero (0) de la cola, para que el [0] quede encima de todos
            for (let j = queue.length - 1; j >= 0; j--) {
                const item = queue[j];
                const isDouble = item.size === 2;
                const w = isDouble ? 70 : 40;
                
                // Mostrar profundidad (los cañones abajo en la cola están más arriba visualmente y más pequeños)
                const depthOffset = j * 12;
                const yOffset = baseY - depthOffset;
                const scale = Math.max(0.65, 1 - (j * 0.08));
                const alpha = j === 0 ? 1 : 0.4;
                const strokeColor = j === 0 ? 0xffffff : 0x34495e;

                const cannon = isDouble ? this.add.ellipse(startX + i * slotSize, yOffset, w*2, 80, item.color) : this.add.circle(startX + i * slotSize, yOffset, 40, item.color);
                cannon.setStrokeStyle(4, strokeColor);
                cannon.setAlpha(alpha);
                cannon.setScale(scale);
                this.gameplayContainer.add(cannon);
                this.conveyorSprites.push(cannon);
                
                if (j === 0) {
                    cannon.setInteractive();
                    let txt = this.colorEmojis[item.color] || '🐵';
                    if(isDouble) txt += 'x2';

                    const emojiText = this.add.text(startX + i * slotSize, yOffset, txt, {
                        fontSize: isDouble ? '25px' : '40px',
                        fontStyle: 'bold', stroke: '#000', strokeThickness: 3
                    }).setOrigin(0.5);
                    this.gameplayContainer.add(emojiText);
                    this.conveyorSprites.push(emojiText);

                    cannon.on('pointerdown', () => {
                        if (!this.gameOver && !this.isPaused) {
                            const currentUsedSlots = this.getTrayUsedSlots();
                            if (currentUsedSlots + item.size <= this.maxTraySlots) {
                                this.moveCannonToTray(i);
                            } else {
                                this.cameras.main.shake(100, 0.01);
                            }
                        }
                    });
                }
            }
            
            // Hint de número de tecla y cantidad de balas restantes en esa cola
            const keyHint = this.add.text(startX + i * slotSize, baseY + 60, `[${i+1}] (${queue.length})`, {
                fontSize: '22px', fill: '#bdc3c7', align: 'center', fontStyle: 'bold'
            }).setOrigin(0.5);
            this.gameplayContainer.add(keyHint);
            this.conveyorSprites.push(keyHint);
        }
    }

    getTrayUsedSlots() {
        return this.tray.reduce((sum, item) => sum + item.size, 0);
    }

    renderTray() {
        const slotSize = 80;
        const maxDraw = 10;
        const startX = 540 - (maxDraw * slotSize) / 2 + slotSize / 2;
        const y = 1250;
        
        let visualSlotIndex = 0;

        this.tray.forEach(item => {
            const targetX = startX + visualSlotIndex * slotSize + (item.size > 1 ? slotSize/2 - 5 : 0);
            
            if (item.spriteGroup) {
                this.tweens.add({
                    targets: item.spriteGroup.getChildren(),
                    x: targetX,
                    duration: 150,
                    ease: 'Power2'
                });
            } else {
                item.spriteGroup = this.add.group();
                
                const w = item.size === 2 ? 70 : 35;
                const body = item.size === 2 ? this.add.ellipse(targetX, y, w*2, 70, item.color) : this.add.circle(targetX, y, 35, item.color);
                body.setStrokeStyle(4, 0xffffff);
                
                let txt = this.colorEmojis[item.color] || '🐵';
                if(item.size === 2) txt += ` (${item.matched}/${item.size})`;

                item.emojiTextObj = this.add.text(targetX, y, txt, {
                    fontSize: item.size === 2 ? '20px' : '35px',
                    fontStyle: 'bold', stroke: '#000', strokeThickness: 3
                }).setOrigin(0.5);
                
                item.spriteGroup.add(body);
                item.spriteGroup.add(item.emojiTextObj);

                this.gameplayContainer.add(body);
                this.gameplayContainer.add(item.emojiTextObj);
            }
            
            if(item.emojiTextObj && item.size === 2) {
                item.emojiTextObj.setText(`${this.colorEmojis[item.color]} (${item.matched}/${item.size})`);
            }

            visualSlotIndex += item.size;
        });
    }

    moveCannonToTray(queueIndex) {
        if (this.isPaused) return;

        const queue = this.conveyorQueues[queueIndex];
        if (!queue || queue.length === 0) return;

        const item = queue.shift(); // Sacar desde el frente de la cola
        this.tray.push({ color: item.color, size: item.size, matched: 0, spriteGroup: null, emojiTextObj: null });
        
        this.cameras.main.shake(50, 0.002);

        this.renderConveyor();
        this.renderTray();

        this.time.delayedCall(200, () => this.tryShoot());
    }

    tryShoot() {
        if (this.gameOver || this.isPaused) return;

        let shotFired = false;

        for (let i = 0; i < this.tray.length; i++) {
            const cannon = this.tray[i];
            
            while (cannon.matched < cannon.size) {
                const targetBlock = this.findExposedBlock(cannon.color);
                if (!targetBlock) break;

                shotFired = true;
                cannon.matched++;
                targetBlock.isBeingShot = true; 

                // Partícula visual instantánea
                const emitter = this.add.circle(targetBlock.x, targetBlock.y, 40, cannon.color, 0.8);
                this.gameplayContainer.add(emitter);
                this.tweens.add({
                    targets: emitter, scale: 2.5, alpha: 0, duration: 300, onComplete: () => emitter.destroy()
                });
                
                this.cameras.main.shake(50, 0.005);
                
                // Destrucción Síncrona
                this.score += 10;
                this.scoreText.setText(`${localStorage.getItem('pixelFlowUser') || 'Jugador'} | Puntos: ${this.score}`);
                this.activateCombo();
                this.destroyBlock(targetBlock);
            }
        }

        let removedAny = false;
        for (let i = this.tray.length - 1; i >= 0; i--) {
            const cannon = this.tray[i];
            if (cannon.matched >= cannon.size) {
                if (cannon.spriteGroup) {
                    cannon.spriteGroup.getChildren().forEach(c => c.destroy());
                    cannon.spriteGroup.destroy(true);
                    cannon.spriteGroup = null;
                }
                this.tray.splice(i, 1);
                removedAny = true;
            } else if (cannon.emojiTextObj && cannon.size > 1) {
                cannon.emojiTextObj.setText(`${this.colorEmojis[cannon.color]} (${cannon.matched}/${cannon.size})`);
            }
        }

        if (removedAny) {
            this.renderTray();
        }

        if (!shotFired) {
            this.checkGameOver("¡BANDEJA LLENA!");
        }
    }

    findExposedBlock(color) {
        let found = null;
        for (let y = 0; y < this.gridSizeY; y++) {
            for (let x = 0; x < this.gridSizeX; x++) {
                const block = this.grid[y][x];
                if (block && block.isExposed && block.color === color && !block.isBeingShot) {
                    found = block;
                    return found;
                }
            }
        }
        return null;
    }

    destroyBlock(block) {
        if (!block || !block.active) return;

        this.grid[block.gridY][block.gridX] = null;
        block.destroy();
        
        this.totalBlocks--;
        this.updateOuterLayer();
        
        if (this.totalBlocks <= 0) {
            this.levelComplete();
        } else {
            this.time.delayedCall(50, () => this.tryShoot());
        }
    }

    levelComplete() {
        this.gameOver = true;
        this.add.text(540, 960, '¡NIVEL COMPLETADO!', {
            fontSize: '80px', fill: '#2ecc71', fontStyle: 'bold', stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5);
        
        this.saveHighscore();
        
        localStorage.setItem('pixelFlowLevel', this.level + 1);
        localStorage.setItem('pixelFlowScore', this.score);
        
        this.time.delayedCall(2000, () => {
            this.scene.restart();
        });
    }

    updateOuterLayer() {
        for (let y = 0; y < this.gridSizeY; y++) {
            for (let x = 0; x < this.gridSizeX; x++) {
                const block = this.grid[y][x];
                if (block) {
                    block.isExposed = this.checkExposed(x, y);
                    if (block.isExposed) {
                        block.setStrokeStyle(4, 0xffffff);
                        block.setAlpha(1);
                    } else {
                        block.setStrokeStyle(0);
                        block.setAlpha(0.5);
                    }
                }
            }
        }
    }

    checkExposed(x, y) {
        if (x === 0 || x === this.gridSizeX - 1 || y === 0 || y === this.gridSizeY - 1) return true;
        if (!this.grid[y - 1][x] || !this.grid[y + 1][x] || !this.grid[y][x - 1] || !this.grid[y][x + 1]) {
            return true;
        }
        return false;
    }

    activateCombo() {
        this.comboActive = true;
        this.maxTraySlots = 10;
        this.comboText.setText('¡COMBO VELOCIDAD! Slots: 10');
        
        if (this.comboTimer) this.comboTimer.remove();
        
        this.comboTimer = this.time.delayedCall(3000, () => {
            this.comboActive = false;
            this.maxTraySlots = this.baseMaxTraySlots;
            this.comboText.setText('');
            if (!this.gameOver) this.checkGameOver("¡BANDEJA LLENA!");
        });
    }

    checkGameOver(reasonText) {
        if (this.gameOver || this.isPaused) return;

        // Validar si la bandeja esta llena O si hay reasonText provisto (como tiempo agotado)
        if (this.getTrayUsedSlots() >= this.maxTraySlots || reasonText === "¡SE ACABÓ EL TIEMPO!") {
            this.gameOver = true;
            this.cameras.main.shake(500, 0.03);
            this.add.rectangle(540, 960, 1080, 1920, 0x000000, 0.85);
            this.add.text(540, 900, `${reasonText}\nGAME OVER`, {
                fontSize: '90px', fill: '#e74c3c', fontStyle: 'bold', align: 'center', stroke: '#000000', strokeThickness: 8
            }).setOrigin(0.5);
            
            this.saveHighscore();
            
            const hs = localStorage.getItem('pixelFlowHS') || 0;
            this.add.text(540, 1050, `Puntuación: ${this.score}\nHighscore: ${hs}`, {
                fontSize: '50px', fill: '#f1c40f', align: 'center', fontStyle: 'bold'
            }).setOrigin(0.5);

            const restart = this.add.rectangle(540, 1250, 500, 120, 0x3498db).setInteractive();
            restart.setStrokeStyle(6, 0xffffff);
            this.add.text(540, 1250, '▶ REINTENTAR ▶', { fontSize: '45px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

            restart.on('pointerdown', () => {
                this.scene.restart({reset: true});
            });
        }
    }
    
    saveHighscore() {
        const hs = parseInt(localStorage.getItem('pixelFlowHS')) || 0;
        if (this.score > hs) {
            localStorage.setItem('pixelFlowHS', this.score);
        }
    }
}
