
import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Form,
  Input,
  List,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
  message,
} from "antd";
import {
  DownloadOutlined,
  FilePdfOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import apiClient from "../../api/client";

const { Title, Text } = Typography;

const dateText = (value) =>
  value ? new Date(value).toLocaleString() : "Not recorded";

const errorText = (error) =>
  error?.response?.data?.error ||
  error?.response?.data?.message ||
  error?.message ||
  "Request failed";

export default function ReportGenerator() {
  const [searchParams, setSearchParams] = useSearchParams();

  const requestedCaseId = searchParams.get("caseId");

  const [cases, setCases] = useState([]);
  const [caseId, setCaseId] = useState(() => {
    const id = Number(requestedCaseId);
    return requestedCaseId && Number.isSafeInteger(id) && id > 0
      ? id
      : null;
  });

  const [caseDetails, setCaseDetails] = useState(null);
  const [reports, setReports] = useState([]);
  const [loadingCases, setLoadingCases] = useState(false);
  const [loadingCase, setLoadingCase] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const [form] = Form.useForm();

  useEffect(() => {
    let active = true;

    const loadCases = async () => {
      setLoadingCases(true);

      try {
        const { data } = await apiClient.get("/cases", {
          params: { pageSize: 1000 },
        });

        const rows = Array.isArray(data)
          ? data
          : data.data || data.cases || [];

        if (!active) return;

        setCases(rows);

        if (rows.length) {
          setCaseId((previous) => previous ?? rows[0].id);
        }
      } catch (error) {
        if (active) {
          message.error(
            `Could not load cases: ${errorText(error)}`
          );
        }
      } finally {
        if (active) setLoadingCases(false);
      }
    };

    loadCases();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const id = Number(requestedCaseId);

    if (
      requestedCaseId &&
      Number.isSafeInteger(id) &&
      id > 0
    ) {
      setCaseId(id);
    }
  }, [requestedCaseId]);

  const handleCaseChange = (selectedId) => {
    setCaseId(selectedId);

    setSearchParams({
      caseId: String(selectedId),
    });
  };

  const refreshCase = async (id) => {
    if (!id) return;

    setLoadingCase(true);

    try {
      const [caseResult, reportsResult] = await Promise.all([
        apiClient.get(`/cases/${id}`),
        apiClient.get(`/cases/${id}/reports`),
      ]);

      setCaseDetails(
        caseResult.data.case || caseResult.data
      );

      setReports(reportsResult.data.reports || []);
    } catch (error) {
      message.error(
        `Could not load case or reports: ${errorText(error)}`
      );
    } finally {
      setLoadingCase(false);
    }
  };

  useEffect(() => {
    if (!caseId) {
      setCaseDetails(null);
      setReports([]);
      return;
    }

    setCaseDetails(null);
    setReports([]);
    form.resetFields();

    refreshCase(caseId);
  }, [caseId]);

  const generateReport = async (values) => {
    if (!caseId) return;

    setGenerating(true);

    try {
      const { data } = await apiClient.post(
        `/cases/${caseId}/reports`,
        {
          title:
            values.title?.trim() ||
            "Forensic Road Accident Report",
          executiveSummary:
            values.executiveSummary || "",
          reviewerNotes:
            values.reviewerNotes || "",
          measurements: [],
          findings: [],
        }
      );

      message.success(
        `Report ${data.report?.id || ""} generated and saved`
      );

      await refreshCase(caseId);
    } catch (error) {
      message.error(
        `Report generation failed: ${errorText(error)}`
      );
    } finally {
      setGenerating(false);
    }
  };

  const downloadPdf = async (report) => {
    setDownloadingId(report.id);

    try {
      const { data } = await apiClient.get(
        `/reports/${report.id}/pdf`,
        {
          responseType: "blob",
        }
      );

      const url = URL.createObjectURL(
        new Blob([data], {
          type: "application/pdf",
        })
      );

      const link = document.createElement("a");

      link.href = url;
      link.download = `${
        caseDetails?.caseReference || "DAIAS"
      }-report-${report.id}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 30000);
    } catch (error) {
      message.error(
        `PDF download failed: ${errorText(error)}`
      );
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: 24,
        minHeight: "100vh",
        background: "#f5f5f5",
      }}
    >
      <Title level={2}>
        <FilePdfOutlined /> Forensic Report Generator
      </Title>

      <Text type="secondary">
        Generate, review, and download reports saved
        in the DAIAS database.
      </Text>

      <Card
        title="Select accident case"
        style={{
          marginTop: 20,
          marginBottom: 16,
        }}
      >
        <Space wrap style={{ width: "100%" }}>
          <Select
            showSearch
            optionFilterProp="label"
            loading={loadingCases}
            style={{ minWidth: 320 }}
            placeholder="Select a case"
            value={caseId}
            onChange={handleCaseChange}
            options={cases.map((item) => ({
              value: item.id,
              label: `${
                item.caseReference || `Case ${item.id}`
              } — ${
                item.incidentAddress || "No address"
              }`,
            }))}
          />

          <Button
            icon={<ReloadOutlined />}
            onClick={() => refreshCase(caseId)}
            disabled={!caseId}
          >
            Refresh
          </Button>
        </Space>

        {!loadingCases && cases.length === 0 && (
          <Alert
            style={{ marginTop: 12 }}
            type="info"
            message="No cases found. Create a case before generating a report."
          />
        )}
      </Card>

      {loadingCase && (
        <div
          style={{
            textAlign: "center",
            padding: 24,
          }}
        >
          <Spin />
        </div>
      )}

      {!loadingCase && caseDetails && (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Card>
                <Statistic
                  title="Case"
                  value={
                    caseDetails.caseReference ||
                    caseDetails.id
                  }
                />
              </Card>
            </Col>

            <Col xs={24} md={8}>
              <Card>
                <Statistic
                  title="Existing reports"
                  value={reports.length}
                />
              </Card>
            </Col>

            <Col xs={24} md={8}>
              <Card>
                <Statistic
                  title="Vehicles"
                  value={
                    caseDetails.vehicleCount ?? 0
                  }
                />
              </Card>
            </Col>
          </Row>

          <Card
            title="Case information"
            style={{ marginTop: 16 }}
          >
            <Descriptions
              bordered
              column={{ xs: 1, sm: 2 }}
            >
              <Descriptions.Item label="Case reference">
                {caseDetails.caseReference ||
                  caseDetails.id}
              </Descriptions.Item>

              <Descriptions.Item label="Status">
                <Tag>
                  {caseDetails.status || "Unknown"}
                </Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Incident date">
                {dateText(caseDetails.incidentDate)}
              </Descriptions.Item>

              <Descriptions.Item label="Location">
                {caseDetails.incidentAddress ||
                  "Not recorded"}
              </Descriptions.Item>

              <Descriptions.Item label="Investigator">
                {caseDetails.assignedInvestigator ||
                  "Not assigned"}
              </Descriptions.Item>

              <Descriptions.Item label="Created">
                {dateText(caseDetails.createdAt)}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card
            title="Prepare forensic report"
            style={{ marginTop: 16 }}
          >
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message="Only verified case data is included automatically. Do not invent measurements, findings, or evidence."
            />

            <Form
              form={form}
              layout="vertical"
              onFinish={generateReport}
              initialValues={{
                title: "Forensic Road Accident Report",
              }}
            >
              <Form.Item
                name="title"
                label="Report title"
                rules={[
                  {
                    required: true,
                    message:
                      "Please enter a report title",
                  },
                ]}
              >
                <Input
                  placeholder="Enter report title"
                  maxLength={200}
                />
              </Form.Item>

              <Form.Item
                name="executiveSummary"
                label="Executive summary"
              >
                <Input.TextArea
                  rows={4}
                  placeholder="Summarize the documented accident case"
                />
              </Form.Item>

              <Form.Item
                name="reviewerNotes"
                label="Reviewer notes"
              >
                <Input.TextArea
                  rows={4}
                  placeholder="Add reviewer observations"
                />
              </Form.Item>

              <Button
                type="primary"
                htmlType="submit"
                loading={generating}
                icon={<FilePdfOutlined />}
              >
                Generate and save report
              </Button>
            </Form>
          </Card>

          <Card
            title="Saved reports"
            style={{ marginTop: 16 }}
          >
            <List
              locale={{
                emptyText: (
                  <Empty description="No reports generated for this case" />
                ),
              }}
              dataSource={reports}
              renderItem={(report) => (
                <List.Item
                  actions={[
                    <Button
                      key="download"
                      icon={<DownloadOutlined />}
                      loading={
                        downloadingId === report.id
                      }
                      onClick={() =>
                        downloadPdf(report)
                      }
                    >
                      Download PDF
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={`${
                      report.title ||
                      "Forensic Road Accident Report"
                    } #${report.id}`}
                    description={`Created ${dateText(
                      report.created_at
                    )}${
                      report.generated_by
                        ? ` · By ${report.generated_by}`
                        : ""
                    }`}
                  />
                </List.Item>
              )}
            />
          </Card>
        </>
      )}
    </div>
  );
}
