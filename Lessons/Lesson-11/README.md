# Lesson 11 - NoSQL with MongoDB

## 1. Giới thiệu NoSQL và MongoDB

### 1.1. Khái niệm NoSQL

**NoSQL** (Not Only SQL) là thuật ngữ chỉ các hệ quản trị cơ sở dữ liệu phi quan hệ, được thiết kế để giải quyết những hạn chế của cơ sở dữ liệu quan hệ truyền thống (SQL) trong bối cảnh ứng dụng hiện đại.

#### Tại sao ra đời NoSQL?

Để hiểu tại sao NoSQL ra đời, chúng ta cần xem xét những thách thức mà SQL gặp phải ở quy mô lớn:

**Vấn đề 1: Schema cứng nhắc (Rigid Schema)**

Trong SQL, bạn phải định nghĩa schema trước khi lưu dữ liệu:

```sql
-- SQL: Phải định nghĩa chặt chẽ
CREATE TABLE users (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100),
  age INT
);

-- Nếu muốn thêm field mới, phải ALTER TABLE
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
```

**Vấn đề**: Trong thời đại agile, requirements thay đổi liên tục. Việc thay đổi schema trong production database rất phức tạp và có thể gây downtime.

**Giải pháp NoSQL**: Schema linh hoạt

```javascript
// MongoDB: Lưu document với structure khác nhau
db.users.insert({ name: "John", email: "john@example.com", age: 25 })
db.users.insert({ name: "Jane", email: "jane@example.com", address: { city: "Hanoi" } })
// Không cần định nghĩa schema trước!
```

**Vấn đề 2: Khó scale theo chiều ngang (Horizontal Scaling)**

SQL databases thường scale theo chiều dọc (vertical scaling - tăng RAM, CPU của một server):

```
SQL Traditional Scaling:
┌─────────────┐
│  Server 1   │  → Tăng RAM: 16GB → 32GB → 64GB
│  (MySQL)    │  → Tăng CPU: 4 cores → 8 cores
└─────────────┘
Giới hạn: Chi phí tăng theo cấp số nhân, có điểm giới hạn phần cứng
```

NoSQL được thiết kế để scale ngang (horizontal scaling - thêm nhiều server):

```
NoSQL Horizontal Scaling:
┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐
│ Node1│  │ Node2│  │ Node3│  │ Node4│
└──────┘  └──────┘  └──────┘  └──────┘
   ↓         ↓         ↓         ↓
Dữ liệu được phân tán tự động (Sharding)
Chi phí tuyến tính, không có giới hạn lý thuyết
```

**Vấn đề 3: Performance với Big Data**

Với SQL, khi dữ liệu lớn, JOIN operations rất chậm:

```sql
-- Query này có thể mất vài giây với millions records
SELECT u.name, p.title, c.content
FROM users u
JOIN posts p ON u.id = p.user_id
JOIN comments c ON p.id = c.post_id
WHERE u.country = 'Vietnam';
```

NoSQL sử dụng denormalization để tránh JOIN:

```javascript
// Tất cả dữ liệu trong 1 document
{
  _id: "post123",
  title: "My Post",
  author: {
    name: "John",
    country: "Vietnam"
  },
  comments: [
    { content: "Great post!", author: "Jane" },
    { content: "Thanks!", author: "Bob" }
  ]
}
// Đọc 1 lần, không cần JOIN → Rất nhanh!
```

#### CAP Theorem cơ bản

CAP Theorem là nguyên lý quan trọng nhất trong distributed systems, phát biểu rằng một hệ thống phân tán chỉ có thể đảm bảo **tối đa 2 trong 3** đặc tính sau:

**C - Consistency (Tính nhất quán)**
- Mọi node đều thấy cùng dữ liệu tại cùng thời điểm
- Đọc luôn trả về dữ liệu mới nhất

**A - Availability (Tính khả dụng)**
- Hệ thống luôn phản hồi request (dù có thể không phải dữ liệu mới nhất)
- Không có downtime

**P - Partition Tolerance (Chịu lỗi phân vùng)**
- Hệ thống vẫn hoạt động khi có sự cố network giữa các node

**Ví dụ minh họa:**

```
Scenario: E-commerce với 2 database nodes

┌─────────┐         Network         ┌─────────┐
│  Node A │ ════════X════════ │  Node B │
│ Stock: 5│                          │ Stock: 5│
└─────────┘                          └─────────┘

Network bị lỗi (Partition xảy ra)

Request 1 → Node A: Mua 3 sản phẩm
Request 2 → Node B: Mua 4 sản phẩm

Lựa chọn:
1. CP (Consistency + Partition Tolerance):
   → Từ chối request để đảm bảo consistency
   → Availability bị ảnh hưởng (downtime)
   
2. AP (Availability + Partition Tolerance):
   → Chấp nhận cả 2 request
   → Consistency bị ảnh hưởng (oversell: 7 > 5)
   
3. CA (Consistency + Availability):
   → Không thể đạt được khi có partition
   → Không phù hợp với distributed system
```

**Các hệ thống lựa chọn:**
- **SQL (MySQL, PostgreSQL)**: CA → CP khi có replication
- **MongoDB**: CP → Ưu tiên Consistency
- **Cassandra, DynamoDB**: AP → Ưu tiên Availability

### 1.2. Các loại cơ sở dữ liệu NoSQL

#### Document Store (MongoDB, CouchDB)

Lưu trữ dữ liệu dưới dạng documents (JSON-like).

```javascript
// MongoDB Document
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  name: "John Doe",
  email: "john@example.com",
  addresses: [
    {
      type: "home",
      street: "123 Main St",
      city: "Hanoi",
      country: "Vietnam"
    },
    {
      type: "work",
      street: "456 Office Rd",
      city: "HCMC"
    }
  ],
  orders: [
    { orderId: "ORD001", total: 150.00 },
    { orderId: "ORD002", total: 200.00 }
  ],
  createdAt: ISODate("2024-01-15T10:30:00Z")
}
```

**Ưu điểm:**
- Schema linh hoạt
- Dễ map với objects trong code
- Truy vấn phong phú (aggregation, text search)

**Use cases:**
- Content Management Systems
- E-commerce product catalogs
- User profiles

#### Key-Value Store (Redis, DynamoDB)

Đơn giản nhất: mỗi key ánh xạ tới một value.

```javascript
// Redis Examples
SET user:1001:name "John Doe"
SET user:1001:email "john@example.com"
GET user:1001:name  // Returns: "John Doe"

// Session storage
SET session:abc123 '{"userId": 1001, "role": "admin"}' EX 3600

// Cache
SET product:detail:123 '{"name": "iPhone", "price": 999}' EX 300
```

**Ưu điểm:**
- Cực kỳ nhanh (in-memory)
- Đơn giản, dễ scale

**Nhược điểm:**
- Không có query phức tạp
- Chỉ lookup bằng key

**Use cases:**
- Caching
- Session management
- Rate limiting
- Leaderboards

#### Column-Family (Cassandra, HBase)

Lưu trữ dữ liệu theo cột thay vì hàng.

```
Row-based (SQL):
Row 1: | id:1 | name:John  | age:25 | city:Hanoi |
Row 2: | id:2 | name:Jane  | age:30 | city:HCMC  |

Column-based (Cassandra):
Column Family "users":
  RowKey 1 → name:John,  age:25, city:Hanoi
  RowKey 2 → name:Jane,  age:30, city:HCMC
  
Data được lưu theo cột:
  name column: [John, Jane, ...]
  age column:  [25, 30, ...]
```

**Ưu điểm:**
- Cực tốt cho analytical queries (đọc 1 vài cột từ nhiều rows)
- Write performance cao
- Scale cực tốt

**Use cases:**
- Time-series data
- Analytics
- IoT sensor data

#### Graph Database (Neo4j)

Lưu trữ relationships giữa các entities.

```cypher
// Neo4j Example
// Nodes
(john:Person {name: "John", age: 25})
(jane:Person {name: "Jane", age: 30})
(google:Company {name: "Google"})

// Relationships
(john)-[:FRIEND_WITH {since: 2020}]->(jane)
(john)-[:WORKS_AT {position: "Engineer"}]->(google)
(jane)-[:WORKS_AT {position: "Manager"}]->(google)

// Query: Tìm bạn bè của bạn bè
MATCH (me:Person {name: "John"})-[:FRIEND_WITH]->(friend)-[:FRIEND_WITH]->(fof)
RETURN fof.name
```

**Ưu điểm:**
- Truy vấn relationships cực nhanh
- Tự nhiên cho social networks

**Use cases:**
- Social networks
- Recommendation engines
- Fraud detection

### 1.3. Giới thiệu về MongoDB

MongoDB là document-oriented NoSQL database phổ biến nhất hiện nay.

**Đặc điểm chính:**

1. **Document-based**: Dữ liệu lưu dưới dạng BSON (Binary JSON)
2. **Schema-less**: Không cần định nghĩa schema trước
3. **Distributed**: Hỗ trợ sharding và replication tự động
4. **Rich queries**: Hỗ trợ aggregation framework mạnh mẽ
5. **ACID transactions**: Từ version 4.0+

### 1.4. Ưu điểm và nhược điểm của MongoDB

#### Ưu điểm

**1. Flexibility (Linh hoạt)**

```javascript
// Không cần migration khi thêm field mới
// Document 1 (old structure)
{
  _id: 1,
  name: "John",
  email: "john@example.com"
}

// Document 2 (new structure) - Thêm ngay không cần ALTER TABLE
{
  _id: 2,
  name: "Jane",
  email: "jane@example.com",
  phoneNumber: "+84987654321",
  socialLinks: {
    facebook: "jane.doe",
    twitter: "@janedoe"
  }
}
```

**2. Performance cho read-heavy workloads**

```javascript
// Embedded data → 1 query
db.posts.findOne({ _id: "post123" })
// Returns:
{
  _id: "post123",
  title: "My Post",
  content: "...",
  author: {
    id: "user456",
    name: "John Doe",
    avatar: "avatar.jpg"
  },
  comments: [...],
  tags: [...]
}

// So với SQL cần multiple JOINs:
SELECT p.*, u.name, u.avatar, c.*, t.*
FROM posts p
JOIN users u ON p.author_id = u.id
JOIN comments c ON c.post_id = p.id
JOIN post_tags pt ON pt.post_id = p.id
JOIN tags t ON pt.tag_id = t.id
WHERE p.id = 'post123';
```

**3. Horizontal scaling dễ dàng**

```javascript
// Sharding tự động
sh.shardCollection("mydb.users", { "country": 1 })

// Dữ liệu tự động phân tán:
Shard 1: Users từ countries A-M
Shard 2: Users từ countries N-Z
```

**4. Developer-friendly**

```javascript
// Document structure giống object trong code
class User {
  constructor(name, email, addresses) {
    this.name = name;
    this.email = email;
    this.addresses = addresses; // Array of objects
  }
}

// Lưu trực tiếp không cần ORM mapping phức tạp
db.users.insertOne(new User("John", "john@example.com", [...]));
```

#### Nhược điểm

**1. Không có ACID transactions mạnh như SQL** (trước version 4.0)

```javascript
// MongoDB (trước 4.0): Atomic chỉ ở document level
db.accounts.updateOne(
  { _id: "acc1" },
  { $inc: { balance: -100 } }
); // ✓ Atomic

db.accounts.updateOne(
  { _id: "acc2" },
  { $inc: { balance: 100 } }
); // ✓ Atomic

// Nhưng giữa 2 operations không atomic → có thể mất tiền!
```

**2. JOIN kém hiệu quả**

```javascript
// MongoDB $lookup (tương đương JOIN) chậm
db.orders.aggregate([
  {
    $lookup: {
      from: "products",
      localField: "productId",
      foreignField: "_id",
      as: "productDetails"
    }
  }
]);
// Performance kém hơn SQL JOIN đáng kể
```

**3. Data duplication**

```javascript
// Denormalization → Duplicate data
{
  _id: "order1",
  product: {
    id: "prod123",
    name: "iPhone 15",
    price: 999
  }
}
{
  _id: "order2",
  product: {
    id: "prod123",
    name: "iPhone 15",  // Duplicate!
    price: 999          // Nếu price thay đổi?
  }
}
```

**4. Memory usage cao**

```javascript
// Document size limit: 16MB
// Field names được lưu trong mỗi document
{
  "veryLongFieldNameThatTakesUpSpace": "value1",
  "anotherVeryLongFieldName": "value2"
}
// × 1 million documents = waste nhiều storage
```

### 1.5. So sánh MongoDB với PostgreSQL/MySQL

#### Khi nào dùng MongoDB?

**✅ Use MongoDB when:**

**1. Schema thay đổi thường xuyên**

```javascript
// E-commerce product catalog
// Mỗi loại sản phẩm có attributes khác nhau

// Laptop
{
  type: "laptop",
  brand: "Dell",
  cpu: "Intel i7",
  ram: "16GB",
  storage: "512GB SSD"
}

// T-shirt
{
  type: "tshirt",
  brand: "Nike",
  size: "L",
  color: "Blue",
  material: "Cotton"
}

// Dễ dàng thêm loại sản phẩm mới mà không cần migration
```

**2. Cần scale nhanh**

```javascript
// Startup đang grow exponentially
// Dễ dàng thêm shards khi traffic tăng
```

**3. Document-centric data**

```javascript
// Content Management System
{
  _id: "article123",
  title: "Introduction to MongoDB",
  author: {
    name: "John Doe",
    bio: "...",
    avatar: "..."
  },
  content: "...",
  media: [
    { type: "image", url: "..." },
    { type: "video", url: "..." }
  ],
  metadata: {
    views: 1000,
    likes: 50,
    tags: ["database", "nosql"]
  }
}
```

**4. Real-time analytics**

```javascript
// IoT sensor data
{
  sensorId: "temp_sensor_01",
  timestamp: ISODate("2024-02-06T10:30:00Z"),
  temperature: 25.5,
  humidity: 60,
  location: { lat: 21.0285, lng: 105.8542 }
}
// Insert millions records/second
```

#### Khi nào dùng SQL?

**✅ Use SQL (PostgreSQL/MySQL) when:**

**1. Cần ACID transactions nghiêm ngặt**

```sql
-- Banking system: Transfer money
BEGIN TRANSACTION;
  UPDATE accounts SET balance = balance - 100 WHERE id = 1;
  UPDATE accounts SET balance = balance + 100 WHERE id = 2;
  -- Nếu bất kỳ step nào fail → ROLLBACK tất cả
COMMIT;
```

**2. Complex queries với JOINs**

```sql
-- Reporting: Revenue by category, region, time
SELECT 
  c.name as category,
  r.name as region,
  DATE_TRUNC('month', o.created_at) as month,
  SUM(oi.quantity * oi.price) as revenue
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
JOIN categories c ON p.category_id = c.id
JOIN customers cu ON o.customer_id = cu.id
JOIN regions r ON cu.region_id = r.id
WHERE o.created_at >= '2024-01-01'
GROUP BY c.name, r.name, month
ORDER BY revenue DESC;
```

**3. Data integrity quan trọng**

```sql
-- Foreign key constraints
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id INT REFERENCES customers(id), -- Không thể tạo order cho customer không tồn tại
  total DECIMAL(10,2) CHECK (total >= 0)    -- Không thể có total âm
);
```

**4. Schema ổn định**

```sql
-- HR System: Employee records
-- Schema ít thay đổi, well-defined
CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  hire_date DATE NOT NULL,
  salary DECIMAL(10,2),
  department_id INT REFERENCES departments(id)
);
```

#### Bảng so sánh chi tiết

| Feature | MongoDB | PostgreSQL/MySQL |
|---------|---------|------------------|
| **Schema** | Schema-less, flexible | Rigid schema, migrations required |
| **Scaling** | Horizontal (sharding) | Vertical primarily |
| **Transactions** | Multi-document (4.0+), weaker guarantees | Full ACID, strong guarantees |
| **Joins** | $lookup (slow) | Native JOINs (fast) |
| **Query Language** | JavaScript-like | SQL |
| **Data Model** | Denormalized | Normalized |
| **Best for** | Unstructured, rapid development | Structured, complex queries |
| **Performance** | Read-heavy, simple queries | Complex analytical queries |
| **Data Integrity** | Application-level | Database-level (constraints, FKs) |

### 1.6. Cấu trúc dữ liệu trong MongoDB

