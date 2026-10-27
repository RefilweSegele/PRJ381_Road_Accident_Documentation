import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation } from "@tanstack/react-query";
import { Alert, Button, ConfigProvider, Slider, Tag } from "antd";
import { Download, ImageIcon, RefreshCw, ScanSearch, Upload, X } from "lucide-react";

import { analyzeDamageImage } from "../../../api/damage";
import "../CaseDashboard.css"; // shared --dd-* theme tokens
import "./DamageTestPage.css";

// Same scoped theme override the dashboard uses.
const ANTD_THEME = { token: { colorPrimary: "#3b82f6", borderRadius: 10 } };

const MAX_BYTES = 15 * 1024 * 1024; // matches UPLOAD_MAX_FILE_SIZE_MB default on the server
const BAR_COLOURS = { crack: "#dc2626", dent: "#d97706", scratch: "#3b82f6" };

const chipClass = (cls) =>
  `damage-test__chip damage-test__chip--${BAR_COLOURS[cls] ? cls : "other"}`;

// Page: Car Damage Detection test (/damage-test) — unofficial.
export default function DamageTestPage() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [conf, setConf] = useState(0.25);
  const [fileError, setFileError] = useState(null);
  const abortRef = useRef(null);

  const mutation = useMutation({
    mutationFn: ({ file, conf }) => {
      abortRef.current = new AbortController();
      return analyzeDamageImage(file, conf, abortRef.current.signal);
    },
  });

  // Object URL lifecycle for the original-image preview.
  useEffect(() => {
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onDrop = useCallback(
    (accepted, rejected) => {
      setFileError(null);
      if (rejected.length > 0) {
        const code = rejected[0].errors?.[0]?.code;
        setFileError(
          code === "file-too-large"
            ? "That image is over 15 MB."
            : "Please choose a JPG, PNG or WebP image.",
        );
        return;
      }
      if (accepted[0]) {
        setFile(accepted[0]);
        mutation.reset();
      }
    },
    [mutation],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    maxSize: MAX_BYTES,
    accept: { "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"], "image/webp": [".webp"] },
  });

  const handleReset = () => {
    abortRef.current?.abort();
    setFile(null);
    setPreviewUrl(null);
    setFileError(null);
    mutation.reset();
  };

  const result = mutation.data;
  const detections = result?.detections ?? [];

  const counts = useMemo(() => {
    const map = {};
    detections.forEach((d) => {
      map[d.damage_class] = (map[d.damage_class] || 0) + 1;
    });
    return map;
  }, [detections]);

  const handleDownload = () => {
    if (!result?.annotatedImage) return;
    const base = (file?.name || "image").replace(/\.[^.]+$/, "");
    const a = document.createElement("a");
    a.href = result.annotatedImage;
    a.download = `${base}-damage.jpg`;
    a.click();
  };

  return (
    <ConfigProvider theme={ANTD_THEME}>
      <div className="case-dashboard">
        <div className="damage-test">
          <div className="case-dashboard__header">
            <div>
              <h2 className="case-dashboard__title">
                Damage Detection Test{" "}
                <Tag color="orange" style={{ verticalAlign: "middle" }}>Experimental</Tag>
              </h2>
              <p className="case-dashboard__title-sub">
                Upload a photo of a vehicle and the model will highlight cracks, dents and scratches.
                Results are not part of any case record.
              </p>
            </div>
          </div>

          <div className="damage-test__layout">
            {/* Controls */}
            <div className="damage-test__panel">
              <h3 className="damage-test__panel-title">Input image</h3>

              <div
                {...getRootProps()}
                className={`damage-test__drop ${isDragActive ? "active" : ""}`}
              >
                <input {...getInputProps()} />
                <Upload size={28} className="damage-test__drop-icon" />
                <div>Drop a car photo here, or click to browse</div>
                <div className="damage-test__drop-hint">JPG, PNG or WebP · up to 15 MB</div>
              </div>

              {fileError && (
                <Alert type="error" showIcon message={fileError} style={{ marginTop: 12 }} />
              )}

              {file && (
                <div className="damage-test__file">
                  <ImageIcon size={16} />
                  <span className="damage-test__file-name" title={file.name}>{file.name}</span>
                  <Button
                    type="text"
                    size="small"
                    icon={<X size={14} />}
                    onClick={handleReset}
                    aria-label="Remove image"
                  />
                </div>
              )}

              <div className="damage-test__field">
                <div className="damage-test__field-label">
                  <span>Sensitivity threshold</span>
                  <span>{Math.round(conf * 100)}%</span>
                </div>
                <Slider min={0.05} max={0.9} step={0.05} value={conf} onChange={setConf} tooltip={{ formatter: (v) => `${Math.round(v * 100)}%` }} />
                <p className="damage-test__field-help">
                  Lower finds more (including false alarms); higher shows only confident detections.
                </p>
              </div>

              <div className="damage-test__actions">
                <Button
                  type="primary"
                  icon={<ScanSearch size={14} />}
                  disabled={!file}
                  loading={mutation.isPending}
                  onClick={() => mutation.mutate({ file, conf })}
                >
                  {result ? "Re-run analysis" : "Analyse damage"}
                </Button>
                <Button icon={<RefreshCw size={14} />} onClick={handleReset} disabled={!file && !result}>
                  Reset
                </Button>
              </div>
            </div>

            {/* Output */}
            <div className="damage-test__panel">
              <h3 className="damage-test__panel-title">Result</h3>

              {mutation.isError && (
                <Alert
                  type="error"
                  showIcon
                  message="Could not analyse the image"
                  description={
                    <>
                      {mutation.error.message}
                      {mutation.error.details && (
                        <pre style={{ margin: "6px 0 0", whiteSpace: "pre-wrap", fontSize: 12 }}>
                          {mutation.error.details}
                        </pre>
                      )}
                    </>
                  }
                  style={{ marginBottom: 12 }}
                />
              )}

              <div className="damage-test__images">
                <figure className="damage-test__figure">
                  <figcaption>Original</figcaption>
                  {previewUrl ? (
                    <img src={previewUrl} alt="Original upload" />
                  ) : (
                    <div className="damage-test__placeholder">
                      <ImageIcon size={26} />
                      Your uploaded image appears here
                    </div>
                  )}
                </figure>

                <figure className="damage-test__figure">
                  <figcaption>
                    <span>Detected damage</span>
                    {result?.annotatedImage && (
                      <Button size="small" type="link" icon={<Download size={13} />} onClick={handleDownload}>
                        Download
                      </Button>
                    )}
                  </figcaption>
                  {result?.annotatedImage ? (
                    <img src={result.annotatedImage} alt="Image with detected damage highlighted" />
                  ) : (
                    <div className="damage-test__placeholder">
                      <ScanSearch size={26} />
                      {mutation.isPending
                        ? "Running the model… the first run can take a little longer."
                        : "The annotated image appears here after analysis"}
                    </div>
                  )}
                </figure>
              </div>

              {result && (
                <div className="damage-test__results">
                  {detections.length === 0 ? (
                    <Alert
                      type="info"
                      showIcon
                      message="No damage detected at this threshold"
                      description="Try lowering the sensitivity, or use a clearer, closer photo of the damaged panel."
                    />
                  ) : (
                    <>
                      <div className="damage-test__summary">
                        <span className="damage-test__summary-text">
                          {detections.length} detection{detections.length === 1 ? "" : "s"}:
                        </span>
                        {Object.entries(counts).map(([cls, n]) => (
                          <span key={cls} className={chipClass(cls)}>{n} {cls}</span>
                        ))}
                      </div>
                      <ul className="damage-test__results-list">
                        {detections.map((d, i) => (
                          <li key={i}>
                            <span className={chipClass(d.damage_class)}>{d.damage_class}</span>
                            <span className="damage-test__bar" aria-hidden="true">
                              <span
                                style={{
                                  width: `${Math.round(d.confidence_score * 100)}%`,
                                  background: BAR_COLOURS[d.damage_class] || "#64748b",
                                }}
                              />
                            </span>
                            <span className="damage-test__conf">
                              {(d.confidence_score * 100).toFixed(0)}%
                            </span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
}