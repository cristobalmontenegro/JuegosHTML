# 🎨 Pixel Flow

**ES:** Juego experimental con motor **Phaser 3**. De una cinta transportadora caen piezas de colores que debes enviar a la bandeja en el orden correcto. Incluye sistema de niveles, temporizador, combos y puntaje máximo guardado en el navegador.

**EN:** An experimental game powered by **Phaser 3**. Colored pieces fall on a conveyor belt and must be sent to the tray in the right order. It features levels, a timer, combos and a high score saved in the browser.

## 🎮 Cómo se juega / How to play

- **Griales**: una cuadrícula de 10×10 con **5 colas de cinta** y una **bandeja de 7 espacios**.
- Envía cada pieza a la bandeja cuando haya espacio; completa objetivos antes de que acabe el tiempo.
- Los **combos** y la velocidad aumentan con cada nivel.
- Progreso y *highscore* se guardan en `localStorage`.

- **Mechanics**: a 10×10 grid with **5 conveyor queues** and a **7-slot tray**.
- Send each piece to the tray when there is room; meet the goals before time runs out.
- **Combos** and speed increase with each level.
- Progress and high score are saved in `localStorage`.

## 🕹️ Controles / Controls

Teclado y **clic/tap** (toca el cañón). / Keyboard and **click/tap** (tap the cannon).

## 🗂️ Estructura / Structure

```
PixelFlow/
├── index.html            # Carga Phaser y las escenas
├── style.css
└── js/
    ├── main.js           # Configuración del juego (Phaser)
    └── scenes/
        ├── LoginScene.js # Menú / highscore / nueva partida
        └── GameScene.js  # Lógica principal del juego
```

## ▶️ Cómo jugar / How to play

Abre **`index.html`** en tu navegador (necesita **Internet** para cargar Phaser desde CDN).

Open **`index.html`** in your browser (requires **Internet** to load Phaser from the CDN).

---

Parte de [**JuegosHTML**](../).
