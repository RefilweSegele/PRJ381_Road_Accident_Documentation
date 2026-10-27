import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Card, Progress, Select, Space, Steps, Tag, Typography, message } from "antd";
import {
  cancelProcessing, fetchProcessingStatus, fetchWebodmHealth, startProcessing,
} from "../../api/processing";

const STEPS = [
  { key: "UPLOADING", title: "Send images" },
  { key: "PHOTOGRAMMETRY", title: "Build 3D model" },
  { key: "IMPORTING_MODEL", title: "Prepare model" },
  { key: "DAMAGE_DETECTION", title: "Detect damage" },
];
const QUALITY_OPTIONS = [
  { value: "draft", label: "Draft (fastest - use for testing)" },
  { value: "standard", label: "Standard" },
  { value: "high", label: "High (slowest, needs most RAM)" },
];

export default function ProcessingPanel({ caseId, viewerPath }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [quality, setQuality] = useState("standard");
  const [busy, setBusy] = useState(false);
  const lastStatus = useRef(null);

  const { data, error } = useQuery({
    queryKey: ["processing", caseId],
    queryFn: () => fetchProcessingStatus(caseId),
    refetchInterval: (query) => {
      const s = query.state.data?.job?.status;
      return s === "queued" || s === "running" ? 3000 : 15000;
    },
  });
  const health = useQuery({
    queryKey: ["webodm-health"],
    queryFn: fetchWebodmHealth,
    retry: false,
    staleTime: 60_000,
  });

  const job = data?.job;
  const active = job && (job.status === "queued" || job.status === "running");
  const done = data && ["processed", "reviewed"].includes(data.caseStatus) && data.model?.ready;

  // When a run finishes, refresh the case so the status tag updates immediately.
  useEffect(() => {
    if (job && lastStatus.current && lastStatus.current !== job.status) {
      queryClient.invalidateQueries({ queryKey: ["case", caseId] });
    }
    lastStatus.current = job?.status ?? null;
  }, [job, caseId, queryClient]);

  const run = async (fn, okText) => {
    setBusy(true);
    try {
      await fn();
      if (okText) message.success(okText);
      await queryClient.invalidateQueries({ queryKey: ["processing", caseId] });
      queryClient.invalidateQueries({ queryKey: ["case", caseId] });
    } catch (e) {
      message.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const stepIndex = Math.max(0, STEPS.findIndex((s) => s.key === job?.stage));

  return (
    <Card title="3D reconstruction & damage detection" style={{ marginTop: 24 }}>
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        {health.isError && (
          <Alert
            type="warning" showIcon
            message="WebODM is not reachable"
            description={`${health.error.message} - start WebODM (Docker) and check WEBODM_* in backend/.env.`}
          />
        )}
        {health.data && !health.data.nodes.some((n) => n.online) && (
          <Alert type="warning" showIcon message="WebODM has no processing node online" />
        )}
        {error && <Alert type="error" showIcon message={error.message} />}

        {job && (
          <>
            <Space wrap>
              <Tag color={job.status === "failed" ? "red" : job.status === "completed" ? "green" : "blue"}>
                {job.status.toUpperCase()}
              </Tag>
              <Typography.Text type="secondary">
                Run #{job.id} - {job.imageCount} images - {job.quality}
              </Typography.Text>
            </Space>
            <Steps
              size="small"
              current={job.status === "completed" ? STEPS.length : stepIndex}
              status={job.status === "failed" ? "error" : undefined}
              items={STEPS.map((s) => ({ title: s.title }))}
            />
            <Progress
              percent={job.progress}
              status={job.status === "failed" ? "exception" : job.status === "completed" ? "success" : "active"}
            />
            {job.error && <Alert type="error" showIcon message={job.error} />}
            {job.warning && <Alert type="warning" showIcon message={job.warning} />}
            {job.log.length > 0 && (
              <details>
                <summary>Processing log</summary>
                <pre style={{ maxHeight: 220, overflow: "auto", fontSize: 12, background: "#fafafa", padding: 8 }}>
                  {job.log.slice(-15).join("\n")}
                </pre>
              </details>
            )}
          </>
        )}

        {!job && <Typography.Text type="secondary">No 3D reconstruction has been run for this case yet.</Typography.Text>}

        <Space wrap>
          {!active && (
            <>
              <Select value={quality} onChange={setQuality} options={QUALITY_OPTIONS} style={{ width: 280 }} />
              <Button
                type="primary" loading={busy}
                onClick={() => run(() => startProcessing(caseId, quality), "3D reconstruction started")}
              >
                {job?.status === "failed" ? "Retry" : done ? "Reprocess" : "Start 3D reconstruction"}
              </Button>
            </>
          )}
          {active && (
            <Button danger loading={busy} onClick={() => run(() => cancelProcessing(caseId), "Cancelled")}>
              Cancel
            </Button>
          )}
          {done && (
            <Button type="primary" ghost onClick={() => navigate(viewerPath)}>
              Open 3D viewer ({data.detectionCount} damage regions)
            </Button>
          )}
        </Space>
      </Space>
    </Card>
  );
}