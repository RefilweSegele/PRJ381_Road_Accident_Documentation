const { exec } = require('child_process');
const path = require('path');

exports.analyzeDamage = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded for damage detection.' });
    }

    const imagePath = req.file.path;
    const scriptPath = path.join(__dirname, '../services/damageDetection.py');

    // Execute the Python detection script with the image path argument
    exec(`python "${scriptPath}" "${imagePath}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Inference error: ${error.message}`);
            return res.status(500).json({ error: 'Failed to run damage detection model.' });
        }

        try {
            const detections = JSON.parse(stdout);
            // detections contains your polygon coordinates [[x, y], ...] ready for your database JSONB column!
            return res.status(200).json({
                success: true,
                detections
            });
        } catch (parseError) {
            console.error(`Parse error: ${parseError.message}`);
            return res.status(500).json({ error: 'Invalid output from detection service.' });
        }
    });
};