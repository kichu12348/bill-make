import { useState, useRef, useEffect, type ChangeEvent } from "react";
import LZString from "lz-string";
import { LuBuilding2, LuFileText, LuPackage, LuPenLine } from "react-icons/lu";
import {
  FiDownload,
  FiShare2,
  FiPlus,
  FiX,
  FiCheck,
  FiImage,
} from "react-icons/fi";
import "./App.css";

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface InvoiceData {
  // Company / Sender
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyGSTIN: string;
  companyState: string;
  companyLogo: string; // base64 data URL
  logoBlackAndWhite: boolean;

  // Document
  documentTitle: string; // e.g. "QUOTATION", "INVOICE"
  invoiceNumber: string;
  eventDate: string;
  eventName: string;

  // Bill To
  billToName: string;
  billToAddress: string;

  // Items
  items: InvoiceItem[];

  // GST
  gstPercentage: number;

  // Footer
  paymentTerms: string[];
  signatureName: string;
  signatureDesignation: string;
}

const DEFAULT_DATA: InvoiceData = {
  companyName: "YOUR COMPANY NAME",
  companyAddress: "123 Main Street, City, State - 000000",
  companyPhone: "+91 9876543210",
  companyGSTIN: "",
  companyState: "",
  companyLogo: "",
  logoBlackAndWhite: false,

  documentTitle: "QUOTATION",
  invoiceNumber: "QT-001",
  eventDate: new Date().toISOString().split("T")[0],
  eventName: "",

  billToName: "Client Name",
  billToAddress: "Client Address Line 1\nClient Address Line 2",

  items: [{ id: "1", description: "Item 1", quantity: 1, unitPrice: 100 }],

  gstPercentage: 0,

  paymentTerms: [
    "50% advance to confirm booking.",
    "Remaining balance to be cleared on event day.",
    "Prices inclusive of all applicable service charges unless stated.",
    "Quotation valid for 15 days from date of issue.",
  ],
  signatureName: "",
  signatureDesignation: "",
};

