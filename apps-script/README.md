# Apps Script Backend

ใช้ไฟล์ `Code.gs` นี้ใน Google Apps Script แล้ว deploy เป็น Web App

ค่า deploy ที่แนะนำ:

- Execute as: Me
- Who has access: Anyone with the link หรือ Only myself ตามรูปแบบใช้งาน

ชีตที่ต้องสร้าง:

- `Settings`
- `Categories`
- `Ingredients`
- `Recipes`
- `RecipeItems`
- `Favorites`
- `Sales`
- `SaleItems`
- `DailyClosings`
- `MonthlyArchives`

หลังอัปเดต `Code.gs` ให้รัน `setupSpreadsheet()` หนึ่งครั้ง ระบบจะเพิ่มชีตและหัวตารางที่ขาดโดยไม่ลบข้อมูลเดิม จากนั้น deploy Web App เป็นเวอร์ชันใหม่

การตั้งค่า GP และการเลือกวิธีคิดโปรโมชั่น:

ตั้งค่า GP แยก LINE MAN / Grab / ShopeeFood ได้ที่ “ตั้งค่า GP แต่ละแพลตฟอร์ม” ในหน้าบันทึกขาย หรือหน้าคำนวณต้นทุน > สรุปกำไร ค่าที่กรอกเป็น GP ก่อน VAT และบันทึกในชีต `Settings` ด้วย key `platform_gp_rates` (JSON) ผ่าน action `savePlatformGpRates` ใช้ร่วมกันทั้งหน้าขายและคำนวณราคา รองรับการบันทึกออฟไลน์และซิงก์เมื่อออนไลน์ ค่าเริ่มต้นยังคง 32.10% จนกว่าจะตั้งค่าใหม่

ยอดขายเก็บ `gp_rate` ของรายการไว้เสมอ เมื่อแก้ค่าตั้งจะมีผลกับรายการใหม่ ส่วนรายการเดิมและคิวออฟไลน์จะใช้อัตราของรายการนั้น ฝั่ง GS ต้องใช้ `gp_rate` ที่ส่งมาแทนการล็อกไว้ที่ 32.1% (ถ้าไม่ส่งอัตราจะใช้ค่าตั้งตามแพลตฟอร์ม) ช่อง GP ในหน้าคำนวณต้นทุนใช้ทดลองคำนวณได้โดยไม่เปลี่ยนค่าตั้งประจำ

ตัวอย่างจากใบแจ้งยอด: ตั้ง LINE MAN = 30%, ยอดขาย 125 บาท, โปรโมชั่นส่วนลดค่าส่ง 6.40 บาท, เลือกคิด GP ก่อนหักโปรโมชั่น → GP 37.50 + VAT 2.63 + ส่วนลดค่าส่ง 6.40 → รายรับสุทธิ 78.47 บาท

- `before_promotion`: ใช้ยอดก่อนหักโปรโมชั่นเป็นฐานคิด GP (คอลัมน์ `gp_calculation_basis` ในชีต `Sales`)
- `after_promotion`: ใช้ยอดหลังหักโปรโมชั่นเป็นฐานคิด GP (ค่าเริ่มต้นสำหรับรายการเก่า)

อัตรา GP ที่ตั้งเป็นอัตรา **ก่อน VAT** แล้วคิด VAT 7% ของค่า GP เพิ่มอีกครั้ง เช่น เมื่อตั้ง GP 32.10%, ยอดขาย 150 บาท ไม่มีส่วนลด: GP 48.15 บาท + VAT ของ GP 3.37 บาท = ค่าธรรมเนียมรวม 51.52 บาท เหลือรายรับสุทธิ 98.48 บาท

เพิ่มคอลัมน์ใน `Sales` อีก 2 ช่อง: `gp_vat_rate` และ `gp_vat_amount` โดยปัดค่า GP เป็นทศนิยม 2 ตำแหน่งก่อน แล้วคำนวณและปัด VAT เป็นทศนิยม 2 ตำแหน่ง จากนั้นรวมค่าธรรมเนียมและหักออกจากยอดหลังโปรโมชั่น

ตัวอย่างยอดขาย 100 บาท ส่วนลด 10 บาท: เมื่อคิด GP ก่อนโปรโมชั่น จะหัก GP 32.10 บาท + VAT 2.25 บาท เหลือ 55.65 บาท เมื่อคิด GP หลังโปรโมชั่น จะหัก GP 28.89 บาท + VAT 2.02 บาท เหลือ 59.09 บาท

รายการใหม่ส่ง `gp_vat_rate: 7` ส่วนรายการเก่าและคิวออฟไลน์ที่ไม่มีข้อมูล VAT จะใช้ `gp_vat_rate: 0` เพื่อคงสูตรเดิม รวมถึงเมื่อเปิดแก้ไข ไม่คำนวณยอดเก่าย้อนหลังอัตโนมัติ รายการหน้าร้านไม่มี GP จึงไม่มี VAT ของ GP

**ขั้นตอนอัปเดต:** วาง `Code.gs` ฉบับเต็ม → รัน `setupSpreadsheet()` หนึ่งครั้งเพื่อเพิ่มคอลัมน์โดยรักษาข้อมูลเดิม → ไปที่ Deploy > Manage deployments > Edit > New version > Deploy โดยใช้ Web App URL เดิม ต้อง deploy backend ฉบับนี้ก่อนบันทึกรายการด้วยสูตรใหม่ มิฉะนั้น backend เก่าจะไม่หัก VAT ของ GP

การจัดเก็บรายเดือนทำจากหน้า `ขาย > ภาพรวมยอดขาย > จัดเก็บข้อมูลรายเดือน` โดยทำได้เฉพาะเดือนที่จบแล้ว ระบบจะบันทึกสรุปรายวันลง `MonthlyArchives` ก่อน แล้วจึงลบรายการดิบของเดือนนั้นจาก `Sales`, `SaleItems` และ `DailyClosings`

ตัวอย่าง API:

```text
GET  /exec?action=getBootstrapData
GET  /exec?action=getRecipe&id=rec_thai_boba
POST /exec?action=saveIngredient
POST /exec?action=saveRecipe
POST /exec?action=calculateCost
POST /exec?action=uploadRecipeImage
POST /exec?action=saveSale
POST /exec?action=savePlatformGpRates
POST /exec?action=saveDailyClosing
POST /exec?action=archiveSalesMonth
```

ถ้าจะอัปโหลดรูปผ่าน Google Drive ให้สร้างโฟลเดอร์รูป แล้วตั้ง Script Property:

```text
IMAGE_FOLDER_ID=your_google_drive_folder_id
```
