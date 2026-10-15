// Hardware limits for the survey drone, in one place so the parser, the
// validator and GET /api/drone-profile all agree. Figures are DJI's published
// DJI Neo specs; anything marked "planning" is our own convention, not DJI's.

const toNum = (v, fallback) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
};

const NEO = {
    id: "dji-neo",
    name: "DJI Neo",

    takeoffWeightG: 135,

    // Rated, wind-tunnel figure. Real flights get less.
    maxFlightTimeMin: 18,
    maxFlightTimeWithGuardsMin: 17,
    // Planning convention (not DJI): land with >= 20% of rated time unused.
    batteryReserveFraction: toNum(process.env.NEO_BATTERY_RESERVE, 0.2),

    // Level 4 wind resistance.
    maxWindSpeedMs: 8,
    // Normal / Sport / Manual mode, near sea level, no wind.
    maxHorizontalSpeedMs: { normal: 6, sport: 8, manual: 16 },
    // Above sea level (not AGL).
    maxTakeoffAltitudeM: 2000,
    // DJI's published operating range. Pre-flight records outside it are rejected.
    operatingTempC: { min: -10, max: 40 },
    // Within this many degrees of either end of the range we warn instead of staying quiet.
    tempWarnMarginC: 5,

    photo: { megapixels: 12, width: 4000, height: 3000, format: "JPEG" },

    // 22 GB on board and NO microSD slot: footage has to be offloaded to a phone/PC
    // before the next job, so an "SD card formatted" checklist item makes no sense.
    internalStorageGB: 22,
    hasSdSlot: false,

    // What the Neo does NOT have — the flight form/checklist should not assume these.
    hasRtk: false,
    hasLidar: false,
    hasWaypointMissions: false,

    // Regulatory ceiling, not hardware. Confirm against your local RPAS rules.
    maxAglWarnM: toNum(process.env.MAX_AGL_M, 120),
    // Hard stop, same as the existing form (anything above is a typo).
    maxAglHardM: 400,

    // No RTK => rely on ground control points.
    recommendedGcpMin: 7,
    recommendedGcpMax: 8,
    // Planning conventions (not DJI): one Neo battery (~18 min) covers a small scene.
    // GCPs spread wider than this, or far from the case's recorded position, usually
    // mean a typo or swapped latitude/longitude rather than a real survey.
    gcpMaxSpreadM: toNum(process.env.GCP_MAX_SPREAD_M, 1000),
    gcpMaxFromCaseM: toNum(process.env.GCP_MAX_FROM_CASE_M, 2000),

    overlap: { frontMinPct: 75, sideMinPct: 65 },
};

module.exports = { NEO };
