export type OcrOrderItem = {
  quantity: number;
  name: string;
  lineTotal: number;
  sweetness: "" | "50%" | "100%";
  note: string;
};

export type ParsedOcrOrder = {
  orderNumber: string;
  channel: string;
  customerName: string;
  orderTime: string;
  paymentMethod: string;
  grossTotal: number;
  promotionName: string;
  promotionAmount: number;
  netTotal: number;
  totalCheck: string;
  items: OcrOrderItem[];
  rawText: string;
};

export type OcrProgress = {
  progress: number;
  status: string;
};

type PaddleOcrModule = Awaited<ReturnType<typeof createPaddleOcr>>;

const PADDLE_MODEL_BASE = "https://paddle-model-ecology.bj.bcebos.com/paddlex/official_inference_model/paddle3.0.0";
const ORT_WASM_BASE = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/";

let paddleOcrPromise: Promise<PaddleOcrModule> | null = null;

const thaiDigits: Record<string, string> = {
  "๐": "0", "๑": "1", "๒": "2", "๓": "3", "๔": "4",
  "๕": "5", "๖": "6", "๗": "7", "๘": "8", "๙": "9"
};

function normalizeDigits(value: string) {
  return String(value || "").replace(/[๐-๙]/g, (digit) => thaiDigits[digit] || digit);
}

function cleanLine(line: string) {
  return line.replace(/[|]/g, " ").replace(/\s+/g, " ").trim();
}

function normalizedForMatch(value: string) {
  return normalizeDigits(value)
    .toLowerCase()
    .replace(/[\s:：()@©|._-]+/g, "")
    .replace(/ชํ/g, "ชำ")
    .replace(/สัง/g, "สั่ง")
    .replace(/ซือ/g, "ซื้อ");
}

function looselyMatches(line: string, pattern: RegExp) {
  return pattern.test(normalizedForMatch(line));
}

function moneyValues(value = "") {
  return normalizeDigits(value).replace(/,/g, "").match(/-?\d+(?:\.\d{1,2})/g) || [];
}

function lastMoneyFrom(value = "") {
  const values = moneyValues(value);
  return Number(values[values.length - 1] || 0);
}

function itemStart(line: string) {
  return normalizeDigits(line).match(/^\s*([0-9]+)\s*[xX×%]\s*(.+)$/);
}

function parseItemLine(line: string): OcrOrderItem | null {
  const match = itemStart(line);
  if (!match) return null;
  const prices = moneyValues(match[2]);
  const priceText = prices[prices.length - 1] || "";
  let name = match[2];
  if (priceText) {
    const priceIndex = name.lastIndexOf(priceText);
    if (priceIndex >= 0) name = name.slice(0, priceIndex);
  }
  name = name.replace(/[.·•\s]+$/g, "").trim();
  if (!name) return null;
  return {
    quantity: Math.max(1, Number(match[1]) || 1),
    name,
    lineTotal: Math.max(0, Number(priceText) || 0),
    sweetness: "",
    note: ""
  };
}

