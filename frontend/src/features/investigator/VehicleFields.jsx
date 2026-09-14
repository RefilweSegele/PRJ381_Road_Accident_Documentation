import { Button, Card, Form, Input, Space } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";

export default function VehicleFields() {
  return (
    <Form.List
      name="vehicles"
      rules={[
        {
          validator: async (_, vehicles) => {
            if (!vehicles || vehicles.length < 1) {
              return Promise.reject(
                new Error("Please add at least one vehicle")
              );
            }
          },
        },
      ]}
    >
      {(fields, { add, remove }, { errors }) => (
        <>
          {fields.map(({ key, name, ...restField }) => (
            <Card
              key={key}
              title={`Vehicle ${name + 1}`}
              style={{ marginBottom: 16 }}
            >
              <Space
                direction="vertical"
                size="middle"
                style={{ width: "100%" }}
              >
                <Form.Item
                  {...restField}
                  name={[name, "registration"]}
                  label="Registration Number"
                  rules={[
                    {
                      required: true,
                      message: "Please enter the vehicle registration number",
                    },
                  ]}
                >
                  <Input placeholder="e.g. ABC 123 GP" />
                </Form.Item>

                <Form.Item
                  {...restField}
                  name={[name, "make"]}
                  label="Vehicle Make"
                  rules={[
                    {
                      required: true,
                      message: "Please enter the vehicle make",
                    },
                  ]}
                >
                  <Input placeholder="e.g. Toyota" />
                </Form.Item>

                <Form.Item
                  {...restField}
                  name={[name, "model"]}
                  label="Vehicle Model"
                  rules={[
                    {
                      required: true,
                      message: "Please enter the vehicle model",
                    },
                  ]}
                >
                  <Input placeholder="e.g. Corolla" />
                </Form.Item>

                <Form.Item
                  {...restField}
                  name={[name, "colour"]}
                  label="Vehicle Colour"
                  rules={[
                    {
                      required: true,
                      message: "Please enter the vehicle colour",
                    },
                  ]}
                >
                  <Input placeholder="e.g. White" />
                </Form.Item>

                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => remove(name)}
                >
                  Remove Vehicle
                </Button>
              </Space>
            </Card>
          ))}

          <Form.ErrorList errors={errors} />

          <Button
            type="dashed"
            onClick={() => add()}
            block
            icon={<PlusOutlined />}
          >
            Add Vehicle
          </Button>
        </>
      )}
    </Form.List>
  );
}
               
                   
           
