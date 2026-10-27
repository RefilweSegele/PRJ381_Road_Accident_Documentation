import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Button, Card, Descriptions, Skeleton, Space } from "antd";
import { fetchCase } from "../../api/cases";
import StatusTag from "../../components/common/StatusTag";
import { formatDate, formatDateTime } from "../../utils/formatDate";
redesigning_demo
import "../reviewer/reviewer.css";

import ProcessingPanel from "./ProcessingPanel";
 main

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
 redesigning_demo
    return <div className="page" style={{ maxWidth: 840 }}><Skeleton active /></div>;

    return <Skeleton active style={{ maxWidth: 800, margin: "40px auto" }} />;
  }
main
  if (isError || !data) {
    return (
     <div className="page" style={{ maxWidth: 840 }}>
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
 redesigning_demo
    <div className="page" style={{ maxWidth: 840 }}>
      <Card
        className="section-card"
        title={`Case ${data.caseReference}`}
        extra={<StatusTag status={data.status} />}
      >
=======
    <div style={{ maxWidth: 800, margin: "40px auto", padding: 24 }}>
      <Card title={`Case ${data.caseReference}`} extra={<StatusTag status={data.status} />}>
 main
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
}