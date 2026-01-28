import { useState, useRef, useEffect } from "react";
import domtoimage from "dom-to-image-more";
import LZString from "lz-string"; // Import lz-string
import "./App.css";

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
}

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  billTo: string;
  recipient: string;
  items: InvoiceItem[];
}

function App() {
  const [data, setData] = useState<InvoiceData>({
    invoiceNumber: "INV-001",
    date: new Date().toISOString().split("T")[0],
    billTo: "John Doe",
    recipient: "My Store Inc.",
    items: [{ id: "1", description: "Item 1", quantity: 1, price: 10.0 }],
  });

  const [isViewMode, setIsViewMode] = useState(false);

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

  const addItem = () => {
    setData({
      ...data,
      items: [
        ...data.items,
        { id: crypto.randomUUID(), description: "", quantity: 1, price: 0 },
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
    setData({
      ...data,
      items: data.items.filter((item) => item.id !== id),
    });
  };

  const calculateTotal = () => {
    return data.items.reduce(
      (sum, item) => sum + item.quantity * Number(item.price),
      0,
    );
  };

  const handleDownload = async () => {
    if (invoiceRef.current) {
      try {
        const scale = 3; // Higher scale = better quality
        const node = invoiceRef.current;

        const dataUrl = await domtoimage.toPng(node, {
          quality: 2,
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
        link.download = `invoice-${data.invoiceNumber}.png`;
        link.click();
      } catch (err) {
        console.error("Failed to generate image", err);
      }
    }
  };

  const handleShare = () => {
    const json = JSON.stringify(data);
    const compressed = LZString.compressToEncodedURIComponent(json);
    const url = `${window.location.origin}${window.location.pathname}?data=${compressed}`;
    navigator.clipboard.writeText(url);
    alert("Invoice link copied to clipboard!");
  };

  return (
    <div className="container">
      {!isViewMode && (
        <div className="editor-panel">
          <h1>Invoice Generator</h1>

          <div className="form-group">
            <label>Pay To (Recipient)</label>
            <input
              type="text"
              value={data.recipient}
              onChange={(e) => setData({ ...data, recipient: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Bill To (Customer)</label>
            <input
              type="text"
              value={data.billTo}
              onChange={(e) => setData({ ...data, billTo: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Invoice Number</label>
              <input
                type="text"
                value={data.invoiceNumber}
                onChange={(e) =>
                  setData({ ...data, invoiceNumber: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={data.date}
                onChange={(e) => setData({ ...data, date: e.target.value })}
              />
            </div>
          </div>

          <h3>Items</h3>
          <div className="items-editor">
            {data.items.map((item) => (
              <div key={item.id} className="item-row">
                <input
                  placeholder="Description"
                  className="desc-input"
                  value={item.description}
                  onChange={(e) =>
                    updateItem(item.id, "description", e.target.value)
                  }
                />
                <input
                  type="number"
                  placeholder="Qty"
                  className="qty-input"
                  value={item.quantity}
                  onChange={(e) =>
                    updateItem(item.id, "quantity", Number(e.target.value))
                  }
                />
                <input
                  type="text"
                  placeholder="Price"
                  className="price-input"
                  value={item.price}
                  onChange={(e) =>
                    updateItem(item.id, "price", e.target.value.trim())
                  }
                />
                <button
                  onClick={() => removeItem(item.id)}
                  className="remove-btn"
                >
                  ×
                </button>
              </div>
            ))}
            <button onClick={addItem} className="add-btn">
              + Add Item
            </button>
          </div>

          <br />
          <div className="action-buttons">
            <button onClick={handleDownload} className="download-btn">
              Download Image
            </button>
            <button onClick={handleShare} className="share-btn">
              Share Link
            </button>
          </div>
        </div>
      )}

      <div className="preview-panel">
        <div className="paper-bill" ref={invoiceRef}>
          <div className="bill-header">
            <h2>INVOICE</h2>
            <div className="bill-meta">
              <p>
                <strong>Ref:</strong> {data.invoiceNumber}
              </p>
              <p>
                <strong>Date:</strong> {data.date}
              </p>
            </div>
          </div>

          <div className="bill-parties">
            <div className="party-col">
              <p className="party-label">Bill To:</p>
              <p className="party-name">{data.billTo}</p>
            </div>
            <div className="party-col">
              <p className="party-label">Pay To:</p>
              <p className="party-name">{data.recipient}</p>
            </div>
          </div>

          <table className="bill-table">
            <thead>
              <tr>
                <th style={{ width: "50%" }}>Item</th>
                <th className="text-right" style={{ width: "15%" }}>
                  Qty
                </th>
                <th className="text-right" style={{ width: "15%" }}>
                  Price
                </th>
                <th className="text-right" style={{ width: "20%" }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.description || "Item"}</td>
                  <td className="text-right">{item.quantity}</td>
                  <td className="text-right">
                    ₹{Number(item.price).toFixed(2)}
                  </td>
                  <td className="text-right">
                    {/*inr */}₹{(item.quantity * Number(item.price)).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}></td>
                <td className="text-right total-label">
                  <strong>Total:</strong>
                </td>
                <td className="text-right total-amount">
                  <strong>₹{calculateTotal().toFixed(2)}</strong>
                </td>
              </tr>
            </tfoot>
          </table>

          <div className="bill-footer">
            <p>Thank you for your business!</p>
          </div>
        </div>
        {isViewMode && (
          <button
            onClick={() => {
              setIsViewMode(false);
              window.history.replaceState({}, "", window.location.pathname);
            }}
            className="download-btn"
            style={{ position: "fixed", bottom: "2rem", right: "2rem" }}
          >
            Edit / Create New
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
