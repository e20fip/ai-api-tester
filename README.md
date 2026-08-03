# AI API Test

AI API Test เป็นแอปพลิเคชันบนเว็บที่สร้างขึ้นด้วย React และ Vite สำหรับใช้ในการทดสอบ AI APIs โดยมีหน้าจอที่ใช้งานง่ายและสะดวกสบาย

## ฟีเจอร์หลัก

แอปพลิเคชันนี้มีหน้าจอที่รองรับรูปแบบการทดสอบที่แตกต่างกัน:

- **Chat View (`ChatView`)**: หน้าจอสำหรับการสนทนากับ AI ในรูปแบบแชท
- **Playground View (`PlaygroundView`)**: หน้าจอสำหรับปรับแต่งพารามิเตอร์ต่างๆ และทดสอบ Prompts อย่างละเอียด
- **Raw Request View (`RawRequestView`)**: หน้าจอสำหรับดูและแก้ไข API Requests และ Responses ในรูปแบบข้อมูลดิบ (Raw Data)

## เทคโนโลยีที่ใช้

- **React 19**
- **Vite**
- **Lucide React** (สำหรับไอคอน)
- **Highlight.js** (สำหรับทำไฮไลต์โค้ด)
- **Vanilla CSS**

## การติดตั้งและการรันโปรเจกต์

ทำตามขั้นตอนด้านล่างเพื่อตั้งค่าและรันโปรเจกต์ในเครื่องของคุณ

### สิ่งที่ต้องมีเบื้องต้น

- Node.js (แนะนำให้ใช้เวอร์ชัน 18 ขึ้นไป)
- npm หรือ yarn

### ขั้นตอนการติดตั้ง

1. โคลน Repository หรือเข้าไปที่โฟลเดอร์ของโปรเจกต์:
   ```bash
   cd "AI API Test"
   ```

2. ติดตั้งแพ็กเกจที่จำเป็น:
   ```bash
   npm install
   ```

### การรันเซิร์ฟเวอร์สำหรับการพัฒนา (Development)

รันคำสั่งเพื่อเริ่ม Vite development server:
```bash
npm run dev
```

หลังจากเซิร์ฟเวอร์เริ่มทำงาน คุณสามารถเปิดดูเว็บแอปพลิเคชันได้ที่ URL ที่แสดงบน Terminal (โดยปกติจะเป็น `http://localhost:5173/`)

### การ Build สำหรับ Production

หากต้องการ Build แอปพลิเคชันเพื่อนำไปใช้งานจริง ให้รันคำสั่ง:
```bash
npm run build
```

หากต้องการพรีวิว Production build ในเครื่อง สามารถใช้คำสั่ง:
```bash
npm run preview
```

## โครงสร้างโปรเจกต์

- `src/`
  - `components/`: คอมโพเนนต์ React ที่สามารถนำกลับมาใช้ใหม่ได้ (Layout, Chat, Common)
  - `views/`: คอมโพเนนต์หน้าจอหลัก (ChatView, PlaygroundView, RawRequestView)
  - `context/`: React context สำหรับจัดการ State (AppContext)
  - `services/`: ไฟล์สำหรับการเชื่อมต่อ API และ Mock services
  - `utils/`: ฟังก์ชันการทำงานต่างๆ (Utility functions)
  - `assets/`: ไฟล์รูปภาพหรือ Assets อื่นๆ
  - `App.jsx`: โครงสร้างหลักของแอปพลิเคชัน
  - `main.jsx`: จุดเริ่มต้นการทำงาน (Entry point) ของแอปพลิเคชัน
  - `index.css`: สไตล์ชีตหลักของระบบ