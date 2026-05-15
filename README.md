# X Algo Lab

An interactive website that explains how posts move through the X recommendation pipeline: retrieval, filtering, scoring, ranking, diversity, and final feed selection.

The content is based on the open-source X algorithm snapshot from [`xai-org/x-algorithm`](https://github.com/xai-org/x-algorithm). This project is not the original algorithm repository; it is a visual explainer built to make the ranking flow easier to understand.

## What This Website Does

- Shows a high-level walkthrough of how candidate posts are found, filtered, scored, and ranked.
- Includes an animated pipeline that traces the major recommendation stages.
- Provides an interactive scoring sandbox where sliders change demo probabilities and update the final score.
- Visualizes retrieval with moving query points connected to nearby candidate points.
- Visualizes ranking attention with blocks that glow on and off over time.
- Summarizes practical levers such as author embedding, dwell, follow intent, negative feedback, repeat penalties, and quote mechanics.

## Run Locally

This is a static site. Open `index.html` in a browser, or serve the folder with any static server:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Files

- `index.html` - page structure and content
- `styles.css` - layout, visual design, and animations
- `script.js` - canvas animations, scoring sandbox, and retrieval visualization
