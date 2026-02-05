# Lesson 13 - Upload & Streaming Files & Send Email NestJS

## Phần 1: File Upload Foundations

### 1.1 Giới thiệu về File Upload

* **Tại sao cần upload file?**
  * User avatars
  * Documents, attachments
  * Media content (images, videos)
  * Data imports (CSV, Excel)

* **File Upload Workflow**
  * Client → Server upload
  * Validation
  * Storage
  * Response with file URL

### 1.2 HTTP Multipart Form Data

* **Multipart/form-data là gì?**
  * Content-Type header
  * Boundary separator
  * Cấu trúc multipart request

* **Form Data vs JSON**
  * Khi nào dùng form-data
  * Mixed data (files + JSON)
  * Performance considerations

---

## Phần 2: Upload File với Multer

### 2.1 Giới thiệu Multer

* **Multer là gì?**
  * Middleware cho multipart/form-data
  * Integration với NestJS
  * Platform support (Express vs Fastify)

* **Cài đặt Dependencies**

  ```bash
  # For Express
  npm install @nestjs/platform-express multer
  npm install -D @types/multer
  
  # For Fastify
  npm install @fastify/multipart
  ```

### 2.2 Basic File Upload

* **Single File Upload**
  * @UseInterceptors(FileInterceptor())
  * @UploadedFile() decorator
  * File object structure
  * Response với file info

* **Multiple Files Upload**
  * FilesInterceptor (array of files)
  * FileFieldsInterceptor (multiple fields)
  * AnyFilesInterceptor (any files)

* **Configuration Options**
  * Storage destination
  * File size limits
  * File count limits

### 2.3 Custom Storage Configuration

* **Disk Storage**
  * Custom destination folder
  * Dynamic folder structure (by date, user)
  * Custom filename generation
  * Preserve original filename
  * Handle duplicate filenames

* **Memory Storage**
  * Store in memory (Buffer)
  * Use cases
  * Memory limitations
  * When to use vs disk storage

* **Example: Custom Storage**

  ```typescript
  const storage = diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + '-' + uniqueSuffix);
    },
  });
  ```

### 2.4 File Validation

* **Security Considerations**
  * File type validation
  * File size limits
  * Malware scanning
  * Path traversal prevention
  * File name sanitization

* **Built-in Validators**
  * ParseFilePipe
  * MaxFileSizeValidator
  * FileTypeValidator

* **Custom File Validators**
  * Implement FileValidator
  * MIME type validation
  * File extension validation
  * Magic number validation
  * Image dimension validation

* **Validation Examples**
  * Image files only (JPEG, PNG, GIF)
  * Document files (PDF, DOCX)
  * Size limits (MB restrictions)
  * Multiple validation rules

### 2.5 Advanced Upload Features

* **Custom Upload Decorator**
  * Create reusable decorator
  * Combine validation rules
  * Default configurations
  * Type-safe decorators

* **File Metadata Extraction**
  * Image metadata (EXIF)
  * File hash generation
  * Virus scanning integration
  * Content analysis

* **Error Handling**
  * File too large
  * Invalid file type
  * Upload failed
  * Disk space issues
  * Custom error messages

* **Upload Progress Tracking**
  * Client-side progress
  * Server-side events
  * Multipart upload for large files

---

## Phần 3: Cloud Storage Integration

### 3.1 Local Storage vs Cloud Storage

* **Comparison**
  * Scalability
  * Cost
  * Performance
  * Durability
  * Accessibility

* **When to use Cloud Storage?**
  * Large file volumes
  * Multiple servers
  * CDN integration
  * Backup và redundancy
  * Global distribution

### 3.2 AWS S3 Integration

* **AWS S3 Overview**
  * Buckets và Objects
  * Regions
  * Storage classes
  * Pricing model

* **Setup AWS SDK**

  ```bash
  npm install @aws-sdk/client-s3
  npm install @aws-sdk/s3-request-presigner
  ```

* **Configuration**
  * AWS credentials (IAM)
  * Access Key và Secret Key
  * Bucket configuration
  * Region setup
  * Environment variables

* **Upload to S3**
  * PutObjectCommand
  * Multipart upload
  * Upload from Buffer
  * Upload from Stream
  * Set ACL permissions

* **Advanced S3 Features**
  * Presigned URLs (upload & download)
  * Public vs Private files
  * S3 lifecycle policies
  * Versioning
  * Server-side encryption
  * CloudFront CDN integration

* **Error Handling**
  * Network errors
  * Permission denied
  * Bucket not found
  * Rate limiting

### 3.3 Cloudinary Integration

* **Cloudinary Overview**
  * Media management platform
  * Image/Video transformation
  * CDN delivery
  * Free tier options

* **Setup Cloudinary**

  ```bash
  npm install cloudinary
  ```

* **Configuration**
  * Cloud name, API key, API secret
  * Upload presets
  * Folder structure

* **Upload to Cloudinary**
  * Upload from local file
  * Upload from Buffer
  * Upload from URL
  * Resource type (image, video, raw)

* **Image Transformations**
  * Resize và crop
  * Format conversion
  * Quality optimization
  * Filters và effects
  * Watermarks
  * Responsive images

* **Advanced Cloudinary Features**
  * Video transcoding
  * Lazy loading
  * Auto-format và auto-quality
  * Face detection
  * AI-powered cropping
  * Cloudinary URLs

### 3.4 Alternative Cloud Storage

* **Google Cloud Storage**
  * Setup và configuration
  * Upload workflow
  * Comparison với S3

