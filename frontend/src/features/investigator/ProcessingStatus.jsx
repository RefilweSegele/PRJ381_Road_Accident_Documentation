//Page for processing webODM stages for photo processing
import React, {useState, useEffect} from 'react';
import {useParams, useNavigate} from 'react-router-dom';
import {Card, Steps, Progress, Button, Tag, Alert, Collapse, Typography, Space, Spin, Descriptions} from 'antd';
import {PlayCircleOutlined, EyeOutlined, CheckCircleFilled, CloseCircleFilled, LoadingOutlined, CodeOutlined} from '@ant-design/icons';

const {Title, Text, Paragraph} =Typography;

//webODM stages
const STAGES = [
  { key: 'GCP_ALIGNMENT', title: 'GCP Alignment & EXIF Ingestion', description: 'Checking image metadata and locking ground control points' },
  { key: 'FEATURE_MATCHING', title: 'Feature Matching & Camera Pose (SfM)', description: 'Finding keypoints and working out camera positions' },
  { key: 'POINT_CLOUD', title: 'Dense Point Cloud Generation', description: 'Depth maps and point cloud cleanup' },
  { key: 'MESH_TEXTURING', title: '3D Mesh & Texture Mapping', description: 'Building the mesh and wrapping the photo texture on it' },
  { key: 'GEOSPATIAL_PRODUCTS', title: 'Orthomosaic & DSM Generation', description: '2D map image and elevation model' },
  { key: 'MODEL_OPTIMIZATION', title: 'Draco glTF Compression & Staging', description: 'Shrinking the model so it loads fast in the 3D viewer' },
];
 

const EMPTY_JOB = {
  status: 'IDLE', // IDLE,PROCESSING,COMPLETED,FAILED states for the page
  currentStageIndex: -1, // -1 means "hasn't started"
  currentStageTitle: '',
  currentStageDetail: '',
  progressPercent: 0,
  logs: [],
  errorMessage: null,
};
 