#### Database

Container chứa collections.

```javascript
// List databases
show dbs

// Switch to database (tạo tự động nếu chưa tồn tại)
use myapp

// Current database
db
```

#### Collection

Tương đương table trong SQL, nhưng không có schema cố định.

```javascript
// Tạo collection
db.createCollection("users")

// Hoặc tạo tự động khi insert
db.products.insertOne({ name: "iPhone" }) // Collection "products" tự tạo

// List collections
show collections
```

#### Document

Một record trong collection, định dạng BSON.

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439011"),  // Primary key tự động
  name: "John Doe",
  email: "john@example.com",
  age: 25,
  isActive: true,
  roles: ["user", "admin"],
  address: {
    street: "123 Main St",
    city: "Hanoi",
    country: "Vietnam"
  },
  createdAt: ISODate("2024-02-06T10:30:00Z")
}
```

#### Field

Key-value pair trong document.

```javascript
{
  "name": "John Doe",        // Field: name
  "age": 25,                 // Field: age
  "address.city": "Hanoi"    // Nested field
}
```

#### BSON vs JSON

**JSON (JavaScript Object Notation)**

```json
{
  "name": "John",
  "age": 25,
  "createdAt": "2024-02-06T10:30:00Z"
}
```

**BSON (Binary JSON)**

```javascript
// BSON hỗ trợ thêm data types:
{
  _id: ObjectId("..."),           // ObjectId type
  name: "John",                   // String
  age: NumberInt(25),             // 32-bit integer
  balance: NumberDecimal("99.99"), // Decimal128
  avatar: BinData(...),           // Binary data
  createdAt: ISODate("..."),      // Date type
  metadata: {...}                 // Embedded document
}
```

**Tại sao BSON?**

1. **Rich data types**: Date, ObjectId, Binary, Decimal128
2. **Efficient**: Binary format → faster parsing
3. **Traversable**: Có thể skip fields mà không parse toàn bộ document

```javascript
// Performance comparison
JSON.parse('{"name":"John","age":25,...}')  // Phải parse hết
BSON.decode(buffer)                          // Có thể skip fields
```

### 1.7. Ứng dụng thực tế của MongoDB

#### Content Management Systems

```javascript
// Blog platform
{
  _id: ObjectId("..."),
  slug: "introduction-to-mongodb",
  title: "Introduction to MongoDB",
  content: "<p>MongoDB is a NoSQL database...</p>",
  author: {
    id: "user123",
    name: "John Doe",
    avatar: "https://..."
  },
  categories: ["Database", "NoSQL"],
  tags: ["mongodb", "nosql", "database"],
  media: [
    {
      type: "image",
      url: "https://...",
      caption: "MongoDB Logo"
    }
  ],
  seo: {
    metaTitle: "...",
    metaDescription: "...",
    keywords: [...]
  },
  status: "published",
  publishedAt: ISODate("2024-02-06T10:00:00Z"),
  stats: {
    views: 1000,
    likes: 50,
    shares: 10
  }
}
```

**Lý do dùng MongoDB:**
- Schema linh hoạt cho different content types
- Embedded documents cho related data (author, media)
- Fast reads cho high-traffic websites

#### Real-time Analytics

```javascript
// User activity tracking
{
  _id: ObjectId("..."),
  userId: "user123",
  sessionId: "session456",
  events: [
    {
      type: "page_view",
      page: "/products",
      timestamp: ISODate("2024-02-06T10:30:00Z"),
      metadata: {
        referrer: "google.com",
        device: "mobile"
      }
    },
    {
      type: "click",
      element: "buy_button",
      productId: "prod789",
      timestamp: ISODate("2024-02-06T10:31:00Z")
    }
  ]
}

// Aggregation for analytics
db.analytics.aggregate([
  { $match: { "events.type": "click" } },
  { $unwind: "$events" },
  { $group: {
    _id: "$events.element",
    count: { $sum: 1 }
  }},
  { $sort: { count: -1 } }
]);
```

#### IoT Data

```javascript
// Smart home sensors
{
  _id: ObjectId("..."),
  deviceId: "sensor_living_room_temp",
  deviceType: "temperature_sensor",
  location: {
    room: "living_room",
    coordinates: { lat: 21.0285, lng: 105.8542 }
  },
  readings: [
    {
      timestamp: ISODate("2024-02-06T10:00:00Z"),
      temperature: 25.5,
      humidity: 60
    },
    {
      timestamp: ISODate("2024-02-06T10:05:00Z"),
      temperature: 25.7,
      humidity: 61
    }
    // ... thousands of readings
  ]
}

// Time-series collection (MongoDB 5.0+)
db.createCollection("sensor_data", {
  timeseries: {
    timeField: "timestamp",
    metaField: "deviceId",
    granularity: "minutes"
  }
});
```

#### Social Networks

```javascript
// User profile
{
  _id: ObjectId("user123"),
  username: "johndoe",
  profile: {
    fullName: "John Doe",
    bio: "Software Engineer",
    avatar: "https://...",
    coverPhoto: "https://..."
  },
  friends: [
    "user456",
    "user789"
  ],
  posts: [
    {
      id: "post1",
      content: "Hello world!",
      createdAt: ISODate("..."),
      likes: ["user456", "user789"],
      comments: [
        {
          userId: "user456",
          content: "Great post!",
          createdAt: ISODate("...")
        }
      ]
    }
  ],
  settings: {
    privacy: "friends_only",
    notifications: true
  }
}
```

#### E-commerce Product Catalogs

```javascript
// Flexible product schema
{
  _id: ObjectId("prod123"),
  sku: "IPHONE-15-PRO-256-BLACK",
  name: "iPhone 15 Pro",
  category: "Electronics",
  subcategory: "Smartphones",
  
  // Different attributes for different products
  specs: {
    brand: "Apple",
    model: "iPhone 15 Pro",
    storage: "256GB",
    color: "Black",
    screenSize: "6.1 inch",
    camera: "48MP"
  },
  
  pricing: {
    basePrice: 999,
    discount: 10,
    finalPrice: 899,
    currency: "USD"
  },
  
  inventory: {
    warehouse1: 50,
    warehouse2: 30,
    totalAvailable: 80
  },
  
  media: [
    { type: "image", url: "https://...", isPrimary: true },
    { type: "video", url: "https://..." }
  ],
  
  reviews: [
    {
      userId: "user123",
      rating: 5,
      comment: "Excellent phone!",
      createdAt: ISODate("...")
    }
  ],
  
  seo: {
    slug: "iphone-15-pro-256gb-black",
    metaTitle: "iPhone 15 Pro 256GB - Best Price",
    keywords: ["iphone", "apple", "smartphone"]
  }
}
```

---

## 2. Cài đặt MongoDB và kết nối với NestJS

### 2.1. Cài đặt MongoDB trên máy tính cá nhân

#### Option 1: Docker (Khuyến nghị)

**Tại sao nên dùng Docker?**

1. **Isolated environment**: Không làm "bẩn" máy tính
2. **Consistent**: Giống môi trường production
3. **Easy cleanup**: Xóa container là xong
4. **Multiple versions**: Chạy nhiều version MongoDB cùng lúc

**Bước 1: Cài Docker Desktop**

- Download từ https://www.docker.com/products/docker-desktop
- Install và start Docker

**Bước 2: Tạo docker-compose.yml**

```yaml
# docker-compose.yml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0  # Latest stable version
    container_name: nestjs_mongodb
    restart: always
    ports:
      - "27017:27017"  # Port mapping: host:container
    environment:
      # Root credentials
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password123
      # Initial database
      MONGO_INITDB_DATABASE: myapp
    volumes:
      # Persist data
      - mongodb_data:/data/db
      # Persist config
      - mongodb_config:/data/configdb
    networks:
      - nestjs_network

  # Optional: Mongo Express (Web UI)
  mongo-express:
    image: mongo-express:latest
    container_name: mongo_express
    restart: always
    ports:
      - "8081:8081"
    environment:
      ME_CONFIG_MONGODB_ADMINUSERNAME: admin
      ME_CONFIG_MONGODB_ADMINPASSWORD: password123
      ME_CONFIG_MONGODB_URL: mongodb://admin:password123@mongodb:27017/
      ME_CONFIG_BASICAUTH_USERNAME: admin
      ME_CONFIG_BASICAUTH_PASSWORD: admin123
    depends_on:
      - mongodb
    networks:
      - nestjs_network

volumes:
  mongodb_data:
  mongodb_config:

networks:
  nestjs_network:
    driver: bridge
```

**Bước 3: Start containers**

```bash
# Start MongoDB
docker-compose up -d

# Check logs
docker-compose logs -f mongodb

# Stop MongoDB
docker-compose down

# Stop and remove all data
docker-compose down -v
```

**Bước 4: Connect to MongoDB**

```bash
# Via Docker
docker exec -it nestjs_mongodb mongosh -u admin -p password123

# Or via Mongo Express
# Open browser: http://localhost:8081
# Login: admin / admin123
```

#### Option 2: Native Installation

**Windows:**

```bash
# Download từ https://www.mongodb.com/try/download/community
# Chọn "MongoDB Community Server"
# Install với default settings

# Start MongoDB service
net start MongoDB

# Connect
mongosh
```

**macOS:**

```bash
# Via Homebrew
brew tap mongodb/brew
brew install mongodb-community@7.0

# Start service
brew services start mongodb-community@7.0

# Connect
mongosh
```

**Linux (Ubuntu):**

```bash
# Import public key
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# Create list file
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start service
sudo systemctl start mongod
sudo systemctl enable mongod

# Connect
mongosh
```

### 2.2. Sử dụng MongoDB Atlas (Cloud)

**Ưu điểm của Atlas:**
- Free tier: 512MB storage
- Automatic backups
- High availability (replica sets)
- Scalable
- Security (encryption, IP whitelist)

#### Bước 1: Tạo account và cluster

```
1. Truy cập https://www.mongodb.com/cloud/atlas
2. Sign up (free)
3. Create New Cluster
   - Provider: AWS / Google Cloud / Azure
   - Region: Singapore (gần Vietnam nhất)
   - Cluster Tier: M0 Sandbox (FREE)
   - Cluster Name: MyFirstCluster
4. Click "Create Cluster" (mất ~5 phút)
```

#### Bước 2: Cấu hình network access

```
1. Vào menu "Network Access"
2. Click "Add IP Address"
3. Chọn:
   - "Allow Access from Anywhere" (0.0.0.0/0) - Development
   - Hoặc nhập IP cụ thể - Production
4. Confirm
```

**Giải thích:**
- MongoDB Atlas chặn tất cả connections mặc định
- Phải whitelist IP để connect được
- `0.0.0.0/0` = allow tất cả (chỉ dùng development)

#### Bước 3: Tạo database user

```
1. Vào menu "Database Access"
2. Click "Add New Database User"
3. Authentication Method: Password
   - Username: myapp_user
   - Password: StrongPassword123! (tự generate hoặc tự nhập)
4. Database User Privileges: Read and write to any database
5. Add User
```

#### Bước 4: Lấy connection string

```
1. Vào menu "Databases"
2. Click "Connect" trên cluster của bạn
3. Choose "Connect your application"
4. Driver: Node.js, Version: 5.5 or later
5. Copy connection string:

mongodb+srv://myapp_user:<password>@myfirstcluster.xxxxx.mongodb.net/?retryWrites=true&w=majority

6. Thay <password> bằng password thực tế
```

**Connection string explained:**

```
mongodb+srv://           # Protocol (SRV record)
myapp_user              # Username
:StrongPassword123!     # Password
@                       # Separator
myfirstcluster.xxxxx    # Cluster domain
.mongodb.net            # MongoDB Atlas domain
/myapp                  # Database name (optional)
?retryWrites=true       # Options
&w=majority             # Write concern
```

### 2.3. MongoDB Compass - GUI Tool

**Tại sao cần GUI?**
- Dễ dàng browse data
- Visual query builder
- Schema analysis
- Performance monitoring

#### Installation

```bash
# Download từ https://www.mongodb.com/try/download/compass

# Hoặc via package manager
brew install --cask mongodb-compass  # macOS
choco install mongodb-compass        # Windows
```

#### Connect to MongoDB

**Local MongoDB:**

```
Connection String: mongodb://admin:password123@localhost:27017
hoặc
Host: localhost
Port: 27017
Authentication: Username/Password
  Username: admin
  Password: password123
```

**MongoDB Atlas:**

```
Connection String: 
mongodb+srv://myapp_user:StrongPassword123!@myfirstcluster.xxxxx.mongodb.net/
```

#### Các tính năng chính

**1. Browse Collections**

```
- View documents trong collection
- Filter, sort, paginate
- Create, update, delete documents
```

**2. Query Builder**

```javascript
// Visual interface to build queries
{
  age: { $gte: 18 },
  country: "Vietnam",
  isActive: true
}
// → Generates query automatically
```

**3. Aggregation Pipeline Builder**

```javascript
// Drag-and-drop stages
[
  { $match: { country: "Vietnam" } },
  { $group: { _id: "$city", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
]
```

**4. Schema Analysis**

```
- Phân tích structure của documents
- Data types distribution
- Unique values
- Missing fields
```

**5. Performance Monitoring**

```
- Query performance
- Index usage
- Slow queries
```

### 2.4. Kết nối MongoDB với ứng dụng NestJS

#### Bước 1: Install dependencies

```bash
# Core packages
npm install @nestjs/mongoose mongoose

# Types for TypeScript
npm install -D @types/mongoose
```

**Package explanation:**

```
@nestjs/mongoose    # NestJS integration for Mongoose
mongoose            # MongoDB ODM (Object Document Mapper)
@types/mongoose     # TypeScript definitions
```

#### Bước 2: Cấu hình connection string

**Tạo .env file:**

```bash
# .env

# Local MongoDB
MONGODB_URI=mongodb://admin:password123@localhost:27017/myapp?authSource=admin

# Or MongoDB Atlas
# MONGODB_URI=mongodb+srv://myapp_user:StrongPassword123!@cluster.xxxxx.mongodb.net/myapp?retryWrites=true&w=majority

# Database name
DB_NAME=myapp

# Node environment
NODE_ENV=development
```

**Connection string anatomy:**

```
mongodb://              # Protocol
admin:password123       # Credentials
@localhost:27017        # Host:Port
/myapp                  # Database name
?authSource=admin       # Authentication database
&retryWrites=true       # Retry failed writes
&w=majority             # Write concern (wait for majority of replicas)
```

**Install config package:**

```bash
npm install @nestjs/config
```

#### Bước 3: Tạo config module

```typescript
// src/config/database.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  uri: process.env.MONGODB_URI,
  name: process.env.DB_NAME || 'myapp',
}));
```

**Giải thích:**
- `registerAs('database', ...)` tạo namespaced configuration
- Có thể access via `configService.get('database.uri')`
- Centralized configuration management

#### Bước 4: Connect trong AppModule

**Simple connection:**

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import databaseConfig from './config/database.config';

@Module({
  imports: [
    // Load environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    
    // Connect to MongoDB
    MongooseModule.forRoot(process.env.MONGODB_URI),
  ],
})
export class AppModule {}
```

**Advanced connection with options:**

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import databaseConfig from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('database.uri'),
        
        // Connection options
        retryWrites: true,
        w: 'majority',
        
        // Connection pool
        maxPoolSize: 10,
        minPoolSize: 5,
        
        // Timeouts
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        
        // Monitoring
        autoIndex: process.env.NODE_ENV === 'development', // Don't auto-create indexes in production
        
        // Logging
        // logger: console, // Log all queries (development only)
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

**Options explained:**

```typescript
{
  // Retry failed writes (important for distributed systems)
  retryWrites: true,
  
  // Write concern: wait for majority of replica set
  // Ensures data durability
  w: 'majority',
  
  // Connection pool: reuse connections
  // Improves performance by avoiding connection overhead
  maxPoolSize: 10,  // Max concurrent connections
  minPoolSize: 5,   // Always maintain 5 connections
  
  // Timeouts
  serverSelectionTimeoutMS: 5000,  // 5s to find available server
  socketTimeoutMS: 45000,          // 45s for operations
  
  // Auto-create indexes (expensive in production)
  autoIndex: false,  // Turn off in production
}
```

### 2.5. Environment variables cho dev/prod

#### Development environment

