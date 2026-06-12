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

ตัวอย่าง API:

```text
GET  /exec?action=getBootstrapData
GET  /exec?action=getRecipe&id=rec_thai_boba
POST /exec?action=saveIngredient
POST /exec?action=saveRecipe
POST /exec?action=calculateCost
POST /exec?action=uploadRecipeImage
```

ถ้าจะอัปโหลดรูปผ่าน Google Drive ให้สร้างโฟลเดอร์รูป แล้วตั้ง Script Property:

```text
IMAGE_FOLDER_ID=your_google_drive_folder_id
```
