import React, { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Empty,
  Input,
  List,
  Row,
  Space,
  Statistic,
  Tag,
  Typography,
} from "antd";
import {
  CheckCircleOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  PrinterOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

/*
 * Member 9 - Page 7: Final forensic PDF assembly
 *
 * This first frontend version is intentionally API-independent.
 * Replace the demo `reportData` with data returned by the backend/other
 * reviewer components when those integrations are ready.
 */

const demoReport = {
  caseNumber: "RA-2026-00124",
  status: "Ready for assembly",
  generatedAt: "16 September 2026",
  investigator: "Demo Investigator",
  incidentDate: "14 September 2026",
  location: "Pretoria, Gauteng",
  vehicleCount: 2,
  executiveSummary:
    "Preliminary digital reconstruction and inspection findings are available for reviewer confirmation.",
  measurements: [
    { label: "Vehicle A impact width", value: "1.82 m" },
    { label: "Vehicle B final position", value: "4.37 m" },
    { label: "Debris field length", value: "8.14 m" },
  ],
  findings: [
    "Scene imagery has been uploaded and processed.",
    "3D inspection measurements are available for inclusion.",
    "ML damage/debris annotations are available for reviewer confirmation.",
  ],
  evidence: [
    { name: "Scene overview", description: "Primary accident-scene image" },
    { name: "Vehicle damage", description: "Damage inspection evidence" },
    { name: "3D measurements", description: "Reviewer measurement summary" },
  ],
};

function Section({ title, children }) {
  return (
    <Card
      title={title}
      style={{ marginBottom: 16 }}
      className="report-section"
    >
      {children}
    </Card>
  );
}

export default function ReportGenerator({ reportData = demoReport }) {
  const [preparedBy, setPreparedBy] = useState(reportData.investigator || "");
  const [notes, setNotes] = useState("");
  const [includedEvidence, setIncludedEvidence] = useState(
    reportData.evidence?.map((item) => item.name) || []
  );

  const allEvidenceSelected = useMemo(
    () =>
      (reportData.evidence?.length || 0) > 0 &&
      includedEvidence.length === reportData.evidence.length,
    [includedEvidence, reportData.evidence]
  );

  const toggleEvidence = (name) => {
    setIncludedEvidence((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name]
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: 24,
        background: "#f5f5f5",
        minHeight: "100vh",
      }}
    >
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .report-page {
            max-width: none !important;
            padding: 0 !important;
            background: white !important;
          }
          .report-section {
            break-inside: avoid;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="no-print" style={{ marginBottom: 20 }}>
        <Space direction="vertical" size={4}>
          <Title level={2} style={{ margin: 0 }}>
            <FilePdfOutlined /> Forensic Report Generator
          </Title>
          <Text type="secondary">
            Page 7 — assemble and review the final forensic report before PDF
            output.
          </Text>
        </Space>
      </div>

      <Row gutter={[16, 16]} className="no-print">
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="Case" value={reportData.caseNumber} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="Evidence items" value={includedEvidence.length} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="Vehicles" value={reportData.vehicleCount} />
          </Card>
        </Col>
      </Row>

      <Card className="report-page" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
          <div>
            <Title level={1} style={{ marginBottom: 4 }}>
              Forensic Road Accident Report
            </Title>
            <Text type="secondary">Case {reportData.caseNumber}</Text>
          </div>

          <div className="no-print">
            <Space wrap>
              <Button icon={<PrinterOutlined />} onClick={handlePrint}>
                Print / Save as PDF
              </Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handlePrint}
              >
                Generate PDF
              </Button>
            </Space>
          </div>
        </div>

        <Divider />

        <Section title="Case Information">
          <Descriptions bordered column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Case number">
              {reportData.caseNumber}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag icon={<CheckCircleOutlined />} color="green">
                {reportData.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Incident date">
              {reportData.incidentDate}
            </Descriptions.Item>
            <Descriptions.Item label="Location">
              {reportData.location}
            </Descriptions.Item>
            <Descriptions.Item label="Investigator">
              {reportData.investigator}
            </Descriptions.Item>
            <Descriptions.Item label="Report date">
              {reportData.generatedAt}
            </Descriptions.Item>
          </Descriptions>
        </Section>

        <Section title="Executive Summary">
          <Text>{reportData.executiveSummary}</Text>
        </Section>

        <Section title="Measurements">
          <List
            bordered
            dataSource={reportData.measurements || []}
            locale={{ emptyText: <Empty description="No measurements available" /> }}
            renderItem={(item) => (
              <List.Item>
                <Text>{item.label}</Text>
                <Text strong>{item.value}</Text>
              </List.Item>
            )}
          />
        </Section>

        <Section title="Findings">
          <List
            bordered
            dataSource={reportData.findings || []}
            renderItem={(item, index) => (
              <List.Item>
                <Text>
                  {index + 1}. {item}
                </Text>
              </List.Item>
            )}
          />
        </Section>

        <Section title="Evidence Included">
          <Alert
            className="no-print"
            type={allEvidenceSelected ? "success" : "info"}
            showIcon
            message={
              allEvidenceSelected
                ? "All available evidence is selected."
                : "Select the evidence items that should appear in the final report."
            }
            style={{ marginBottom: 12 }}
          />

          <List
            bordered
            dataSource={reportData.evidence || []}
            renderItem={(item) => {
              const selected = includedEvidence.includes(item.name);
              return (
                <List.Item
                  actions={[
                    <Button
                      key={item.name}
                      className="no-print"
                      type={selected ? "primary" : "default"}
                      onClick={() => toggleEvidence(item.name)}
                    >
                      {selected ? "Included" : "Include"}
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={item.name}
                    description={item.description}
                  />
                </List.Item>
              );
            }}
          />
        </Section>

        <Section title="Reviewer Notes">
          <Input.TextArea
            className="no-print"
            rows={4}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Add final reviewer notes before exporting..."
          />
          <div style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>
            {notes || "No additional reviewer notes."}
          </div>
        </Section>

        <Divider />

        <div style={{ textAlign: "center" }}>
          <Text type="secondary">
            Prepared by: {preparedBy || "Not specified"} · Generated:{" "}
            {reportData.generatedAt}
          </Text>
        </div>

        <div className="no-print" style={{ marginTop: 16 }}>
          <Input
            addonBefore="Prepared by"
            value={preparedBy}
            onChange={(event) => setPreparedBy(event.target.value)}
          />
        </div>
      </Card>
    </div>
  );
}