```bash
# .env.development
MONGODB_URI=mongodb://admin:password123@localhost:27017/myapp_dev?authSource=admin
DB_NAME=myapp_dev
NODE_ENV=development
LOG_LEVEL=debug
```

#### Production environment

```bash
# .env.production
MONGODB_URI=mongodb+srv://prod_user:SecurePassword@cluster.mongodb.net/myapp_prod?retryWrites=true&w=majority
DB_NAME=myapp_prod
NODE_ENV=production
LOG_LEVEL=error
```

#### Sử dụng multiple environments

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const configService = app.get(ConfigService);
  const port = configService.get('PORT', 3000);
  const env = configService.get('NODE_ENV', 'development');
  
  await app.listen(port);
  console.log(`Application running in ${env} mode on port ${port}`);
}
bootstrap();
```

**Run with different environments:**

```bash
# Development
npm run start:dev

# Production
NODE_ENV=production npm run start:prod
```

### 2.6. Health Check & Connection Pooling

#### Health Check

```typescript
// src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection() private readonly connection: Connection,
  ) {}

  @Get()
  async check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: {
        connected: this.connection.readyState === 1,
        host: this.connection.host,
        name: this.connection.name,
      },
    };
  }

  @Get('db')
  async checkDatabase() {
    try {
      // Ping database
      await this.connection.db.admin().ping();
      
      return {
        status: 'healthy',
        message: 'Database connection is active',
        details: {
          readyState: this.connection.readyState,
          host: this.connection.host,
          database: this.connection.name,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Database connection failed',
        error: error.message,
      };
    }
  }
}
```

**ReadyState values:**

```
0 = disconnected
1 = connected
2 = connecting
3 = disconnecting
```

#### Connection Pooling Monitoring

```typescript
// src/monitoring/database.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class DatabaseMonitoringService {
  private readonly logger = new Logger(DatabaseMonitoringService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  logConnectionPool() {
    const client = this.connection.getClient();
    
    // @ts-ignore - Access internal pool statistics
    const poolStats = client?.topology?.s?.pool;
    
    if (poolStats) {
      this.logger.log({
        totalConnections: poolStats.totalConnectionCount,
        availableConnections: poolStats.availableConnectionCount,
        pendingRequests: poolStats.waitQueueSize,
      });
    }
  }

  getPoolStatistics() {
    const client = this.connection.getClient();
    
    // @ts-ignore
    const pool = client?.topology?.s?.pool;
    
    return {
      total: pool?.totalConnectionCount || 0,
      available: pool?.availableConnectionCount || 0,
      inUse: (pool?.totalConnectionCount || 0) - (pool?.availableConnectionCount || 0),
      waitQueueSize: pool?.waitQueueSize || 0,
    };
  }
}
```

**Giải thích Connection Pooling:**

```
Connection Pool là một tập hợp các kết nối được tạo sẵn và tái sử dụng.

Without Connection Pool:
Request 1 → Create Connection → Query → Close Connection (slow!)
Request 2 → Create Connection → Query → Close Connection (slow!)
Request 3 → Create Connection → Query → Close Connection (slow!)

With Connection Pool:
Request 1 → Get Connection from Pool → Query → Return to Pool (fast!)
Request 2 → Get Connection from Pool → Query → Return to Pool (fast!)
Request 3 → Get Connection from Pool → Query → Return to Pool (fast!)

Benefits:
1. Faster: Không phải tạo connection mới mỗi lần
2. Efficient: Reuse connections
3. Scalable: Limit số connections, tránh overwhelm database
```

**Best practices:**

```typescript
// Connection pool configuration
MongooseModule.forRootAsync({
  useFactory: () => ({
    uri: process.env.MONGODB_URI,
    
    // Pool size based on workload
    minPoolSize: 5,   // Always maintain 5 connections
    maxPoolSize: 10,  // Maximum 10 connections
    
    // Connection lifespan
    maxIdleTimeMS: 30000,  // Close idle connections after 30s
    
    // Wait time for available connection
    waitQueueTimeoutMS: 5000,  // 5s wait for connection from pool
  }),
});
```

---

# Lesson 11 - NoSQL with MongoDB (Tiếp theo)

## 3. Sử dụng Mongoose với NestJS

### 3.1. Giới thiệu về Mongoose

#### ODM (Object Document Mapper) là gì?

**ODM** là một lớp trừu tượng giữa ứng dụng và MongoDB, tương tự như ORM (Object-Relational Mapper) cho SQL databases.

**Mapping giữa Code và Database:**

```typescript
// Your Code (TypeScript Class)
class User {
  name: string;
  email: string;
  age: number;
}

         ↓ ODM (Mongoose) ↓

// MongoDB Document
{
  _id: ObjectId("..."),
  name: "John Doe",
  email: "john@example.com",
  age: 25
}
```

**Chức năng của ODM:**

1. **Schema Definition**: Định nghĩa cấu trúc dữ liệu
2. **Validation**: Kiểm tra dữ liệu trước khi lưu
3. **Type Casting**: Tự động convert types
4. **Middleware**: Hooks (pre/post operations)
5. **Query Builder**: Xây dựng queries dễ dàng
6. **Population**: Tương tự JOIN trong SQL

#### Tại sao cần Mongoose? (vs MongoDB Native Driver)

**MongoDB Native Driver:**

```typescript
// Native Driver - Low level, verbose
import { MongoClient } from 'mongodb';

const client = new MongoClient('mongodb://localhost:27017');
await client.connect();

const db = client.db('myapp');
const collection = db.collection('users');

// Insert - No validation, no type safety
await collection.insertOne({
  name: 'John',
  email: 'john@example.com',
  age: '25', // Oops! Should be number
  extraField: 'allowed' // No schema enforcement
});

// Find - Returns plain objects
const user = await collection.findOne({ name: 'John' });
console.log(user.name); // No TypeScript autocomplete
```

**Mongoose ODM:**

```typescript
// Mongoose - High level, clean
import { Schema, model } from 'mongoose';

// Define schema with validation
const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  age: { type: Number, min: 0, max: 150 }
});

const User = model('User', userSchema);

// Insert - Auto validation
await User.create({
  name: 'John',
  email: 'john@example.com',
  age: '25', // Auto convert to number
  // extraField: 'not allowed' // Will be ignored (strict mode)
});

// Find - Returns Mongoose documents with methods
const user = await User.findOne({ name: 'John' });
console.log(user.name); // TypeScript autocomplete ✓
await user.save(); // Document methods available
```

**Bảng so sánh:**

| Feature | Native Driver | Mongoose |
|---------|--------------|----------|
| **Schema** | No | Yes (optional) |
| **Validation** | Manual | Automatic |
| **Type Safety** | No | Yes (with TypeScript) |
| **Middleware** | No | Yes (hooks) |
| **Population** | Manual joins | Automatic |
| **Query Builder** | Basic | Rich (chainable) |
| **Learning Curve** | Low | Medium |
| **Performance** | Slightly faster | Good enough |
| **Use Case** | Low-level control | Application development |

**Khi nào dùng Native Driver?**

```typescript
// 1. High-performance bulk operations
const bulkOps = await collection.bulkWrite([
  { insertOne: { document: { ... } } },
  { updateOne: { filter: { ... }, update: { ... } } },
  // 1000s operations
]);

// 2. Complex aggregations
const result = await collection.aggregate([
  { $match: { ... } },
  { $group: { ... } },
  { $lookup: { ... } }
]).toArray();

// 3. Database administration
await db.createCollection('newCollection', { ... });
await db.command({ ping: 1 });
```

**Khi nào dùng Mongoose?**

```typescript
// 1. Application development (CRUD)
const user = await User.findById(userId);
user.name = 'Updated Name';
await user.save();

// 2. Need validation
const newUser = new User({ ... });
await newUser.validate(); // Throws error if invalid

// 3. Complex relationships
const post = await Post.findById(postId)
  .populate('author')
  .populate('comments.user');
```

### 3.2. Cài đặt Mongoose trong dự án NestJS

```bash
# Install core packages
npm install @nestjs/mongoose mongoose

# Install TypeScript types
npm install -D @types/mongoose

# Optional: For validation
npm install class-validator class-transformer
```

**Package roles:**

```typescript
@nestjs/mongoose    // NestJS wrapper for Mongoose
                    // Provides decorators: @Schema(), @Prop()
                    // Module: MongooseModule

mongoose            // Core Mongoose library
                    // Provides Schema, Model, Document

@types/mongoose     // TypeScript definitions
                    // Type safety and autocomplete

class-validator     // Validation decorators (optional)
class-transformer   // Transform plain objects to class instances
```

### 3.3. Tạo module Mongoose trong NestJS

#### Cách 1: MongooseModule.forRoot() - Simple

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost:27017/myapp'),
  ],
})
export class AppModule {}
```

**Ưu điểm:**
- Đơn giản, nhanh chóng
- Phù hợp cho prototype

**Nhược điểm:**
- Hardcoded connection string
- Không có environment variables
- Khó maintain

#### Cách 2: MongooseModule.forRootAsync() - Recommended

**With ConfigService:**

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    // 1. Config Module (load .env)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),

    // 2. Mongoose Module (async with ConfigService)
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        
        // Additional options
        retryWrites: true,
        w: 'majority',
        maxPoolSize: 10,
        minPoolSize: 5,
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

**Giải thích từng phần:**

```typescript
// 1. imports: [ConfigModule]
// → Import ConfigModule để có thể inject ConfigService

// 2. useFactory: async (configService: ConfigService) => ({ ... })
// → Factory function để tạo Mongoose options
// → Async: có thể await nếu cần (ví dụ: fetch config from remote)

// 3. inject: [ConfigService]
// → Inject ConfigService vào factory function

// 4. Flow:
// NestJS creates ConfigModule
//    ↓
// Inject ConfigService into factory
//    ↓
// Factory returns Mongoose options
//    ↓
// MongooseModule connects to MongoDB
```

**With custom configuration service:**

```typescript
// src/config/database.config.ts
export default () => ({
  database: {
    uri: process.env.MONGODB_URI,
    options: {
      retryWrites: true,
      w: 'majority',
      maxPoolSize: parseInt(process.env.DB_POOL_SIZE) || 10,
      minPoolSize: 5,
    },
  },
});

// src/app.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import databaseConfig from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),

    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const dbConfig = configService.get('database');
        
        return {
          uri: dbConfig.uri,
          ...dbConfig.options,
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

#### Multiple Database Connections

```typescript
// src/app.module.ts
@Module({
  imports: [
    // Default connection
    MongooseModule.forRoot('mongodb://localhost/default-db'),

    // Named connection for analytics
    MongooseModule.forRoot('mongodb://localhost/analytics-db', {
      connectionName: 'analytics',
    }),

    // Named connection for logs
    MongooseModule.forRoot('mongodb://localhost/logs-db', {
      connectionName: 'logs',
    }),
  ],
})
export class AppModule {}

// Usage in feature module
@Module({
  imports: [
    // Use default connection
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
    ]),

    // Use named connection
    MongooseModule.forFeature(
      [{ name: Analytics.name, schema: AnalyticsSchema }],
      'analytics', // Connection name
    ),
  ],
})
export class UserModule {}
```

**Use case cho multiple connections:**

```typescript
// 1. Microservices architecture
// - Main DB: User data
// - Analytics DB: Tracking data
// - Logs DB: Application logs

// 2. Read/Write separation
// - Write DB: Master (write operations)
// - Read DB: Replica (read operations)

// 3. Multi-tenant applications
// - Each tenant has separate database
```

### 3.4. Mongoose Schema Types

Mongoose hỗ trợ nhiều schema types để định nghĩa cấu trúc document.

#### String

```typescript
import { Schema } from 'mongoose';

const userSchema = new Schema({
  // Basic string
  name: String,
  
  // With options
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,      // Convert to lowercase
    trim: true,           // Remove whitespace
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, // Regex validation
  },
  
  // Enum
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user',
  },
  
  // Min/Max length
  username: {
    type: String,
    minlength: 3,
    maxlength: 20,
  },
});
```

**String options:**

```typescript
{
  lowercase: true,     // Convert to lowercase
  uppercase: true,     // Convert to uppercase
  trim: true,          // Remove leading/trailing whitespace
  match: RegExp,       // Must match regex
  enum: [...],         // Must be one of these values
  minlength: number,   // Minimum length
  maxlength: number,   // Maximum length
}
```

#### Number

```typescript
const productSchema = new Schema({
  // Basic number
  price: Number,
  
  // With options
  quantity: {
    type: Number,
    required: true,
    min: 0,
    max: 10000,
    default: 0,
  },
  
  // Integer only
  rating: {
    type: Number,
    min: 1,
    max: 5,
    validate: {
      validator: Number.isInteger,
      message: '{VALUE} is not an integer',
    },
  },
  
  // Decimal (for precision)
  discount: {
    type: Schema.Types.Decimal128,
    get: (v) => parseFloat(v.toString()), // Convert to number when reading
  },
});
```

**Number options:**

```typescript
{
  min: number,         // Minimum value
  max: number,         // Maximum value
  enum: [...],         // Must be one of these values
}

// Special number types:
Schema.Types.Decimal128  // High precision decimals (for money)
```

#### Date

```typescript
const postSchema = new Schema({
  // Basic date
  createdAt: Date,
  
  // With default
  publishedAt: {
    type: Date,
    default: Date.now,  // Function, not Date.now()
  },
  
  // With validation
  expiresAt: {
    type: Date,
    validate: {
      validator: function(value) {
        return value > new Date();
      },
      message: 'Expiry date must be in the future',
    },
  },
  
  // Min/Max date
  eventDate: {
    type: Date,
    min: new Date('2024-01-01'),
    max: new Date('2024-12-31'),
  },
});
```

**Date handling:**

```typescript
// Insert
await Post.create({
  createdAt: new Date(),
  publishedAt: '2024-02-06', // Auto convert string to Date
});

// Query
const posts = await Post.find({
  createdAt: { $gte: new Date('2024-01-01') },
});

// Update
await Post.updateOne(
  { _id: postId },
  { $set: { updatedAt: new Date() } }
);
```

#### Boolean

```typescript
const userSchema = new Schema({
  // Basic boolean
  isActive: Boolean,
  
  // With default
  isVerified: {
    type: Boolean,
    default: false,
  },
  
  // Required
  agreedToTerms: {
    type: Boolean,
    required: [true, 'You must agree to terms'],
  },
});
```

**Boolean truthy values:**

```typescript
// These all become true:
true, 'true', 1, '1', 'yes'

// These all become false:
false, 'false', 0, '0', 'no'

// Example
await User.create({ isActive: 'yes' }); // Saved as true
```

#### ObjectId

```typescript
const postSchema = new Schema({
  // Reference to another document
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',  // Model name to reference
    required: true,
  },
  
  // Array of references
  tags: [{
    type: Schema.Types.ObjectId,
    ref: 'Tag',
  }],
  
  // Optional reference
  editor: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
});
```

**ObjectId usage:**

```typescript
import { Types } from 'mongoose';

// Create new ObjectId
const userId = new Types.ObjectId();

// Convert string to ObjectId
const id = new Types.ObjectId('507f1f77bcf86cd799439011');

// Check if valid
Types.ObjectId.isValid('507f1f77bcf86cd799439011'); // true
Types.ObjectId.isValid('invalid'); // false

// Insert with reference
await Post.create({
  title: 'My Post',
  author: userId, // ObjectId
});

// Populate reference
const post = await Post.findById(postId)
  .populate('author'); // Gets full user document

console.log(post.author.name); // Access user name
```

#### Array

```typescript
const userSchema = new Schema({
  // Array of strings
  tags: [String],
  
  // Array with validation
  hobbies: {
    type: [String],
    validate: {
      validator: (v) => v.length <= 10,
      message: 'Maximum 10 hobbies allowed',
    },
  },
  
  // Array of numbers
  scores: {
    type: [Number],
    default: [],
  },
  
  // Array of subdocuments
  addresses: [{
    street: String,
    city: String,
    country: { type: String, default: 'Vietnam' },
    isPrimary: { type: Boolean, default: false },
  }],
  
  // Array of references
  friends: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
});
```

**Array operations:**

```typescript
// Insert with array
await User.create({
  tags: ['nodejs', 'mongodb', 'nestjs'],
  addresses: [
    { street: '123 Main St', city: 'Hanoi', isPrimary: true },
    { street: '456 Second St', city: 'HCMC' },
  ],
});