* **Azure Blob Storage**
  * Setup và configuration
  * Container management
  * SAS tokens

* **Digital Ocean Spaces**
  * S3-compatible API
  * Setup và usage

* **MinIO (Self-hosted S3)**
  * Installation
  * S3-compatible
  * Use cases

---

## Phần 4: File Streaming

### 4.1 Giới thiệu về Streaming

* **Streaming là gì?**
  * Chunk-by-chunk delivery
  * Memory efficiency
  * Real-time data flow

* **Tại sao cần Streaming?**
  * Large files (videos, archives)
  * Memory constraints
  * Faster initial response
  * Better user experience
  * Reduced server load

* **Streaming vs Download**
  * Load entire file vs chunks
  * Memory usage comparison
  * Use cases cho mỗi approach

### 4.2 StreamableFile trong NestJS

* **StreamableFile Class**
  * Import và usage
  * Buffer to stream
  * File to stream
  * Response headers

* **Basic File Streaming**

  ```typescript
  @Get('download/:filename')
  getFile(@Param('filename') filename: string) {
    const file = createReadStream(join(process.cwd(), filename));
    return new StreamableFile(file);
  }
  ```

* **Set Response Headers**
  * Content-Type
  * Content-Disposition
  * Content-Length
  * Cache-Control

* **Download vs Inline Display**
  * Attachment header
  * Inline viewing
  * Browser handling

### 4.3 Advanced Streaming Techniques

* **Range Requests (Partial Content)**
  * HTTP Range header
  * Byte-range requests
  * Resume downloads
  * Video seeking
  * Implementation example

* **Streaming Large Files**
  * Chunked transfer encoding
  * Buffer management
  * Memory optimization
  * Error handling mid-stream

* **Transform Streams**
  * On-the-fly compression (gzip)
  * Image resizing while streaming
  * Video transcoding
  * Encryption/Decryption

### 4.4 Streaming từ Cloud Storage

* **Stream from AWS S3**
  * GetObjectCommand
  * S3 stream to client
  * Signed URLs với expiration
  * Performance optimization

* **Stream from Cloudinary**
  * Direct URL streaming
  * Transformation URLs
  * Video streaming

* **CDN Integration**
  * Cache-Control headers
  * Edge caching
  * Invalidation strategies

### 4.5 Video Streaming

* **Video Streaming Basics**
  * Progressive download
  * Adaptive bitrate streaming
  * HLS (HTTP Live Streaming)
  * DASH (Dynamic Adaptive Streaming)

* **Implementation**
  * Video chunks
  * M3U8 playlists
  * Multiple quality levels
  * Subtitle support

### 4.6 Real-time Streaming

* **Server-Sent Events (SSE)**
  * One-way server to client
  * Real-time updates
  * Log streaming
  * Progress updates

* **WebSocket Streaming**
  * Bi-directional streaming
  * File upload progress
  * Chat with file sharing

---

## Phần 5: Email Integration

### 5.1 Giới thiệu về Email trong Web Apps

* **Tại sao cần gửi email?**
  * User notifications
  * Account verification
  * Password reset
  * Newsletters
  * Transactional emails
  * Reports và invoices

* **Email Protocols**
  * SMTP (Simple Mail Transfer Protocol)
  * IMAP vs POP3
  * TLS/SSL encryption

* **Email Service Providers**
  * Gmail SMTP
  * SendGrid
  * AWS SES
  * Mailgun
  * Mailtrap (testing)
  * Resend
  * Comparison và pricing

### 5.2 Setup NestJS Mailer Module

* **Installation**

  ```bash
  npm install @nestjs-modules/mailer nodemailer
  npm install -D @types/nodemailer
  ```

* **Configuration**
  * SMTP settings
  * Authentication
  * TLS/SSL setup
  * Environment variables
  * Multiple transports

* **MailerModule Setup**
  * Global module
  * Async configuration
  * Template engine integration

### 5.3 Sending Basic Emails

* **Simple Text Email**

  ```typescript
  await this.mailerService.sendMail({
    to: 'user@example.com',
    subject: 'Welcome',
    text: 'Welcome to our app!',
  });
  ```

* **HTML Email**
  * Rich formatting
  * Inline styles
  * Images và links
  * Email clients compatibility

* **Email Options**
  * From, To, CC, BCC
  * Reply-To
  * Priority
  * Headers
  * Custom metadata

### 5.4 Email Templates

* **Template Engines**
  * Handlebars
  * Pug
  * EJS
  * Comparison

* **Setup Handlebars**
  * Template directory structure
  * Partials và layouts
  * Helper functions
  * Context data

* **Creating Templates**
  * HTML structure
  * CSS inline styles
  * Responsive design
  * Email-safe HTML
  * Testing across clients

* **Dynamic Content**
  * Variable injection
  * Conditional rendering
  * Loops và iterations
  * Localization

* **Template Examples**
  * Welcome email
  * Email verification
  * Password reset
  * Order confirmation
  * Weekly newsletter

### 5.5 Email Attachments

* **Attach Files**
  * From file path
  * From buffer
  * From URL
  * Multiple attachments

* **Attachment Types**
  * Documents (PDF, DOCX)
  * Images
  * Invoices
  * Reports

* **Inline Attachments**
  * Embed images in HTML
  * CID (Content-ID)
  * Logo và branding

* **Large Attachments**
  * Size limitations
  * Alternative: cloud links
  * Compression strategies

