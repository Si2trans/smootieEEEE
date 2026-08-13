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
POST /exec?action=saveDailyClosing
POST /exec?action=archiveSalesMonth
```

ถ้าจะอัปโหลดรูปผ่าน Google Drive ให้สร้างโฟลเดอร์รูป แล้วตั้ง Script Property:

```text
IMAGE_FOLDER_ID=your_google_drive_folder_id
```