// Update array - Push
await User.updateOne(
  { _id: userId },
  { $push: { tags: 'typescript' } }
);

// Update array - Pull
await User.updateOne(
  { _id: userId },
  { $pull: { tags: 'mongodb' } }
);

// Update array - Add to set (no duplicates)
await User.updateOne(
  { _id: userId },
  { $addToSet: { tags: 'nestjs' } } // Won't add if exists
);

// Update nested array element
await User.updateOne(
  { _id: userId, 'addresses.isPrimary': true },
  { $set: { 'addresses.$.street': 'New Street' } }
);
```

#### Mixed

```typescript
const logSchema = new Schema({
  // Any type
  metadata: Schema.Types.Mixed,
  
  // Or use Object
  config: Object,
  
  // With default
  settings: {
    type: Schema.Types.Mixed,
    default: {},
  },
});
```

**Mixed type usage:**

```typescript
// Can store anything
await Log.create({
  metadata: {
    userId: 123,
    action: 'login',
    timestamp: new Date(),
    details: {
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0...',
    },
  },
});

// Different structure in next document
await Log.create({
  metadata: {
    error: 'Something went wrong',
    stackTrace: '...',
    severity: 'high',
  },
});

// ⚠️ Warning: Mixed fields don't trigger change detection
const log = await Log.findById(logId);
log.metadata.newField = 'value';
await log.save(); // Won't save!

// Solution: Mark as modified
log.markModified('metadata');
await log.save(); // Now it saves
```

#### Buffer

```typescript
const fileSchema = new Schema({
  // Binary data
  data: Buffer,
  
  // With content type
  file: {
    data: Buffer,
    contentType: String,
  },
});
```

**Buffer usage:**

```typescript
// Store file
const fileBuffer = fs.readFileSync('image.jpg');

await File.create({
  data: fileBuffer,
  contentType: 'image/jpeg',
});

// Retrieve file
const file = await File.findById(fileId);
res.set('Content-Type', file.contentType);
res.send(file.data);
```

#### Decimal128

```typescript
const orderSchema = new Schema({
  // High precision decimal (for money)
  total: {
    type: Schema.Types.Decimal128,
    required: true,
  },
  
  // With getter to convert to number
  price: {
    type: Schema.Types.Decimal128,
    get: (v) => {
      return v != null ? parseFloat(v.toString()) : v;
    },
  },
});

// Enable getters
orderSchema.set('toJSON', { getters: true });
orderSchema.set('toObject', { getters: true });
```

**Why Decimal128 for money?**

```typescript
// ❌ Problem with Number (floating point)
0.1 + 0.2 // = 0.30000000000000004 (not 0.3!)

// ✓ Solution with Decimal128
import { Decimal128 } from 'mongodb';

const price1 = Decimal128.fromString('0.1');
const price2 = Decimal128.fromString('0.2');
// Precise calculations

// Usage
await Order.create({
  total: Decimal128.fromString('99.99'),
});

const order = await Order.findById(orderId);
console.log(order.total.toString()); // "99.99"
console.log(order.price); // 99.99 (if getter enabled)
```

### 3.5. Schema Type Summary

```typescript
// Complete example với tất cả types
const completeSchema = new Schema({
  // String
  name: { type: String, required: true },
  email: { type: String, unique: true, lowercase: true },
  
  // Number
  age: { type: Number, min: 0, max: 150 },
  score: { type: Number, default: 0 },
  
  // Boolean
  isActive: { type: Boolean, default: true },
  
  // Date
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
  
  // ObjectId
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  
  // Array
  tags: [String],
  scores: [Number],
  
  // Subdocuments
  address: {
    street: String,
    city: String,
    country: { type: String, default: 'Vietnam' },
  },
  
  // Array of subdocuments
  comments: [{
    text: String,
    author: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
  }],
  
  // Mixed
  metadata: Schema.Types.Mixed,
  
  // Buffer
  avatar: Buffer,
  
  // Decimal
  balance: {
    type: Schema.Types.Decimal128,
    get: (v) => parseFloat(v?.toString() || '0'),
  },
});
```

---

## 4. Tạo Schema và Model với Mongoose

### 4.1. Định nghĩa Schema trong Mongoose

#### Basic Schema Definition

```typescript
// src/users/schemas/user.schema.ts
import { Schema, model, Document } from 'mongoose';

// 1. Define interface for TypeScript
interface IUser extends Document {
  name: string;
  email: string;
  age?: number;
  createdAt: Date;
}

// 2. Define schema
const userSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  age: {
    type: Number,
    min: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// 3. Create model
export const User = model<IUser>('User', userSchema);
```

#### Schema Options

```typescript
const userSchema = new Schema(
  {
    name: String,
    email: String,
  },
  {
    // Timestamps: auto add createdAt, updatedAt
    timestamps: true,
    
    // Version key: __v field for versioning
    versionKey: '_version', // Custom name, or false to disable
    
    // Collection name (default: lowercase plural of model name)
    collection: 'users',
    
    // Strict mode: reject fields not in schema
    strict: true, // true | false | 'throw'
    
    // Auto-create indexes
    autoIndex: true,
    
    // Minimize: remove empty objects
    minimize: false,
    
    // toJSON options
    toJSON: {
      virtuals: true,   // Include virtuals
      getters: true,    // Apply getters
      transform: (doc, ret) => {
        delete ret.__v;
        delete ret.password;
        return ret;
      },
    },
    
    // toObject options
    toObject: {
      virtuals: true,
      getters: true,
    },
  }
);
```

**Giải thích từng option:**

**1. timestamps:**

```typescript
// timestamps: true
{
  timestamps: true,
}

// Auto add:
{
  name: "John",
  email: "john@example.com",
  createdAt: ISODate("2024-02-06T10:00:00Z"),  // Auto
  updatedAt: ISODate("2024-02-06T10:00:00Z"),  // Auto
}

// When update:
await user.save();
// updatedAt auto updates to current time

// Custom timestamp field names:
{
  timestamps: {
    createdAt: 'created',
    updatedAt: 'updated',
  },
}
```

**2. versionKey:**

```typescript
// versionKey: default '__v'
{
  _id: ObjectId("..."),
  name: "John",
  __v: 0  // Version number
}

// When update:
const user = await User.findById(userId);
user.name = "Jane";
await user.save();
// __v becomes 1

// Purpose: Detect concurrent modifications
// Disable with: versionKey: false
```

**3. strict:**

```typescript
// strict: true (default)
await User.create({
  name: "John",
  email: "john@example.com",
  extraField: "ignored",  // Ignored!
});

// strict: false
await User.create({
  name: "John",
  email: "john@example.com",
  extraField: "saved",  // Saved!
});

// strict: 'throw'
await User.create({
  name: "John",
  extraField: "error",  // Throws error!
});
```

**4. toJSON transform:**

```typescript
const userSchema = new Schema(
  { /* ... */ },
  {
    toJSON: {
      transform: (doc, ret) => {
        // Remove sensitive fields
        delete ret.password;
        delete ret.__v;
        
        // Rename _id to id
        ret.id = ret._id;
        delete ret._id;
        
        return ret;
      },
    },
  }
);

// Usage
const user = await User.findById(userId);
res.json(user); // Auto applies toJSON transform

// Output:
{
  "id": "507f1f77bcf86cd799439011",  // Renamed
  "name": "John",
  "email": "john@example.com"
  // No password, no __v, no _id
}
```

### 4.2. Tạo Model từ Schema (NestJS way)

#### Using @Schema() Decorator

```typescript
// src/users/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// 1. Document type
export type UserDocument = User & Document;

// 2. Schema class
@Schema({
  timestamps: true,
  collection: 'users',
})
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ min: 0, max: 150 })
  age: number;

  @Prop({ default: true })
  isActive: boolean;
}

// 3. Create schema
export const UserSchema = SchemaFactory.createForClass(User);
```

**Giải thích:**

```typescript
// @Schema() decorator
// → Marks class as Mongoose schema
// → Options are schema options

// @Prop() decorator
// → Marks property as schema field
// → Options are field options

// SchemaFactory.createForClass()
// → Converts class to Mongoose schema
```

#### Register Schema in Module

```typescript
// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // Export if other modules need it
})
export class UsersModule {}
```

**Giải thích flow:**

```
1. Define schema class with @Schema()
   ↓
2. Create schema with SchemaFactory
   ↓
3. Register in MongooseModule.forFeature()
   ↓
4. Inject Model in Service
```

### 4.3. Sử dụng Decorators với Mongoose trong NestJS

#### @Prop() Basic Usage

```typescript
import { Prop, Schema } from '@nestjs/mongoose';

@Schema()
export class User {
  // Simple type
  @Prop()
  name: string;

  // With options
  @Prop({ required: true, unique: true })
  email: string;

  // With default
  @Prop({ default: 0 })
  loginCount: number;

  // With validation
  @Prop({
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user',
  })
  role: string;
}
```

#### @Prop() với required, unique, default

**Required:**

```typescript
@Schema()
export class User {
  // Required with default message
  @Prop({ required: true })
  name: string;

  // Required with custom message
  @Prop({
    required: [true, 'Email is required'],
  })
  email: string;

  // Conditional required
  @Prop({
    required: function() {
      return this.role === 'admin'; // Required only for admins
    },
  })
  department: string;
}
```

**Unique:**

```typescript
@Schema()
export class User {
  // Unique email
  @Prop({ unique: true })
  email: string;

  // Unique username (case-insensitive)
  @Prop({ unique: true, lowercase: true })
  username: string;

  // Sparse unique (null values allowed, but unique if not null)
  @Prop({ unique: true, sparse: true })
  phoneNumber: string;
}

// ⚠️ Important: Create index for unique to work
// In production, run:
await UserModel.collection.createIndex({ email: 1 }, { unique: true });
```

**Default:**

```typescript
@Schema()
export class User {
  // Static default
  @Prop({ default: 'active' })
  status: string;

  // Function default
  @Prop({ default: () => Date.now() })
  createdAt: Date;

  // Complex default
  @Prop({
    type: Object,
    default: () => ({
      theme: 'light',
      notifications: true,
      language: 'en',
    }),
  })
  settings: Record<string, any>;
}
```

#### @Prop() với validate

**Built-in validators:**

```typescript
@Schema()
export class User {
  // String validators
  @Prop({
    type: String,
    minlength: [3, 'Username too short'],
    maxlength: [20, 'Username too long'],
    match: [/^[a-zA-Z0-9_]+$/, 'Invalid username'],
  })
  username: string;

  // Number validators
  @Prop({
    type: Number,
    min: [0, 'Age cannot be negative'],
    max: [150, 'Invalid age'],
  })
  age: number;

  // Enum validator
  @Prop({
    type: String,
    enum: {
      values: ['male', 'female', 'other'],
      message: '{VALUE} is not supported',
    },
  })
  gender: string;
}
```

**Custom validators:**

```typescript
import { Prop, Schema } from '@nestjs/mongoose';

@Schema()
export class User {
  // Simple custom validator
  @Prop({
    type: String,
    validate: {
      validator: function(v: string) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: (props) => `${props.value} is not a valid email`,
    },
  })
  email: string;

  // Async validator
  @Prop({
    type: String,
    validate: {
      validator: async function(v: string) {
        // Check if username exists
        const count = await this.constructor.countDocuments({
          username: v,
          _id: { $ne: this._id },
        });
        return count === 0;
      },
      message: 'Username already taken',
    },
  })
  username: string;

  // Multiple validators
  @Prop({
    type: String,
    validate: [
      {
        validator: (v: string) => v.length >= 8,
        message: 'Password must be at least 8 characters',
      },
      {
        validator: (v: string) => /[A-Z]/.test(v),
        message: 'Password must contain uppercase letter',
      },
      {
        validator: (v: string) => /[0-9]/.test(v),
        message: 'Password must contain number',
      },
    ],
  })
  password: string;
}
```

**Validator with context:**

```typescript
@Schema()
export class Order {
  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  price: number;

  @Prop({
    type: Number,
    validate: {
      validator: function(v: number) {
        // Access other fields via 'this'
        return v === this.quantity * this.price;
      },
      message: 'Total must equal quantity × price',
    },
  })
  total: number;
}
```

## 5. CRUD cơ bản với Mongoose

### 5.1. Setup Service với Mongoose

```typescript
// src/users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  // CRUD methods will be here
}
```

**Giải thích:**

```typescript
// @InjectModel(User.name)
// → Inject Mongoose Model for User
// User.name = "User" (schema name)

// private userModel: Model<UserDocument>
// → Type-safe Mongoose model
// UserDocument = User & Document (includes Mongoose methods)
```

### 5.2. Tạo dữ liệu (Create)

#### create() method

```typescript
// src/users/dto/create-user.dto.ts
export class CreateUserDto {
  name: string;
  email: string;
  age?: number;
  password: string;
}

// src/users/users.service.ts
@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  // Method 1: create()
  async create(createUserDto: CreateUserDto): Promise<User> {
    const createdUser = await this.userModel.create(createUserDto);
    return createdUser;
  }

  // Alternative: with try-catch
  async createSafe(createUserDto: CreateUserDto): Promise<User> {
    try {
      const user = await this.userModel.create(createUserDto);
      return user;
    } catch (error) {
      // Handle duplicate key error
      if (error.code === 11000) {
        throw new Error('Email already exists');
      }
      throw error;
    }
  }
}
```

**create() explained:**

```typescript
// create() does:
// 1. Validate data against schema
// 2. Apply defaults
// 3. Run pre-save middleware
// 4. Insert to database
// 5. Run post-save middleware
// 6. Return saved document

const user = await this.userModel.create({
  name: 'John Doe',
  email: 'john@example.com',
  // age not provided → uses default
  // _id auto-generated
  // timestamps auto-added
});

// Result:
{
  _id: ObjectId("..."),
  name: "John Doe",
  email: "john@example.com",
  age: 0, // default value
  isActive: true, // default value
  createdAt: ISODate("2024-02-06T10:00:00Z"),
  updatedAt: ISODate("2024-02-06T10:00:00Z"),
}
```

#### save() method

```typescript
@Injectable()
export class UsersService {
  // Method 2: new + save()
  async createWithSave(createUserDto: CreateUserDto): Promise<User> {
    const user = new this.userModel(createUserDto);
    
    // Can modify before saving
    user.isActive = true;
    
    // Validate manually (optional)
    await user.validate();
    
    // Save to database
    const savedUser = await user.save();
    
    return savedUser;
  }
}
```

**create() vs save():**

```typescript
// create() - Shorthand, direct insert
const user = await this.userModel.create({ name: 'John', email: '...' });

// new + save() - More control
const user = new this.userModel({ name: 'John', email: '...' });
user.someField = 'modified';
await user.save();

// When to use which:
// create(): Simple inserts, straightforward cases
// save(): Need to modify document before saving, complex logic
```

#### insertMany() cho bulk insert

```typescript
@Injectable()
export class UsersService {
  // Insert multiple documents
  async createMany(users: CreateUserDto[]): Promise<User[]> {
    const createdUsers = await this.userModel.insertMany(users);
    return createdUsers;
  }

  // With options
  async createManyOrdered(users: CreateUserDto[]): Promise<User[]> {
    const createdUsers = await this.userModel.insertMany(users, {
      ordered: true, // Stop on first error
      // ordered: false, // Continue on errors
    });
    return createdUsers;
  }
}
```

**insertMany() explained:**

```typescript
// Insert 1000 users
const users = Array.from({ length: 1000 }, (_, i) => ({
  name: `User ${i}`,
  email: `user${i}@example.com`,
}));

// Slow: 1000 individual inserts
for (const user of users) {
  await this.userModel.create(user); // 1000 database calls
}

// Fast: 1 bulk insert
await this.userModel.insertMany(users); // 1 database call

// Performance:
// create() × 1000: ~5000ms
// insertMany(): ~200ms
```

**ordered vs unordered:**

```typescript
const users = [
  { name: 'User 1', email: 'user1@example.com' },
  { name: 'User 2', email: 'duplicate@example.com' }, // Duplicate!
  { name: 'User 3', email: 'user3@example.com' },
];

// ordered: true (default)
await this.userModel.insertMany(users, { ordered: true });
// Inserts: User 1
// Fails on: User 2 (duplicate)
// Stops: User 3 NOT inserted

