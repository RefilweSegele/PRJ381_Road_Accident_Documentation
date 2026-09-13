import { Link } from "react-router-dom";
import { Button, Descriptions, Drawer, Space } from "antd";
import StatusTag from "../../components/common/StatusTag";
import { formatDate, formatDateTime } from "../../utils/formatDate";


function CaseQuickViewDrawer({ open, caseRecord, onClose }) {
  return (
    <Drawer
      title={caseRecord?.caseReference || "Case details"}
      open={open}
      onClose={onClose}
      width={420}
    >
      {caseRecord && (
        <>
          <div style={{ marginBottom: 16 }}>
            <StatusTag status={caseRecord.status} />
          </div>

          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Incident Location">
              {caseRecord.incidentAddress}
            </Descriptions.Item>
            <Descriptions.Item label="Incident Date">
              {formatDate(caseRecord.incidentDate)}
            </Descriptions.Item>
            <Descriptions.Item label="Assigned Investigator">
              {caseRecord.assignedInvestigator}
            </Descriptions.Item>
            <Descriptions.Item label="Vehicles Involved">
              {caseRecord.vehicleCount}
            </Descriptions.Item>
            <Descriptions.Item label="Last Updated">
              {formatDateTime(caseRecord.updatedAt)}
            </Descriptions.Item>
          </Descriptions>

          <Space style={{ marginTop: 24 }} wrap>
            <Link to={`/investigator/cases/${caseRecord.id}/upload`}>
              <Button type="primary">Continue Upload</Button>
            </Link>
            <Link to={`/investigator/cases/${caseRecord.id}/status`}>
              <Button>View Status</Button>
            </Link>
          </Space>
        </>
      )}
    </Drawer>
  );
}

export default CaseQuickViewDrawer;
