const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

//Middleware
app.use(cors());
app.use(express.json());

//this keeps the processing logs while our server is running
const processingJobs ={};
const jobTimers ={}; //these are the timers for each case

//the stages of processing images
const ODM_PIPELINE_STAGES = [
  {
    key: 'GCP_ALIGNMENT',
    title: 'GCP Alignment & EXIF Ingestion',
    detail: 'Validating image EXIF metadata and locking Ground Control Points (1-2 cm precision).',
    progress: 15,
  },
  {
    key: 'FEATURE_MATCHING',
    title: 'Feature Matching & Camera Pose (SfM)',
    detail: 'Extracting keypoint descriptors and calculating Bundle Block Adjustment.',
    progress: 35,
  },
  {
    key: 'POINT_CLOUD',
    title: 'Dense Point Cloud Generation',
    detail: 'Calculating depth maps and filtering point cloud spatial noise.',
    progress: 55,
  },
  {
    key: 'MESH_TEXTURING',
    title: '3D Mesh & Texture Mapping',
    detail: 'Constructing triangle surface mesh and baking high-resolution RGB texture atlas.',
    progress: 75,
  },
  {
    key: 'GEOSPATIAL_PRODUCTS',
    title: 'Orthomosaic & DSM Generation',
    detail: 'Exporting 2D georeferenced orthophoto and Digital Surface Model.',
    progress: 88,
  },
  {
    key: 'MODEL_OPTIMIZATION',
    title: 'Draco glTF Compression & Staging',
    detail: 'Simplifying polygon mesh and compressing glTF for Three.js rendering.',
    progress: 100,
  },
];

const FAIL_AT_STAGE = 3;
 
// How often the fake job moves to the next stage
const STAGE_DURATION_MS = 4000;
 
// Makes a log line like "[10:02:11] something happened"
const logLine = (message) => `[${new Date().toLocaleTimeString()}] ${message}`;
 
// POST: start (or retry) the job
app.post('/api/cases/:id/process', (req, res) => {
  const caseId = req.params.id;
  const shouldFail = req.query.fail === 'true';
 
  // Don't start a second job if one is already running
  if (processingJobs[caseId] && processingJobs[caseId].status === 'PROCESSING') {
    return res.status(409).json({ message: 'Processing is already running for this case.' });
  }
 
  // If there's an old timer hanging around (e.g. from a failed run), kill it
  clearInterval(jobTimers[caseId]);
 
  // Fresh job, starting at stage 1
  processingJobs[caseId] = {
    caseId,
    status: 'PROCESSING',
    currentStageIndex: 0,
    progressPercent: ODM_PIPELINE_STAGES[0].progress,
    errorMessage: null,
    logs: [
      logLine(`Batch job initialized for Case #${caseId}`),
      logLine(`Starting Stage 1: ${ODM_PIPELINE_STAGES[0].title}`),
    ],
  };
 
  startOdmSimulation(caseId, shouldFail);
 
  // 202 = "got it, working on it"
  return res.status(202).json({
    message: 'Pipeline processing started.',
    caseId,
  });
});
 
// GET: the frontend polls this to see how things are going
app.get('/api/cases/:id/status', (req, res) => {
  const caseId = req.params.id;
  const job = processingJobs[caseId];
 
  // No job yet = IDLE (the frontend shows the Start button)
  if (!job) {
    return res.status(200).json({
      status: 'IDLE',
      currentStageKey: null,
      currentStageTitle: '',
      currentStageDetail: '',
      currentStageIndex: -1,
      progressPercent: 0,
      logs: [],
      errorMessage: null,
    });
  }
 
  const currentStage = ODM_PIPELINE_STAGES[job.currentStageIndex] || {};
 
  // Field names for stages
  return res.status(200).json({
    status: job.status,
    currentStageKey: currentStage.key || null,
    currentStageTitle: currentStage.title || '',
    currentStageDetail: currentStage.detail || '',
    currentStageIndex: job.currentStageIndex,
    progressPercent: job.progressPercent,
    logs: job.logs,
    errorMessage: job.errorMessage,
  });
});
 
// Moves the job forward one stage every few seconds, like a real pipeline would
function startOdmSimulation(caseId, shouldFail) {
  let step = 0;
 
  jobTimers[caseId] = setInterval(() => {
    const job = processingJobs[caseId];
 
    if (!job) {
      clearInterval(jobTimers[caseId]);
      return;
    }
 
    step += 1;
 
    /*
    Here we are faking a failure to test before using real values
     */
    if (shouldFail && step === FAIL_AT_STAGE) {
      const failedStage = ODM_PIPELINE_STAGES[FAIL_AT_STAGE];
      job.status = 'FAILED';
      job.currentStageIndex = FAIL_AT_STAGE;
      job.progressPercent = failedStage.progress;
      job.errorMessage = `Stage failed: ${failedStage.title}. The process ran out of memory.`;
      job.logs.push(logLine(`ERROR in ${failedStage.title}: process exited with code 137`));
      clearInterval(jobTimers[caseId]);
      return;
    }
 
    //move to the next stage
    if (step < ODM_PIPELINE_STAGES.length) {
      const stage = ODM_PIPELINE_STAGES[step];
      job.currentStageIndex = step;
      job.progressPercent = stage.progress;
      job.logs.push(logLine(`${stage.title} — ${stage.detail}`));
      return;
    }
 
    // done processing
    job.status = 'COMPLETED';
    job.progressPercent = 100;
    job.logs.push(logLine('Photogrammetry pipeline complete. Draco glTF asset ready.'));
    clearInterval(jobTimers[caseId]);
  }, STAGE_DURATION_MS);
}


//Test Route (Just use this to test if the server is running)
app.get('/', (req, res) => {
  res.send('API is running...');
});

//Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});