// ordered: false
await this.userModel.insertMany(users, { ordered: false });
// Inserts: User 1 ✓
// Fails on: User 2 ✗
// Continues: User 3 ✓
```

### 5.3. Đọc dữ liệu (Read)

#### find() - Tìm nhiều documents

```typescript
// src/users/users.service.ts
@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  // Find all users
  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  // Find with conditions
  async findActive(): Promise<User[]> {
    return this.userModel.find({ isActive: true }).exec();
  }

  // Find with multiple conditions
  async findByAgeRange(minAge: number, maxAge: number): Promise<User[]> {
    return this.userModel.find({
      age: { $gte: minAge, $lte: maxAge },
      isActive: true,
    }).exec();
  }

  // Find with sorting
  async findAllSorted(): Promise<User[]> {
    return this.userModel
      .find()
      .sort({ createdAt: -1 }) // Sort by newest first
      .exec();
  }

  // Find with limit and skip (pagination)
  async findPaginated(page: number = 1, limit: number = 10): Promise<User[]> {
    const skip = (page - 1) * limit;
    
    return this.userModel
      .find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  // Find with select (projection)
  async findAllPublic(): Promise<User[]> {
    return this.userModel
      .find()
      .select('name email age') // Only these fields
      .select('-password') // Exclude password
      .exec();
  }
}
```

**Query operators:**

```typescript
// Comparison operators
await this.userModel.find({
  age: { $eq: 25 },        // Equal: age === 25
  age: { $ne: 25 },        // Not equal: age !== 25
  age: { $gt: 25 },        // Greater than: age > 25
  age: { $gte: 25 },       // Greater or equal: age >= 25
  age: { $lt: 25 },        // Less than: age < 25
  age: { $lte: 25 },       // Less or equal: age <= 25
  age: { $in: [20, 25, 30] }, // In array: age in [20, 25, 30]
  age: { $nin: [20, 25] }, // Not in array: age not in [20, 25]
});

// Logical operators
await this.userModel.find({
  $and: [
    { age: { $gte: 18 } },
    { isActive: true }
  ]
});

await this.userModel.find({
  $or: [
    { role: 'admin' },
    { role: 'moderator' }
  ]
});

await this.userModel.find({
  $nor: [
    { status: 'banned' },
    { status: 'deleted' }
  ]
});

await this.userModel.find({
  age: { $not: { $lt: 18 } } // age NOT less than 18
});

// Element operators
await this.userModel.find({
  phoneNumber: { $exists: true }, // Field exists
  address: { $type: 'object' },   // Field is object type
});

// Array operators
await this.userModel.find({
  tags: { $all: ['mongodb', 'nodejs'] }, // Array contains all
  tags: { $elemMatch: { $eq: 'mongodb' } }, // Array element matches
  tags: { $size: 3 }, // Array size equals 3
});

// String operators (regex)
await this.userModel.find({
  name: { $regex: /^John/, $options: 'i' }, // Case-insensitive regex
  email: { $regex: /@gmail\.com$/ }, // Ends with @gmail.com
});
```

**Chaining methods:**

```typescript
// Build complex queries
async advancedSearch(filters: any): Promise<User[]> {
  let query = this.userModel.find();

  // Add conditions dynamically
  if (filters.name) {
    query = query.where('name').regex(new RegExp(filters.name, 'i'));
  }

  if (filters.minAge) {
    query = query.where('age').gte(filters.minAge);
  }

  if (filters.maxAge) {
    query = query.where('age').lte(filters.maxAge);
  }

  if (filters.isActive !== undefined) {
    query = query.where('isActive').equals(filters.isActive);
  }

  // Sort
  if (filters.sortBy) {
    const sortOrder = filters.sortOrder === 'desc' ? -1 : 1;
    query = query.sort({ [filters.sortBy]: sortOrder });
  }

  // Pagination
  if (filters.page && filters.limit) {
    const skip = (filters.page - 1) * filters.limit;
    query = query.skip(skip).limit(filters.limit);
  }

  // Select fields
  if (filters.fields) {
    query = query.select(filters.fields);
  }

  return query.exec();
}

// Usage
const users = await this.advancedSearch({
  name: 'John',
  minAge: 18,
  maxAge: 65,
  isActive: true,
  sortBy: 'createdAt',
  sortOrder: 'desc',
  page: 1,
  limit: 10,
  fields: 'name email age',
});
```

#### findOne() - Tìm một document

```typescript
@Injectable()
export class UsersService {
  // Find by email
  async findByEmail(email: string): Promise<User> {
    const user = await this.userModel.findOne({ email }).exec();
    
    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }
    
    return user;
  }

  // Find with multiple conditions
  async findActiveByEmail(email: string): Promise<User> {
    return this.userModel.findOne({ 
      email, 
      isActive: true 
    }).exec();
  }

  // Find with select
  async findByEmailPublic(email: string): Promise<User> {
    return this.userModel
      .findOne({ email })
      .select('-password -__v')
      .exec();
  }

  // Find with populate (relationships)
  async findWithPosts(email: string): Promise<User> {
    return this.userModel
      .findOne({ email })
      .populate('posts') // Populate referenced documents
      .exec();
  }
}
```

**findOne() behavior:**

```typescript
// Returns first match or null
const user = await this.userModel.findOne({ age: 25 });

if (!user) {
  // No user found
  throw new NotFoundException('User not found');
}

// Multiple matches: returns FIRST match only
// Collection: [
//   { name: 'John', age: 25 },
//   { name: 'Jane', age: 25 },
// ]

const user = await this.userModel.findOne({ age: 25 });
// Returns: { name: 'John', age: 25 } (first match)
```

#### findById() - Tìm bằng ID

```typescript
@Injectable()
export class UsersService {
  // Find by ID - simple
  async findById(id: string): Promise<User> {
    const user = await this.userModel.findById(id).exec();
    
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }
    
    return user;
  }

  // Find by ID with error handling
  async findByIdSafe(id: string): Promise<User> {
    // Validate ObjectId format
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID format');
    }

    const user = await this.userModel.findById(id).exec();
    
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }
    
    return user;
  }

  // Find by ID with populate
  async findByIdWithRelations(id: string): Promise<User> {
    return this.userModel
      .findById(id)
      .populate('posts')
      .populate('friends', 'name email') // Select specific fields
      .exec();
  }

  // Find by ID or fail
  async findByIdOrFail(id: string): Promise<User> {
    const user = await this.userModel.findById(id).orFail(
      new NotFoundException(`User #${id} not found`)
    ).exec();
    
    return user;
  }
}
```

**ObjectId validation:**

```typescript
import { Types } from 'mongoose';

// Check if valid ObjectId
Types.ObjectId.isValid('507f1f77bcf86cd799439011'); // true
Types.ObjectId.isValid('invalid-id'); // false
Types.ObjectId.isValid('123'); // false

// Convert string to ObjectId
const objectId = new Types.ObjectId('507f1f77bcf86cd799439011');

// Generate new ObjectId
const newId = new Types.ObjectId();
```

#### Projection (Select Fields)

```typescript
@Injectable()
export class UsersService {
  // Include specific fields
  async findAllNamesOnly(): Promise<User[]> {
    return this.userModel
      .find()
      .select('name email') // Only name and email
      .exec();
  }

  // Exclude specific fields
  async findAllWithoutPassword(): Promise<User[]> {
    return this.userModel
      .find()
      .select('-password -__v') // Exclude password and __v
      .exec();
  }

  // Mix include and exclude
  async findPublicProfile(id: string): Promise<User> {
    return this.userModel
      .findById(id)
      .select('name email age isActive -_id') // Include fields, exclude _id
      .exec();
  }

  // Using projection object
  async findWithProjection(id: string): Promise<User> {
    return this.userModel
      .findById(id)
      .select({ 
        name: 1,      // Include
        email: 1,     // Include
        password: 0,  // Exclude
      })
      .exec();
  }
}
```

**Projection examples:**

```typescript
// Original document:
{
  _id: "507f1f77bcf86cd799439011",
  name: "John Doe",
  email: "john@example.com",
  password: "hashed_password",
  age: 25,
  isActive: true,
  createdAt: "2024-02-06T10:00:00Z",
}

// .select('name email')
// Result:
{
  _id: "507f1f77bcf86cd799439011", // _id always included unless explicitly excluded
  name: "John Doe",
  email: "john@example.com",
}

// .select('-password -__v')
// Result:
{
  _id: "507f1f77bcf86cd799439011",
  name: "John Doe",
  email: "john@example.com",
  age: 25,
  isActive: true,
  createdAt: "2024-02-06T10:00:00Z",
  // password and __v excluded
}

// .select('name email -_id')
// Result:
{
  name: "John Doe",
  email: "john@example.com",
  // _id excluded
}
```

#### Lean Queries cho Performance

```typescript
@Injectable()
export class UsersService {
  // Normal query (returns Mongoose documents)
  async findAllNormal(): Promise<User[]> {
    const users = await this.userModel.find().exec();
    
    // Mongoose documents have methods:
    // users[0].save()
    // users[0].remove()
    // users[0].populate()
    
    return users;
  }

  // Lean query (returns plain JavaScript objects)
  async findAllLean(): Promise<User[]> {
    const users = await this.userModel
      .find()
      .lean() // Returns plain objects
      .exec();
    
    // Plain objects: faster, less memory
    // But NO Mongoose methods available
    
    return users;
  }

  // Lean with type casting
  async findAllLeanTyped(): Promise<User[]> {
    const users = await this.userModel
      .find()
      .lean<User[]>()
      .exec();
    
    return users;
  }
}
```

**Lean vs Normal performance:**

```typescript
// Performance comparison (10,000 documents)

// Normal query
const start1 = Date.now();
const users1 = await this.userModel.find().exec();
console.log(`Normal: ${Date.now() - start1}ms`); // ~500ms
console.log(`Memory: ${JSON.stringify(users1).length} bytes`);

// Lean query
const start2 = Date.now();
const users2 = await this.userModel.find().lean().exec();
console.log(`Lean: ${Date.now() - start2}ms`); // ~150ms (3x faster!)
console.log(`Memory: ${JSON.stringify(users2).length} bytes`); // Less memory

// When to use lean():
// ✓ Read-only operations
// ✓ API responses (just sending JSON)
// ✓ Performance-critical queries
// ✓ Large result sets

// When NOT to use lean():
// ✗ Need to call document methods
// ✗ Need to modify and save
// ✗ Need virtuals or getters
```

**Lean with virtuals:**

```typescript
// Enable virtuals in lean query
const users = await this.userModel
  .find()
  .lean({ virtuals: true }) // Include virtuals
  .exec();

// Now virtuals are included in plain objects
console.log(users[0].fullName); // Virtual property available
```

### 5.4. Cập nhật dữ liệu (Update)

#### updateOne() - Cập nhật một document

```typescript
@Injectable()
export class UsersService {
  // Update one document
  async updateOne(id: string, updateData: UpdateUserDto): Promise<void> {
    const result = await this.userModel.updateOne(
      { _id: id }, // Filter
      { $set: updateData }, // Update
    ).exec();

    if (result.matchedCount === 0) {
      throw new NotFoundException(`User #${id} not found`);
    }
  }

  // Update with operators
  async incrementLoginCount(id: string): Promise<void> {
    await this.userModel.updateOne(
      { _id: id },
      { 
        $inc: { loginCount: 1 }, // Increment by 1
        $set: { lastLoginAt: new Date() },
      }
    ).exec();
  }

  // Update multiple fields
  async updateProfile(id: string, profile: any): Promise<void> {
    await this.userModel.updateOne(
      { _id: id },
      {
        $set: {
          'profile.bio': profile.bio,
          'profile.avatar': profile.avatar,
          updatedAt: new Date(),
        }
      }
    ).exec();
  }
}
```

**updateOne() result:**

```typescript
const result = await this.userModel.updateOne(
  { _id: id },
  { $set: { name: 'Updated Name' } }
);

console.log(result);
// {
//   acknowledged: true,
//   modifiedCount: 1,    // Number of documents modified
//   matchedCount: 1,     // Number of documents matched
//   upsertedCount: 0,    // Number of documents upserted
//   upsertedId: null,    // ID of upserted document
// }
```

#### updateMany() - Cập nhật nhiều documents

```typescript
@Injectable()
export class UsersService {
  // Deactivate all inactive users
  async deactivateInactiveUsers(): Promise<number> {
    const result = await this.userModel.updateMany(
      { 
        isActive: false,
        lastLoginAt: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
      },
      { 
        $set: { 
          status: 'inactive',
          deactivatedAt: new Date(),
        }
      }
    ).exec();

    return result.modifiedCount;
  }

  // Add tag to all users in a category
  async addTagToCategory(category: string, tag: string): Promise<number> {
    const result = await this.userModel.updateMany(
      { category },
      { $addToSet: { tags: tag } } // Add to array if not exists
    ).exec();

    return result.modifiedCount;
  }

  // Bulk update with different values
  async bulkUpdateRoles(updates: Array<{ id: string; role: string }>): Promise<void> {
    const bulkOps = updates.map(update => ({
      updateOne: {
        filter: { _id: update.id },
        update: { $set: { role: update.role } },
      },
    }));

    await this.userModel.bulkWrite(bulkOps);
  }
}
```

#### findByIdAndUpdate() - Tìm và cập nhật

```typescript
@Injectable()
export class UsersService {
  // Update and return updated document
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userModel.findByIdAndUpdate(
      id,
      { $set: updateUserDto },
      { 
        new: true, // Return updated document (default: false - returns old)
        runValidators: true, // Run schema validators
      }
    ).exec();

    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }

    return user;
  }

  // Update specific fields
  async updateEmail(id: string, newEmail: string): Promise<User> {
    return this.userModel.findByIdAndUpdate(
      id,
      { 
        $set: { 
          email: newEmail,
          emailVerified: false, // Reset verification
        }
      },
      { new: true }
    ).exec();
  }

  // Update with validation
  async updateWithValidation(id: string, data: UpdateUserDto): Promise<User> {
    // Validate first
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }

    // Apply updates
    Object.assign(user, data);
    
    // Validate
    await user.validate();
    
    // Save
    return user.save();
  }
}
```

**findByIdAndUpdate() options:**

```typescript
await this.userModel.findByIdAndUpdate(
  id,
  { $set: { name: 'New Name' } },
  {
    new: true,           // Return updated doc (default: false)
    upsert: false,       // Create if not exists (default: false)
    runValidators: true, // Run validators (default: false)
    select: 'name email', // Select fields to return
    lean: false,         // Return plain object (default: false)
  }
);
```

#### findOneAndUpdate() - Tìm và cập nhật với điều kiện

```typescript
@Injectable()
export class UsersService {
  // Update by email
  async updateByEmail(email: string, updates: UpdateUserDto): Promise<User> {
    return this.userModel.findOneAndUpdate(
      { email },
      { $set: updates },
      { new: true, runValidators: true }
    ).exec();
  }

  // Update only if condition matches
  async updateIfActive(id: string, updates: UpdateUserDto): Promise<User> {
    const user = await this.userModel.findOneAndUpdate(
      { 
        _id: id,
        isActive: true, // Only update if active
      },
      { $set: updates },
      { new: true }
    ).exec();

    if (!user) {
      throw new BadRequestException('User not found or not active');
    }

    return user;
  }

  // Conditional update with version check
  async updateWithVersionCheck(
    id: string, 
    version: number, 
    updates: UpdateUserDto
  ): Promise<User> {
    const user = await this.userModel.findOneAndUpdate(
      { 
        _id: id,
        __v: version, // Version check (optimistic locking)
      },
      { 
        $set: updates,
        $inc: { __v: 1 }, // Increment version
      },
      { new: true }
    ).exec();

    if (!user) {
      throw new ConflictException('Document was modified by another process');
    }

    return user;
  }
}
```

#### Update Operators

**$set - Set field value:**

```typescript
// Set single field
await this.userModel.updateOne(
  { _id: id },
  { $set: { name: 'New Name' } }
);

// Set multiple fields
await this.userModel.updateOne(
  { _id: id },
  { 
    $set: { 
      name: 'New Name',
      email: 'new@example.com',
      updatedAt: new Date(),
    }
  }
);

// Set nested field
await this.userModel.updateOne(
  { _id: id },
  { $set: { 'address.city': 'Hanoi' } }
);
```

**$inc - Increment numeric value:**

```typescript
// Increment by 1
await this.userModel.updateOne(
  { _id: id },
  { $inc: { loginCount: 1 } }
);

