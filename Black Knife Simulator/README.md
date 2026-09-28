# DEVICE_KNIGHT (fork)

A fork of [DEVICE_KNIGHT](https://shadowcrystal.dev/DEVICE_KNIGHT/) that fixes the page zooming in on iOS Safari during play.

- **Upstream:** https://shadowcrystal.dev/DEVICE_KNIGHT/ (v1.0.70)
- **This fork:** v1.0.71 · <!-- TODO: fork URL -->
- **Maintainer:** <!-- TODO: your name / handle -->

---

## What changed

### Fix: iOS page zoom during play

**The bug.** On iPhone and iPad, the whole page zooms in during play, which pushes the game and the on-screen controls out of view. There are two ways to trigger it:

| Action | What Safari does |
| --- | --- |
| Tapping **Z** or **X** quickly | Treats it as a double-tap and zooms in |
| Holding the **d-pad** while tapping a button | Treats the two fingers as a pinch and zooms |

**Why it happened.** The upstream page relies on two standard ways to disable zoom, and iOS Safari doesn't fully honour either one:

- `<meta name="viewport" content="… user-scalable=no">` has been ignored by iOS Safari since iOS 10, as an accessibility choice.
- `touch-action: none` in CSS is only partly respected by WebKit. It doesn't reliably stop double-tap zoom when taps are quick, or pinch zoom when two fingers land on different elements.

**The fix.** A small inline script in `index.html` blocks the gestures directly:

| Event | Blocked because |
| --- | --- |
| `gesturestart` / `gesturechange` / `gestureend` | These are Safari's own pinch-zoom events |
| `touchmove` | Stops pinching and page drag / rubber-banding |
| `touchend` | Cancelling the end of a tap stops Safari's double-tap zoom |
| `dblclick` | Backup for double-tap zoom |

Links and form fields (`a`, `button`, `input`, `select`, `textarea`) are left alone, so they still respond to taps.

The game's touch controls (`input/touch.js`) use **pointer events**, which Safari still fires when touch events are cancelled. The d-pad and the Z / X / R buttons are unaffected.

The fix lives in `index.html` rather than in the game code on purpose. The service worker always fetches the page fresh, but serves the game code from its cache. A fix placed in `index.html` reaches players immediately, and it also covers the "not connected" error screen.

### Version bump: 1.0.70 → 1.0.71

| File | Change |
| --- | --- |
| `web/sw.js` | `CACHE` set to `blackknife-1.0.71`, so players who added the game to their home screen drop the old cache |
| `web/version.js` | `VERSION` set to `1.0.71` |

### Files touched

```
index.html      +17   iOS zoom-block script
web/sw.js       ±1    service-worker cache version
web/version.js  ±1    game version
```

Run `git diff <baseline-commit>` to see the exact changes. The first commit in this repo is an unmodified copy of upstream v1.0.70.

---

## Running locally

The game is plain ES modules with no build step. Serve the folder with any static file server over `http://`. Opening the file directly with `file://` won't work, because the modules and the service worker won't load.

```bash
npx serve .
```

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/`.

To test on an iPhone, serve the folder on your local network and open the page in Safari. Then try:

- [ ] Mash **Z** quickly: the page doesn't zoom
- [ ] Hold the **d-pad** and tap **Z** / **X**: the page doesn't zoom
- [ ] Pinch the screen: the page doesn't zoom
- [ ] The d-pad and all buttons still respond, and holding **R** still exits
- [ ] Rotate to landscape and back: the layout is correct and there's no zoom

---

## Known limitations / TODO

- [ ] Not yet tested on a physical iOS device <!-- update once verified: device / iOS version -->
- [ ] `#game` is sized with `100vh`. On iOS this includes the area behind the browser toolbar, so the canvas may be cropped in Safari (not in home-screen mode). Switching to `100dvh` may help.
- [ ] Anything else you change goes here

---

## Credits

- **DEVICE_KNIGHT:** <!-- TODO: upstream author -->, https://shadowcrystal.dev/DEVICE_KNIGHT/
- **Sprites, audio and fonts** in `assets/` come from *DELTARUNE* © Toby Fox. This is a non-commercial fan project and isn't affiliated with Toby Fox.
- **iOS zoom fix:** <!-- TODO: your name -->
