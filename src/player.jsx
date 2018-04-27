'use strict';

import { Lrc } from 'lrc-kit';

import h from './h.js'; // eslint-disable-line no-unused-vars
import PLAYER_STYLE from './player.less';
import PLAYER_FONT_FACE from  './font-face.less';

class MelodyPlayer extends HTMLElement {
    static get TagName() { return 'melody-player'; }

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
        };
    }

    static get LogTag() {
        return '[MelodyPlayer]';
    }

    static log(...args) {
        console.log(MelodyPlayer.LogTag, ...args); // eslint-disable-line no-console
    }

    static err(...args) {
        console.error(MelodyPlayer.LogTag, ...args); // eslint-disable-line no-console
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

    get singleMode() { return this._singleMode; }
    set singleMode(value) {
        if (value !== this._singleMode) {
            if (value === true) {
                this.hostElem.setAttribute('single', '');
            } else {
                this.hostElem.removeAttribute('single');
            }
            this._singleMode = value;
        }
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
                let offset = 150 / 2
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

    get displayVisible() { return this._displayVisible; }
    set displayVisible(value) {
        if (value !== this._displayVisible) {
            if (value === true) {
                this.btnLyric.classList.add('flip');
                this.containerDisplay.classList.add('active');
            } else {
                this.btnLyric.classList.remove('flip');
                this.containerDisplay.classList.remove('active');
            }
            this._displayVisible = value;
        }
    }

    /**
     * add audio to `this.audios` and add event listeners
     * @param {HTMLAudioElement} audio
     */
    registerAudio(audio) {
        this.audios.push(audio);
        const evInit = { detail: { audio } };
        audio.addEventListener('play', () => {
            this.playing = true;
            this.handleAudioPlaying();
            this.dispatchEvent(new CustomEvent('play', evInit));
        });
        audio.addEventListener('pause', () => {
            this.playing = false;
            this.dispatchEvent(new CustomEvent('pause', evInit));
        });
        audio.addEventListener('ended', () => {
            this.handleAudioEnd();
            this.dispatchEvent(new CustomEvent('audioend', evInit));
        });
    }

    init() {
        this.playing = false;
        this.loopMode = MelodyPlayer.LoopMode.Once;
        this.displayVisible = false;
        const { length } = this.audios;
        if (length > 0) {
            this.playIndex = 0;
            this.singleMode = length === 1;
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
        function tiggerSeek(elm, t = 0.2) {
            elm.classList.add('peek');
            setTimeout(() => elm.classList.remove('peek'), t * 1000);
        }
        tiggerSeek(this.progressPlay);
        tiggerSeek(this.progressLoad);
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
                                au[k] = Object.assign({ status: 1 }, Lrc.parse(t));
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
            const elm = <p class='line' data-timestamp={line.timestamp}>{line.content}</p>;
            // const elm = document.createElement('p');
            // elm.classList.add('line');
            elm.timestamp = line.timestamp;
            // elm.dataset['timestamp'] = line.timestamp;
            // elm.appendChild(document.createTextNode(line.content));
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
        // audio loop when `this._singleMode` true
        if (time < this._currentSecond) {
            this.syncProgress();
            this._currentSecond = Math.floor(time);
        }
        if (time - this._currentSecond > 1) {
            this.updateProgress();
            this._currentSecond = Math.floor(time);
        }
        if (this._lyricStatus === 1 && this._displayVisible) { // Loaded
            this.nextLyricIndex();
        }
        if (this._playing) {
            setTimeout(() => this.handleAudioPlaying(), 166);
        }
    }

    _play() {
        const au = this.audios[this.playIndex];
        return au.play();
    }

    /**
     * @param {number} position time to seek after pause
     */
    _pause(position = true) {
        const au = this.audios[this.playIndex];
        au.pause();
        if (position === 0) {
            au.currentTime = 0;
        }
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
        if (this._singleMode) {
            if (this._loopMode === 1) {
                this.loopMode = 0;
            } else {
                this.loopMode = 1;
            }
            this.audios[0].loop = this._loopMode === 1;
        } else {
            this.loopMode = (this.loopMode + 1) % 4;
        }
    }

    /**
     * handle click on progress bar
     * @param {MouseEvent} ev MouseEvent from click listener
     */
    handleProgressSeek(ev) {
        const rect = this.progressFull.getBoundingClientRect();
        const seekTime = (ev.clientX - rect.x) / rect.width * this.au.duration;
        this.au.currentTime = seekTime;
        this.syncProgress();
        if (this._displayVisible) {
            this.nextLyricIndex();
        }
        this._currentSecond = Math.floor(seekTime);
    }

    handleToggleDisplay() {
        this.displayVisible = !this._displayVisible;
    }

    render() {
        const shadow = this.attachShadow({ mode: 'open' });
        const style = <style>{PLAYER_STYLE.toString()}</style>;
        this.hostElem = (
            <main>
                <div ref={r => this.containerDisplay = r} class="display">
                    <div ref={r => this.lyricMaskLoading = r} class="lyric mask"><p class="line">{'歌词加载中\nLoading Lyric\n歌詞を読み込む'}</p></div>
                    <div ref={r => this.lyricMaskFailed = r} class="lyric mask"><p class="line">{'歌词加载失败\nFailed to Load Lyric\n歌詞を読み込めません'}</p></div>
                    <div ref={r => this.lyricMaskNone = r} class="lyric mask"><p class="line">{'暂无歌词\nNo Lyric\n歌詞なし'}</p></div>
                    <div ref={r => this.containerLyric = r} class="lyric"></div>
                </div>
                <div class="control">
                    <div class="control-left">
                        <button ref={r => this.btnPrev = r} onClick={() => this.handleNext(-1)}>skip_previous</button>
                        <button ref={r => this.btnPlay = r} onClick={ev => this.handlePlayOrPause(ev)} data-play="play_arrow" data-pause="pause">stop</button>
                        <button ref={r => this.btnNext = r} onClick={() => this.handleNext()}>skip_next</button>
                    </div>
                    <div ref={r => this.progressFull = r} onClick={ev => this.handleProgressSeek(ev)} class="porgress">
                        <div ref={r => this.progressLoad = r} class="load"></div>
                        <div ref={r => this.progressPlay = r} class="play"></div>
                    </div>
                    <div class="timer"><span ref={r => this.timerPlay = r}>0:00</span> / <span ref={r => this.timerTotal = r}>0:00</span></div>
                    <div class="control-right">
                        <button ref={r => this.btnLoop = r} onClick={() => this.handleLoopMode()} data-once="subdirectory_arrow_right" data-single="repeat_one" data-list="repeat" data-shuffle="shuffle">cancel</button>
                        <button ref={r => this.btnLyric = r} onClick={() => this.handleToggleDisplay()}>keyboard_capslock</button>
                    </div>
                </div>
            </main>
        );
        shadow.appendChild(style);
        shadow.appendChild(this.hostElem);
    }

    constructor() {
        super();
        /** @type {boolean} */
        this._singleMode = null;
        this._currentSecond = 0;
        /** @type {boolean} */
        this._playing = null;
        /** @type {HTMLAudioElement[]} */
        this.audios = [];
        /** @type {number} */
        this._playIndex = null;
        /** @type {number} */
        this._lyricStatus = null;
        /** @type {HTMLParagraphElement[]} */
        this.lyrics = null;
        /** @type {number} */
        this._lyricIndex = null;
        /** @type {number} */
        this._loopMode = null;
        /** @type {boolean} */
        this._displayVisible = null;
        /** @type {HTMLElement} */
        this.hostElem = null;
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

if (!window.customElements.get(MelodyPlayer.TagName)) {
    window.customElements.define(MelodyPlayer.TagName, MelodyPlayer);
    document.head.appendChild(<style>{PLAYER_FONT_FACE.toString()}</style>);
}
