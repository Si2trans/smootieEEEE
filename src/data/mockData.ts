import type { Category, Ingredient, Recipe } from "../types/app";

export const categories: Category[] = [
  { id: "all", label: "ทั้งหมด", icon: "Store", color: "#3f8f18" },
  { id: "tea", label: "ชา", icon: "CupSoda", color: "#f2b634" },
  { id: "milk", label: "นม", icon: "Milk", color: "#77bfd3" },
  { id: "coffee", label: "กาแฟ", icon: "Coffee", color: "#8a4f1e" },
  { id: "smoothie", label: "สมูทตี้", icon: "Cherry", color: "#f04646" },
  { id: "soda", label: "โซดา", icon: "GlassWater", color: "#6ea4e8" }
];

export const ingredients: Ingredient[] = [
  { id: "ing_tea", name: "ผงชาไทย", category: "วัตถุดิบน้ำ", buyQty: 500, buyUnit: "g", buyPrice: 120, baseUnit: "g", costPerUnit: 0.24 },
  { id: "ing_milk", name: "นมสด", category: "วัตถุดิบน้ำ", buyQty: 2000, buyUnit: "ml", buyPrice: 95, baseUnit: "ml", costPerUnit: 0.0475 },
  { id: "ing_condensed", name: "นมข้นหวาน", category: "วัตถุดิบน้ำ", buyQty: 388, buyUnit: "g", buyPrice: 28, baseUnit: "g", costPerUnit: 0.072 },
  { id: "ing_creamer", name: "ครีมเทียมข้นจืด", category: "วัตถุดิบน้ำ", buyQty: 1000, buyUnit: "ml", buyPrice: 52, baseUnit: "ml", costPerUnit: 0.052 },
  { id: "ing_syrup", name: "น้ำเชื่อม", category: "วัตถุดิบน้ำ", buyQty: 750, buyUnit: "ml", buyPrice: 42, baseUnit: "ml", costPerUnit: 0.056 },
  { id: "ing_boba", name: "ไข่มุก", category: "ท็อปปิ้ง", buyQty: 1000, buyUnit: "g", buyPrice: 80, baseUnit: "g", costPerUnit: 0.08 },
  { id: "ing_cocoa", name: "ผงโกโก้", category: "วัตถุดิบน้ำ", buyQty: 500, buyUnit: "g", buyPrice: 135, baseUnit: "g", costPerUnit: 0.27 },
  { id: "ing_matcha", name: "มัทฉะ", category: "วัตถุดิบน้ำ", buyQty: 100, buyUnit: "g", buyPrice: 230, baseUnit: "g", costPerUnit: 2.3 },
  { id: "ing_cup16", name: "แก้ว 16 oz + ฝา", category: "บรรจุภัณฑ์", buyQty: 100, buyUnit: "piece", buyPrice: 250, baseUnit: "piece", costPerUnit: 2.5 }
];