// Increment by custom value
await this.userModel.updateOne(
  { _id: id },
  { $inc: { score: 10 } }
);

// Decrement (negative increment)
await this.userModel.updateOne(
  { _id: id },
  { $inc: { credits: -5 } }
);

// Multiple increments
await this.userModel.updateOne(
  { _id: id },
  { 
    $inc: { 
      loginCount: 1,
      points: 10,
      level: 1,
    }
  }
);
```

**$push - Add to array:**

```typescript
// Push single item
await this.userModel.updateOne(
  { _id: id },
  { $push: { tags: 'mongodb' } }
);

// Push multiple items
await this.userModel.updateOne(
  { _id: id },
  { 
    $push: { 
      tags: { 
        $each: ['mongodb', 'nodejs', 'nestjs']
      }
    }
  }
);

// Push with position
await this.userModel.updateOne(
  { _id: id },
  { 
    $push: { 
      tags: { 
        $each: ['first-tag'],
        $position: 0, // Insert at beginning
      }
    }
  }
);

// Push with limit (keep only last N items)
await this.userModel.updateOne(
  { _id: id },
  { 
    $push: { 
      recentActions: { 
        $each: [{ action: 'login', time: new Date() }],
        $slice: -10, // Keep only last 10 items
      }
    }
  }
);

// Push and sort
await this.userModel.updateOne(
  { _id: id },
  { 
    $push: { 
      scores: { 
        $each: [85, 90, 78],
        $sort: -1, // Sort descending
      }
    }
  }
);
```

**$pull - Remove from array:**

```typescript
// Remove specific value
await this.userModel.updateOne(
  { _id: id },
  { $pull: { tags: 'mongodb' } }
);

// Remove multiple values
await this.userModel.updateOne(
  { _id: id },
  { $pull: { tags: { $in: ['old-tag', 'deprecated'] } } }
);

// Remove by condition
await this.userModel.updateOne(
  { _id: id },
  { 
    $pull: { 
      scores: { $lt: 50 } // Remove scores less than 50
    }
  }
);

// Remove subdocument
await this.userModel.updateOne(
  { _id: id },
  { 
    $pull: { 
      addresses: { city: 'Old City' }
    }
  }
);
```

**$addToSet - Add to array if not exists:**

```typescript
// Add single item (no duplicates)
await this.userModel.updateOne(
  { _id: id },
  { $addToSet: { tags: 'mongodb' } }
);
// If 'mongodb' already exists, nothing happens

// Add multiple items
await this.userModel.updateOne(
  { _id: id },
  { 
    $addToSet: { 
      tags: { 
        $each: ['mongodb', 'nodejs', 'nestjs']
      }
    }
  }
);
// Only non-existing items are added
```

**$pop - Remove first/last array element:**

```typescript
// Remove last element
await this.userModel.updateOne(
  { _id: id },
  { $pop: { tags: 1 } } // 1 = last, -1 = first
);

// Remove first element
await this.userModel.updateOne(
  { _id: id },
  { $pop: { recentActions: -1 } }
);
```

**$unset - Remove field:**

```typescript
// Remove single field
await this.userModel.updateOne(
  { _id: id },
  { $unset: { phoneNumber: '' } }
);

// Remove multiple fields
await this.userModel.updateOne(
  { _id: id },
  { 
    $unset: { 
      phoneNumber: '',
      temporaryToken: '',
      expiredField: '',
    }
  }
);
```

**$rename - Rename field:**

```typescript
// Rename field
await this.userModel.updateOne(
  { _id: id },
  { $rename: { 'oldFieldName': 'newFieldName' } }
);
```

**Combining operators:**

```typescript
// Complex update with multiple operators
await this.userModel.updateOne(
  { _id: id },
  {
    $set: { 
      name: 'Updated Name',
      updatedAt: new Date(),
    },
    $inc: { 
      loginCount: 1,
      points: 10,
    },
    $push: { 
      recentActions: {
        $each: [{ action: 'update', time: new Date() }],
        $slice: -20,
      }
    },
    $addToSet: { 
      tags: { $each: ['active', 'verified'] }
    },
  }
);
```

#### Upsert Option

```typescript
@Injectable()
export class UsersService {
  // Update or create if not exists
  async upsert(email: string, userData: any): Promise<User> {
    const user = await this.userModel.findOneAndUpdate(
      { email },
      { 
        $set: userData,
        $setOnInsert: { 
          createdAt: new Date(), // Only set on insert
        }
      },
      { 
        upsert: true, // Create if not exists
        new: true,
        runValidators: true,
      }
    ).exec();

    return user;
  }

  // Increment counter (create if not exists)
  async incrementOrCreate(userId: string): Promise<void> {
    await this.userModel.updateOne(
      { _id: userId },
      { 
        $inc: { visitCount: 1 },
        $setOnInsert: { 
          firstVisit: new Date(),
        }
      },
      { upsert: true }
    ).exec();
  }
}
```

**Upsert behavior:**

```typescript
// Document exists: UPDATE
await this.userModel.findOneAndUpdate(
  { email: 'existing@example.com' },
  { $set: { name: 'Updated' } },
  { upsert: true }
);
// Updates existing document

// Document doesn't exist: INSERT
await this.userModel.findOneAndUpdate(
  { email: 'new@example.com' },
  { 
    $set: { name: 'New User' },
    $setOnInsert: { createdAt: new Date() }
  },
  { upsert: true }
);
// Creates new document with email, name, and createdAt
```

# Lesson 11 - NoSQL with MongoDB (Tiếp theo)

## 5. CRUD cơ bản với Mongoose (Tiếp theo)

### 5.5. Xóa dữ liệu (Delete)

#### deleteOne() - Xóa một document

```typescript
// src/users/users.service.ts
@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  // Delete one document
  async deleteOne(id: string): Promise<void> {
    const result = await this.userModel.deleteOne({ _id: id }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(`User #${id} not found`);
    }
  }

  // Delete by condition
  async deleteByEmail(email: string): Promise<void> {
    const result = await this.userModel.deleteOne({ email }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(`User with email ${email} not found`);
    }
  }

  // Delete with validation
  async deleteIfInactive(id: string): Promise<void> {
    const result = await this.userModel.deleteOne({
      _id: id,
      isActive: false, // Only delete if inactive
    }).exec();

    if (result.deletedCount === 0) {
      throw new BadRequestException('User not found or still active');
    }
  }
}
```

**deleteOne() result:**

```typescript
const result = await this.userModel.deleteOne({ _id: id });

console.log(result);
// {
//   acknowledged: true,
//   deletedCount: 1, // Number of documents deleted (0 or 1)
// }

// Check if deleted
if (result.deletedCount === 0) {
  // Document not found
}
```

#### deleteMany() - Xóa nhiều documents

```typescript
@Injectable()
export class UsersService {
  // Delete all inactive users
  async deleteInactiveUsers(): Promise<number> {
    const result = await this.userModel.deleteMany({
      isActive: false,
      lastLoginAt: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
    }).exec();

    return result.deletedCount;
  }

  // Delete by category
  async deleteByCategory(category: string): Promise<number> {
    const result = await this.userModel.deleteMany({ category }).exec();
    return result.deletedCount;
  }

  // Delete all test users
  async deleteTestUsers(): Promise<number> {
    const result = await this.userModel.deleteMany({
      email: { $regex: /@test\.com$/ }
    }).exec();

    return result.deletedCount;
  }

  // Delete with date range
  async deleteOldUsers(beforeDate: Date): Promise<number> {
    const result = await this.userModel.deleteMany({
      createdAt: { $lt: beforeDate }
    }).exec();

    return result.deletedCount;
  }
}
```

**⚠️ Warning: deleteMany() is dangerous!**

```typescript
// Dangerous: Delete ALL documents
await this.userModel.deleteMany({}); // Empty filter = delete all!

// Safe: Always use specific filters
await this.userModel.deleteMany({ 
  status: 'deleted',
  deletedAt: { $lt: new Date() }
});

// Production safety: Add confirmation
async deleteAllInCategory(category: string, confirm: boolean): Promise<number> {
  if (!confirm) {
    throw new BadRequestException('Please confirm deletion');
  }

  const count = await this.userModel.countDocuments({ category });
  
  if (count > 100) {
    throw new BadRequestException(`Too many documents to delete: ${count}`);
  }

  const result = await this.userModel.deleteMany({ category });
  return result.deletedCount;
}
```

#### findByIdAndDelete() - Tìm và xóa

```typescript
@Injectable()
export class UsersService {
  // Delete and return deleted document
  async remove(id: string): Promise<User> {
    const user = await this.userModel.findByIdAndDelete(id).exec();

    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }

    return user;
  }

  // Delete with select
  async removeAndGetEmail(id: string): Promise<string> {
    const user = await this.userModel
      .findByIdAndDelete(id)
      .select('email')
      .exec();

    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }

    return user.email;
  }

  // Delete with condition
  async removeIfOwner(id: string, userId: string): Promise<User> {
    const user = await this.userModel.findOneAndDelete({
      _id: id,
      userId: userId, // Only delete if owner
    }).exec();

    if (!user) {
      throw new ForbiddenException('Not authorized to delete this user');
    }

    return user;
  }
}
```

**findByIdAndDelete() vs deleteOne():**

```typescript
// findByIdAndDelete() - Returns deleted document
const deletedUser = await this.userModel.findByIdAndDelete(id);
console.log(deletedUser); // Full user object or null

// deleteOne() - Returns delete result
const result = await this.userModel.deleteOne({ _id: id });
console.log(result); // { acknowledged: true, deletedCount: 1 }

// When to use which:
// findByIdAndDelete(): Need deleted document data (logging, audit, etc.)
// deleteOne(): Just need to delete, don't care about data
```

#### findOneAndDelete()

```typescript
@Injectable()
export class UsersService {
  // Delete by email and return
  async removeByEmail(email: string): Promise<User> {
    const user = await this.userModel.findOneAndDelete({ email }).exec();

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    return user;
  }

  // Delete with complex condition
  async removeExpiredUser(email: string): Promise<User> {
    const user = await this.userModel.findOneAndDelete({
      email,
      status: 'expired',
      expiresAt: { $lt: new Date() }
    }).exec();

    if (!user) {
      throw new NotFoundException('No expired user found with this email');
    }

    return user;
  }
}
```

### 5.6. Soft Delete Pattern

Soft delete là pattern không xóa thật document, mà chỉ đánh dấu là "deleted".

**Ưu điểm:**
- Có thể restore data
- Audit trail (theo dõi lịch sử)
- Compliance (tuân thủ quy định)

**Nhược điểm:**
- Database size tăng
- Queries phức tạp hơn
- Cần cleanup định kỳ

#### Schema cho Soft Delete

```typescript
// src/users/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ type: Date, default: null })
  deletedAt: Date;

  @Prop({ type: String, default: null })
  deletedBy: string; // User ID who deleted

  @Prop()
  deletionReason: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Query helper: Exclude deleted by default
UserSchema.query.notDeleted = function() {
  return this.where({ isDeleted: false });
};

// Add to TypeScript interface
declare module 'mongoose' {
  interface Query<ResultType, DocType, THelpers = {}, RawDocType = DocType> {
    notDeleted(): Query<ResultType, DocType, THelpers, RawDocType>;
  }
}
```

#### Soft Delete Service

```typescript
// src/users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  // Find all (exclude deleted)
  async findAll(): Promise<User[]> {
    return this.userModel
      .find({ isDeleted: false })
      .exec();
  }

  // Or using query helper
  async findAllNotDeleted(): Promise<User[]> {
    return this.userModel
      .find()
      .notDeleted() // Custom query helper
      .exec();
  }

  // Find by ID (exclude deleted)
  async findById(id: string): Promise<User> {
    const user = await this.userModel
      .findOne({ _id: id, isDeleted: false })
      .exec();

    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }

    return user;
  }

  // Soft delete
  async softDelete(id: string, deletedBy: string, reason?: string): Promise<User> {
    const user = await this.userModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy,
          deletionReason: reason,
        }
      },
      { new: true }
    ).exec();

    if (!user) {
      throw new NotFoundException(`User #${id} not found or already deleted`);
    }

    return user;
  }

  // Restore
  async restore(id: string): Promise<User> {
    const user = await this.userModel.findOneAndUpdate(
      { _id: id, isDeleted: true },
      {
        $set: {
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
          deletionReason: null,
        }
      },
      { new: true }
    ).exec();

    if (!user) {
      throw new NotFoundException(`User #${id} not found or not deleted`);
    }

    return user;
  }

  // Find deleted users (for admin)
  async findDeleted(): Promise<User[]> {
    return this.userModel
      .find({ isDeleted: true })
      .sort({ deletedAt: -1 })
      .exec();
  }

  // Permanent delete (hard delete)
  async permanentDelete(id: string): Promise<void> {
    const result = await this.userModel.deleteOne({
      _id: id,
      isDeleted: true, // Only hard delete if soft deleted
    }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(`User #${id} not found or not soft deleted`);
    }
  }

  // Cleanup: Permanently delete old soft-deleted records
  async cleanupDeleted(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.userModel.deleteMany({
      isDeleted: true,
      deletedAt: { $lt: cutoffDate }
    }).exec();

    return result.deletedCount;
  }
}
```

#### Advanced Soft Delete with Plugin

```typescript
// src/common/plugins/soft-delete.plugin.ts
import { Schema } from 'mongoose';

export interface SoftDeleteDocument {
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
}

export function softDeletePlugin(schema: Schema) {
  // Add fields
  schema.add({
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: String, default: null },
  });

  // Override find methods to exclude deleted by default
  const excludeDeleted = function(next) {
    // Only apply if isDeleted filter not explicitly set
    if (!this.getQuery().isDeleted) {
      this.where({ isDeleted: false });
    }
    next();
  };

  schema.pre('find', excludeDeleted);
  schema.pre('findOne', excludeDeleted);
  schema.pre('findOneAndUpdate', excludeDeleted);
  schema.pre('countDocuments', excludeDeleted);

  // Add instance method: soft delete
  schema.methods.softDelete = function(deletedBy?: string) {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = deletedBy;
    return this.save();
  };

  // Add instance method: restore
  schema.methods.restore = function() {
    this.isDeleted = false;
    this.deletedAt = null;
    this.deletedBy = null;
    return this.save();
  };

  // Add static method: find with deleted
  schema.statics.findWithDeleted = function(filter = {}) {
    return this.find(filter).setOptions({ isDeleted: undefined });
  };

  // Add static method: find only deleted
  schema.statics.findDeleted = function(filter = {}) {
    return this.find({ ...filter, isDeleted: true });
  };
}
```

**Usage:**

```typescript
// src/users/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { softDeletePlugin, SoftDeleteDocument } from '../../common/plugins/soft-delete.plugin';

export type UserDocument = User & Document & SoftDeleteDocument;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  // Soft delete fields added by plugin
}

export const UserSchema = SchemaFactory.createForClass(User);

// Apply plugin
UserSchema.plugin(softDeletePlugin);

// Add type declarations
export interface UserModel extends Model<UserDocument> {
  findWithDeleted(filter?: any): Query<UserDocument[], UserDocument>;
  findDeleted(filter?: any): Query<UserDocument[], UserDocument>;
}
```

**Service with plugin:**

```typescript
@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: UserModel,
  ) {}

  // Find all (auto excludes deleted)
  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  // Find including deleted
  async findAllWithDeleted(): Promise<User[]> {
    return this.userModel.findWithDeleted().exec();
  }

  // Find only deleted
  async findDeleted(): Promise<User[]> {
    return this.userModel.findDeleted().exec();
  }

  // Soft delete using instance method
  async softDelete(id: string, deletedBy: string): Promise<User> {
    const user = await this.userModel.findById(id);
    
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }

    await user.softDelete(deletedBy);
    return user;
  }

  // Restore using instance method
  async restore(id: string): Promise<User> {
    const user = await this.userModel
      .findOne({ _id: id, isDeleted: true })
      .setOptions({ isDeleted: undefined }); // Override pre-hook

    if (!user) {
      throw new NotFoundException(`User #${id} not found in trash`);
    }

    await user.restore();
    return user;
  }
}
```

---

## 6. Quan hệ dữ liệu trong MongoDB

### 6.1. Khi nào dùng Embedded vs References?

Đây là một trong những quyết định quan trọng nhất khi thiết kế schema MongoDB.

#### Decision Framework

**Câu hỏi cần trả lời:**

1. **Dữ liệu có được truy cập cùng nhau không?**
   - Luôn luôn → Embedded
   - Đôi khi → References

2. **Dữ liệu con có kích thước như thế nào?**
   - Nhỏ và cố định → Embedded
   - Lớn hoặc không giới hạn → References

3. **Dữ liệu có được update độc lập không?**
   - Không → Embedded
   - Có → References

4. **Có cần query dữ liệu con riêng lẻ không?**
   - Không → Embedded
   - Có → References

5. **Dữ liệu có duplicate ở nhiều nơi không?**
   - Không → Embedded or References
   - Có → References (tránh duplication)

#### One-to-One Relationships

**Example: User ↔ Profile**

```typescript
// Option 1: Embedded (RECOMMENDED for 1-to-1)
@Schema()
export class User {
  @Prop({ required: true })
  email: string;

