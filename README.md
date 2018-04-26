# MelodyPlayer

WebComponent based music player.

## Demo

[MelodyPlayer Demo](http://rocka.github.io/melody-player)

## Borwser Compatibility

Browsers that support [`Custom Elements v1`](cd1) and [`ShadowDOM v1`](sd1) are supported.

Tested on Chrome 66, Firefox 59 with flags enabled.

Custom Elements polyfill: [webcomponents/custom-elements](wce)

## Usage

```html
<html>
<head>
    <script src="./dist/player.min.js"></script>
</head>
<body>
    <!-- single audio -->
    <melody-player>
        <audio src="track1.mp3"></audio>
    </melody-player>

    <!-- multi audios -->
    <melody-player>
        <audio src="track1.mp3"></audio>
        <audio src="track2.mp3"></audio>
    </melody-player>

    <!-- optional lrc -->
    <melody-player>
        <audio src="track1.mp3" data-lrc="track1.lrc"></audio>
        <!-- display 2 lrc at the same time -->
        <audio src="track2.mp3" data-lrc="track2.lrc" data-sub-lrc="track2.zh.lrc"></audio>
    </melody-player>
</body>
</html>
```

[ce1]: https://caniuse.com/#feat=custom-elementsv1
[sd1]: https://caniuse.com/#feat=shadowdomv1
[wce]: https://github.com/webcomponents/custom-elements
