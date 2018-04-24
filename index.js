class MelodyPlayer extends HTMLElement {
    static get stylesheet() {
        return `:host {
  display: block;
  font-family: sans-serif;
  margin: 8px;
  padding: 8px;
  color: #abb2bf;
  background-color: #282c34;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.6);
}
:host .display {
  position: relative;
  font-size: 14px;
  height: 150px;
  overflow: hidden;
}
:host .display .lyric {
  transform: translateY(0);
  transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
:host .display .lyric .line {
  opacity: 0.4;
  margin: 16px 0;
  white-space: pre-wrap;
  text-align: center;
  transition: color 0.5s, opacity 0.5s;
}
:host .display .lyric .line.active {
  color: white;
  opacity: 1;
  text-shadow: 0 0 0.3px currentColor;
}
:host .display .lyric.mask {
  position: relative;
  top: calc(50% - 3em);
}
:host .display .shadow {
  content: " ";
  position: absolute;
  display: block;
  width: 100%;
  height: 45px;
  z-index: 1;
}
:host .display::before {
  content: " ";
  position: absolute;
  display: block;
  width: 100%;
  height: 45px;
  z-index: 1;
  top: 0;
  background-image: linear-gradient(#282c34, transparent);
}
:host .display::after {
  content: " ";
  position: absolute;
  display: block;
  width: 100%;
  height: 45px;
  z-index: 1;
  bottom: 0;
  background-image: linear-gradient(transparent, #282c34);
}
:host .control {
  display: flex;
  align-items: center;
}
:host .control button {
  color: #abb2bf;
  font: 20px "Material Icons";
  display: inline-block;
  box-sizing: content-box;
  width: 32px;
  height: 32px;
  border-radius: 16px;
  border: none;
  margin: 0;
  padding: 0;
  outline: none;
  cursor: pointer;
  background-color: transparent;
  transition: background-color 0.5s;
  -webkit-tap-highlight-color: transparent;
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
  margin-left: 8px;
  flex-grow: 1;
  height: 12px;
  color: #61aeee;
  background-color: rgba(0, 0, 0, 0.6);
}
:host .control .porgress div {
  width: 0;
  height: inherit;
  position: absolute;
  transition: width 1s linear;
}
:host .control .porgress div.peek {
  transition: width 0.2s;
}
:host .control .porgress .load {
  background-color: rgba(255, 255, 255, 0.3);
}
:host .control .porgress .play {
  background-color: currentColor;
}
:host .control .porgress .play::after {
  content: " ";
  cursor: pointer;
  color: white;
  position: absolute;
  box-sizing: content-box;
  width: 2px;
  height: inherit;
  right: 0;
  top: 0;
  border: 0 solid currentColor;
  box-shadow: 0 0 0 transparent;
  background-color: currentColor;
  transition: border 0.2s, top 0.2s, right 0.2s;
}
:host .control .porgress:hover .play::after {
  border-width: 6px 3px;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.6);
  top: -6px;
  right: -3px;
}
:host .control .timer {
  font-size: 14px;
  margin-left: 8px;
}
:host .control .control-right {
  margin-left: 8px;
}`;
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

    static get LyricStatus() {
        return {
            Loading: 0,
            Loaded: 1,
            Failed: 2,
            None: 3,
            0: 'loading',
            1: 'loaded',
            2: 'failed',
            3: 'none'
        }
    }

    static get LogTag() {
        return '[MelodyPlayer]';
    }

    static log(...args) {
        console.log(MelodyPlayer.LogTag, ...args);
    }

    static err(...args) {
        console.error(MelodyPlayer.LogTag, ...args);
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

    /**
     * hide HTML element; set style.display to none
     * @param {HTMLElement} elm
     * @param {boolean} hide hide or unhide
     */
    static hide(elm, hide = true) {
        elm.style.display = hide ? 'none' : '';
    }

    get playing() { return this._playing; }
    set playing(value) {
        if (value !== this._playing) {
            this._playing = value;
            const elm = this.btnPlay;
            elm.textContent = elm.dataset[value ? 'pause' : 'play'];
            try { this.syncProgress(); } catch (e) { /* just ignore */ }
        }
    }

    get playIndex() { return this._playIndex; }
    set playIndex(value) {
        if (value !== this._playIndex) {
            this._playIndex = value;
            const au = this.audios[value];
            if (Number.isNaN(au.duration)) {
                au.addEventListener('loadedmetadata', () => {
                    this.timerTotal.textContent = MelodyPlayer.time(au.duration);
                });
            } else {
                this.timerTotal.textContent = MelodyPlayer.time(au.duration);
            }
            this.syncProgress();
            this.fetchLyric().then(() => this.renderLyric());
        }
    }

    get lyricStatus() { return this._lyricStatus; }
    set lyricStatus(value) {
        if (value !== this._lyricStatus) {
            this._lyricStatus = value;
            [
                this.lyricMaskLoading,
                this.containerLyric,
                this.lyricMaskFailed,
                this.lyricMaskNone
            ].forEach((elm, i) => MelodyPlayer.hide(elm, value !== i));
        }
    }

    get lyricIndex() { return this._lyricIndex; }
    set lyricIndex(value) {
        if (value !== this._lyricIndex) {
            window.requestAnimationFrame(((before, current) => {
                const bf = this.lyrics[before];
                if (bf) { bf.classList.remove('active'); }
                const cur = this.lyrics[current];
                cur.classList.add('active');
                let offset = this.containerDisplay.clientHeight / 2
                    - cur.clientHeight / 2
                    - cur.offsetTop
                    - 16;
                this.containerLyric.style.transform = `translateY(${offset}px)`;
            }).bind(this, this._lyricIndex, value));
            this._lyricIndex = value;
        }
    }

    get loopMode() { return this._loopMode; }
    set loopMode(value) {
        if (value !== this._loopMode) {
            this._loopMode = value;
            const elm = this.btnLoop;
            elm.textContent = elm.dataset[MelodyPlayer.LoopMode[value]];
        }
    }

    /**
     * add audio to `this.audios` and add event listeners
     * @param {HTMLAudioElement} audio
     */
    registerAudio(audio) {
        this.audios.push(audio);
        audio.addEventListener('play', () => {
            this.playing = true;
        });
        audio.addEventListener('pause', () => {
            this.playing = false;
        });
        audio.addEventListener('ended', () => {
            this.handleAudioEnd();
            const evInit = { detail: { audio } };
            this.dispatchEvent(new CustomEvent('audioend', evInit));
        });
    }

    init() {
        this.playing = false;
        this.loopMode = MelodyPlayer.LoopMode.Once;
        if (this.audios.length > 0) {
            this.playIndex = 0;
        }
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
        /** @param {HTMLDivElement} elm */
        function tiggerPeek(elm, t = 0.2) {
            elm.classList.add('peek');
            setTimeout(() => elm.classList.remove('peek'), t * 1000);
        }
        tiggerPeek(this.progressPlay);
        tiggerPeek(this.progressLoad);
        this.updateProgress();
    }

    /**
     * remove all rendered lyric elements
     */
    clearLyric() {
        const p = this.containerLyric;
        let c = p.firstChild;
        while (c) { p.removeChild(c), c = p.firstChild; }
    }

    /**
     * fetch lrc to au props
     * @returns {Promise<void>}
     */
    fetchLyric() {
        this.lyricStatus = 0; // Loading
        const au = this.audios[this.playIndex];
        const urls = {
            lrc: au.dataset['lrc'],
            subLrc: au.dataset['subLrc']
        };
        // TODO: cache lyric; retry when cache invalid
        // maybe the browser would do it?
        return Promise.all(
            Object.entries(urls).map(([k, v]) => {
                if (v) {
                    return fetch(v)
                        .then(r => {
                            if (r.status === 200) {
                                return r.text();
                            }
                            throw r;
                        })
                        .then(t => {
                            try {
                                au[k] = { status: 1, ...window.LrcKit.Lrc.parse(t) };
                            } catch (e) {
                                MelodyPlayer.err('parse lrc', e);
                                au[k] = { status: 2, lyrics: [] }; // Failed
                            }
                        })
                        .catch(e => {
                            MelodyPlayer.err('fetch lyric', e);
                            au[k] = { status: 2, lyrics: [] }; // Failed
                        });
                } else {
                    au[k] = { status: 3, lyrics: [] }; // None
                }
            })
        );
    }

    /**
     * render to lrc element
     */
    renderLyric() {
        const au = this.audios[this.playIndex];
        if (au.lrc.status === 3 && au.subLrc.status === 3) { // None
            this.lyricStatus = 3;
            return;
        }
        if (au.lrc.status !== 1 && au.subLrc.status !== 1) { // Failed
            this.lyricStatus = 2;
            return;
        }
        this.lyricStatus = 1; // Loaded
        const cmp = (a, b) => a.timestamp - b.timestamp;
        /** @type {Array.<{timestamp:number;content:string}>} */
        const lrc = au.lrc.lyrics.sort(cmp);
        /** @type {Array.<{timestamp:number;content:string}>} */
        const subLrc = au.subLrc.lyrics.sort(cmp);
        /** @type {Array.<{timestamp:number;content:string}>} */
        const lyrics = [{ timestamp: 0, content: '' }], lyricElms = [];
        let i = 0, j = 0;
        while (i < lrc.length || j < subLrc.length) {
            const l = lrc[i], sl = subLrc[j];
            if (l && sl && l.timestamp === sl.timestamp) {
                lyrics.push({ timestamp: l.timestamp, content: `${l.content}\n${sl.content}` });
                i++ , j++;
            } else if (!l && sl || l && sl && l.timestamp > sl.timestamp) {
                lyrics.push({ timestamp: sl.timestamp, content: sl.content });
                j++;
            } else if (!sl && l || l && sl && sl.timestamp > l.timestamp) {
                lyrics.push({ timestamp: l.timestamp, content: l.content });
                i++;
            }
        }
        const frag = document.createDocumentFragment();
        for (const line of lyrics) {
            const elm = document.createElement('p');
            elm.classList.add('line');
            elm.timestamp = line.timestamp;
            elm.dataset['timestamp'] = line.timestamp;
            elm.appendChild(document.createTextNode(line.content));
            frag.appendChild(elm);
            lyricElms.push(elm);
        }
        this.lyrics = lyricElms;
        this.clearLyric();
        this.containerLyric.appendChild(frag);
        this.nextLyricIndex();
    }

    nextLyricIndex() {
        if (this._lyricStatus !== 1) { // Not Loaded
            return this.lyricIndex = 0;
        }
        const au = this.audios[this.playIndex];
        let loopStart = this._lyricIndex || 0;
        // decide where to start loop
        const activeLyric = this.lyrics[this._lyricIndex];
        if (activeLyric) {
            const activeTime = activeLyric.timestamp || +activeLyric.dataset['timestamp'];
            if (au.currentTime < activeTime) {
                // audio seek back, loop lyric from 0
                loopStart = 0;
        }
        }
        for (let i = loopStart; i < this.lyrics.length; i++) {
            const elm = this.lyrics[i];
            const time = elm.timestamp || +elm.dataset['timestamp'];
            if (time > au.currentTime) {
                return this.lyricIndex = !i ? 0 : i - 1;
            }
        }
        return this.lyricIndex = this.lyrics.length - 1;
    }

    handleAudioPlaying() {
        const time = this.audios[this.playIndex].currentTime;
        if (time - this._currentSecond > 1) {
            this.updateProgress();
            this._currentSecond = Math.floor(time);
        }
        if (this._lyricStatus === 1) { // Loaded
            this.nextLyricIndex();
        }
        if (this._playing) {
            setTimeout(() => this.handleAudioPlaying(), 166);
        }
    }

    _play() {
        const au = this.audios[this.playIndex];
        const evInit = { detail: { audio: au } };
        return au.play().then(() => {
            this.playing = true;
            this._currentSecond = Math.floor(au.currentTime);
            this.handleAudioPlaying();
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
        this.dispatchEvent(new CustomEvent('pause', evInit));
    }

    handlePlayOrPause() {
        if (this._playing) {
            this._pause();
        } else {
            this._play();
        }
    }

    /**
     * @param {number} offset next offset
     * @param {boolean} force force switch to next track
     */
    nextPlayIndex(offset = 1, force = false) {
        const mode = this.loopMode;
        const total = this.audios.length;
        let i = this._playIndex;
        if (force === true || mode === 0 || mode === 2) { // Once || List
            i = (total + i + offset);
        } else if (mode === 3) { // Shuffle
            i = Math.floor(Math.random() * total);
        }
        this.playIndex = i % total;
    }

    /**
     * @param {number} offset next offset
     */
    handleNext(offset = 1) {
        this._pause(0);
        this.nextPlayIndex(offset, this._loopMode === 1);
        this._play();
    }

    handleAudioEnd() {
        this._pause(0);
        this.nextLyricIndex();
        this.nextPlayIndex();
        if (this._loopMode === 0 && this._playIndex === 0) {
            this.playing = false;
            this.dispatchEvent(new CustomEvent('playend'));
        } else {
            this._play();
        }
    }

    handleLoopMode() {
        this.loopMode = (this.loopMode + 1) % 4;
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
        this.nextLyricIndex();
        this._currentSecond = Math.floor(au.currentTime);
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
        // DOM element reference
        this.containerDisplay = shadow.getElementById('container-disp');
        this.lyricMaskLoading = shadow.getElementById('lyric-mask-loading');
        this.lyricMaskFailed = shadow.getElementById('lyric-mask-failed');
        this.lyricMaskNone = shadow.getElementById('lyric-mask-none');
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
        // register DOM interactive events
        this.btnPlay.addEventListener('click', () => this.handlePlayOrPause());
        this.btnPrev.addEventListener('click', () => this.handleNext(-1));
        this.btnNext.addEventListener('click', () => this.handleNext(1));
        this.btnLoop.addEventListener('click', () => this.handleLoopMode());
        this.progressFull.addEventListener('click', ev => this.handleProgressPeek(ev));
    }

    constructor() {
        super();
        this._currentSecond = 0;
        /** @type {boolean} */
        this._playing = null;
        /** @type {HTMLAudioElement[]} */
        this.audios = [];
        /** @type {number} */
        this._playIndex = null;
        /** @type {boolean} */
        this._lyricStatus = null;
        /** @type {HTMLParagraphElement[]} */
        this.lyrics = null;
        /** @type {number} */
        this._lyricIndex = null;
        /** @type {number} */
        this._loopMode = null;
        /** @type {HTMLDivElement} */
        this.containerDisplay = null;
        /** @type {HTMLDivElement} */
        this.lyricMaskLoading = null;
        /** @type {HTMLDivElement} */
        this.lyricMaskFailed = null;
        /** @type {HTMLDivElement} */
        this.lyricMaskNone = null;
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
            Array.from(this.children)
                .filter(elm => elm instanceof HTMLAudioElement)
                .map(elm => this.registerAudio(elm));
            this.init();
            const evInit = { detail: { audios: this.audios } };
            this.dispatchEvent(new CustomEvent('ready', evInit));
        }, 0);
        this.render();
    }

    connectedCallback() {
        MelodyPlayer.log('connected.');
    }
}

window.customElements.define('melody-player', MelodyPlayer);