  @Prop({ type: Object })
  profile: {
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    bio: string;
    avatar: string;
  };
}

// Pros:
// ✓ One query to get everything
// ✓ Atomic updates
// ✓ Better performance

// Cons:
// ✗ Document size grows
// ✗ Can't query profile independently
```

```typescript
// Option 2: References (if profile is large/complex)
@Schema()
export class User {
  @Prop({ required: true })
  email: string;

  @Prop({ type: Types.ObjectId, ref: 'Profile' })
  profileId: Types.ObjectId;
}

@Schema()
export class Profile {
  @Prop({ type: Types.ObjectId, ref: 'User', unique: true })
  userId: Types.ObjectId;

  @Prop()
  firstName: string;

  @Prop()
  lastName: string;

  @Prop()
  bio: string;

  // ... many more fields
}

// Pros:
// ✓ Keep User document small
// ✓ Can query/update profile independently
// ✓ Better for large profile data

// Cons:
// ✗ Need 2 queries (or populate)
// ✗ No atomic updates across both
```

#### One-to-Many Relationships

**Example: User ↔ Addresses**

**Case 1: Few items (< 10-20) → Embedded**

```typescript
@Schema()
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  email: string;

  @Prop({ type: [AddressSchema] })
  addresses: Address[];
}

@Schema()
export class Address {
  @Prop({ required: true })
  street: string;

  @Prop({ required: true })
  city: string;

  @Prop({ required: true })
  country: string;

  @Prop({ default: false })
  isPrimary: boolean;
}

export const AddressSchema = SchemaFactory.createForClass(Address);

// Usage
const user = await this.userModel.create({
  name: 'John Doe',
  email: 'john@example.com',
  addresses: [
    {
      street: '123 Main St',
      city: 'Hanoi',
      country: 'Vietnam',
      isPrimary: true,
    },
    {
      street: '456 Second St',
      city: 'HCMC',
      country: 'Vietnam',
      isPrimary: false,
    },
  ],
});

// Add address
await this.userModel.updateOne(
  { _id: userId },
  {
    $push: {
      addresses: {
        street: '789 Third St',
        city: 'Da Nang',
        country: 'Vietnam',
      }
    }
  }
);

// Update address
await this.userModel.updateOne(
  { _id: userId, 'addresses._id': addressId },
  { $set: { 'addresses.$.isPrimary': true } }
);
```

**Case 2: Many items (unbounded) → References**

**Example: User ↔ Posts**

```typescript
// src/users/schemas/user.schema.ts
@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// src/posts/schemas/post.schema.ts
@Schema({ timestamps: true })
export class Post {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorId: Types.ObjectId;

  @Prop({ default: 0 })
  viewCount: number;
}

export const PostSchema = SchemaFactory.createForClass(Post);

// Why references?
// - User can have unlimited posts
// - Posts are queried independently
// - Posts are updated frequently
```

**Service with references:**

```typescript
// src/posts/posts.service.ts
@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
  ) {}

  // Create post
  async create(authorId: string, createPostDto: CreatePostDto): Promise<Post> {
    return this.postModel.create({
      ...createPostDto,
      authorId,
    });
  }

  // Get user's posts
  async findByAuthor(authorId: string): Promise<Post[]> {
    return this.postModel
      .find({ authorId })
      .sort({ createdAt: -1 })
      .exec();
  }

  // Get post with author info (populate)
  async findById(id: string): Promise<Post> {
    return this.postModel
      .findById(id)
      .populate('authorId', 'name email') // Populate author
      .exec();
  }

  // Get all posts with authors
  async findAll(): Promise<Post[]> {
    return this.postModel
      .find()
      .populate('authorId', 'name email avatar')
      .sort({ createdAt: -1 })
      .exec();
  }
}
```

#### Many-to-Many Relationships

**Example: Posts ↔ Tags**

**Option 1: Array of References (simple, for small sets)**

```typescript
// src/posts/schemas/post.schema.ts
@Schema()
export class Post {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Tag' }] })
  tags: Types.ObjectId[];
}

export const PostSchema = SchemaFactory.createForClass(Post);

// src/tags/schemas/tag.schema.ts
@Schema()
export class Tag {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ default: 0 })
  postCount: number;
}

export const TagSchema = SchemaFactory.createForClass(Tag);
```

**Usage:**

```typescript
// src/posts/posts.service.ts
@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    @InjectModel(Tag.name) private tagModel: Model<TagDocument>,
  ) {}

  // Create post with tags
  async create(createPostDto: CreatePostDto): Promise<Post> {
    const { tagNames, ...postData } = createPostDto;

    // Find or create tags
    const tags = await Promise.all(
      tagNames.map(async (name) => {
        let tag = await this.tagModel.findOne({ name });
        if (!tag) {
          tag = await this.tagModel.create({ name });
        }
        return tag._id;
      })
    );

    // Create post with tag references
    const post = await this.postModel.create({
      ...postData,
      tags,
    });

    // Increment tag post counts
    await this.tagModel.updateMany(
      { _id: { $in: tags } },
      { $inc: { postCount: 1 } }
    );

    return post;
  }

  // Get post with tags populated
  async findById(id: string): Promise<Post> {
    return this.postModel
      .findById(id)
      .populate('tags', 'name description')
      .exec();
  }

  // Get posts by tag
  async findByTag(tagId: string): Promise<Post[]> {
    return this.postModel
      .find({ tags: tagId })
      .populate('tags')
      .exec();
  }

  // Add tag to post
  async addTag(postId: string, tagId: string): Promise<Post> {
    const post = await this.postModel.findByIdAndUpdate(
      postId,
      { $addToSet: { tags: tagId } }, // Add if not exists
      { new: true }
    ).exec();

    // Increment tag count
    await this.tagModel.updateOne(
      { _id: tagId },
      { $inc: { postCount: 1 } }
    );

    return post;
  }

  // Remove tag from post
  async removeTag(postId: string, tagId: string): Promise<Post> {
    const post = await this.postModel.findByIdAndUpdate(
      postId,
      { $pull: { tags: tagId } },
      { new: true }
    ).exec();

    // Decrement tag count
    await this.tagModel.updateOne(
      { _id: tagId },
      { $inc: { postCount: -1 } }
    );

    return post;
  }
}
```

**Option 2: Junction Collection (for complex many-to-many)**

```typescript
// When you need metadata about the relationship
// Example: User ↔ Course (with enrollment date, progress, etc.)

// src/enrollments/schemas/enrollment.schema.ts
@Schema({ timestamps: true })
export class Enrollment {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  courseId: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  enrolledAt: Date;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  progress: number;

  @Prop({ type: String, enum: ['active', 'completed', 'dropped'], default: 'active' })
  status: string;

  @Prop({ type: Date })
  completedAt: Date;
}

export const EnrollmentSchema = SchemaFactory.createForClass(Enrollment);

// Create compound index for uniqueness
EnrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });
```

**Service:**

```typescript
@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectModel(Enrollment.name) private enrollmentModel: Model<EnrollmentDocument>,
  ) {}

  // Enroll user in course
  async enroll(userId: string, courseId: string): Promise<Enrollment> {
    try {
      return await this.enrollmentModel.create({
        userId,
        courseId,
      });
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Already enrolled in this course');
      }
      throw error;
    }
  }

  // Get user's courses
  async getUserCourses(userId: string): Promise<Enrollment[]> {
    return this.enrollmentModel
      .find({ userId })
      .populate('courseId', 'title description')
      .exec();
  }

  // Get course's students
  async getCourseStudents(courseId: string): Promise<Enrollment[]> {
    return this.enrollmentModel
      .find({ courseId })
      .populate('userId', 'name email')
      .exec();
  }

  // Update progress
  async updateProgress(userId: string, courseId: string, progress: number): Promise<Enrollment> {
    const enrollment = await this.enrollmentModel.findOneAndUpdate(
      { userId, courseId },
      {
        $set: {
          progress,
          ...(progress === 100 && { 
            status: 'completed',
            completedAt: new Date()
          })
        }
      },
      { new: true }
    ).exec();

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    return enrollment;
  }
}
```

### 6.2. Embedded Documents (Denormalization)

#### Ưu điểm

```typescript
// ✓ Performance: 1 query thay vì nhiều queries
const post = await this.postModel.findById(postId);
// Có luôn author info, comments, etc.

// ✓ Atomic operations
await this.postModel.updateOne(
  { _id: postId },
  {
    $set: { title: 'New Title' },
    $push: { comments: newComment }
  }
);
// Both updates succeed or fail together

// ✓ Data locality: related data stored together
// Better for read performance
```

#### Nhược điểm

```typescript
// ✗ Data duplication
{
  _id: "post1",
  title: "My Post",
  author: {
    id: "user123",
    name: "John Doe",
    email: "john@example.com" // Duplicated
  }
}

{
  _id: "post2",
  title: "Another Post",
  author: {
    id: "user123",
    name: "John Doe",
    email: "john@example.com" // Duplicated again!
  }
}

// If user changes email → must update ALL posts!

// ✗ Document size limit: 16MB max
// Can't have unlimited embedded items

// ✗ Update complexity
// Updating nested arrays can be tricky
```

#### Examples

**Example 1: Blog Post with Comments**

```typescript
@Schema({ timestamps: true })
export class Comment {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  userName: string; // Denormalized for performance

  @Prop({ required: true })
  content: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ default: 0 })
  likes: number;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);

@Schema({ timestamps: true })
export class Post {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorId: Types.ObjectId;

  @Prop({ type: [CommentSchema], default: [] })
  comments: Comment[];

  @Prop({ default: 0 })
  viewCount: number;
}

export const PostSchema = SchemaFactory.createForClass(Post);
```

**Service:**

```typescript
@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  // Add comment
  async addComment(postId: string, userId: string, content: string): Promise<Post> {
    // Get user name
    const user = await this.userModel.findById(userId).select('name');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Add comment with denormalized user name
    return this.postModel.findByIdAndUpdate(
      postId,
      {
        $push: {
          comments: {
            userId,
            userName: user.name, // Denormalized!
            content,
            createdAt: new Date(),
            likes: 0,
          }
        }
      },
      { new: true }
    ).exec();
  }

  // Like comment
  async likeComment(postId: string, commentId: string): Promise<Post> {
    return this.postModel.findOneAndUpdate(
      { 
        _id: postId,
        'comments._id': commentId
      },
      {
        $inc: { 'comments.$.likes': 1 }
      },
      { new: true }
    ).exec();
  }

  // Delete comment
  async deleteComment(postId: string, commentId: string, userId: string): Promise<Post> {
    const post = await this.postModel.findById(postId);

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const comment = post.comments.id(commentId);

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId.toString() !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    return this.postModel.findByIdAndUpdate(
      postId,
      { $pull: { comments: { _id: commentId } } },
      { new: true }
    ).exec();
  }

  // Get post with limited comments (pagination)
  async findByIdWithComments(postId: string, commentLimit: number = 10): Promise<Post> {
    return this.postModel.findById(postId)
      .slice('comments', commentLimit) // Limit embedded array
      .exec();
  }
}
```

# Lesson 11 - NoSQL with MongoDB (Tiếp theo)

## 6. Quan hệ dữ liệu trong MongoDB (Tiếp theo)

### 6.3. References (Normalization)

#### Manual References vs DBRefs

**Manual References (Recommended)**

```typescript
// Simple ObjectId reference
@Schema()
export class Post {
  @Prop({ required: true })
  title: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorId: Types.ObjectId; // Manual reference

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Tag' }] })
  tagIds: Types.ObjectId[];
}

// Pros:
// ✓ Simple and clean
// ✓ Lightweight
// ✓ Flexible
// ✓ Works with populate()

// Cons:
// ✗ No automatic integrity checking
// ✗ Must manually ensure referenced doc exists
```

**DBRefs (Rarely used)**

```typescript
// DBRef format
{
  $ref: 'collection_name',
  $id: ObjectId('...'),
  $db: 'database_name' // optional
}

// Example
@Schema()
export class Post {
  @Prop({ 
    type: {
      $ref: { type: String, default: 'users' },
      $id: { type: Types.ObjectId, required: true },
    }
  })
  author: {
    $ref: string;
    $id: Types.ObjectId;
  };
}

// Pros:
// ✓ Contains collection name (more explicit)
// ✓ Can reference across databases

// Cons:
// ✗ More complex
// ✗ More storage overhead
// ✗ Not commonly used in modern apps
// ✗ Manual dereferencing needed

// Verdict: Use manual references in 99% of cases
```

#### Ưu điểm của References

```typescript
// ✓ No data duplication
// User stored once
{
  _id: "user123",
  name: "John Doe",
  email: "john@example.com"
}

// Referenced from multiple posts
{ _id: "post1", authorId: "user123", ... }
{ _id: "post2", authorId: "user123", ... }
{ _id: "post3", authorId: "user123", ... }

// Update user email → automatically reflected in all posts (via populate)

// ✓ Flexible: no document size limit
// Can have unlimited posts per user

// ✓ Independent updates
// Update user without touching posts
// Update post without touching user
```

#### Nhược điểm của References

```typescript
// ✗ Multiple queries needed
const post = await this.postModel.findById(postId); // Query 1
const author = await this.userModel.findById(post.authorId); // Query 2

// Or with populate (still 2 queries internally)
const post = await this.postModel
  .findById(postId)
  .populate('authorId'); // Query 1 + Query 2

// ✗ No joins (MongoDB doesn't have native JOINs like SQL)
// Must use populate() or aggregation $lookup

// ✗ No atomic updates across collections
// Can't update user and post in a single atomic operation

// ✗ No referential integrity
// Can delete user without deleting their posts
// Must handle orphaned references manually
```

#### Examples với References

**Example 1: User → Posts (One-to-Many)**

```typescript
// src/users/schemas/user.schema.ts
@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop()
  avatar: string;

  @Prop({ default: 0 })
  postCount: number; // Denormalized counter for performance
}

export const UserSchema = SchemaFactory.createForClass(User);

// src/posts/schemas/post.schema.ts
@Schema({ timestamps: true })
export class Post {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  authorId: Types.ObjectId; // Reference to User

  @Prop({ default: 0 })
  viewCount: number;

  @Prop({ default: 0 })
  likeCount: number;
}

