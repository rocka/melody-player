class MelodyPlayer extends HTMLElement {
    static get stylesheet() {
        return (`:host {
  display: block;
  font-family: sans-serif;
  margin: 0.5rem;
  padding: 0.5rem;
  color: #abb2bf;
  background-color: #282c34;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.6);
}
:host .display {
  font-size: 0.9rem;
  height: 130px;
  overflow: hidden;
}
:host .display .lyric {
  transform: translateY(63px);
  transition: transform .5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
:host .display .lyric .lrc-line {
  margin: 1rem 0;
  white-space: pre-wrap;
  text-align: center;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.3);
  transition: color .5s, text-shadow .5s;
}
:host .display .lyric .lrc-line.active {
  color: white;
}
:host .control {
  display: flex;
  align-items: center;
}
:host .control button {
  color: #abb2bf;
  font-family: "Material Icons";
  font-size: 20px;
  display: inline-block;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border-style: none;
  margin: 0;
  padding: 0;
  outline: none;
  cursor: pointer;
  background-color: transparent;
  transition: background-color 0.5s;
}
:host .control button:hover {
  transition: background-color 0.2s;
  background-color: rgba(255, 255, 255, 0.15);
}
:host .control button:active {
  background-color: rgba(255, 255, 255, 0.4);
}
:host .control button::-moz-focus-inner {
  border: 0;
}
:host .control .porgress {
  cursor: pointer;
  position: relative;
  margin-left: 0.5rem;
  flex-grow: 1;
  height: 0.7rem;
  color: #61aeee;
  background-color: rgba(0, 0, 0, 0.6);
}
:host .control .porgress div {
  width: 0;
  height: inherit;
  position: absolute;
  transition: width 1s linear;
}
:host .control .porgress .load {
  background-color: rgba(255, 255, 255, 0.3);
}
:host .control .porgress .play {
  background-color: currentColor;
}
:host .control .porgress .play::after {
  content: " ";
  color: white;
  position: absolute;
  width: 2px;
  height: inherit;
  right: 0;
  top: 0;
  border: 0 solid currentColor;
  box-shadow: 0 0 0 transparent;
  background-color: currentColor;
  transition: all 0.2s;
}
:host .control .porgress:hover .play::after {
  cursor: pointer;
  border-width: 6px 3px;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.6);
  top: -6px;
  right: -3px;
}
:host .control .timer {
  margin-left: 0.5rem;
}
:host .control .control-right {
  margin-left: 0.5rem;
}`
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
            this.fetchLyric()
                .then(() => this.renderLyric());
        }
    }

    /**
     * fetch lrc to au props
     * @returns {Promise<void>}
     */
    fetchLyric() {
        const au = this.audios[this.playIndex];
        /** @type {{lrc:string; subLrc:string}} */
        const urls = {
            lrc: au.dataset['lrc'],
            subLrc: au.dataset['subLrc']
        };
        // TODO: cache lyric; retry when cache invalid
        return Promise.all(Object.entries(urls).map(([k, v]) => {
            if (v) {
                return fetch(v)
                    .then(r => r.text())
                    .then(t => au[k] = window.LrcKit.Lrc.parse(t))
                    .catch(e => console.error('[MelodyPlayer] Cannot fetch lrc:', e));
            } else {
                au[k] = '';
            }
        }));
    }

    /**
     * render to lrc element
     */
    renderLyric() {
        const au = this.audios[this.playIndex];
        /** @type {Array.<{timestamp:number;content:string}>} */
        const lrc = au.lrc.lyrics;
        lrc.sort((a, b) => a.timestamp - b.timestamp);
        /** @type {Array.<{timestamp:number;content:string}>} */
        const subLrc = au.subLrc.lyrics;
        subLrc.sort((a, b) => a.timestamp - b.timestamp);
        /** @type {Array.<{timestamp:number;content:string}>} */
        const lyrics = [], lyricElms = [];
        let i = 0, j = 0;
        while (i < lrc.length && j < subLrc.length) {
            const l = lrc[i], sl = subLrc[j];
            if (l.timestamp === sl.timestamp) {
                lyrics.push({ timestamp: l.timestamp, content: `${l.content}\n${sl.content}` });
                i++ , j++;
            } else if (l.timestamp > sl.timestamp) {
                lyrics.push({ timestamp: sl.timestamp, content: sl.content });
                j++;
            } else if (sl.timestamp > l.timestamp) {
                lyrics.push({ timestamp: l.timestamp, content: l.content });
                i++;
            }
        }
        const frag = document.createDocumentFragment();
        for (const line of lyrics) {
            const elm = document.createElement('p');
            elm.classList.add('lrc-line');
            elm.timestamp = line.timestamp;
            elm.dataset['timestamp'] = line.timestamp;
            elm.appendChild(document.createTextNode(line.content));
            frag.appendChild(elm);
            lyricElms.push(elm);
        }
        this.lyrics = lyricElms;
        this.containerLyric.innerHTML = '';
        this.containerLyric.appendChild(frag);
    }

    nextLyricIndex() {
        const au = this.audios[this.playIndex];
        const first = this.lyrics[0].timestamp || +ly.dataset['timestamp'];
        if (au.currentTime < first) {
            return -1;
        }
        const ly = this.lyrics[this.lyricIndex];
        const lyricTime = ly.timestamp || +ly.dataset['timestamp'];
        let loopStart = this.lyricIndex;
        if (au.currentTime < lyricTime) {
            loopStart = 0;
        }
        for (let i = loopStart; i < this.lyrics.length; i++) {
            const elm = this.lyrics[i];
            const time = elm.timestamp || +elm.dataset['timestamp'];
            if (time > au.currentTime) {
                return !i ? 0 : i - 1;
            }
        }
        return this.lyrics.length - 1;
    }

    syncLyric() {
        const nextIndex = this.nextLyricIndex();
        if (nextIndex !== this.lyricIndex) {
            if (nextIndex === -1) {
                this.containerLyric.style.transform = '';
            } else {
                this.lyrics[this.lyricIndex].classList.remove('active');
                this.lyrics[nextIndex].classList.add('active');
                let offset = this.lyrics[nextIndex].offsetTop
                    - this.containerDisplay.clientHeight / 2
                    + this.lyrics[nextIndex].clientHeight / 2;
                this.containerLyric.style.transform = `translateY(calc(-1rem - ${offset}px))`;
                this.lyricIndex = nextIndex;
            }
        }
    }

    handleAudioPlaying() {
        this.updateProgress();
        this.syncLyric();
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
            if (this.firstPlay) {
                this.firstPlay = false;
            } else {
                this.fetchLyric().then(() => this.renderLyric());
            }
            this.updateTimerTotal();
            this.syncProgress();
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
        if (this.firstPlay) {
            this.firstPlay = false;
        }
        this._pause(0);
        this.nextPlayIndex(pos);
        this._play();
    }

    handleAudioEnd() {
        this._pause(0);
        this.lyricIndex = 0;
        this.containerLyric.style.transform = '';
        const shouldContinue = this.nextPlayIndex();
        if (shouldContinue) {
            this._play();
        } else {
            this.playing = false;
            this.updateBtnPlay();
            this.dispatchEvent(new CustomEvent('playend'));
        }
        this.updateTimerTotal();
        this.syncProgress();
    }

    handlePlayEnd() {
        this.renderLyric();
        this.firstPlay = true;
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
        this.syncLyric();
    }

    render() {
        const shadow = this.attachShadow({ mode: 'open' });
        const style = document.createElement('style');
        style.appendChild(document.createTextNode(MelodyPlayer.stylesheet));
        /** @type {HTMLTemplateElement} */
        const tmpl = document.getElementById('mldy-tmpl');
        let dom = document.importNode(tmpl.content, true);
        if (~navigator.userAgent.toLowerCase().indexOf('firefox')) {
            const wrapper = document.createElement('div');
            wrapper.classList.add('melody-player');
            wrapper.appendChild(dom);
            dom = wrapper;
            style.textContent = style.textContent.replace(/:host/g, '.melody-player');
        }
        shadow.appendChild(style);
        shadow.appendChild(dom);
        this.containerDisplay = shadow.getElementById('container-disp');
        this.containerLyric = shadow.getElementById('container-lrc');
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
        this.addEventListener('playend', () => this.handlePlayEnd());
        this.btnPlay.addEventListener('click', () => this.handlePlayOrPause());
        this.btnPrev.addEventListener('click', () => this.handleNext(-1));
        this.btnNext.addEventListener('click', () => this.handleNext(1));
        this.btnLoop.addEventListener('click', () => this.handleLoopMode());
        this.progressFull.addEventListener('click', (ev) => this.handleProgressPeek(ev));
    }

    constructor() {
        super();
        this.firstPlay = true;
        this.playing = false;
        /** @type {HTMLAudioElement[]} */
        this.audios = [];
        this.playIndex = 0;
        /** @type {HTMLParagraphElement[]} */
        this.lyrics = null;
        this.lyricIndex = 0;
        this.loopMode = MelodyPlayer.LoopMode.Once;
        /** @type {number} */
        this.progressTimeout = null;
        /** @type {Function} */
        this.audioEndListener = null;
        /** @type {HTMLDivElement} */
        this.containerLyric = null;
        /** @type {HTMLDivElement} */
        this.containerDisplay = null;
        /** @type {HTMLDivElement} */
        this.containerLyric = null;
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
                .filter(elm => elm instanceof HTMLAudioElement)
                .map(elm => {
                    elm.addEventListener('ended', () => {
                        this.dispatchEvent(new CustomEvent('audioend'));
                    });
                    return elm;
                });
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

window.customElements.define('melody-player', MelodyPlayer);
