# Phần mở rộng

## Phần 6: Real-World Integration Examples

### 6.1 User Profile Management

* Upload avatar
* Resize và optimize
* Store in cloud
* Update database
* Return optimized URL

### 6.2 Document Management System

* Upload documents (PDF, DOCX)
* Virus scanning
* Metadata extraction
* Cloud storage
* Download with streaming
* Email document links

### 6.3 Media Library

* Multiple image upload
* Cloudinary integration
* Image transformations
* Gallery display
* Lazy loading

### 6.4 Video Platform

* Video upload
* Transcoding queue
* Thumbnail generation
* HLS streaming
* Progress tracking

### 6.5 Authentication Flow

* User registration
  * Upload profile picture
  * Send verification email
  * Email template
* Password reset
  * Send reset link
  * Token expiration
  * Confirmation email

### 6.6 E-commerce Order System

* Order confirmation email
* Invoice PDF attachment
* Shipping updates
* Email templates
* Tracking pixels

### 6.7 Backup & Export System

* Generate export file
* Large file handling
* Stream download
* Email download link
* Scheduled exports

---

## Phần 7: Performance & Optimization

### 7.1 Upload Optimization

* **Client-Side Optimization**
  * Image compression before upload
  * Preview before upload
  * Drag-and-drop UI
  * Progress indicators

* **Server-Side Optimization**
  * Validation early
  * Stream to cloud directly
  * Async processing
  * Background jobs for heavy tasks

* **Network Optimization**
  * Multipart upload for large files
  * Resume interrupted uploads
  * Parallel uploads
  * CDN for delivery

### 7.2 Storage Optimization

* **Cost Management**
  * Choose right storage class
  * Lifecycle policies
  * Delete unused files
  * Compression

* **Performance**
  * CDN integration
  * Caching strategies
  * Lazy loading
  * Responsive images

### 7.3 Email Optimization

* **Sending Performance**
  * Queue system
  * Batch processing
  * Rate limiting
  * Connection pooling

* **Template Performance**
  * Template caching
  * Pre-compiled templates
  * Minimize HTML size

---

## Phần 8: Security Considerations

### 8.1 File Upload Security

* **Input Validation**
  * File type whitelist
  * Size limits
  * Filename sanitization
  * Path traversal prevention

* **Malware Protection**
  * Virus scanning (ClamAV)
  * Sandbox execution
  * Content analysis

* **Access Control**
  * Authentication required
  * Authorization checks
  * Private file URLs
  * Presigned URL expiration

### 8.2 Cloud Storage Security

* **AWS S3 Security**
  * IAM policies
  * Bucket policies
  * ACL settings
  * Encryption at rest
  * Encryption in transit
  * Versioning

* **Access Management**
  * Temporary credentials
  * STS tokens
  * Presigned URLs
  * Public vs private files

### 8.3 Email Security

* **Authentication**
  * SPF records
  * DKIM signing
  * DMARC policy

* **Content Security**
  * Email injection prevention
  * XSS in templates
  * Sanitize user input
  * Rate limiting

* **Data Protection**
  * Encrypt sensitive data
  * GDPR compliance
  * Unsubscribe mechanism
  * Data retention policies


