import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Button, Card, Descriptions, Skeleton, Space } from "antd";
import { fetchCase } from "../../api/cases";
import StatusTag from "../../components/common/StatusTag";
import { formatDate, formatDateTime } from "../../utils/formatDate";
import ProcessingPanel from "./ProcessingPanel";

export default function CaseStatusPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["case", id],
    queryFn: () => fetchCase(id),
    enabled: Boolean(id),
    refetchInterval: 10_000, // status changes while the 3D model is being built
  });

  if (isLoading) {
    return <Skeleton active style={{ maxWidth: 800, margin: "40px auto" }} />;
  }
  if (isError || !data) {
    return (
      <div style={{ maxWidth: 800, margin: "40px auto", padding: 24 }}>
        <Alert
          type="error"
          showIcon
          message="Case not found"
          description={`No case with id ${id} could be loaded.`}
          action={<Button onClick={() => navigate("/investigator/cases")}>Back to cases</Button>}
        />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: 24 }}>
      <Card title={`Case ${data.caseReference}`} extra={<StatusTag status={data.status} />}>
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="Incident Location">{data.incidentAddress}</Descriptions.Item>
          <Descriptions.Item label="Incident Date">{formatDate(data.incidentDate)}</Descriptions.Item>
          <Descriptions.Item label="Last Updated">{formatDateTime(data.updatedAt)}</Descriptions.Item>
        </Descriptions>
        <Space style={{ marginTop: 24 }} wrap>
          <Button type="primary" onClick={() => navigate("/investigator/cases")}>Back to cases</Button>
          <Button onClick={() => navigate(`/investigator/cases/${id}/upload`)}>Upload more images</Button>
        </Space>
      </Card>

      <ProcessingPanel caseId={id} viewerPath={`/investigator/cases/${id}/viewer`} />
    </div>
  );
}