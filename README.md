# Ad Awards Deadline Tracker

A zero-dependency static web app that tracks submission deadlines, entry fees, and resources for the world's biggest advertising award shows.

## Awards Covered

| Award | Website |
|-------|---------|
| Cannes Lions | canneslions.com |
| D&AD Awards | dandad.org |
| The One Show | oneshow.org |
| Clio Awards | clios.com |
| London International Awards (LIA) | liaawards.com |
| Effie Awards | effie.org |
| ADC Awards | adcawards.org |
| Webby Awards | webbyawards.com |
| ANDY Awards | andyawards.com |
| Spikes Asia | spikes.asia |

## Features

- Deadline tracking with countdown badges (color-coded by urgency)
- Entry fee breakdowns per deadline tier
- Links to official rulebooks, category definitions, entry guides, and FAQs
- Downloadable `.ics` calendar files (all deadlines or per-award)
- Built-in 7-day and 1-day reminders in calendar events
- Search, sort, and filter controls
- Responsive dark-themed UI

## Usage

Open `index.html` in any browser. No server or build step required.

## Updating for Next Year

Edit `data.js` and update dates, fees, and URLs for each award show. The UI reads from `window.AWARDS_DATA` at load time — no other files need to change.

## Files

- `index.html` — Full application (HTML + embedded CSS + JS)
- `data.js` — Award show data (deadlines, fees, resources)
- `README.md` — This file
