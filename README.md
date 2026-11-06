# AirScope Intelligence

AirScope Intelligence is a city-level air quality and weather monitoring dashboard. It combines AQI readings with current weather, highlights locations that may need attention, and produces summaries for operators and executive reviews.

## What the project does

- Tracks AQI and weather conditions across a configurable list of cities. The default list is a built-in global city network.
- Shows headline indicators such as average AQI, critical and warning city counts, and triggered alerts.
- Ranks high-risk cities and compares average AQI across countries.
- Keeps historical snapshots for trend and weather-correlation analysis.
- Flags warning, danger, hazardous, and sudden-spike conditions using configurable thresholds.
- Provides dashboard views for maps, city search, alerts, trends, regional comparisons, and intervention planning.
- Generates JSON snapshots, an executive HTML brief, and a PDF report.

## How it works

The ingestion pipeline requests air-quality data from the World Air Quality Index (WAQI) service and weather data from OpenWeather. It normalizes the results into city snapshots, calculates summaries and alerts, and writes outputs to the project’s data folders. The React dashboard reads these outputs from `public/data` and presents them as interactive views.

The pipeline supports three modes:

- **Demo:** generates a local sample dataset without calling external weather or AQI APIs.
- **Live:** fetches fresh data and requires API keys.
- **Scheduled:** runs the live pipeline immediately, then repeats on the configured cron schedule.

## Run locally

Requirements: Node.js and npm.

```bash
npm install
npm run pipeline:demo
npm start
```

Open the local URL printed by the development server. The demo pipeline creates the data files needed by the dashboard without API credentials.

## Live data configuration

Copy `.env.example` to `.env.local` and add your service keys:

```env
WAQI_API_KEY=your_waqi_api_key
OPENWEATHER_API_KEY=your_openweather_api_key
```

Then run one live ingestion:

```bash
npm run pipeline:run
```

To monitor a custom set of cities, add a comma-separated list:

```env
CITY_LIST=Mumbai,Delhi,London,Los Angeles
```

If `CITY_LIST` is omitted, the pipeline uses its built-in city network. Keep `.env.local` private; it is excluded from Git.

### Alerts and thresholds

The pipeline writes alerts to its output files and logs. Console alerts are the default. Email and SMS delivery can be configured with SMTP/Gmail and Twilio credentials in `.env.local`.

```env
ALERT_MODE=console
AQI_WARNING_THRESHOLD=100
AQI_DANGER_THRESHOLD=150
AQI_HAZARDOUS_THRESHOLD=200
AQI_SPIKE_DELTA=35
PIPELINE_CRON=*/30 * * * *
```

`ALERT_MODE` accepts `console`, `email`, `sms`, or `all`. Scheduled mode uses `PIPELINE_CRON`:

```bash
npm run pipeline:schedule
```

## Optional local API

The app can use the local dashboard API server for the generated snapshots. Start it in a separate terminal from the React app:

```bash
npm run api:start
```

Available endpoints:

- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/latest`
- `GET /api/history`
- `GET /api/alerts`

The API reads the same JSON files generated in `public/data`; generate demo or live data first.

## Generated files

- `public/data/environment-latest.json` — latest city snapshot and summary.
- `public/data/environment-history.json` — historical city readings.
- `public/data/alerts.json` — generated alert records.
- `public/data/analytics.json` — aggregate analysis and insights.
- `public/reports/judge-brief.html` and `public/reports/judge-brief.pdf` — executive report outputs.
- `data/archive/` — archived pipeline records.
- `logs/alerts.log` — alert log.

## Useful commands

```bash
npm start                 # Start the React development server
npm run build              # Create a production build
npm test                   # Run the test suite
npm run pipeline:demo      # Generate demo data
npm run pipeline:run       # Fetch live data
npm run pipeline:schedule  # Run the live pipeline on a schedule
npm run api:start          # Start the local JSON API
```

## Deployment

The included `vercel.json` configures a static frontend deployment. The built dashboard serves its JSON snapshots from `public/data`. Live ingestion, the cron scheduler, and the local Node API are separate runtime processes and are not started by a static Vercel deployment. Refresh and commit the snapshot files when you want a deployment to show newer data, or add a hosted ingestion/API service for continuously updated data.

## Main project areas

- `src/App.tsx` — dashboard application and views.
- `src/App.css` — dashboard styling.
- `scripts/environmentPipeline.js` — ingestion, normalization, analytics, alerting, and report generation.
- `scripts/dashboardApiServer.js` — local read-only API for generated JSON snapshots.
- `public/data/` — dashboard snapshot data.
- `public/reports/` — generated executive reports.
