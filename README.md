# Global Air Quality & Weather Intelligence System

This project is a hackathon-ready environmental intelligence platform that combines:

- WAQI air quality data
- OpenWeather current weather data
- Automated threshold-based alerts
- A React dashboard for decision-makers

The focus is on ingestion, transformation, automation, storage, and analytical clarity.

## What It Does

The system:

- fetches AQI and weather data for a configured city list
- normalizes both sources into one structured snapshot model
- stores latest, historical, alert, and archive outputs as JSON
- calculates summary insights and weather-to-pollution correlations
- triggers alerts for warning, danger, hazardous, and sudden spike events
- renders a dashboard with AQI trends, city comparison, correlation views, and alert summaries

## Architecture

### Ingestion

- `scripts/environmentPipeline.js`
- Pulls data from WAQI and OpenWeather
- Supports live, demo, and scheduled modes

### Storage

- `public/data/environment-latest.json`
- `public/data/environment-history.json`
- `public/data/alerts.json`
- `public/data/analytics.json`
- `data/archive/*.jsonl`
- `logs/alerts.log`

### Dashboard

- `src/App.tsx`
- Reads generated JSON files from `public/data`
- Shows:
  - AQI trend over time
  - city-wise AQI comparison
  - weather correlation analysis
  - executive summary metrics
  - automated alert feed

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and set your keys.

Required:

```env
WAQI_API_KEY=your_waqi_key
OPENWEATHER_API_KEY=your_openweather_key
CITY_LIST=Mumbai,Delhi,London,Los Angeles
```

Optional alerting:

```env
ALERT_MODE=console
ALERT_RECIPIENT=team@example.com
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
SMS_RECIPIENT=+911234567890
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_number
PIPELINE_CRON=*/30 * * * *
```

Supported `ALERT_MODE` values:

- `console`
- `email`
- `sms`
- `all`

## Run Modes

### Demo dataset

Generates a realistic multi-city history without calling live APIs.

```bash
npm run pipeline:demo
```

### One live ingestion run

```bash
npm run pipeline:run
```

### Scheduled ingestion

Uses `PIPELINE_CRON` from `.env.local`.

```bash
npm run pipeline:schedule
```

### Start the dashboard

```bash
npm start
```

## Dashboard Views

The dashboard includes:

- AQI trends over time for the selected city
- city-wise AQI comparison bar chart
- weather factor vs AQI scatter analysis
- current environmental brief
- correlation coefficients across temperature, humidity, wind speed, and pressure
- pipeline workflow summary
- latest alert cards

## Alert Logic

The pipeline raises alerts when:

- AQI crosses the warning threshold
- AQI crosses the danger threshold
- AQI reaches hazardous levels
- AQI spikes sharply compared with the previous snapshot

Thresholds are configurable through:

```env
AQI_WARNING_THRESHOLD=100
AQI_DANGER_THRESHOLD=150
AQI_HAZARDOUS_THRESHOLD=200
AQI_SPIKE_DELTA=35
```

## Demo Flow For Judges

1. Run `npm run pipeline:demo`
2. Run `npm start`
3. Open the app in the browser
4. Explain the pipeline stages from the dashboard
5. Switch to live mode with `npm run pipeline:run` if API keys are configured

## Verification

Production build:

```bash
npm run build
```

## Vercel Deploy

This repo is now set up to deploy cleanly to Vercel using the static snapshot files in `public/data`.

### Recommended deployment flow

1. Run `npm run pipeline:demo` or `npm run pipeline:run`
2. Commit the refreshed files in `public/data`
3. Import the `clima-now` folder as the Vercel project root
4. Deploy with the included `vercel.json`

### What works on Vercel

- SPA routing falls back to `index.html`
- `public/data/*.json` is served directly for the dashboard
- the UI automatically labels static production mode as `Vercel Snapshot`
- shareable links can point to a page hash and selected city query

### What does not run on Vercel by default

- `npm run pipeline:schedule`
- `npm run api:start`

Those remain local/background runtime tools. On Vercel, the dashboard is intended to read the generated snapshot JSON files unless you later add a hosted API layer.

## Key Files

- `scripts/environmentPipeline.js`: ingestion, transformation, storage, alerts
- `src/App.tsx`: intelligence dashboard
- `src/App.css`: dashboard styling
- `vercel.json`: Vercel deployment configuration
- `.env.example`: environment template
