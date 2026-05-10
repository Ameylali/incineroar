# Import battle data from gameplay

This feature parses a video gameplay recording into a structured battle log using image processing and optical character recognition (OCR).

## Tech stack
- Tesseract.js for OCR

## Feature flow
1. User uploads a video
2. App parses the video to extract plain-text battle logs
3. App parses the plain-text battle logs into structured logs and stores them in the database

No video is stored on the server. All processing runs locally in the browser.

## Parsing algorithm
This is a high-level overview of the video gameplay parsing algorithm. The algorithm is configurable via a config object `CONFIG`.

1. **Sample video frames:** Since we only care about on-screen text, most consecutive frames will contain the same content and can be skipped. A config option `CONFIG.SAMPLE_RATE_PER_SECOND` controls how many frames are sampled per second of video. The starting value will be 1 frame per second. A `CONFIG.MAX_FRAMES` cap should be enforced to prevent excessive processing on long videos.

    Frame extraction uses a `<video>` + `<canvas>` approach: seek the video to each sample timestamp, draw the frame onto a canvas, and read the pixel data. Frames are processed in batches of `CONFIG.BATCH_SIZE` (default: 50) to avoid exhausting browser memory on long videos.

2. **Preprocess frames for better OCR:** Gameplay frames contain many visual effects that can reduce OCR accuracy. We'll apply preprocessing steps to reduce image noise. To start, we can:
    - Transform to grayscale, since text is always white.
    - Increase contrast to make text stand out more from the background.
    - Apply blur, since text is always displayed over a semi-transparent box — blur aims to smooth the box into a more even surface.

    All preprocessing steps should be configurable via `CONFIG.PREPROCESS.[STEP]`.

3. **Extract text from each frame:** Since text boxes appear in fixed positions on screen, we'll preconfigure a set of masks that specify the areas where a text box may appear. For each mask, we will:
    - Crop the frame to the area specified by the mask.
    - Run OCR on the cropped region.

    Then, for each OCR result, we need to select only results with high confidence. A selection algorithm will run over the results:
    - For each line, select only lines with a confidence greater than or equal to `CONFIG.SELECTION.MIN_LINE_CONFIDENCE` (default: 0.9).
    - For each selected line, extract the longest confident consecutive subsequence — i.e., the longest run of consecutive words where every word has a confidence greater than or equal to `CONFIG.SELECTION.MIN_WORD_CONFIDENCE`.
    - If all lines in a frame fall below the confidence threshold, the frame is skipped silently (no paragraph emitted).

4. **Deduplicate consecutive frames:** Consecutive frames often produce identical extracted text (e.g., the same text box displayed for several seconds). Before exporting, collapse consecutive paragraphs with identical text content into a single entry, keeping the timestamp of the first occurrence.

5. **Export results:** The output is a list of extracted paragraphs in chronological order. Each paragraph contains the extracted text from each mask in a given frame.

### Structured parsing (TBD)

Once the plain-text battle log is extracted, it must be mapped to the structured `Battle` data model (turns, actions, players, results). Two approaches are under consideration:

- **Lightweight LLM:** Use a small language model to interpret the extracted text lines and produce structured action objects. This approach is more flexible and tolerant of OCR imperfections, but adds a dependency on a model and increases processing time.
- **Deterministic parsing:** Use pattern matching (regex or a simple grammar) to map known text patterns (e.g., "Incineroar used Flare Blitz!") to `Action` objects. This is faster and more predictable, but requires enumerating all possible text patterns and is brittle to OCR errors.

The chosen approach should output data conforming to the existing `CreateBattleData` schema so it can be persisted via `createBattleForTraining()`.

### Resolution handling

The primary target device is the **Nintendo Switch** (720p handheld / 1080p docked). Support for smartphone recordings may be added in the future.

Masks should be defined as **percentages of frame dimensions** (e.g., x: 5%, y: 80%, width: 90%, height: 15%) rather than absolute pixel values. This ensures masks scale correctly across resolutions and allows extending support to new devices without redefining masks. A `CONFIG.DEVICE_PROFILE` option can select the appropriate mask set (e.g., `"switch"`, and later `"mobile"`).

### Performance

Processing a 20-minute video at 1 fps produces ~1,200 frames, each requiring N mask crops and an OCR pass. To keep this manageable:

- Tesseract.js should run in a **Web Worker** to avoid blocking the main thread.
- The UI should display a **progress indicator** (frames processed / total frames).
- Multiple Tesseract workers can be spawned in parallel, controlled by `CONFIG.WORKER_COUNT` (default: number of logical CPU cores, capped at 4).

### Error handling

- Unsupported or corrupted video files should be caught during the `<video>` load event and surfaced to the user with a clear error message.
- Frames captured during transitions, loading screens, or menus will naturally produce low-confidence OCR results and be filtered out by the selection algorithm.
- If the entire video yields zero paragraphs above the confidence threshold, the user should be notified that no battle data could be extracted, with a suggestion to adjust `CONFIG` values.

### Test lab
To test and improve performance of the algorithm, we need a dev page where we can run the algorithm, override the configuration, and analyze the results.

- Dev page at `/dev/gameplay-parsing`
- The page should have a picker to select the video
- The page should have inputs to override each value in `CONFIG`
- The page should have a button to start the algorithm run
- The page should display a progress bar during processing
- The page should display the results
- Each paragraph in the results should include debug metadata: video timestamp of the frame, mask used to extract the paragraph, and confidence scores for the paragraph