export const PostSchema = SchemaFactory.createForClass(Post);
```

**Service với Populate:**

```typescript
// src/posts/posts.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Post, PostDocument } from './schemas/post.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  // Create post và update user's post count
  async create(authorId: string, createPostDto: CreatePostDto): Promise<Post> {
    // Verify user exists
    const user = await this.userModel.findById(authorId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create post
    const post = await this.postModel.create({
      ...createPostDto,
      authorId,
    });

    // Increment user's post count (denormalized)
    await this.userModel.updateOne(
      { _id: authorId },
      { $inc: { postCount: 1 } }
    );

    return post;
  }

  // Get post with author info (populate)
  async findById(id: string): Promise<Post> {
    const post = await this.postModel
      .findById(id)
      .populate('authorId') // Populate full user
      .exec();

    if (!post) {
      throw new NotFoundException(`Post #${id} not found`);
    }

    return post;
  }

  // Get post with selected author fields
  async findByIdWithAuthor(id: string): Promise<Post> {
    return this.postModel
      .findById(id)
      .populate('authorId', 'name email avatar') // Select specific fields
      .exec();
  }

  // Get all posts with authors
  async findAll(page: number = 1, limit: number = 10): Promise<Post[]> {
    const skip = (page - 1) * limit;

    return this.postModel
      .find()
      .populate('authorId', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  // Get user's posts
  async findByAuthor(authorId: string): Promise<Post[]> {
    return this.postModel
      .find({ authorId })
      .sort({ createdAt: -1 })
      .exec();
  }

  // Delete post và update counter
  async remove(id: string): Promise<void> {
    const post = await this.postModel.findById(id);

    if (!post) {
      throw new NotFoundException(`Post #${id} not found`);
    }

    // Delete post
    await this.postModel.deleteOne({ _id: id });

    // Decrement user's post count
    await this.userModel.updateOne(
      { _id: post.authorId },
      { $inc: { postCount: -1 } }
    );
  }

  // Handle orphaned posts (when user is deleted)
  async handleUserDeletion(userId: string): Promise<void> {
    // Option 1: Delete all user's posts
    await this.postModel.deleteMany({ authorId: userId });

    // Option 2: Reassign to a default user
    // const defaultUserId = '...';
    // await this.postModel.updateMany(
    //   { authorId: userId },
    //   { $set: { authorId: defaultUserId } }
    // );

    // Option 3: Mark as orphaned
    // await this.postModel.updateMany(
    //   { authorId: userId },
    //   { $set: { authorId: null, isOrphaned: true } }
    // );
  }
}
```

**Advanced Populate:**

```typescript
@Injectable()
export class PostsService {
  // Nested populate
  async findByIdWithNestedPopulate(id: string): Promise<Post> {
    return this.postModel
      .findById(id)
      .populate({
        path: 'authorId',
        select: 'name email avatar',
        populate: {
          path: 'companyId', // Nested populate
          select: 'name logo',
        }
      })
      .exec();
  }

  // Populate multiple fields
  async findByIdWithMultiplePopulate(id: string): Promise<Post> {
    return this.postModel
      .findById(id)
      .populate('authorId', 'name avatar')
      .populate('categoryId', 'name slug')
      .populate('tags', 'name')
      .exec();
  }

  // Conditional populate
  async findByIdWithConditionalPopulate(id: string): Promise<Post> {
    return this.postModel
      .findById(id)
      .populate({
        path: 'authorId',
        match: { isActive: true }, // Only populate if user is active
        select: 'name email',
      })
      .exec();
  }

  // Populate with limit and sort
  async findByIdWithLimitedPopulate(id: string): Promise<Post> {
    return this.postModel
      .findById(id)
      .populate({
        path: 'comments',
        options: {
          limit: 10,
          sort: { createdAt: -1 }
        }
      })
      .exec();
  }

  // Virtual populate (reference from other side)
  async findUserWithPosts(userId: string) {
    return this.userModel
      .findById(userId)
      .populate('posts') // Virtual field
      .exec();
  }
}
```

**Virtual Populate Setup:**

```typescript
// src/users/schemas/user.schema.ts
@Schema({ 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Virtual populate: get user's posts
UserSchema.virtual('posts', {
  ref: 'Post',           // Model to populate from
  localField: '_id',     // Field in User
  foreignField: 'authorId', // Field in Post
  justOne: false,        // false = array, true = single object
});

// Usage
const user = await this.userModel
  .findById(userId)
  .populate('posts')
  .exec();

console.log(user.posts); // Array of posts
```

**Example 2: Order → Products (Many-to-Many with metadata)**

```typescript
// src/products/schemas/product.schema.ts
@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  stock: number;

  @Prop()
  description: string;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// src/orders/schemas/order-item.schema.ts
@Schema()
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true })
  price: number; // Snapshot of price at order time

  @Prop()
  productName: string; // Denormalized for history
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

// src/orders/schemas/order.schema.ts
@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[]; // Embedded items with references

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ 
    type: String, 
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  })
  status: string;

  @Prop({ type: Object })
  shippingAddress: {
    street: string;
    city: string;
    country: string;
    postalCode: string;
  };
}

export const OrderSchema = SchemaFactory.createForClass(Order);
```

**Service:**

```typescript
// src/orders/orders.service.ts
@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  // Create order
  async create(userId: string, createOrderDto: CreateOrderDto): Promise<Order> {
    const { items, shippingAddress } = createOrderDto;

    // Get product details and validate stock
    const orderItems: OrderItem[] = [];
    let totalAmount = 0;

    for (const item of items) {
      const product = await this.productModel.findById(item.productId);

      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found`);
      }

      if (product.stock < item.quantity) {
        throw new BadRequestException(`Insufficient stock for ${product.name}`);
      }

      // Snapshot product data
      orderItems.push({
        productId: product._id,
        quantity: item.quantity,
        price: product.price, // Current price
        productName: product.name, // Denormalized
      });

      totalAmount += product.price * item.quantity;
    }

    // Create order
    const order = await this.orderModel.create({
      userId,
      items: orderItems,
      totalAmount,
      shippingAddress,
    });

    // Update product stock
    for (const item of orderItems) {
      await this.productModel.updateOne(
        { _id: item.productId },
        { $inc: { stock: -item.quantity } }
      );
    }

    return order;
  }

  // Get order with product details populated
  async findById(id: string): Promise<Order> {
    return this.orderModel
      .findById(id)
      .populate('userId', 'name email')
      .populate('items.productId', 'name description') // Populate nested reference
      .exec();
  }

  // Get user's orders
  async findByUser(userId: string): Promise<Order[]> {
    return this.orderModel
      .find({ userId })
      .populate('items.productId', 'name')
      .sort({ createdAt: -1 })
      .exec();
  }

  // Cancel order and restore stock
  async cancel(id: string): Promise<Order> {
    const order = await this.orderModel.findById(id);

    if (!order) {
      throw new NotFoundException(`Order #${id} not found`);
    }

    if (order.status !== 'pending') {
      throw new BadRequestException('Only pending orders can be cancelled');
    }

    // Update order status
    order.status = 'cancelled';
    await order.save();

    // Restore product stock
    for (const item of order.items) {
      await this.productModel.updateOne(
        { _id: item.productId },
        { $inc: { stock: item.quantity } }
      );
    }

    return order;
  }
}
```

### 6.4. Hybrid Approach

Kết hợp cả Embedded và References để tận dụng ưu điểm của cả hai.

#### Nguyên tắc: Store reference + frequently used fields

```typescript
// Hybrid pattern: Reference + Denormalized data
@Schema()
export class Post {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  // Reference to full user document
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorId: Types.ObjectId;

  // Denormalized frequently-accessed fields
  @Prop({ required: true })
  authorName: string; // Copy for performance

  @Prop()
  authorAvatar: string; // Copy for performance

  @Prop({ default: 0 })
  viewCount: number;
}

// Pros:
// ✓ Fast reads (no populate needed for basic info)
// ✓ Can still populate for full details
// ✓ Reduced database queries

// Cons:
// ✗ Some duplication
// ✗ Must update denormalized fields when source changes
```

#### Example: Blog Platform

```typescript
// src/users/schemas/user.schema.ts
@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop()
  avatar: string;

  @Prop()
  bio: string;

  @Prop({ default: 0 })
  followerCount: number; // Denormalized counter

  @Prop({ default: 0 })
  postCount: number; // Denormalized counter
}

export const UserSchema = SchemaFactory.createForClass(User);

// src/posts/schemas/post.schema.ts
@Schema({ timestamps: true })
export class Post {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  // Reference to User
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  authorId: Types.ObjectId;

  // Denormalized author info (frequently displayed)
  @Prop({ required: true })
  authorName: string;

  @Prop()
  authorAvatar: string;

  // Embedded comments (with hybrid pattern)
  @Prop({ type: [CommentSchema], default: [] })
  comments: Comment[];

  // Stats
  @Prop({ default: 0 })
  viewCount: number;

  @Prop({ default: 0 })
  likeCount: number;

  @Prop({ default: 0 })
  commentCount: number; // Denormalized
}

export const PostSchema = SchemaFactory.createForClass(Post);

// src/posts/schemas/comment.schema.ts
@Schema()
export class Comment {
  // Reference to User
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  // Denormalized user info
  @Prop({ required: true })
  userName: string;

  @Prop()
  userAvatar: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ default: 0 })
  likes: number;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
```

**Service Implementation:**

```typescript
// src/posts/posts.service.ts
@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  // Create post with denormalized author info
  async create(authorId: string, createPostDto: CreatePostDto): Promise<Post> {
    // Get author info
    const author = await this.userModel
      .findById(authorId)
      .select('name avatar');

    if (!author) {
      throw new NotFoundException('Author not found');
    }

    // Create post with denormalized data
    const post = await this.postModel.create({
      ...createPostDto,
      authorId,
      authorName: author.name,
      authorAvatar: author.avatar,
    });

    // Update author's post count
    await this.userModel.updateOne(
      { _id: authorId },
      { $inc: { postCount: 1 } }
    );

    return post;
  }

  // Get posts (fast - no populate needed for listing)
  async findAll(page: number = 1, limit: number = 10): Promise<Post[]> {
    const skip = (page - 1) * limit;

    return this.postModel
      .find()
      .select('-content') // Exclude heavy field
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
    
    // Returns posts with authorName and authorAvatar already included
    // No populate() needed!
  }

  // Get single post with full details
  async findById(id: string): Promise<Post> {
    const post = await this.postModel
      .findById(id)
      .populate('authorId') // Populate for full author details
      .exec();

    if (!post) {
      throw new NotFoundException(`Post #${id} not found`);
    }

    // Increment view count
    await this.postModel.updateOne(
      { _id: id },
      { $inc: { viewCount: 1 } }
    );

    return post;
  }

  // Add comment with denormalized user info
  async addComment(postId: string, userId: string, content: string): Promise<Post> {
    // Get user info
    const user = await this.userModel
      .findById(userId)
      .select('name avatar');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Add comment with denormalized data
    const post = await this.postModel.findByIdAndUpdate(
      postId,
      {
        $push: {
          comments: {
            userId,
            userName: user.name,
            userAvatar: user.avatar,
            content,
            createdAt: new Date(),
          }
        },
        $inc: { commentCount: 1 }
      },
      { new: true }
    ).exec();

    if (!post) {
      throw new NotFoundException(`Post #${id} not found`);
    }

    return post;
  }

  // Update denormalized data when user changes
  async updateUserDenormalizedData(userId: string, updates: { name?: string; avatar?: string }): Promise<void> {
    const updateFields: any = {};

    if (updates.name) {
      updateFields.authorName = updates.name;
      updateFields['comments.$[].userName'] = updates.name; // Update all comments
    }

    if (updates.avatar) {
      updateFields.authorAvatar = updates.avatar;
      updateFields['comments.$[].userAvatar'] = updates.avatar;
    }

    // Update all user's posts
    await this.postModel.updateMany(
      { authorId: userId },
      { $set: updateFields }
    );

    // Update comments by this user in other posts
    if (updates.name || updates.avatar) {
      const commentUpdates: any = {};
      if (updates.name) commentUpdates['comments.$[elem].userName'] = updates.name;
      if (updates.avatar) commentUpdates['comments.$[elem].userAvatar'] = updates.avatar;

      await this.postModel.updateMany(
        { 'comments.userId': userId },
        { $set: commentUpdates },
        { arrayFilters: [{ 'elem.userId': userId }] }
      );
    }
  }
}
```

**Handling User Updates:**

```typescript
// src/users/users.service.ts
@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private postsService: PostsService, // Inject PostsService
  ) {}

  // Update user profile
  async updateProfile(userId: string, updates: UpdateProfileDto): Promise<User> {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).exec();

    if (!user) {
      throw new NotFoundException(`User #${userId} not found`);
    }

    // Update denormalized data in posts
    if (updates.name || updates.avatar) {
      await this.postsService.updateUserDenormalizedData(userId, {
        name: updates.name,
        avatar: updates.avatar,
      });
    }

    return user;
  }
}
```

#### When to use Hybrid Approach?

```typescript
// ✓ Use hybrid when:
// 1. Displaying lists (avoid populate)
// Example: News feed showing post title + author name + avatar

// 2. Frequently accessed fields
// Example: User name displayed everywhere

// 3. Data that changes rarely
// Example: User name (changes infrequently)

// ✗ Don't use hybrid when:
// 1. Data changes frequently
// Example: User's online status (use real-time instead)

// 2. Large fields
// Example: Full user bio (too much duplication)

// 3. Sensitive data
// Example: Email, phone (privacy concerns)
```

#### Best Practices Summary

```typescript
// 1. Embed for:
// - Data always accessed together
// - Small, bounded arrays (< 100 items)
// - Data that doesn't change often
// - Need atomic updates

@Schema()
export class User {
  @Prop()
  name: string;

  @Prop({ type: [AddressSchema] }) // Embed addresses (few, accessed together)
  addresses: Address[];
}

// 2. Reference for:
// - Unbounded relationships
// - Large related data
// - Data queried independently
// - Data shared across documents

@Schema()
export class Post {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  authorId: Types.ObjectId; // Reference user (many posts per user)
}

// 3. Hybrid for:
// - Frequently displayed fields
// - Performance-critical lists
// - Rarely changing data

@Schema()
export class Post {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  authorId: Types.ObjectId; // Reference

  @Prop()
  authorName: string; // Denormalized for fast reads
}

// 4. Maintain consistency:
// - Use transactions for critical updates
// - Implement event-driven updates
// - Regular data consistency checks

// 5. Monitor and optimize:
// - Use explain() to check query performance
// - Create appropriate indexes
// - Monitor query patterns
// - Adjust schema based on usage
```

#### Complete Example: E-commerce Product Reviews

```typescript
// src/products/schemas/product.schema.ts
@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  price: number;

  @Prop()
  description: string;

  // Denormalized review stats for performance
  @Prop({ default: 0 })
  averageRating: number;

  @Prop({ default: 0 })
  reviewCount: number;

  @Prop({ type: Object, default: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } })
  ratingDistribution: Record<number, number>;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// src/reviews/schemas/review.schema.ts
@Schema({ timestamps: true })
export class Review {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true, index: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  // Denormalized user info
  @Prop({ required: true })
  userName: string;

  @Prop()
  userAvatar: string;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ required: true })
  comment: string;

  @Prop({ default: 0 })
  helpfulCount: number;

  @Prop({ default: false })
  verified: boolean; // Verified purchase
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

// Compound unique index
ReviewSchema.index({ productId: 1, userId: 1 }, { unique: true });
```

**Service:**

```typescript
// src/reviews/reviews.service.ts
@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  // Create review
  async create(userId: string, createReviewDto: CreateReviewDto): Promise<Review> {
    const { productId, rating, comment } = createReviewDto;

    // Get user info
    const user = await this.userModel.findById(userId).select('name avatar');
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create review with denormalized data
    const review = await this.reviewModel.create({
      productId,
      userId,
      userName: user.name,
      userAvatar: user.avatar,
      rating,
      comment,
    });

    // Update product stats
    await this.updateProductStats(productId);

    return review;
  }

  // Update product denormalized stats
  private async updateProductStats(productId: string): Promise<void> {
    // Calculate stats from all reviews
    const stats = await this.reviewModel.aggregate([
      { $match: { productId: new Types.ObjectId(productId) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 },
          ratings: { $push: '$rating' }
        }
      }
    ]);

    if (stats.length === 0) return;

    const { averageRating, reviewCount, ratings } = stats[0];

    // Calculate rating distribution
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach(r => ratingDistribution[r]++);

    // Update product
    await this.productModel.updateOne(
      { _id: productId },
      {
        $set: {
          averageRating: Math.round(averageRating * 10) / 10,
          reviewCount,
          ratingDistribution,
        }
      }
    );
  }

  // Get product reviews
  async findByProduct(productId: string, page: number = 1, limit: number = 10): Promise<Review[]> {
    const skip = (page - 1) * limit;

    return this.reviewModel
      .find({ productId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
    
    // Fast! No populate needed (userName, userAvatar already denormalized)
  }

  // Delete review
  async remove(id: string, userId: string): Promise<void> {
    const review = await this.reviewModel.findOne({ _id: id, userId });

    if (!review) {
      throw new NotFoundException('Review not found or unauthorized');
    }

    await this.reviewModel.deleteOne({ _id: id });

    // Update product stats
    await this.updateProductStats(review.productId.toString());
  }
}
```