export default function ProcessingStatus() {
  const { id } = useParams();
  const navigate = useNavigate();
 
  const [jobState, setJobState] = useState(EMPTY_JOB);
 
  // true while we're waiting on the start of processing
  const [loading, setLoading] = useState(false);
 
  const [pollKey, setPollKey] = useState(0);
 
  // Ask the backend for the job status every 3 seconds
  useEffect(() => {
    let timer;
 
    const fetchStatus = async () => {
      try {
        // leading slash matters, otherwise the URL breaks on nested routes
        const response = await fetch(`/api/cases/${id}/status`);
        const data = await response.json();
 
        setJobState({ ...EMPTY_JOB, ...data });
 
        // Job is done (or broken), no need to keep asking
        if (data.status === 'COMPLETED' || data.status === 'FAILED') {
          clearInterval(timer);
        }
      } catch (err) {
        console.error('Could not get job status:', err);
      }
    };
 
    fetchStatus(); // check right away, don't wait 3 seconds
    timer = setInterval(fetchStatus, 3000);
 
    // stop polling when we leave the page or the case id changes
    return () => clearInterval(timer);
  }, [id, pollKey]);
 
  // Start (or retry) the job
  const handleStartProcessing = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/cases/${id}/process`, { method: 'POST' });
 
      // The backend sends 409 if the job is already running
      if (!response.ok) {
        const data = await response.json();
        console.warn(data.message);
      }
 
      // Restart polling so the page picks up the new job
      setPollKey((k) => k + 1);
    } catch (err) {
      console.error('Could not start processing:', err);
    } finally {
      setLoading(false);
    }
  };
 
  // Little coloured tag at the top right: blue = running, green = done, red = failed
  const getStatusBadge = () => {
    switch (jobState.status) {
      case 'PROCESSING':
        return <Tag color="processing" icon={<LoadingOutlined />}>PROCESSING</Tag>;
      case 'COMPLETED':
        return <Tag color="success" icon={<CheckCircleFilled />}>COMPLETED</Tag>;
      case 'FAILED':
        return <Tag color="error" icon={<CloseCircleFilled />}>FAILED</Tag>;
      default:
        return <Tag color="default">READY TO PROCESS</Tag>;
    }
  };
 
  return (
    <div style={{ maxWidth: 900, margin: '24px auto', padding: '0 16px' }}>
      <Card
        title={
          <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
            <Title level={4} style={{ margin: 0 }}>
              Case #{id} — OpenDroneMap Status Monitor
            </Title>
            {getStatusBadge()}
          </Space>
        }
      >
        {/* Nothing has started yet: show the start button */}
        {jobState.status === 'IDLE' && (
          <Alert
            type="info"
            message="Batch Upload Complete"
            description="Drone images and flight parameters are ready for photogrammetry processing."
            action={
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                loading={loading}
                onClick={handleStartProcessing}
              >
                Start Processing
              </Button>
            }
            style={{ marginBottom: 24 }}
          />
        )}
 
        {/* Something broke: show the error and let them retry */}
        {jobState.status === 'FAILED' && (
          <Alert
            type="error"
            message="Pipeline Error"
            description={jobState.errorMessage || 'An error occurred during photogrammetry reconstruction.'}
            action={
              <Button type="primary" danger loading={loading} onClick={handleStartProcessing}>
                Retry Job
              </Button>
            }
            style={{ marginBottom: 24 }}
          />
        )}
 
        {/* Overall progress bar + what's happening right now */}
        <div style={{ marginBottom: 32 }}>
          <Text type="secondary">Overall Pipeline Progress</Text>
          <Progress
            percent={jobState.progressPercent}
            status={
              jobState.status === 'FAILED'
                ? 'exception'
                : jobState.status === 'COMPLETED'
                ? 'success'
                : 'active'
            }
            strokeWidth={12}
            style={{ marginTop: 8 }}
          />
          {jobState.status === 'PROCESSING' && (
            <Text type="secondary" style={{ fontSize: 13 }}>
              <strong>{jobState.currentStageTitle}:</strong> {jobState.currentStageDetail}
            </Text>
          )}
        </div>
 
        {/* The 6 steps. Anything before the current stage shows as done. */}
        <Title level={5} style={{ marginBottom: 16 }}>
          Pipeline Steps
        </Title>
        <Steps
          direction="vertical"
          // when the job is COMPLETED, we pass 6 so every step shows as finished
          current={jobState.status === 'COMPLETED' ? STAGES.length : jobState.currentStageIndex}
          // on failure, the current step turns red
          status={jobState.status === 'FAILED' ? 'error' : undefined}
          items={STAGES.map((stage, idx) => ({
            title: stage.title,
            description: stage.description,
            // show a spinner on the step that's running right now
            icon:
              idx === jobState.currentStageIndex && jobState.status === 'PROCESSING' ? (
                <LoadingOutlined />
              ) : undefined,
          }))}
          style={{ marginBottom: 32 }}
        />
 
        {/* Collapsible log box, like a mini terminal */}
        <Collapse
          items={[
            {
              key: 'logs',
              label: (
                <Space>
                  <CodeOutlined />
                  <Text style={{ fontSize: 13 }}>Execution Logs ({jobState.logs.length})</Text>
                </Space>
              ),
              children: (
                <div
                  style={{
                    background: '#1e1e1e',
                    color: '#00ff66',
                    padding: 12,
                    borderRadius: 6,
                    fontFamily: 'monospace',
                    fontSize: 12,
                    maxHeight: 180,
                    overflowY: 'auto',
                  }}
                >
                  {jobState.logs.length === 0 ? (
                    <Text style={{ color: '#888' }}>No logs generated yet.</Text>
                  ) : (
                    jobState.logs.map((log, index) => <div key={index}>{log}</div>)
                  )}
                </div>
              ),
            },
          ]}
          style={{ marginBottom: 24 }}
        />
 
        {/*go look at the finished 3D model */}
        {jobState.status === 'COMPLETED' && (
          <div style={{ textAlign: 'right' }}>
            <Button
              type="primary"
              size="large"
              icon={<EyeOutlined />}
              style={{ background: '#52c41a', borderColor: '#52c41a' }}
              onClick={() => navigate(`/review/cases/${id}`)}
            >
              View 3D Model
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}