function App() {
  const [data, setData] = useState<InvoiceData>(DEFAULT_DATA);
  const [isViewMode, setIsViewMode] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "company" | "document" | "items" | "footer"
  >("company");
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [mobilePreview, setMobilePreview] = useState(false);

  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encodedData = params.get("data");
    if (encodedData) {
      try {
        const decompressed =
          LZString.decompressFromEncodedURIComponent(encodedData);
        if (decompressed) {
          const decoded = JSON.parse(decompressed);
          setData(decoded);
          setIsViewMode(true);
        }
      } catch (e) {
        console.error("Failed to decode invoice data", e);
      }
    }
  }, []);

  const toast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setData({ ...data, companyLogo: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => setData({ ...data, companyLogo: "" });

  const addItem = () => {
    setData({
      ...data,
      items: [
        ...data.items,
        { id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0 },
      ],
    });
  };

  const updateItem = (
    id: string,
    field: keyof InvoiceItem,
    value: string | number,
  ) => {
    setData({
      ...data,
      items: data.items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    });
  };

  const removeItem = (id: string) => {
    if (data.items.length <= 1) return;
    setData({ ...data, items: data.items.filter((item) => item.id !== id) });
  };

  const updatePaymentTerm = (index: number, value: string) => {
    const terms = [...data.paymentTerms];
    terms[index] = value;
    setData({ ...data, paymentTerms: terms });
  };

  const addPaymentTerm = () => {
    setData({ ...data, paymentTerms: [...data.paymentTerms, ""] });
  };

  const removePaymentTerm = (index: number) => {
    setData({
      ...data,
      paymentTerms: data.paymentTerms.filter((_, i) => i !== index),
    });
  };

  const subtotal = data.items.reduce(
    (sum, item) => sum + item.quantity * Number(item.unitPrice),
    0,
  );
  const gstAmount = (subtotal * data.gstPercentage) / 100;
  const grandTotal = subtotal + gstAmount;

  const formatCurrency = (n: number) => {
    return (
      "₹ " +
      n.toLocaleString("en-IN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })
    );
  };

  const handleDownload = async () => {
    if (!invoiceRef.current) return;
    try {
      const domtoimage = (await import("dom-to-image-more")).default;
      const scale = 3;
      const node = invoiceRef.current;
      const dataUrl = await domtoimage.toPng(node, {
        quality: 1,
        width: node.offsetWidth * scale,
        height: node.offsetHeight * scale,
        style: {
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        },
        bgcolor: "#ffffff",
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${data.documentTitle.toLowerCase()}-${data.invoiceNumber}.png`;
      link.click();
      toast("Downloaded successfully!");
    } catch (err) {
      console.error("Failed to generate image", err);
      toast("Download failed. Please try again.");
    }
  };

  const handleShare = () => {
    const json = JSON.stringify(data);
    const compressed = LZString.compressToEncodedURIComponent(json);
    const url = `${window.location.origin}${window.location.pathname}?data=${compressed}`;
    navigator.clipboard.writeText(url);
    toast("Share link copied to clipboard!");
  };

  // ─── Editor Tabs ───
  const renderCompanyTab = () => (
    <div className="tab-content">
      <div className="logo-upload-area">
        {data.companyLogo ? (
          <>
            <div className="logo-preview-wrapper">
              <img
                src={data.companyLogo}
                alt="Logo"
                className="logo-preview-img"
                style={
                  data.logoBlackAndWhite
                    ? { filter: "grayscale(1)" }
                    : undefined
                }
              />
              <button
                className="logo-remove-btn"
                onClick={removeLogo}
                title="Remove logo"
              >
                <FiX size={16} />
              </button>
            </div>
            <div className="bw-toggle-row">
              <label className="bw-toggle-label">Black & White</label>
              <button
                className={`bw-toggle ${data.logoBlackAndWhite ? "active" : ""}`}
                onClick={() =>
                  setData({
                    ...data,
                    logoBlackAndWhite: !data.logoBlackAndWhite,
                  })
                }
                type="button"
                aria-label="Toggle black and white logo"
              >
                <span className="bw-toggle-knob" />
              </button>
            </div>
          </>
        ) : (
          <label className="logo-upload-label" htmlFor="logo-upload">
            <FiImage size={32} />
            <span>Upload Company Logo</span>
            <span className="logo-hint">PNG, JPG up to 2MB</span>
          </label>
        )}
        <input
          type="file"
          id="logo-upload"
          accept="image/*"
          onChange={handleLogoUpload}
          hidden
        />
      </div>

      <div className="field-group">
        <label>Company Name</label>
        <input
          type="text"
          value={data.companyName}
          onChange={(e) => setData({ ...data, companyName: e.target.value })}
          placeholder="Your Company Name"
        />
      </div>

      <div className="field-group">
        <label>Address</label>
        <textarea
          rows={3}
          value={data.companyAddress}
          onChange={(e) => setData({ ...data, companyAddress: e.target.value })}
          placeholder="Full company address"
        />
      </div>

      <div className="field-row">
        <div className="field-group">
          <label>Phone</label>
          <input
            type="text"
            value={data.companyPhone}
            onChange={(e) => setData({ ...data, companyPhone: e.target.value })}
            placeholder="+91 XXXXXXXXXX"
          />
        </div>
        <div className="field-group">
          <label>State</label>
          <input
            type="text"
            value={data.companyState}
            onChange={(e) => setData({ ...data, companyState: e.target.value })}
            placeholder="e.g. Kerala"
          />
        </div>
      </div>

      <div className="field-group">
        <label>GSTIN / UIN</label>
        <input
          type="text"
          value={data.companyGSTIN}
          onChange={(e) => setData({ ...data, companyGSTIN: e.target.value })}
          placeholder="e.g. 32AAECX1117M1ZH"
        />
      </div>
    </div>
  );

  const renderDocumentTab = () => (
    <div className="tab-content">
      <div className="field-group">
        <label>Document Type</label>
        <div className="doc-type-selector">
          {["QUOTATION", "INVOICE", "ESTIMATE", "RECEIPT"].map((type) => (
            <button
              key={type}
              className={`doc-type-btn ${data.documentTitle === type ? "active" : ""}`}
              onClick={() => setData({ ...data, documentTitle: type })}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="field-row">
        <div className="field-group">
          <label>{data.documentTitle} ID</label>
          <input
            type="text"
            value={data.invoiceNumber}
            onChange={(e) =>
              setData({ ...data, invoiceNumber: e.target.value })
            }
          />
        </div>
        <div className="field-group">
          <label>Date</label>
          <input
            type="date"
            value={data.eventDate}
            onChange={(e) => setData({ ...data, eventDate: e.target.value })}
          />
        </div>
      </div>

      <div className="field-group">
        <label>
          Event / Subject Name <span className="optional-badge">Optional</span>
        </label>
        <input
          type="text"
          value={data.eventName}
          onChange={(e) => setData({ ...data, eventName: e.target.value })}
          placeholder="e.g. BUILD WITH AI HACKATHON"
        />
      </div>

      <div className="separator" />

      <h4 className="section-subtitle">Bill To</h4>

      <div className="field-group">
        <label>Client / Company Name</label>
        <input
          type="text"
          value={data.billToName}
          onChange={(e) => setData({ ...data, billToName: e.target.value })}
          placeholder="Client Name"
        />
      </div>

      <div className="field-group">
        <label>Client Address</label>
        <textarea
          rows={3}
          value={data.billToAddress}
          onChange={(e) => setData({ ...data, billToAddress: e.target.value })}
          placeholder="Full client address"
        />
      </div>
    </div>
  );

  const renderItemsTab = () => (
    <div className="tab-content">
      <div className="items-list">
        {data.items.map((item, idx) => (
          <div key={item.id} className="item-card">
            <div className="item-card-header">
              <span className="item-number">#{idx + 1}</span>
              <button
                className="item-remove-btn"
                onClick={() => removeItem(item.id)}
                disabled={data.items.length <= 1}
                title="Remove item"
              >
                <FiX size={14} />
              </button>
            </div>
            <div className="field-group">
              <label>Description</label>
              <input
                type="text"
                value={item.description}
                onChange={(e) =>
                  updateItem(item.id, "description", e.target.value)
                }
                placeholder="Item description"
              />
            </div>
            <div className="field-row three-col">
              <div className="field-group">
                <label>Unit Price (₹)</label>
                <input
                  type="text"
                  value={item.unitPrice}
                  onChange={(e) =>
                    updateItem(item.id, "unitPrice", e.target.value.trim())
                  }
                  placeholder="0"
                />
              </div>
              <div className="field-group">
                <label>Qty / Pax</label>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) =>
                    updateItem(item.id, "quantity", Number(e.target.value))
                  }
                  placeholder="1"
                  min="1"
                />
              </div>
              <div className="field-group">
                <label>Total</label>
                <div className="computed-value">
                  {formatCurrency(item.quantity * Number(item.unitPrice))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button className="add-item-btn" onClick={addItem}>
        <FiPlus size={18} />
        Add Item
      </button>

      <div className="separator" />

      <div className="gst-section">
        <h4 className="section-subtitle">Tax / GST</h4>
        <div className="gst-input-row">
          <label>GST Percentage</label>
          <div className="gst-input-wrapper">
            <input
              type="number"
              value={data.gstPercentage}
              onChange={(e) =>
                setData({
                  ...data,
                  gstPercentage: Math.max(0, Number(e.target.value)),
                })
              }
              min="0"
              max="100"
              step="0.5"
              className="gst-input"
            />
            <span className="gst-symbol">%</span>
          </div>
        </div>
        <div className="gst-quick-btns">
          {[0, 5, 12, 18, 28].map((v) => (
            <button
              key={v}
              className={`gst-quick-btn ${data.gstPercentage === v ? "active" : ""}`}
              onClick={() => setData({ ...data, gstPercentage: v })}
            >
              {v}%
            </button>
          ))}
        </div>
      </div>

      <div className="totals-summary">
        <div className="total-row">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        {data.gstPercentage > 0 && (
          <div className="total-row gst-row">
            <span>GST ({data.gstPercentage}%)</span>
            <span>{formatCurrency(gstAmount)}</span>
          </div>
        )}
        <div className="total-row grand-total-row">
          <span>Grand Total</span>
          <span>{formatCurrency(grandTotal)}</span>
        </div>
      </div>
    </div>
  );

  const renderFooterTab = () => (
    <div className="tab-content">
      <h4 className="section-subtitle">Payment Terms & Conditions</h4>
      <div className="terms-list">
        {data.paymentTerms.map((term, idx) => (
          <div key={idx} className="term-row">
            <span className="term-number">{idx + 1}.</span>
            <input
              type="text"
              value={term}
              onChange={(e) => updatePaymentTerm(idx, e.target.value)}
              placeholder="Payment term..."
            />
            <button
              className="term-remove-btn"
              onClick={() => removePaymentTerm(idx)}
              title="Remove"
            >
              <FiX size={12} />
            </button>
          </div>
        ))}
        <button className="add-term-btn" onClick={addPaymentTerm}>
          + Add term
        </button>
      </div>

      <div className="separator" />

      <h4 className="section-subtitle">Authorized Signature</h4>
      <div className="field-group">
        <label>Name</label>
        <input
          type="text"
          value={data.signatureName}
          onChange={(e) => setData({ ...data, signatureName: e.target.value })}
          placeholder="Signatory name"
        />
      </div>
      <div className="field-group">
        <label>Designation / Company</label>
        <input
          type="text"
          value={data.signatureDesignation}
          onChange={(e) =>
            setData({ ...data, signatureDesignation: e.target.value })
          }
          placeholder="e.g. For blu blu restaurant"
        />
      </div>
    </div>
  );

  // Format date for display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // ─── Render ───
  return (
    <div className="app-shell">
      {/* Toast */}
      <div className={`toast ${showToast ? "show" : ""}`}>
        <FiCheck size={18} />
        {toastMessage}
      </div>

      {/* Editor */}
      {!isViewMode && (
        <aside className={`editor ${mobilePreview ? "editor-hidden" : ""}`}>
          <div className="editor-top">
            <div className="brand">
              <LuFileText size={28} className="brand-icon" />
              <h1>Bill Make</h1>
            </div>
          </div>

          {/* Tabs */}
          <nav className="editor-tabs">
            {(
              [
                {
                  key: "company",
                  icon: <LuBuilding2 size={18} />,
                  label: "Company",
                },
                {
                  key: "document",
                  icon: <LuFileText size={18} />,
                  label: "Details",
                },
                { key: "items", icon: <LuPackage size={18} />, label: "Items" },
                {
                  key: "footer",
                  icon: <LuPenLine size={18} />,
                  label: "Footer",
                },
              ] as const
            ).map(({ key, icon, label }) => (
              <button
                key={key}
                className={`tab-btn ${activeTab === key ? "active" : ""}`}
                onClick={() => setActiveTab(key)}
              >
                <span className="tab-icon">{icon}</span>
                <span className="tab-label">{label}</span>
              </button>
            ))}
          </nav>

          {/* Tab Content */}
          <div className="editor-body">
            {activeTab === "company" && renderCompanyTab()}
            {activeTab === "document" && renderDocumentTab()}
            {activeTab === "items" && renderItemsTab()}
            {activeTab === "footer" && renderFooterTab()}
          </div>

          {/* Actions */}
          <div className="editor-actions">
            <button className="btn-primary" onClick={handleDownload}>
              <FiDownload size={18} />
              Download
            </button>
            <button className="btn-secondary" onClick={handleShare}>
              <FiShare2 size={18} />
              Share
            </button>
          </div>

          {/* Mobile toggle */}
          <button
            className="mobile-preview-toggle"
            onClick={() => setMobilePreview(true)}
          >
            Preview Bill →
          </button>
        </aside>
      )}

      {/* Preview */}
      <main className={`preview ${mobilePreview ? "preview-fullscreen" : ""}`}>
        {mobilePreview && !isViewMode && (
          <button
            className="mobile-back-btn"
            onClick={() => setMobilePreview(false)}
          >
            ← Back to Editor
          </button>
        )}

        <div className="paper" ref={invoiceRef}>
          {/* Logo & Company Header */}
          <div className="paper-company-header">
            {data.companyLogo && (
              <img
                src={data.companyLogo}
                alt="Company Logo"
                className="paper-logo"
                style={
                  data.logoBlackAndWhite
                    ? { filter: "grayscale(1)" }
                    : undefined
                }
              />
            )}
            <h2 className="paper-company-name">{data.companyName}</h2>
            <p className="paper-company-address">{data.companyAddress}</p>
            {data.companyPhone && (
              <p className="paper-company-phone">PH: {data.companyPhone}</p>
            )}
          </div>

          <hr className="paper-divider" />

          {/* Bill To / Document Meta Row */}
          <div className="paper-meta-row">
            <div className="paper-bill-to">
              <p className="paper-label">Bill To:</p>
              <p className="paper-bill-to-name">{data.billToName}</p>
              <p className="paper-bill-to-addr">{data.billToAddress}</p>
              {data.companyGSTIN && (
                <p className="paper-gstin">GSTIN/UIN: {data.companyGSTIN}</p>
              )}
              {data.companyState && (
                <p className="paper-state">
                  <strong>State:</strong> {data.companyState}
                </p>
              )}
            </div>

            <div className="paper-doc-meta">
              <h3 className="paper-doc-title">{data.documentTitle}</h3>
              <p className="paper-meta-line">
                <span className="paper-meta-key">{data.documentTitle} ID:</span>{" "}
                <span className="paper-meta-val">{data.invoiceNumber}</span>
              </p>
              <p className="paper-meta-line">
                <span className="paper-meta-key">Date:</span>{" "}
                <span className="paper-meta-val">
                  {formatDate(data.eventDate)}
                </span>
              </p>
            </div>
          </div>

          {/* Event Name */}
          {data.eventName && (
            <div className="paper-event">
              <p>
                Event: <strong>{data.eventName}</strong>
              </p>
            </div>
          )}

          {/* Items Table */}
          <table className="paper-table">
            <thead>
              <tr>
                <th style={{ width: "8%" }}>S.No.</th>
                <th style={{ width: "40%" }}>Item Description</th>
                <th style={{ width: "17%" }} className="text-right">
                  Unit Price (₹)
                </th>
                <th style={{ width: "17%" }} className="text-right">
                  Quantity (Pax)
                </th>
                <th style={{ width: "18%" }} className="text-right">
                  Total Amount (₹)
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, idx) => (
                <tr key={item.id}>
                  <td className="text-center">{idx + 1}</td>
                  <td>{item.description || "—"}</td>
                  <td className="text-right">
                    {Number(item.unitPrice).toLocaleString("en-IN")}
                  </td>
                  <td className="text-right">{item.quantity}</td>
                  <td className="text-right">
                    {(item.quantity * Number(item.unitPrice)).toLocaleString(
                      "en-IN",
                    )}
                    /-
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="subtotal-row">
                <td colSpan={4} className="text-right">
                  <strong>Subtotal:</strong>
                </td>
                <td className="text-right">
                  <strong>₹ {subtotal.toLocaleString("en-IN")}/-</strong>
                </td>
              </tr>
              <tr className="gst-foot-row">
                <td colSpan={4} className="text-right">
                  <strong>
                    {data.gstPercentage > 0
                      ? `Tax/GST (${data.gstPercentage}%)`
                      : "[Tax/GST (If Applicable)]"}
                    :
                  </strong>
                </td>
                <td className="text-right">
                  <strong>
                    {data.gstPercentage > 0
                      ? `₹ ${gstAmount.toLocaleString("en-IN")}/-`
                      : "—"}
                  </strong>
                </td>
              </tr>
              <tr className="grand-total-foot-row">
                <td colSpan={4} className="text-right">
                  <strong>Grand Total Amount:</strong>
                </td>
                <td className="text-right">
                  <strong>₹ {grandTotal.toLocaleString("en-IN")}/-</strong>
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Footer */}
          <div className="paper-footer">
            <div className="paper-terms">
              {data.paymentTerms.length > 0 && (
                <>
                  <p className="terms-title">
                    <strong>Payment Terms & Conditions</strong>
                  </p>
                  <ol className="terms-list-ol">
                    {data.paymentTerms.map((t, i) => t && <li key={i}>{t}</li>)}
                  </ol>
                </>
              )}
            </div>

            <div className="paper-signature">
              <div className="signature-box" />
              <div className="signature-line" />
              <p className="signature-label">Authorized Signature</p>
              {data.signatureDesignation && (
                <p className="signature-designation">
                  {data.signatureDesignation}
                </p>
              )}
            </div>
          </div>

          {/* Phone bar */}
          {data.companyPhone && (
            <div className="paper-phone-bar">
              <p>Phone: {data.companyPhone}</p>
            </div>
          )}
        </div>

        {isViewMode && (
          <div className="view-mode-actions">
            <button className="btn-primary" onClick={handleDownload}>
              <FiDownload size={18} />
              Download
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                setIsViewMode(false);
                window.history.replaceState({}, "", window.location.pathname);
              }}
            >
              Edit / Create New
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
