# TypeTap v5

- Static, non-scrolling typing page.
- Words move toward the player by translating the active line into view.
- Invisible keyboard input: click anywhere on the typing area and just type.
- **Tab instantly resets** the test.
- Time tests: 15 / 30 / 60 seconds plus custom time.
- Word tests plus custom word count.
- Monkeytype-style net WPM: correct characters / 5 / minutes. Wrong characters reduce net WPM.
- Raw WPM: all typed characters / 5 / minutes.
- Accuracy and WPM/raw history are graphed at the end.
- Results popup shows WPM, raw WPM, accuracy and score.
- Offline-capable service worker caches the HTML/CSS/JS/word list after the first successful load.

For offline mode, open the site once from a local/static HTTP server. A service worker normally does not run from `file://`.

Example: `python -m http.server 8000`
