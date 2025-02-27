class Stampede {
    constructor(options = {}) {
        this.emojis = Array.isArray(options.emojis) ? options.emojis : ['🦏', '🦒'];
        this.count = options.count || 10;
        this.direction = options.direction || 'left-to-right';
        this.flip = options.flip ?? 0;
        this.container = null;
        this.rhinos = [];
        this.dustEmoji = '💨';
        this.dustFlip = options.dustFlip ?? 0;
        this.initialize();
    }

    getRandomEmoji() {
        return this.emojis[Math.floor(Math.random() * this.emojis.length)];
    }

    initialize() {
        this.container = document.createElement('div');
        this.container.style.cssText = `
            position: fixed;
            bottom: 5px;
            left: 0;
            right: 0;
            height: 100px;
            overflow: hidden;
            pointer-events: none;
        `;
        document.body.appendChild(this.container);

        for (let i = 0; i < this.count; i++) {
            setTimeout(() => {
                this.createRhino();
            }, i * 200);
        }
    }

    updateZIndices() {
        // Sort rhinos by y position (higher y = closer to bottom = higher z-index)
        const sortedRhinos = [...this.rhinos].sort((a, b) => a.y - b.y);
        
        // Assign z-indices based on position (higher y = higher z-index)
        sortedRhinos.forEach((rhino, index) => {
            rhino.element.style.zIndex = index;
        });
    }

    createRhino() {
        const rhino = document.createElement('div');
        const isRightToLeft = this.direction === 'right-to-left';

        rhino.style.cssText = `
            position: absolute;
            font-size: 40px;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

        const startX = isRightToLeft ? window.innerWidth + 50 : -50;
        const y = Math.random() * 40 + 30;

        const rhinoState = {
            element: rhino,
            x: startX,
            y,
            speed: Math.random() * 2 + 2,
            tilt: 0,
            dustTimer: 0,
            dustElement: null,
            lastDustTime: 0,
            resetting: false,
            emoji: this.getRandomEmoji()
        };

        this.updateRhinoPosition(rhinoState);
        this.container.appendChild(rhino);
        
        setTimeout(() => {
            rhino.style.opacity = '1';
        }, 50);

        this.rhinos.push(rhinoState);
        this.updateZIndices(); // Update z-indices when adding new rhino
        this.updateRhino(rhinoState);
    }

    updateRhinoPosition(rhinoState) {
        rhinoState.element.style.transform = `
            translate(${rhinoState.x}px, ${rhinoState.y}px)
            rotate(${rhinoState.tilt}deg)
            ${this.flip === 1 ? 'scale(-1, 1)' : ''}
        `;
    }

    updateRhino(rhinoState) {
        if (rhinoState.resetting) {
            requestAnimationFrame(() => this.updateRhino(rhinoState));
            return;
        }

        const isRightToLeft = this.direction === 'right-to-left';
        rhinoState.x += isRightToLeft ? -rhinoState.speed : rhinoState.speed;
        rhinoState.tilt = Math.sin(rhinoState.x / 20) * 10;

        this.updateRhinoPosition(rhinoState);
        rhinoState.element.textContent = rhinoState.emoji;

        const now = Date.now();
        if (now - rhinoState.lastDustTime > 1000 && Math.random() < 0.04) {
            this.createDust(rhinoState);
            rhinoState.lastDustTime = now;
        }

        const offScreen = isRightToLeft ?
            rhinoState.x < -100 :
            rhinoState.x > window.innerWidth + 100;

        if (offScreen && !rhinoState.resetting) {
            rhinoState.resetting = true;
            rhinoState.element.style.opacity = '0';

            setTimeout(() => {
                rhinoState.x = isRightToLeft ? window.innerWidth + 50 : -50;
                // Generate new y position when resetting
                rhinoState.y = Math.random() * 40 + 30;
                rhinoState.emoji = this.getRandomEmoji();
                this.updateRhinoPosition(rhinoState);
                this.updateZIndices(); // Update z-indices when repositioning

                requestAnimationFrame(() => {
                    rhinoState.element.style.opacity = '1';
                    rhinoState.resetting = false;
                });
            }, 200);
        }

        requestAnimationFrame(() => this.updateRhino(rhinoState));
    }

    createDust(rhinoState) {
        const dust = document.createElement('div');
        dust.textContent = this.dustEmoji;
        dust.style.cssText = `
            position: absolute;
            font-size: 40px;
            opacity: 1;
            transition: all 0.8s ease-out;
            z-index: ${rhinoState.element.style.zIndex}; // Match parent rhino's z-index
        `;

        const isRightToLeft = this.direction === 'right-to-left';
        const dustX = rhinoState.x + (isRightToLeft ? 40 : -40);
        const dustY = rhinoState.y + 20;

        dust.style.transform = `
            translate(${dustX}px, ${dustY}px)
            ${this.dustFlip === 1 ? 'scale(-1, 1)' : ''}
            scale(0.1)
        `;

        this.container.appendChild(dust);

        requestAnimationFrame(() => {
            dust.style.transform = `
                translate(${dustX + (isRightToLeft ? 50 : -50)}px, ${dustY}px)
                ${this.dustFlip === 1 ? 'scale(-1, 1)' : ''}
                scale(1)
            `;
            dust.style.opacity = '0';
        });

        setTimeout(() => dust.remove(), 800);
    }

    updateSettings(options = {}) {
        if (options.emojis) {
            this.emojis = Array.isArray(options.emojis) ? options.emojis : [options.emojis];
        }
        this.direction = options.direction ?? this.direction;
        this.flip = options.flip ?? this.flip;
        this.dustFlip = options.dustFlip ?? this.dustFlip;

        if (options.count !== undefined && options.count !== this.count) {
            const diff = options.count - this.count;
            if (diff > 0) {
                for (let i = 0; i < diff; i++) {
                    setTimeout(() => {
                        this.createRhino();
                    }, i * 200);
                }
            } else {
                for (let i = 0; i < -diff; i++) {
                    const rhino = this.rhinos.pop();
                    rhino.element.remove();
                }
            }
            this.count = options.count;
            this.updateZIndices(); // Update z-indices after changing count
        }
    }

    destroy() {
        if (this.container) {
            this.container.remove();
            this.container = null;
            this.rhinos = [];
        }
    }
}

//Keyboard sequence detection and stampede trigger
class SafariTrigger {
    constructor() {
        this.sequence = '';
        this.targetWord = 'safari';
        this.timeout = null;
        this.activeStampede = null;
        this.setupListeners();
    }

    setupListeners() {
        document.addEventListener('keydown', (e) => {
            // Ignore if user is typing in an input field, textarea, or contenteditable element
            if (this.isUserTyping(e.target)) {
                return;
            }

            // Add the key to the sequence
            this.sequence += e.key.toLowerCase();

            // Reset sequence after 2 seconds of no typing
            clearTimeout(this.timeout);
            this.timeout = setTimeout(() => {
                this.sequence = '';
            }, 2000);

            // Check if sequence contains our target word
            if (this.sequence.includes(this.targetWord)) {
                this.triggerStampede();
                this.sequence = ''; // Reset after trigger
            }
        });
    }

    isUserTyping(element) {
        // Check if the element is an input field, textarea, or contenteditable
        return (
            element.tagName === 'INPUT' ||
            element.tagName === 'TEXTAREA' ||
            element.isContentEditable ||
            element.closest('[contenteditable="true"]')
        );
    }

    triggerStampede() {
        // Clean up previous stampede if it exists
        if (this.activeStampede) {
            this.activeStampede.destroy();
        }

        // Create new stampede
        this.activeStampede = new Stampede({
            emojis: ['🦏', '🦒', '🐘', '🦛', '🦓', '🦬', '🐆', '🐅', '🐪', '🐫', '🦙'],
            count: 30,
            direction: 'left-to-right',
            flip: 1,
            dustFlip: 1
        });

        // Cleanup after animation
        setTimeout(() => {
            if (this.activeStampede) {
                this.activeStampede.destroy();
                this.activeStampede = null;
            }
        }, 15000); 
    }
}

// Initialize the trigger
const safariTrigger = new SafariTrigger();