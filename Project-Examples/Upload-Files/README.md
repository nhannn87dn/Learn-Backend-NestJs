Dựa vào tài liệu chính thức của NestJS, tôi sẽ tạo decorator `@UploadFile` tùy chỉnh với validation linh hoạt:Tôi đã tạo implementation đầy đủ cho `@UploadFile` decorator dựa trên tài liệu chính thức của NestJS. Đây là những điểm chính:

## **🎯 Tính năng chính:**

### **1. Custom Decorators**
- **`@UploadFile()`** - Upload single file
- **`@UploadFiles()`** - Upload multiple files

### **2. Validation linh hoạt**
- ✅ **Extension validation** - Kiểm tra đuôi file
- ✅ **Size validation** - Giới hạn dung lượng
- ✅ **MIME type validation** - Bảo mật kép
- ✅ **Required/Optional** - File bắt buộc hoặc không

### **3. Dynamic destination paths**
```typescript
// Avatar uploads
@UploadFile({
  destination: './uploads/avatars',
  allowedExtensions: ['.jpg', '.png'],
  maxSize: 5 * 1024 * 1024
})

// Document uploads  
@UploadFile({
  destination: './uploads/documents',
  allowedExtensions: ['.pdf', '.docx'],
  maxSize: 10 * 1024 * 1024
})
```

### **4. Hai cách sử dụng**

#### **Cách 1: Custom Decorator** (Đơn giản, dễ dùng)
```typescript
@Post('avatar')
@UploadFile({
  destination: './uploads/avatars',
  allowedExtensions: ['.jpg', '.png'],
  maxSize: 5 * 1024 * 1024
})
uploadAvatar(@UploadedFile() file: Express.Multer.File) {
  // File đã được validate
}
```

#### **Cách 2: NestJS ParseFilePipeBuilder** (Chuẩn NestJS)
```typescript
@Post('avatar')
@UploadFile({ destination: './uploads/avatars' })
uploadAvatar(
  @UploadedFile(
    new ParseFilePipeBuilder()
      .addFileTypeValidator({ fileType: /(jpg|png)$/ })
      .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
      .build()
  ) file: Express.Multer.File
) {}
```

## **📁 File Structure:**
```
src/
├── common/
│   ├── config/
│   │   └── multer.config.ts
│   ├── decorators/
│   │   ├── upload-file.decorator.ts
│   │   └── upload-files.decorator.ts
│   └── pipes/
│       └── file-validation.pipe.ts
└── modules/
    └── upload/
        └── upload.module.ts
```

## **🔒 Security Features:**
1. **Filename sanitization** - Loại bỏ ký tự đặc biệt
2. **UUID generation** - Tên file unique
3. **MIME type check** - Không chỉ dựa vào extension
4. **Directory creation** - Tự động tạo folder nếu chưa tồn tại
5. **File size limits** - Giới hạn dung lượng

## **📦 Dependencies cần cài:**
```bash
npm install @nestjs/platform-express
npm install multer
npm install uuid
npm install -D @types/multer @types/uuid
```

## **🎨 Error Codes:**
- `FILE_001` - File required but not provided
- `FILE_002` - Invalid file extension
- `FILE_003` - File size exceeds limit
- `FILE_004` - Invalid MIME type

Decorator này production-ready và follow đúng best practices của NestJS! Bạn muốn tôi thêm tính năng gì nữa không? (Ví dụ: image processing, S3 upload, virus scanning...)