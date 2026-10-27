import { useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  message,
  Select,
  Space,
  Typography,
} from "antd";
import { useNavigate } from "react-router-dom";

import MapPicker from "./MapPicker";
import VehicleFields from "./VehicleFields";
import { createCase } from "../../api/cases";

const { Title } = Typography;
const { TextArea } = Input;

export default function CaseIntakeForm() {
  const [form] = Form.useForm();
  const [location, setLocation] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (values) => {
    if (!location) {
      message.error("Please select the accident location on the map.");
      return;
    }

   
    const payload = {
      incidentAddress: values.incidentAddress.trim(),
      incidentDate: values.accidentDate ? values.accidentDate.toISOString() : null, // dayjs -> ISO string
      location: {
        lat: Number(location.lat.toFixed(6)),
        lng: Number(location.lng.toFixed(6)),
      },
      accidentType: values.accidentType,
      description: values.description,
      vehicles: (values.vehicles || []).map((v) => ({
        registration: v.registration,
        make: v.make,
        model: v.model,
        colour: v.colour,
      })),
    };

    setSubmitting(true);
    try {
      const created = await createCase(payload);
      message.success(`Case ${created.caseReference} created.`);
      // The next step needs the new case's id, so the URL carries it.
      navigate(`/investigator/cases/${created.id}/upload`);
    } catch (err) {
      message.error(
        err.response?.data?.error || "Could not create the case. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
    setLocation(null);
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
      <Title level={2}>New Case Intake</Title>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        {/* CASE INFORMATION */}
        <Card title="Case Information" style={{ marginBottom: 24 }}>
          <Form.Item
            label="Incident Address"
            name="incidentAddress"
            rules={[{ required: true, message: "Please enter the incident address" }]}
          >
            <Input placeholder="e.g. N1 Highway, km 47, Pretoria" />
          </Form.Item>

          <Form.Item
            label="Accident Type"
            name="accidentType"
            rules={[{ required: true, message: "Please select the accident type" }]}
          >
            <Select placeholder="Select accident type">
              <Select.Option value="collision">Vehicle Collision</Select.Option>
              <Select.Option value="single_vehicle">Single Vehicle Accident</Select.Option>
              <Select.Option value="pedestrian">Pedestrian Accident</Select.Option>
              <Select.Option value="other">Other</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Accident Date and Time"
            name="accidentDate"
            rules={[{ required: true, message: "Please select the accident date and time" }]}
          >
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            label="Accident Description"
            name="description"
            rules={[
              { required: true, message: "Please provide a description of the accident" },
              { min: 10, message: "Description must contain at least 10 characters" },
            ]}
          >
            <TextArea rows={5} placeholder="Describe what happened during the accident..." />
          </Form.Item>
        </Card>

        {/* ACCIDENT LOCATION */}
        <Card title="Accident Location" style={{ marginBottom: 24 }}>
          <p>Click on the map to select the exact accident location.</p>

          <MapPicker value={location} onChange={setLocation} />

          <Form.Item label="Latitude" style={{ marginTop: 16 }}>
            <Input
              value={location?.lat ?? ""}
              readOnly
              placeholder="Select a location on the map"
            />
          </Form.Item>

          <Form.Item label="Longitude">
            <Input
              value={location?.lng ?? ""}
              readOnly
              placeholder="Select a location on the map"
            />
          </Form.Item>

          {!location && (
            <p style={{ color: "#ff4d4f" }}>
              A location must be selected before the case can be created.
            </p>
          )}
        </Card>

        {/* VEHICLES */}
        <Card title="Vehicles Involved" style={{ marginBottom: 24 }}>
          <VehicleFields />
        </Card>

        {/* ACTIONS */}
        <Space>
          <Button type="primary" htmlType="submit" loading={submitting}>
            Create Case
          </Button>
          <Button onClick={handleReset} disabled={submitting}>
            Reset
          </Button>
        </Space>
      </Form>
    </div>
  );
}