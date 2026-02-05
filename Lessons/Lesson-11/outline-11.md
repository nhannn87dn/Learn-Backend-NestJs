# Lesson 11 - NoSQL with MongoDB

## 1. Giới thiệu NoSQL và MongoDB

* Khái niệm NoSQL
  * Tại sao ra đời NoSQL? (Vấn đề của SQL ở quy mô lớn)
  * CAP Theorem cơ bản
* Các loại cơ sở dữ liệu NoSQL
  * Document Store (MongoDB, CouchDB)
  * Key-Value Store (Redis, DynamoDB)
  * Column-Family (Cassandra, HBase)
  * Graph Database (Neo4j)
* Giới thiệu về MongoDB
* Ưu điểm và nhược điểm của MongoDB
* So sánh MongoDB với PostgreSQL/MySQL
  * Khi nào dùng MongoDB?
  * Khi nào dùng SQL?
  * Bảng so sánh chi tiết (Schema, Transaction, Join, Scale...)
* Cấu trúc dữ liệu trong MongoDB
  * Database
  * Collection
  * Document
  * Field
  * BSON vs JSON
* Ứng dụng thực tế của MongoDB
  * Content Management Systems
  * Real-time Analytics
  * IoT Data
  * Social Networks
  * E-commerce Product Catalogs

## 2. Cài đặt MongoDB và kết nối với NestJS

* Cài đặt MongoDB trên máy tính cá nhân
  * Windows, macOS, Linux
  * Docker (khuyến nghị) 
* Sử dụng dịch vụ MongoDB Atlas (Cloud)
  * Tạo cluster miễn phí
  * Cấu hình network access và database user
* MongoDB Compass - GUI Tool 
* Kết nối MongoDB với ứng dụng NestJS
  * Cấu hình connection string
  * Environment variables cho dev/prod
* Health Check & Connection Pooling 

## 3. Sử dụng Mongoose với NestJS

* Giới thiệu về Mongoose
  * ODM (Object Document Mapper) là gì?
  * Tại sao cần Mongoose? (vs MongoDB Native Driver)
* Cài đặt Mongoose trong dự án NestJS
  * @nestjs/mongoose
  * mongoose
* Tạo module Mongoose trong NestJS
  * MongooseModule.forRoot()
  * MongooseModule.forRootAsync() với ConfigService
* Mongoose Schema Types 
  * String, Number, Date, Boolean
  * ObjectId, Array, Mixed
  * Buffer, Decimal128

## 4. Tạo Schema và Model với Mongoose

* Định nghĩa Schema trong Mongoose
  * Schema definition
  * Schema options (timestamps, versionKey, collection name)
* Tạo Model từ Schema
* Sử dụng Decorators với Mongoose trong NestJS
  * @Schema()
  * @Prop()
  * @Prop() với options: required, unique, default, validate
* Schema Validation 
  * Built-in validators
  * Custom validators
  * Schema methods và virtuals
* Indexes trong MongoDB 
  * Tạo index cho performance
  * Unique index
  * Compound index
  * Text index cho full-text search

## 5. CRUD cơ bản với Mongoose

* Tạo dữ liệu (Create)
  * create() vs save()
  * insertMany() cho bulk insert
* Đọc dữ liệu (Read)
  * find(), findOne(), findById()
  * Query operators ($eq, $ne, $gt, $lt, $in...)
  * Projection (select fields)
  * Lean queries cho performance 
* Cập nhật dữ liệu (Update)
  * updateOne(), updateMany()
  * findByIdAndUpdate(), findOneAndUpdate()
  * Update operators ($set, $inc, $push, $pull...)
  * Upsert option
* Xóa dữ liệu (Delete)
  * deleteOne(), deleteMany()
  * findByIdAndDelete()
  * Soft delete pattern

## 6. Quan hệ dữ liệu trong MongoDB

* Khi nào dùng Embedded vs References? 
  * One-to-One
  * One-to-Many
  * Many-to-Many
* Embedded Documents (Denormalization)
  * Ưu điểm: Performance, atomic operations
  * Nhược điểm: Data duplication, document size limit (16MB)
  * Ví dụ: User -> Address, Post -> Comments
* References (Normalization)
  * Manual references vs DBRefs
  * Ưu điểm: No duplication, flexible
  * Nhược điểm: Multiple queries, no joins
  * Ví dụ: User -> Posts, Order -> Products
* Hybrid Approach 
  * Kết hợp cả hai (store reference + frequently used fields)
