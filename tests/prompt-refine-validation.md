# Prompt / Refine — local validation

2026-09-07 · Local prototype · No participant study has been conducted.

The prompt looks 26px tall, but its active button extends 9px above and below the pill. This review separates that measured target from the unanswered question of whether people recognize it as an action.

## Presentation change

- Returned the study to a regular gallery card, after the existing full-width Feed / Adapt study.
- The study now uses the gallery's shared stage height, with the conversation surface filling the remaining room beneath its controls. Its corner radius remains 24px. Removed the simulated status bar, navigation, home indicator, and secondary feedback tools.
- Kept the fictional text prefilled, with “Fix the grammar:” at the same 17px as the rest of the text. Sending dismisses the composer and reveals the conversation in the same frame.
- Preserved the one-line suggestion rail, direct sending, and cumulative refinement sequence. The main website shell and the other studies retain their existing styles.

## Measurements

Read from the rendered local page with `getBoundingClientRect()` and computed CSS styles. Units are CSS pixels, not hardware pixels, iOS points, or Android dp. Font rendering can change exact widths on another platform.

| First-reply prompt | Visible width × height | Active width × height |
| --- | --- | --- |
| More natural | 91.41 × 26 | 91.41 × 44 |
| More concise | 95.83 × 26 | 95.83 × 44 |
| Focus on service | 115.60 × 26 | 115.60 × 44 |
| Explain changes | 111.62 × 26 | 111.62 × 44 |

Text is 12px, horizontal padding is 10px per side, and the space between active targets is 6px. The study is not scaled down with a CSS transform.

| Browser viewport width | Conversation width | Rail width / content width | Page horizontal overflow |
| --- | --- | --- | --- |
| 1440 | 390 | 360 / 434 | None observed |
| 834 | 349.30 | 319 / 434 | None observed |
| 390 | 324 | 294 / 434 | None observed |
| 320 | 262 | 232 / 434 | None observed |

All four widths retained a single horizontal row and a 44px active target height. For fully visible buttons, DOM hit checks at the horizontal midpoint and 1px inside the top and bottom edges returned the intended button, as did the center. Those checks include the transparent area outside the 26px pill. On the 390px viewport, keyboard navigation scrolled the rail from 0 to 140px; the initially hidden last prompt then passed the same checks. A partially clipped prompt is not counted as a fully available target until scrolled into view. These are geometric checks, not observed human tapping performance or a physical-device test.

After the height-alignment revision, the stage matched Photo / Select and Actions / Reveal at every checked width: 388.80px at a 1440px viewport, 300px at 834px, and 390px at 390px. The desktop description rows also began at the same vertical position. At the shortest checked stage, sending and refining still completed, the latest prompt rail stayed inside the conversation surface, and a bottom-edge hit check still reached its 44px button. Longer conversations scroll inside the surface rather than increasing the gallery card's height.

## Standards comparison

WCAG 2.2 SC 2.5.8 defines a minimum target of 24 × 24 CSS px, with exceptions. The enhanced SC 2.5.5 criterion specifies 44 × 44 CSS px. The measured, fully revealed prompt buttons meet both size thresholds; this is not a claim that the whole website conforms to WCAG AA or AAA. [Minimum target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [enhanced target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html).

At rest, label color `#686f79` on pill color `#f3f4f6` has a calculated contrast ratio of **4.611:1**, above the **4.5:1** threshold for normal text. This checks the solid resting colors, not the temporary entrance fade or the overflow-edge fade. [WCAG text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

The pill fill against white is only **1.101:1**. This supports the observation that its boundary is subtle. It does not establish how many people will mistake the button for a tag, and by itself is not a complete non-text-contrast audit.

## Interaction checks

- The initial text exists before any click. Sending creates the corrected café sentence.
- “More natural” sends immediately, leaves the composer empty, and produces “feel right at home.” The next rail omits “More natural.”
- Following with “More concise” produces “Busy café, but I felt right at home.” Both completed requests are omitted from the next rail.
- Arrow keys focus neighboring prompts and scroll the rail. The visible focus ring is placed on the pill so its top and bottom are not clipped by the 44px rail.
- The replay control restores the initial sample. Animation cancellation and reduced-motion paths were retained and reviewed in code; no OS-level reduced-motion or physical touchscreen session was run in this review.
- The three intent tests pass. The production build passes.

## Decision and remaining evidence

Keep the 26px visual height and 44px active height for this local revision. The current measurements do not establish a need to widen or enlarge the pills. They also do not establish that the affordance is sufficiently clear.

For the next participant study, compare the present 26px pill with a 32px pill while keeping the label, color, order, horizontal padding, and 44px active target identical. Randomize which version is seen first, and use equivalent new writing samples for later exposures. Ask participants to make the reply sound more natural without mentioning the prompt buttons. Record whether they discover the action without help, time from the rail becoming interactive to the first correct action, missed taps, and unnecessary additional revisions. Follow up by asking what they thought the pills would do before using them. Treat a small initial round as directional evidence, not a statistically established winning size.
