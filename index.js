class MelodyPlayer extends HTMLElement {
    static get stylesheet() {
        return (`:host {
  display: flex;
  align-items: center;
  margin: 0.5rem;
  padding: 0.5rem;
  background-color: #dddddd;
  border-radius: 2px;
}
:host button {
  display: inline-block;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border-style: none;
  margin: 0;
  padding: 0;
  outline: none;
  cursor: pointer;
  transition: background-color 0.5s;
}
:host button:hover {
  transition: background-color 0.2s;
  background-color: rgba(255, 255, 255, 0.3);
}
:host button:active {
  background-color: rgba(255, 255, 255, 0.8);
}
:host .porgress {
  cursor: pointer;
  position: relative;
  margin-left: 0.5rem;
  flex-grow: 1;
  height: 0.7rem;
  color: teal;
  background-color: rgba(0, 0, 0, 0.6);
}
:host .porgress div {
  height: inherit;
  position: absolute;
  transition: width 1s linear;
}
:host .porgress #prog-load {
  background-color: rgba(255, 255, 255, 0.3);
}
:host .porgress #prog-play {
  background-color: currentColor;
}
:host .porgress #prog-play::after {
  content: " ";
  position: absolute;
  width: 2px;
  height: inherit;
  right: 0;
  top: 0;
  border: 0 solid white;
  box-shadow: 0 0 0 transparent;
  background-color: white;
  transition: all 0.2s;
}
:host .porgress:hover #prog-play::after {
  cursor: pointer;
  border-width: 6px 3px;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.6);
  top: -6px;
  right: -3px;
}
:host .timer {
  margin-left: 0.5rem;
}
:host .control-right {
  margin-left: 0.5rem;
}
:host[data-playing] { background-color: red; }`
        );
    }

    static get LoopMode() {
        return {
            Once: 0,
            Single: 1,
            List: 2,
            Shuffle: 3,
            0: 'once',
            1: 'single',
            2: 'list',
            3: 'shuffle'
        };
    }

    static percent(num) {
        if (typeof num !== 'number') {
            throw new Error('percent must be number');
        }
        return `${(num * 100).toFixed(2)}%`;
    }

    static time(num) {
        if (typeof num !== 'number') {
            throw new Error('time must be number');
        }
        const dt = new Date(num * 1000);
        const mm = dt.getUTCMinutes() + dt.getUTCHours() * 60;
        const ss = dt.getUTCSeconds();
        return [mm, ss > 9 ? ss : `0${ss}`].join(':');
    }

    updateProgress() {
        const au = this.audios[this.playIndex];
        this.timerPlay.textContent = MelodyPlayer.time(au.currentTime);
        const played = au.currentTime / au.duration;
        let loaded = 0;
        if (au.buffered.length !== 0) {
            loaded = au.buffered.end(au.buffered.length - 1) / au.duration;
        }
        this.progressPlay.style.width = MelodyPlayer.percent(played);
        this.progressLoad.style.width = MelodyPlayer.percent(loaded);
    }

    syncProgress() {
        this.progressPlay.style.transition = 'width 0.2s';
        this.progressLoad.style.transition = 'width 0.2s';
        this.updateProgress();
        setTimeout(() => {
            this.progressPlay.style.transition = '';
        }, 0.2 * 1000);
        setTimeout(() => {
            this.progressLoad.style.transition = '';
        }, 0.2 * 1000);
    }

    updateTimerTotal() {
        const au = this.audios[this.playIndex];
        if (Number.isNaN(au.duration)) {
            au.addEventListener('loadedmetadata', () => {
                this.timerTotal.textContent = MelodyPlayer.time(au.duration);
            })
        } else {
            this.timerTotal.textContent = MelodyPlayer.time(au.duration);
        }
    }

    updateBtnPlay() {
        const elm = this.btnPlay;
        elm.textContent = elm.dataset[this.playing ? 'pause' : 'play'];
    }

    updateBtnLoop() {
        const elm = this.btnLoop;
        elm.textContent = elm.dataset[MelodyPlayer.LoopMode[this.loopMode]];
    }

    handlePlayerReady() {
        this.updateBtnPlay();
        this.updateBtnLoop();
        if (this.audios.length > 0) {
            this.playIndex = 0;
            this.updateTimerTotal();
        }
    }

    handleAudioPlaying() {
        this.updateProgress();
        this.progressTimeout = setTimeout(() => {
            if (this.playing) {
                this.handleAudioPlaying();
            }
        }, 1000);
    }

    _play() {
        const au = this.audios[this.playIndex];
        const evInit = { detail: { audio: au } };
        if (this.audios[this.playIndex].currentTime < 1e-9) {
            this.handleAudioStart();
        }
        return au.play().then(() => {
            this.playing = true;
            this.handleAudioPlaying();
            this.updateBtnPlay();
            this.dispatchEvent(new CustomEvent('play', evInit));
        });
    }

    /**
     * @param {number} position time to seek after pause
     */
    _pause(position = true) {
        const au = this.audios[this.playIndex];
        const evInit = { detail: { audio: au } };
        au.pause();
        if (position === 0) {
            au.currentTime = 0;
        }
        this.playing = false;
        clearTimeout(this.progressTimeout);
        this.updateBtnPlay();
        this.dispatchEvent(new CustomEvent('pause', evInit));
    }

    handlePlayOrPause() {
        if (this.playing) {
            this._pause();
        } else {
            this._play();
        }
    }

    /**
     * @param {number} pos should be next, or prev
     * @returns {boolean} should continue playing
     */
    nextPlayIndex(pos = 1) {
        switch (this.loopMode) {
            case MelodyPlayer.LoopMode.Once:
                this.playIndex = (this.audios.length + this.playIndex + pos) % this.audios.length;
                if (this.playIndex === 0) return false;
                break;
            case MelodyPlayer.LoopMode.Single:
                break;
            case MelodyPlayer.LoopMode.List:
                this.playIndex = (this.audios.length + this.playIndex + pos) % this.audios.length;
                break;
            case MelodyPlayer.LoopMode.Shuffle:
                this.playIndex = Math.round(Math.random() * Number.MAX_SAFE_INTEGER) % this.audios.length;
                break;
        }
        return true;
    }

    /**
     * @param {number} pos should be next, or prev
     */
    handleNext(pos = 1) {
        this._pause(0);
        this.nextPlayIndex(pos);
        this._play();
    }

    handleAudioStart() {
        this.updateTimerTotal();
        this.syncProgress();
        this.audios[this.playIndex].addEventListener('ended', () => {
            this.dispatchEvent(new CustomEvent('audioend'));
        });
    }

    handleAudioEnd() {
        if (this.nextPlayIndex()) {
            this._play();
        } else {
            this.playing = false;
            this.updateBtnPlay();
            this.updateTimerTotal();
            this.updateProgress();
            this.dispatchEvent(new CustomEvent('playend'));
        }
    }

    handleLoopMode() {
        this.loopMode = (this.loopMode + 1) % 4;
        this.updateBtnLoop();
    }

    /**
     * handle click on progress bar
     * @param {MouseEvent} ev MouseEvent from click listener
     */
    handleProgressPeek(ev) {
        const au = this.audios[this.playIndex];
        const start = this.progressFull.offsetLeft;
        const progress = (ev.clientX - start) / this.progressFull.offsetWidth;
        au.currentTime = progress * au.duration;
        this.syncProgress();
    }

    render() {
        const shadow = this.attachShadow({ mode: 'open' });
        const style = document.createElement('style');
        style.appendChild(document.createTextNode(MelodyPlayer.stylesheet));
        shadow.appendChild(style);
        /** @type {Node} */
        const dom = document
            .getElementById('mldy-tmpl')
            .content
            .cloneNode(true);
        shadow.appendChild(dom);
        this.progressFull = shadow.getElementById('prog-full');
        this.progressPlay = shadow.getElementById('prog-play');
        this.progressLoad = shadow.getElementById('prog-load');
        this.timerPlay = shadow.getElementById('timer-play');
        this.timerTotal = shadow.getElementById('timer-total');
        this.btnPrev = shadow.getElementById('btn-prev');
        this.btnPlay = shadow.getElementById('btn-play');
        this.btnNext = shadow.getElementById('btn-next');
        this.btnLyric = shadow.getElementById('btn-lyric');
        this.btnLoop = shadow.getElementById('btn-loop');
    }

    event() {
        this.addEventListener('ready', () => this.handlePlayerReady());
        this.addEventListener('audioend', () => this.handleAudioEnd());
        this.btnPlay.addEventListener('click', () => this.handlePlayOrPause());
        this.btnPrev.addEventListener('click', () => this.handleNext(-1));
        this.btnNext.addEventListener('click', () => this.handleNext(1));
        this.btnLoop.addEventListener('click', () => this.handleLoopMode());
        this.progressFull.addEventListener('click', (ev) => this.handleProgressPeek(ev));
    }

    constructor() {
        super();
        this.playing = false;
        this.playIndex = 0;
        this.loopMode = MelodyPlayer.LoopMode.Once;
        /** @type {number} */
        this.progressTimeout = null;
        /** @type {HTMLAudioElement[]} */
        this.audios = [];
        /** @type {HTMLDivElement} */
        this.progressFull = null;
        /** @type {HTMLDivElement} */
        this.progressPlay = null;
        /** @type {HTMLDivElement} */
        this.progressLoad = null;
        /** @type {HTMLSpanElement} */
        this.timerPlay = null;
        /** @type {HTMLSpanElement} */
        this.timerTotal = null;
        /** @type {HTMLButtonElement} */
        this.btnPrev = null;
        /** @type {HTMLButtonElement} */
        this.btnPlay = null;
        /** @type {HTMLButtonElement} */
        this.btnNext = null;
        /** @type {HTMLButtonElement} */
        this.btnLoop = null;
        /** @type {HTMLButtonElement} */
        this.btnLyric = null;
        setTimeout(() => {
            this.audios = Array
                .from(this.children)
                .filter(elm => elm instanceof HTMLAudioElement);
            const evInit = { detail: { audios: this.audios } };
            this.dispatchEvent(new CustomEvent('ready', evInit));
        }, 0);
        this.render();
        this.event();
    }

    connectedCallback() {
        console.log('MelodyPlayer loaded.');
    }
}

window.customElements.define('melody-player', MelodyPlayer, { extends: 'div' });