export function parseLineManOrderText(rawText: string): ParsedOcrOrder {
  const lines = rawText.split(/\r?\n/).map(cleanLine).filter(Boolean);
  const joined = lines.join("\n");
  const orderNumber = joined.match(/(?:ข้อมูลออเดอร์\s*)?#\s*(\d{2,})/i)?.[1]
    || joined.match(/(?:ออเดอร์|order)\s*#?\s*(\d{2,})/i)?.[1]
    || "";

  const receiptCodeIndex = lines.findIndex((line) => /LMF[-\s]?\d+/i.test(line));
  let customerName = "";
  const newCustomerIndex = lines.findIndex((line) => /ลูกค้าใหม่/.test(line));
  if (newCustomerIndex >= 0) {
    customerName = lines[newCustomerIndex]
      .replace(/ลูกค้าใหม่/g, "")
      .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")
      .trim();
    if (!customerName && lines[newCustomerIndex + 1]) customerName = lines[newCustomerIndex + 1];
  }
  if (!customerName && receiptCodeIndex > 0 && orderNumber) {
    let standaloneOrderIndex = -1;
    for (let index = receiptCodeIndex - 1; index >= 0; index -= 1) {
      if (new RegExp(`^#?\\s*${orderNumber}\\s*$`).test(lines[index])) {
        standaloneOrderIndex = index;
        break;
      }
    }
    if (standaloneOrderIndex >= 0) {
      customerName = lines.slice(standaloneOrderIndex + 1, receiptCodeIndex)
        .map((line) => line.replace(/ลูกค้าใหม่/g, "").replace(/^\s*#+\s*/, "").replace(/[“”]+$/g, "").trim())
        .find((line) => Boolean(line) && !/รหัสใบสั่งซื้อ|ข้อมูลออเดอร์/.test(line)) || "";
    }
  }

  const orderTime = (lines.find((line) => /ลูกค้าสั่งออเดอร์|เวลาสั่ง|order time/i.test(line))
    ?.replace(/^.*?(?:ลูกค้าสั่งออเดอร์|เวลาสั่ง|order time)\s*[:：]?\s*/i, "") || "")
    .replace(/\s+[vV∨⌄]+\s*$/, "")
    .trim();
  const paymentLine = lines.find((line) => /E[- ]?Payment|พร้อมเพย์|เงินสด|ธนาคาร/i.test(line));
  const paymentMethod = paymentLine?.match(/E[- ]?Payment|พร้อมเพย์|เงินสด|ธนาคาร/i)?.[0] || "";

  const grossLine = lines.find((line) => looselyMatches(line, /รวม.*(?:เป็น)?เงิน|รวมทั้งหมด/));
  const promotionLine = lines.find((line) => looselyMatches(line, /ส่วนลด|โปรโม/));
  let netLine = "";
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (looselyMatches(lines[index], /ยอด.*(?:รวม)?.*สุทธิ/)) {
      netLine = lines[index];
      break;
    }
  }
  const grossTotal = lastMoneyFrom(grossLine);
  const promotionAmount = Math.abs(lastMoneyFrom(promotionLine));
  const netTotal = netLine ? lastMoneyFrom(netLine) : Math.max(0, grossTotal - promotionAmount);

  const itemSectionStart = lines.findIndex((line) => looselyMatches(line, /รายการ.*(?:สั่ง)?ซื้อ|รายการสินค้า/));
  let itemSectionEnd = lines.findIndex((line, index) => (
    index > itemSectionStart && looselyMatches(line, /รับ.*ช้อน.*ส้อม|วิธี.*ชำระเงิน/)
  ));
  if (itemSectionEnd < 0) itemSectionEnd = lines.length;
  const items: OcrOrderItem[] = [];
  for (let index = itemSectionStart >= 0 ? itemSectionStart + 1 : 0; index < itemSectionEnd; index += 1) {
    const item = parseItemLine(lines[index]);
    if (item) {
      items.push(item);
      continue;
    }
    if (!items.length) continue;
    const sweetness = normalizeDigits(lines[index]).match(/(?:หวาน\s*)?(50|100)\s*%/);
    if (sweetness) items[items.length - 1].sweetness = `${sweetness[1]}%` as "50%" | "100%";
  }

  const itemTotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const summaryMatches = grossTotal > 0 && Math.abs(grossTotal - promotionAmount - netTotal) < 0.01;
  const itemsMatch = grossTotal > 0 && items.length > 0 && Math.abs(itemTotal - grossTotal) < 0.01;
  const totalCheck = grossTotal <= 0 || netTotal < 0
    ? "ข้อมูลยอดยังไม่ครบ"
    : summaryMatches && itemsMatch
      ? "ยอดรายการ ส่วนลด และยอดสุทธิตรงกัน"
      : summaryMatches
        ? "ยอดหลังหักส่วนลดตรง แต่ยอดรายการยังไม่ตรง"
        : "ยอดเงินไม่สัมพันธ์กัน กรุณาตรวจสอบ";

  return {
    orderNumber,
    channel: /LMF[-\s]?\d+|LINE\s*MAN|ไลน์แมน|สั่งเดลิเวอร/i.test(joined) ? "LINE MAN" : "",
    customerName,
    orderTime,
    paymentMethod,
    grossTotal,
    promotionName: promotionLine ? "ส่วนลดร้านค้า" : "",
    promotionAmount,
    netTotal,
    totalCheck,
    items,
    rawText
  };
}

export async function recognizeOrderImage(file: File, onProgress: (progress: OcrProgress) => void) {
  onProgress({ progress: 0.05, status: "loading-paddle" });
  const ocr = await getPaddleOcr();
  onProgress({ progress: 0.45, status: "detecting-text" });
  const [result] = await ocr.predict(file, {
    textDetLimitSideLen: 1920,
    textDetLimitType: "max",
    textDetMaxSideLimit: 2400,
    textRecScoreThresh: 0.35
  });
  onProgress({ progress: 0.9, status: "parsing-order" });
  const rawText = paddleItemsToText(result?.items || []);
  if (!rawText.trim()) throw new Error("ไม่พบข้อความในภาพ กรุณาใช้ภาพที่คมชัดและเห็นออเดอร์ครบ");
  return parseLineManOrderText(rawText);
}

async function getPaddleOcr() {
  if (!paddleOcrPromise) {
    paddleOcrPromise = createPaddleOcr().catch((error) => {
      paddleOcrPromise = null;
      throw error;
    });
  }
  return paddleOcrPromise;
}

async function createPaddleOcr() {
  const { PaddleOCR } = await import("@paddleocr/paddleocr-js");
  return PaddleOCR.create({
    worker: true,
    textDetectionModelName: "PP-OCRv5_mobile_det",
    textDetectionModelAsset: {
      url: `${PADDLE_MODEL_BASE}/PP-OCRv5_mobile_det_onnx_infer.tar`
    },
    textRecognitionModelName: "th_PP-OCRv5_mobile_rec",
    textRecognitionModelAsset: {
      url: `${PADDLE_MODEL_BASE}/th_PP-OCRv5_mobile_rec_onnx_infer.tar`
    },
    textDetectionBatchSize: 1,
    textRecognitionBatchSize: 6,
    ortOptions: {
      backend: "wasm",
      wasmPaths: ORT_WASM_BASE,
      numThreads: 1,
      simd: true
    }
  });
}

type PaddleTextItem = {
  poly: Array<[number, number]>;
  text: string;
  score: number;
};

function paddleItemsToText(items: PaddleTextItem[]) {
  const boxes = items
    .filter((item) => item.text.trim() && item.score >= 0.35 && item.poly.length > 0)
    .map((item) => {
      const xs = item.poly.map((point) => point[0]);
      const ys = item.poly.map((point) => point[1]);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      return {
        text: cleanLine(item.text),
        minX: Math.min(...xs),
        minY,
        maxY,
        centerY: (minY + maxY) / 2,
        height: Math.max(1, maxY - minY)
      };
    })
    .sort((left, right) => left.centerY - right.centerY || left.minX - right.minX);

  const rows: typeof boxes[] = [];
  for (const box of boxes) {
    let row: typeof boxes | undefined;
    for (let index = rows.length - 1; index >= 0; index -= 1) {
      const candidate = rows[index];
      const reference = candidate[0];
      const tolerance = Math.max(reference.height, box.height) * 0.55;
      if (Math.abs(reference.centerY - box.centerY) <= tolerance) {
        row = candidate;
        break;
      }
    }
    if (row) row.push(box);
    else rows.push([box]);
  }

  return rows
    .map((row) => row.sort((left, right) => left.minX - right.minX).map((box) => box.text).join(" "))
    .join("\n");
}
