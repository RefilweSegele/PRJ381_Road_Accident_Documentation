# Member 5 — GCP & Flight Log API

All routes sit under `/api/cases/:id` (the case must exist → 404 `CASE_NOT_FOUND`).
Errors: `{ "error": "...", "code": "...", "details": { ... } }`.

## Ground Control Points
| Method | Path | Notes |
|---|---|---|
| POST | `/api/cases/:id/gcps/import?mode=replace\|append&dryRun=true` | multipart, field **`file`** (.csv/.txt, max 1 MB). `dryRun=true` parses and returns the points without saving. |
| POST | `/api/cases/:id/gcps` | JSON `{ "points": [{ "id","lat","long","elevation" }], "mode": "replace" }` — for the frontend, which already parses with papaparse. |
| GET | `/api/cases/:id/gcps` | `{ points, count, recommendedMin, meetsRecommendation }` |
| DELETE | `/api/cases/:id/gcps` | clears the case's GCPs |

- `replace` (default) swaps the whole set in one transaction; `append` upserts by marker ID.
- A file with any bad row is rejected whole: **422 `GCP_INVALID`** with `details.errors[] = { row, message }`.
- Warnings (saved anyway) come back in `warnings[]`: fewer than 7 GCPs, missing elevation, duplicate coordinates, elevation above the Neo's 2000 m limit, and set-level checks: `GCP_SPREAD_LARGE` (points > 1 km apart), `GCP_FAR_FROM_CASE` (centroid > 2 km from the case's recorded position) and `GCP_LAT_LON_SWAPPED` (would match the case if latitude/longitude were swapped). The last two are skipped when the case has no coordinates. Thresholds: `GCP_MAX_SPREAD_M`, `GCP_MAX_FROM_CASE_M`.
- Accepted: comma / semicolon / tab / whitespace delimiters, header aliases (`lat|latitude|y`, `lon|long|lng|x`, `elevation|elev|alt|z`, `id|marker|name|label`...), headerless `id,lat,lon[,elev]`, `#` comments, UTF-8 BOM, decimal commas in `;`/tab files.
- Encodings: UTF-8, UTF-8/UTF-16 with BOM (Excel "Unicode Text"), and a Windows-1252 fallback (Excel's plain "CSV") reported as warning `ENCODING_FALLBACK`. `meta.encoding` says which was used.
- Not accepted: easting/northing, degrees-minutes-seconds, N/S/E/W letters (WGS84 signed decimal degrees only). The error message says so.
- Other errors: **415 `UNSUPPORTED_FILE_TYPE`** (not .csv/.txt), 413 (> 1 MB), 400 `NO_FILE`, 400 `INVALID_MODE`, 400 `INVALID_JSON` (malformed JSON body).

## Flight logs (manual flight notes)
| Method | Path |
|---|---|
| POST | `/api/cases/:id/flight-logs` → 201 `{ flightLog, warnings }` |
| GET | `/api/cases/:id/flight-logs` |
| GET | `/api/cases/:id/flight-logs/:logId` |
| PUT | `/api/cases/:id/flight-logs/:logId` (full replacement, same body as POST) |
| DELETE | `/api/cases/:id/flight-logs/:logId` |
| GET | `/api/drone-profile` → the Neo limits the server enforces |

Body = the Flight Log form's payload (`missionId, date, time, pilotName, location, gpsLat, gpsLon, altitudeAGL, flightSpeed, overlapFront, overlapSide, batteryCount, estimatedDuration, weatherCondition, windSpeed, visibility, temperature, missionType, notes, checklist:[{id,checked}]`) plus optional `propGuards: true`.
`422 FLIGHT_LOG_INVALID` → `details.errors[] = { field, code, message }` (field names match the form inputs). `409 DUPLICATE_MISSION_ID` if the case already has that mission ID.

### DJI Neo limits enforced
| Rule | Error (blocks save) | Warning (saved) |
|---|---|---|
| Duration per battery (`estimatedDuration ÷ batteryCount`) | > 18 min (17 with prop guards) | > 80% of that (14.4 / 13.6 min) |
| Wind | > 8 m/s = 28.8 km/h | ≥ 6.4 m/s = 23 km/h |
| Speed | > 16 m/s | > 6 m/s (Sport), > 8 m/s (Manual) |
| Altitude AGL | > 400 m | > 120 m (`MAX_AGL_M`) |
| Temperature | outside −10…40 °C (Neo operating range) | within 5 °C of either end |
| Overlap | outside 0–100 | front < 75%, side < 65% |
| Weather | — | rain, fog / low visibility, wind advisory |
| GCP elevation | outside −500…9000 m | > 2000 m (Neo max takeoff altitude) |
| Checklist | any critical item unchecked | non-critical items open |

The Neo has no RTK, LiDAR or waypoint missions, so GCP count (7–8) is recommended, and checklist item `ms1` (flight plan loaded in GCS) is not required by the server (the form now lists it as non-critical). It also has 22 GB of internal storage and no SD slot, so the form's old "SD card formatted" item is now "internal storage has free space". Numeric fields must be real numbers or plain numeric strings (`true`, `0x10`, `Infinity` are rejected).

## curl
```bash
curl -F "file=@samples/gcps_sample.csv" "http://localhost:5000/api/cases/1/gcps/import?dryRun=true"
curl -F "file=@samples/gcps_sample.csv" "http://localhost:5000/api/cases/1/gcps/import"
curl http://localhost:5000/api/cases/1/gcps
curl http://localhost:5000/api/drone-profile
```

## Run the tests (no install, no database needed: multer/pg are stubbed)
```bash
cd backend
node --test        # or: npm test
```

## Database
Run `npm run migrate`. Migrations in order: `004_create_detection.sql` (DAIAS DB team), `005_create_gcp_points_and_flight_logs.sql` (this module; renumbered from 004 to avoid a clash). Both are idempotent.
