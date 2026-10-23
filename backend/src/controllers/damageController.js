const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");

const SCRIPT_PATH = path.join(__dirname, "../services/damageDetection.py");
// Windows installs expose `python`; macOS/Linux usually only `python3`.
const PYTHON_BIN = process.env.PYTHON_BIN || (process.platform === "win32" ? "python" : "python3");
const TIMEOUT_MS = parseInt(process.env.DAMAGE_TIMEOUT_MS, 10) || 120000;

const removeTemp = (file) => file && fs.unlink(file.path, () => {});

// POST /api/damage/analyze  (multipart: image, optional conf 0.05-0.95)
// Responds with { success, image, detections, annotatedImage (data URL) }.
exports.analyzeDamage = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No image uploaded for damage detection." });
    }

    let conf = parseFloat(req.body && req.body.conf);
    if (Number.isNaN(conf)) conf = 0.25;
    conf = Math.min(0.95, Math.max(0.05, conf));

    execFile(
        PYTHON_BIN,
        [SCRIPT_PATH, req.file.path, "--conf", String(conf)],
        { timeout: TIMEOUT_MS, maxBuffer: 64 * 1024 * 1024 }, // annotated image arrives as base64
        (error, stdout, stderr) => {
            removeTemp(req.file);

            if (error) {
                console.error("Damage inference error:", error.message, stderr);
                const missingPython = error.code === "ENOENT";
                const missingDeps = /ModuleNotFoundError|ImportError/.test(stderr || "");
                return res.status(500).json({
                    error: missingPython
                        ? `Python not found ("${PYTHON_BIN}"). Install Python or set PYTHON_BIN in backend/.env.`
                        : missingDeps
                        ? "Python dependencies missing. Run: pip install -r backend/requirements.txt"
                        : error.killed
                        ? "Damage detection timed out."
                        : "Failed to run damage detection model.",
                    details: (stderr || "").trim().split("\n").slice(-3).join("\n"),
                });
            }

            try {
                // The script prints a single JSON line; take the last non-empty line defensively.
                const line = stdout.trim().split("\n").filter(Boolean).pop();
                const result = JSON.parse(line);
                return res.status(200).json({
                    success: true,
                    image: result.image,
                    detections: result.detections,
                    annotatedImage: result.annotated_image
                        ? `data:image/jpeg;base64,${result.annotated_image}`
                        : null,
                });
            } catch (parseError) {
                console.error("Parse error:", parseError.message);
                return res.status(500).json({ error: "Invalid output from detection service." });
            }
        },
    );
};