export const recipes: Recipe[] = [
  {
    id: "rec_thai_boba",
    name: "ชาไทยไข่มุก",
    categoryId: "tea",
    imageKey: "thai",
    status: "ขายดี",
    prepTime: 5,
    sweetness: 75,
    sizeOz: 16,
    sellingPrice: 35,
    favorite: true,
    rating: 4.8,
    items: [
      { ingredientId: "ing_tea", amount: 12, unit: "g", note: "2 ช้อนโต๊ะ" },
      { ingredientId: "ing_milk", amount: 120, unit: "ml" },
      { ingredientId: "ing_condensed", amount: 25, unit: "g" },
      { ingredientId: "ing_creamer", amount: 20, unit: "ml" },
      { ingredientId: "ing_syrup", amount: 15, unit: "ml" },
      { ingredientId: "ing_boba", amount: 40, unit: "g" },
      { ingredientId: "ing_cup16", amount: 1, unit: "piece" }
    ],
    steps: ["ชงชาไทยกับน้ำร้อน คนให้ละลาย", "เติมนมข้นหวาน นมสด ครีมเทียม และน้ำเชื่อม", "เติมน้ำแข็ง เขย่าหรือคนให้เย็น", "เทใส่แก้ว ตามด้วยไข่มุก พร้อมเสิร์ฟ"]
  },
  {
    id: "rec_matcha",
    name: "ชาเขียวมัทฉะนมสด",
    categoryId: "tea",
    imageKey: "matcha",
    prepTime: 5,
    sweetness: 50,
    sizeOz: 16,
    sellingPrice: 45,
    favorite: true,
    rating: 4.6,
    items: [
      { ingredientId: "ing_matcha", amount: 5, unit: "g" },
      { ingredientId: "ing_milk", amount: 150, unit: "ml" },
      { ingredientId: "ing_syrup", amount: 15, unit: "ml" },
      { ingredientId: "ing_cup16", amount: 1, unit: "piece" }
    ],
    steps: ["ละลายมัทฉะกับน้ำอุ่น", "เติมนมสดและน้ำเชื่อม", "เทลงแก้วน้ำแข็ง"]
  },
  {
    id: "rec_cocoa",
    name: "โกโก้เย็น",
    categoryId: "milk",
    imageKey: "cocoa",
    prepTime: 5,
    sweetness: 65,
    sizeOz: 16,
    sellingPrice: 35,
    favorite: false,
    rating: 4.7,
    items: [
      { ingredientId: "ing_cocoa", amount: 18, unit: "g" },
      { ingredientId: "ing_milk", amount: 140, unit: "ml" },
      { ingredientId: "ing_condensed", amount: 20, unit: "g" },
      { ingredientId: "ing_cup16", amount: 1, unit: "piece" }
    ],
    steps: ["ละลายโกโก้กับน้ำร้อน", "ผสมนมและนมข้นหวาน", "เติมน้ำแข็งแล้วเสิร์ฟ"]
  },
  {
    id: "rec_pink",
    name: "นมชมพู",
    categoryId: "milk",
    imageKey: "pink",
    prepTime: 4,
    sweetness: 70,
    sizeOz: 16,
    sellingPrice: 30,
    favorite: false,
    rating: 4.6,
    items: [
      { ingredientId: "ing_milk", amount: 160, unit: "ml" },
      { ingredientId: "ing_syrup", amount: 25, unit: "ml" },
      { ingredientId: "ing_cup16", amount: 1, unit: "piece" }
    ],
    steps: ["ผสมนมสดกับน้ำแดง", "เติมน้ำแข็ง คนให้เย็น"]
  },
  {
    id: "rec_caramel",
    name: "คาราเมลมัคคิอาโต้",
    categoryId: "coffee",
    imageKey: "caramel",
    prepTime: 6,
    sweetness: 60,
    sizeOz: 16,
    sellingPrice: 55,
    favorite: true,
    rating: 4.8,
    items: [
      { ingredientId: "ing_milk", amount: 150, unit: "ml" },
      { ingredientId: "ing_syrup", amount: 20, unit: "ml" },
      { ingredientId: "ing_cup16", amount: 1, unit: "piece" }
    ],
    steps: ["เติมนมและน้ำแข็ง", "ราดคาราเมล", "ช็อตกาแฟด้านบน"]
  },
  {
    id: "rec_black_tea",
    name: "ชาดำเย็น",
    categoryId: "tea",
    imageKey: "blacktea",
    prepTime: 4,
    sweetness: 60,
    sizeOz: 16,
    sellingPrice: 25,
    favorite: false,
    rating: 4.5,
    items: [
      { ingredientId: "ing_tea", amount: 10, unit: "g" },
      { ingredientId: "ing_syrup", amount: 20, unit: "ml" },
      { ingredientId: "ing_cup16", amount: 1, unit: "piece" }
    ],
    steps: ["ชงชา", "เติมน้ำเชื่อม", "เทใส่แก้วน้ำแข็ง"]
  }
];
