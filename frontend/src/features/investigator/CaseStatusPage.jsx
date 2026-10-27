import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Button, Card, Descriptions, Skeleton, Space } from "antd";

import { fetchCase } from "../../api/cases";
import StatusTag from "../../components/common/StatusTag";
import { formatDate, formatDateTime } from "../../utils/formatDate";
import "../reviewer/reviewer.css";

export default function CaseStatusPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["case", id],
    queryFn: () => fetchCase(id),
    enabled: Boolean(id),
    // Status changes when processing finishes, so poll. Stops once the page unmounts.
    refetchInterval: 10_000,
  });

  if (isLoading) {
    return <div className="page" style={{ maxWidth: 840 }}><Skeleton active /></div>;
  if (isError || !data) {
    return (
     <div className="page" style={{ maxWidth: 840 }}>
        <Alert        
          type="error"
          showIcon
          message="Case not found"
          description={`No case with id ${id} could be loaded.`}
          action={
            <Button onClick={() => navigate("/investigator/cases")}>Back to cases</Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: 840 }}>
      <Card
        className="section-card"
        title={`Case ${data.caseReference}`}
        extra={<StatusTag status={data.status} />}
      >
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="Incident Location">{data.incidentAddress}</Descriptions.Item>
          <Descriptions.Item label="Incident Date">{formatDate(data.incidentDate)}</Descriptions.Item>
          <Descriptions.Item label="Last Updated">{formatDateTime(data.updatedAt)}</Descriptions.Item>
        </Descriptions>

        <Space style={{ marginTop: 24 }} wrap>
          <Button type="primary" onClick={() => navigate("/investigator/cases")}>
            Back to cases
          </Button>
          <Button onClick={() => navigate(`/investigator/cases/${id}/upload`)}>
            Upload more images
          </Button>
        </Space>
      </Card>
    </div>
  );
}
}