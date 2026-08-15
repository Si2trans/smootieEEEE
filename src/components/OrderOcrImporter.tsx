import { Camera, CheckCircle2, FileSearch, ImagePlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { recognizeOrderImage } from "../lib/orderOcr";
import type { OcrOrderItem, ParsedOcrOrder } from "../lib/orderOcr";

type Props = {
  hasExistingItems: boolean;
  onApply: (order: ParsedOcrOrder) => void;
};

const emptyOrder: ParsedOcrOrder = {
  orderNumber: "",
  channel: "LINE MAN",
  customerName: "",
  orderTime: "",
  paymentMethod: "",
  grossTotal: 0,
  promotionName: "",
  promotionAmount: 0,
  netTotal: 0,
  totalCheck: "",
  items: [],
  rawText: ""
};

export function OrderOcrImporter({ hasExistingItems, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [reading, setReading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<ParsedOcrOrder | null>(null);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function chooseFile(nextFile: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(nextFile);
    setPreviewUrl(nextFile ? URL.createObjectURL(nextFile) : "");
    setResult(null);
    setError("");
    setProgress(0);
    setStatus("");
  }

  async function readImage() {
    if (!file || reading) return;
    setReading(true);
    setError("");
    setStatus("กำลังโหลดระบบ OCR...");
    try {
      const parsed = await recognizeOrderImage(file, (message) => {
        setProgress(message.progress);
        setStatus(progressLabel(message.status, message.progress));
      });
      setResult(parsed);
      setProgress(1);
      setStatus("อ่านภาพเสร็จแล้ว กรุณาตรวจข้อมูล");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "อ่านภาพไม่สำเร็จ");
    } finally {
      setReading(false);
    }
  }

  function close() {
    if (reading) return;
    setOpen(false);
  }

  function updateResult(patch: Partial<ParsedOcrOrder>) {
    setResult((current) => current ? { ...current, ...patch } : current);
  }

  function updateItem(index: number, patch: Partial<OcrOrderItem>) {
    setResult((current) => current ? {
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)
    } : current);
  }

  function removeItem(index: number) {
    setResult((current) => current ? { ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) } : current);
  }

  function apply() {
    if (!result?.items.length) return;
    if (hasExistingItems && !window.confirm("นำเข้าจากภาพจะแทนรายการออเดอร์ปัจจุบัน ต้องการทำต่อหรือไม่?")) return;
    onApply({ ...result, totalCheck: reviewTotalCheck(result) });
    setOpen(false);
  }

  return (
    <>
      <button className="order-ocr-open" onClick={() => setOpen(true)} type="button">
        <Camera size={17} /> อ่านออเดอร์จากภาพ
      </button>
      {open ? (
        <div className="order-ocr-backdrop" role="presentation">
          <section aria-labelledby="order-ocr-title" aria-modal="true" className="order-ocr-sheet" role="dialog">
            <header className="order-ocr-header">
              <div>
                <h3 id="order-ocr-title">อ่านออเดอร์จากภาพ</h3>
                <small>รูปประมวลผลในเครื่องและไม่ถูกบันทึก</small>
              </div>
              <button aria-label="ปิด" disabled={reading} onClick={close} type="button"><X size={20} /></button>
            </header>

            <label className="order-ocr-picker">
              {previewUrl ? <img alt="ภาพออเดอร์ที่เลือก" src={previewUrl} /> : <><ImagePlus size={30} /><strong>เลือกรูปออเดอร์ LINE MAN</strong></>}
              <input accept="image/*" onChange={(event) => chooseFile(event.currentTarget.files?.[0] || null)} type="file" />
            </label>
            <button className="order-ocr-read" disabled={!file || reading} onClick={readImage} type="button">
              <FileSearch size={17} /> {reading ? "กำลังอ่านภาพ..." : "อ่านข้อมูลจากภาพ"}
            </button>
            {status ? (
              <div className="order-ocr-progress">
                <progress max={1} value={progress} />
                <small>{status}</small>
              </div>
            ) : null}
            {error ? <p className="order-ocr-error">{error}</p> : null}

            {result ? (
              <div className="order-ocr-review">
                <div className="order-ocr-review__title">
                  <strong>ตรวจข้อมูลก่อนใส่ในออเดอร์</strong>
                  <span className={reviewTotalCheck(result).includes("ตรงกัน") ? "is-ok" : "is-warning"}>{reviewTotalCheck(result)}</span>
                </div>
                <div className="order-ocr-fields">
                  <label>เลขออเดอร์<input onChange={(event) => updateResult({ orderNumber: event.currentTarget.value })} value={result.orderNumber} /></label>
                  <label>ช่องทาง<input onChange={(event) => updateResult({ channel: event.currentTarget.value })} value={result.channel} /></label>
                  <label className="is-wide">ชื่อลูกค้า<input onChange={(event) => updateResult({ customerName: event.currentTarget.value })} value={result.customerName} /></label>
                  <label className="is-wide">วันและเวลา<input onChange={(event) => updateResult({ orderTime: event.currentTarget.value })} value={result.orderTime} /></label>
                </div>

                <div className="order-ocr-items">
                  {result.items.map((item, index) => (
                    <article className="order-ocr-item" key={`${index}-${item.name}`}>
                      <div className="order-ocr-item__head">
                        <input aria-label="ชื่อเมนู" onChange={(event) => updateItem(index, { name: event.currentTarget.value })} value={item.name} />
                        <button aria-label="ลบรายการ" onClick={() => removeItem(index)} type="button"><X size={15} /></button>
                      </div>
                      <div className="order-ocr-item__grid">
                        <label>จำนวน<input min={1} onChange={(event) => updateItem(index, { quantity: Math.max(1, Number(event.currentTarget.value || 1)) })} type="number" value={item.quantity} /></label>
                        <label>ราคารวม<input min={0} onChange={(event) => updateItem(index, { lineTotal: Math.max(0, Number(event.currentTarget.value || 0)) })} type="number" value={item.lineTotal} /></label>
                      </div>
                      <div className="order-ocr-sweetness">
                        <span>ความหวาน</span>
                        {(["50%", "100%"] as const).map((sweetness) => (
                          <button
                            className={item.sweetness === sweetness ? "is-active" : ""}
                            key={sweetness}
                            onClick={() => updateItem(index, { sweetness: item.sweetness === sweetness ? "" : sweetness })}
                            type="button"
                          >{sweetness}</button>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>

                <div className="order-ocr-fields">
                  <label>วิธีชำระ<input onChange={(event) => updateResult({ paymentMethod: event.currentTarget.value })} value={result.paymentMethod} /></label>
                  <label>รวมทั้งหมด<input min={0} onChange={(event) => updateResult({ grossTotal: Number(event.currentTarget.value || 0) })} type="number" value={result.grossTotal} /></label>
                  <label>ชื่อโปรโมชั่น<input onChange={(event) => updateResult({ promotionName: event.currentTarget.value })} value={result.promotionName} /></label>
                  <label>ส่วนลด<input min={0} onChange={(event) => updateResult({ promotionAmount: Math.max(0, Number(event.currentTarget.value || 0)) })} type="number" value={result.promotionAmount} /></label>
                  <label className="is-wide">ยอดรวมสุทธิ<input min={0} onChange={(event) => updateResult({ netTotal: Math.max(0, Number(event.currentTarget.value || 0)) })} type="number" value={result.netTotal} /></label>
                </div>
                <button className="order-ocr-apply" disabled={!result.items.length} onClick={apply} type="button">
                  <CheckCircle2 size={18} /> ใส่ข้อมูลลงออเดอร์
                </button>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
}

function progressLabel(status: string, progress: number) {
  if (status === "loading-paddle") return "กำลังโหลด PaddleOCR ภาษาไทย...";
  if (status === "detecting-text") return `กำลังอ่านและจัดตำแหน่งข้อความ ${Math.round(progress * 100)}%`;
  if (status === "parsing-order") return "กำลังแยกข้อมูลออเดอร์...";
  return "กำลังเตรียมระบบ OCR...";
}

function reviewTotalCheck(order: ParsedOcrOrder) {
  const itemTotal = order.items.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
  const summaryMatches = order.grossTotal > 0
    && Math.abs(order.grossTotal - order.promotionAmount - order.netTotal) < 0.01;
  const itemsMatch = order.grossTotal > 0
    && order.items.length > 0
    && Math.abs(itemTotal - order.grossTotal) < 0.01;
  if (order.grossTotal <= 0 || order.netTotal < 0) return "ข้อมูลยอดยังไม่ครบ";
  if (summaryMatches && itemsMatch) return "ยอดรายการ ส่วนลด และยอดสุทธิตรงกัน";
  if (summaryMatches) return "ยอดหลังหักส่วนลดตรง แต่ยอดรายการยังไม่ตรง";
  return "ยอดเงินไม่สัมพันธ์กัน กรุณาตรวจสอบ";
}

export { emptyOrder as emptyParsedOcrOrder };
