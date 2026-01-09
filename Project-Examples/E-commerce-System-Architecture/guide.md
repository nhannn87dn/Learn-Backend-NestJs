# E-commerce System Architecture - NestJS

## 1. DATABASE SCHEMA (PostgreSQL)

### Core Tables

```sql
-- ============================================
-- CATEGORIES
-- ============================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  description TEXT,
  image_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);

-- ============================================
-- ATTRIBUTE TYPES (Định nghĩa loại thuộc tính)
-- ============================================
CREATE TYPE attribute_input_type AS ENUM (
  'select',      -- Dropdown/Select (single choice)
  'multi_select', -- Multiple choice
  'text',        -- Free text input
  'number',      -- Numeric input
  'color',       -- Color picker
  'boolean',     -- Yes/No checkbox
  'date'         -- Date picker
);

CREATE TABLE attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,                    -- "RAM", "Storage", "Color"
  code VARCHAR(50) UNIQUE NOT NULL,              -- "ram", "storage", "color"
  input_type attribute_input_type NOT NULL,
  is_variant BOOLEAN DEFAULT false,              -- Có phải là biến thể không (RAM: true, Brand: false)
  is_filterable BOOLEAN DEFAULT true,            -- Có thể filter không
  is_required BOOLEAN DEFAULT false,             -- Bắt buộc nhập không
  unit VARCHAR(20),                              -- "GB", "TB", "inch"
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ATTRIBUTE VALUES (Giá trị có thể chọn)
-- ============================================
CREATE TABLE attribute_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attribute_id UUID NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
  value VARCHAR(255) NOT NULL,                   -- "8GB", "16GB", "Red", "Blue"
  display_value VARCHAR(255),                    -- Giá trị hiển thị (nếu khác với value)
  color_code VARCHAR(7),                         -- Mã màu (nếu là color attribute)
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_attribute_values_attribute_id ON attribute_values(attribute_id);

-- ============================================
-- CATEGORY ATTRIBUTES (Thuộc tính theo danh mục)
-- ============================================
CREATE TABLE category_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  attribute_id UUID NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
  is_required BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  UNIQUE(category_id, attribute_id)
);

CREATE INDEX idx_category_attributes_category ON category_attributes(category_id);

-- ============================================
-- PRODUCTS (Sản phẩm chính)
-- ============================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id),
  name VARCHAR(500) NOT NULL,
  slug VARCHAR(500) UNIQUE NOT NULL,
  sku VARCHAR(100) UNIQUE,                       -- SKU tổng quát
  description TEXT,
  short_description VARCHAR(1000),
  brand VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  meta_title VARCHAR(255),
  meta_description TEXT,
  meta_keywords TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_is_active ON products(is_active);

-- ============================================
-- PRODUCT ATTRIBUTES (Thuộc tính không phải biến thể)
-- ============================================
CREATE TABLE product_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  attribute_id UUID NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
  value TEXT NOT NULL,                           -- Giá trị tự nhập hoặc từ attribute_values
  attribute_value_id UUID REFERENCES attribute_values(id),
  UNIQUE(product_id, attribute_id)
);

CREATE INDEX idx_product_attributes_product ON product_attributes(product_id);
CREATE INDEX idx_product_attributes_attribute ON product_attributes(attribute_id);

-- ============================================
-- PRODUCT VARIANTS (Biến thể sản phẩm)
-- ============================================
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku VARCHAR(100) UNIQUE NOT NULL,
  variant_name VARCHAR(255),                     -- "8GB RAM - 1TB HDD"
  price DECIMAL(12, 2) NOT NULL,
  compare_at_price DECIMAL(12, 2),               -- Giá gốc (để hiển thị giảm giá)
  cost_price DECIMAL(12, 2),                     -- Giá vốn
  weight DECIMAL(10, 2),
  dimensions JSONB,                              -- {length, width, height}
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,              -- Biến thể mặc định
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_product_variants_sku ON product_variants(sku);

-- ============================================
-- VARIANT ATTRIBUTES (Thuộc tính của biến thể)
-- ============================================
CREATE TABLE variant_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  attribute_id UUID NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
  value VARCHAR(255) NOT NULL,
  attribute_value_id UUID REFERENCES attribute_values(id),
  UNIQUE(variant_id, attribute_id)
);

CREATE INDEX idx_variant_attributes_variant ON variant_attributes(variant_id);
CREATE INDEX idx_variant_attributes_attribute ON variant_attributes(attribute_id);

-- ============================================
-- PRODUCT IMAGES
-- ============================================
CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  alt_text VARCHAR(255),
  is_primary BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_product_images_product ON product_images(product_id);
CREATE INDEX idx_product_images_variant ON product_images(variant_id);

-- ============================================
-- INVENTORY (Quản lý tồn kho)
-- ============================================
CREATE TABLE warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  postal_code VARCHAR(20),
  phone VARCHAR(20),
  email VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER NOT NULL DEFAULT 0,   -- Số lượng đã đặt nhưng chưa giao
  available_quantity INTEGER GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
  low_stock_threshold INTEGER DEFAULT 10,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(variant_id, warehouse_id)
);

CREATE INDEX idx_inventory_variant ON inventory(variant_id);
CREATE INDEX idx_inventory_warehouse ON inventory(warehouse_id);

-- ============================================
-- INVENTORY TRANSACTIONS (Lịch sử tồn kho)
-- ============================================
CREATE TYPE inventory_transaction_type AS ENUM (
  'purchase',      -- Nhập hàng
  'sale',          -- Bán hàng
  'return',        -- Trả hàng
  'adjustment',    -- Điều chỉnh
  'transfer',      -- Chuyển kho
  'damage',        -- Hư hỏng
  'lost'           -- Thất lạc
);

CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES product_variants(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  type inventory_transaction_type NOT NULL,
  quantity INTEGER NOT NULL,                     -- Dương: nhập, Âm: xuất
  balance_after INTEGER NOT NULL,                -- Tồn kho sau giao dịch
  reference_type VARCHAR(50),                    -- 'order', 'purchase_order', etc.
  reference_id UUID,
  note TEXT,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_inventory_transactions_variant ON inventory_transactions(variant_id);
CREATE INDEX idx_inventory_transactions_warehouse ON inventory_transactions(warehouse_id);
CREATE INDEX idx_inventory_transactions_reference ON inventory_transactions(reference_type, reference_id);

-- ============================================
-- PRICE RULES (Giá theo quy tắc - optional)
-- ============================================
CREATE TABLE price_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  customer_group_id UUID,                        -- Nhóm khách hàng
  min_quantity INTEGER DEFAULT 1,                -- Mua tối thiểu
  price DECIMAL(12, 2) NOT NULL,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_price_rules_variant ON price_rules(variant_id);
```

## 2. ENTITY RELATIONSHIPS

```
Categories
    ↓ 1:N
Products (name, description, brand)
    ↓ 1:N
Product Variants (SKU, price, stock)
    ↓ 1:N
Variant Attributes (RAM: 8GB, Storage: 1TB)
    ↓ N:1
Attributes (RAM, Storage, Color)
    ↓ 1:N
Attribute Values (8GB, 16GB, 1TB, 2TB)

Product Images → Product (chung)
Product Images → Variant (riêng biến thể)

Inventory → Variant + Warehouse
```

## 3. QUERY EXAMPLES

### Query 1: Lấy sản phẩm với tất cả biến thể
```sql
SELECT 
  p.id as product_id,
  p.name,
  p.slug,
  pv.id as variant_id,
  pv.sku,
  pv.variant_name,
  pv.price,
  json_agg(
    json_build_object(
      'attribute', a.name,
      'value', va.value
    )
  ) as variant_attributes
FROM products p
JOIN product_variants pv ON p.id = pv.product_id
LEFT JOIN variant_attributes va ON pv.id = va.variant_id
LEFT JOIN attributes a ON va.attribute_id = a.id
WHERE p.id = 'product-uuid'
GROUP BY p.id, pv.id;
```

### Query 2: Filter sản phẩm theo thuộc tính
```sql
-- Tìm laptop có RAM 16GB và Storage 1TB
SELECT DISTINCT p.*
FROM products p
JOIN product_variants pv ON p.id = pv.product_id
JOIN variant_attributes va1 ON pv.id = va1.variant_id
JOIN attributes a1 ON va1.attribute_id = a1.id
JOIN variant_attributes va2 ON pv.id = va2.variant_id
JOIN attributes a2 ON va2.attribute_id = a2.id
WHERE a1.code = 'ram' AND va1.value = '16GB'
  AND a2.code = 'storage' AND va2.value = '1TB'
  AND p.is_active = true
  AND pv.is_active = true;
```

### Query 3: Lấy tồn kho tất cả kho
```sql
SELECT 
  pv.sku,
  pv.variant_name,
  w.name as warehouse_name,
  i.quantity,
  i.reserved_quantity,
  i.available_quantity
FROM inventory i
JOIN product_variants pv ON i.variant_id = pv.id
JOIN warehouses w ON i.warehouse_id = w.id
WHERE pv.product_id = 'product-uuid'
ORDER BY w.name, pv.variant_name;
```

## 4. NESTJS ENTITIES

```typescript
// src/modules/products/entities/attribute.entity.ts
@Entity('attributes')
export class Attribute extends BaseEntity {
  @Column({ length: 100 })
  name: string;

  @Column({ length: 50, unique: true })
  code: string;

  @Column({
    type: 'enum',
    enum: AttributeInputType,
  })
  inputType: AttributeInputType;

  @Column({ default: false })
  isVariant: boolean;

  @Column({ default: true })
  isFilterable: boolean;

  @Column({ default: false })
  isRequired: boolean;

  @Column({ length: 20, nullable: true })
  unit: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: 0 })
  sortOrder: number;

  @OneToMany(() => AttributeValue, (value) => value.attribute)
  values: AttributeValue[];

  @ManyToMany(() => Category, (category) => category.attributes)
  categories: Category[];
}

// src/modules/products/entities/attribute-value.entity.ts
@Entity('attribute_values')
export class AttributeValue extends BaseEntity {
  @Column()
  attributeId: string;

  @ManyToOne(() => Attribute, (attr) => attr.values)
  @JoinColumn({ name: 'attribute_id' })
  attribute: Attribute;

  @Column({ length: 255 })
  value: string;

  @Column({ length: 255, nullable: true })
  displayValue: string;

  @Column({ length: 7, nullable: true })
  colorCode: string;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ default: true })
  isActive: boolean;
}

// src/modules/products/entities/product.entity.ts
@Entity('products')
export class Product extends BaseEntity {
  @Column()
  categoryId: string;

  @ManyToOne(() => Category, (cat) => cat.products)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ length: 500 })
  name: string;

  @Column({ length: 500, unique: true })
  slug: string;

  @Column({ length: 100, unique: true, nullable: true })
  sku: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 1000, nullable: true })
  shortDescription: string;

  @Column({ length: 100, nullable: true })
  brand: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isFeatured: boolean;

  @OneToMany(() => ProductVariant, (variant) => variant.product, {
    cascade: true,
  })
  variants: ProductVariant[];

  @OneToMany(() => ProductAttribute, (attr) => attr.product)
  attributes: ProductAttribute[];

  @OneToMany(() => ProductImage, (img) => img.product)
  images: ProductImage[];

  @DeleteDateColumn()
  deletedAt: Date;
}

// src/modules/products/entities/product-variant.entity.ts
@Entity('product_variants')
export class ProductVariant extends BaseEntity {
  @Column()
  productId: string;

  @ManyToOne(() => Product, (product) => product.variants)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ length: 100, unique: true })
  sku: string;

  @Column({ length: 255, nullable: true })
  variantName: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  compareAtPrice: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  costPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  weight: number;

  @Column({ type: 'jsonb', nullable: true })
  dimensions: {
    length: number;
    width: number;
    height: number;
  };

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ default: 0 })
  sortOrder: number;

  @OneToMany(() => VariantAttribute, (attr) => attr.variant, {
    cascade: true,
    eager: true,
  })
  attributes: VariantAttribute[];

  @OneToMany(() => Inventory, (inv) => inv.variant)
  inventory: Inventory[];

  @OneToMany(() => ProductImage, (img) => img.variant)
  images: ProductImage[];
}

// src/modules/products/entities/variant-attribute.entity.ts
@Entity('variant_attributes')
export class VariantAttribute extends BaseEntity {
  @Column()
  variantId: string;

  @ManyToOne(() => ProductVariant, (variant) => variant.attributes)
  @JoinColumn({ name: 'variant_id' })
  variant: ProductVariant;

  @Column()
  attributeId: string;

  @ManyToOne(() => Attribute, { eager: true })
  @JoinColumn({ name: 'attribute_id' })
  attribute: Attribute;

  @Column({ length: 255 })
  value: string;

  @Column({ nullable: true })
  attributeValueId: string;

  @ManyToOne(() => AttributeValue, { eager: true })
  @JoinColumn({ name: 'attribute_value_id' })
  attributeValue: AttributeValue;
}

// src/modules/inventory/entities/inventory.entity.ts
@Entity('inventory')
export class Inventory extends BaseEntity {
  @Column()
  variantId: string;

  @ManyToOne(() => ProductVariant, (variant) => variant.inventory)
  @JoinColumn({ name: 'variant_id' })
  variant: ProductVariant;

  @Column()
  warehouseId: string;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @Column({ default: 0 })
  quantity: number;

  @Column({ default: 0 })
  reservedQuantity: number;

  @Column({ select: false })
  availableQuantity: number; // Generated column

  @Column({ default: 10 })
  lowStockThreshold: number;
}

// src/modules/inventory/entities/inventory-transaction.entity.ts
@Entity('inventory_transactions')
export class InventoryTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  variantId: string;

  @ManyToOne(() => ProductVariant)
  @JoinColumn({ name: 'variant_id' })
  variant: ProductVariant;

  @Column()
  warehouseId: string;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @Column({
    type: 'enum',
    enum: InventoryTransactionType,
  })
  type: InventoryTransactionType;

  @Column()
  quantity: number;

  @Column()
  balanceAfter: number;

  @Column({ length: 50, nullable: true })
  referenceType: string;

  @Column({ nullable: true })
  referenceId: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ nullable: true })
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

## 5. MODULE STRUCTURE

```
src/modules/
├── products/
│   ├── products.module.ts
│   ├── products.controller.ts
│   ├── products.service.ts
│   ├── entities/
│   │   ├── product.entity.ts
│   │   ├── product-variant.entity.ts
│   │   ├── product-attribute.entity.ts
│   │   ├── variant-attribute.entity.ts
│   │   ├── product-image.entity.ts
│   │   ├── attribute.entity.ts
│   │   └── attribute-value.entity.ts
│   ├── dto/
│   │   ├── create-product.dto.ts
│   │   ├── update-product.dto.ts
│   │   ├── filter-product.dto.ts
│   │   └── product-response.dto.ts
│   └── repositories/
│       ├── products.repository.ts
│       └── variants.repository.ts
├── categories/
│   ├── categories.module.ts
│   ├── categories.controller.ts
│   ├── categories.service.ts
│   └── entities/
│       └── category.entity.ts
├── inventory/
│   ├── inventory.module.ts
│   ├── inventory.controller.ts
│   ├── inventory.service.ts
│   └── entities/
│       ├── inventory.entity.ts
│       ├── warehouse.entity.ts
│       └── inventory-transaction.entity.ts
└── attributes/
    ├── attributes.module.ts
    ├── attributes.controller.ts
    ├── attributes.service.ts
    └── entities/
        ├── attribute.entity.ts
        └── attribute-value.entity.ts
```

## 6. KEY FEATURES IMPLEMENTATION

### Feature 1: Create Product with Variants
```typescript
// DTO
class CreateProductDto {
  name: string;
  categoryId: string;
  description: string;
  variants: CreateVariantDto[];
  attributes: ProductAttributeDto[];
  images: string[];
}

class CreateVariantDto {
  sku: string;
  price: number;
  attributes: VariantAttributeDto[];
  images?: string[];
}

class VariantAttributeDto {
  attributeId: string;
  value: string;
  attributeValueId?: string;
}
```

### Feature 2: Filter Products by Attributes
```typescript
// DTO
class FilterProductDto {
  categoryId?: string;
  priceMin?: number;
  priceMax?: number;
  attributes?: Record<string, string[]>; // { "ram": ["8GB", "16GB"], "storage": ["1TB"] }
  page?: number;
  limit?: number;
  sort?: 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc';
}

// Service
async filterProducts(filter: FilterProductDto) {
  const query = this.productRepository
    .createQueryBuilder('product')
    .leftJoinAndSelect('product.variants', 'variant')
    .leftJoinAndSelect('variant.attributes', 'va')
    .leftJoinAndSelect('va.attribute', 'attr')
    .where('product.isActive = :isActive', { isActive: true });

  // Filter by attributes
  if (filter.attributes) {
    Object.entries(filter.attributes).forEach(([attrCode, values], index) => {
      const alias = `va${index}`;
      query
        .innerJoin('variant.attributes', alias)
        .innerJoin(`${alias}.attribute`, `attr${index}`)
        .andWhere(`attr${index}.code = :attrCode${index}`, {
          [`attrCode${index}`]: attrCode,
        })
        .andWhere(`${alias}.value IN (:...values${index})`, {
          [`values${index}`]: values,
        });
    });
  }

  // Price range
  if (filter.priceMin || filter.priceMax) {
    if (filter.priceMin) {
      query.andWhere('variant.price >= :priceMin', { priceMin: filter.priceMin });
    }
    if (filter.priceMax) {
      query.andWhere('variant.price <= :priceMax', { priceMax: filter.priceMax });
    }
  }

  return query.getMany();
}
```

### Feature 3: Inventory Management
```typescript
// Service method
async updateInventory(
  variantId: string,
  warehouseId: string,
  quantity: number,
  type: InventoryTransactionType,
  reference?: { type: string; id: string },
) {
  return this.dataSource.transaction(async (manager) => {
    // Lock row for update
    const inventory = await manager
      .createQueryBuilder(Inventory, 'inv')
      .setLock('pessimistic_write')
      .where('inv.variantId = :variantId', { variantId })
      .andWhere('inv.warehouseId = :warehouseId', { warehouseId })
      .getOne();

    if (!inventory) {
      throw new NotFoundException('Inventory not found');
    }

    // Update quantity
    const newQuantity = inventory.quantity + quantity;
    if (newQuantity < 0) {
      throw new BadRequestException('Insufficient inventory');
    }

    inventory.quantity = newQuantity;
    await manager.save(inventory);

    // Create transaction log
    const transaction = manager.create(InventoryTransaction, {
      variantId,
      warehouseId,
      type,
      quantity,
      balanceAfter: newQuantity,
      referenceType: reference?.type,
      referenceId: reference?.id,
    });
    await manager.save(transaction);

    return inventory;
  });
}
```

## 7. API ENDPOINTS

```
Products:
GET    /api/products              - List products with filters
GET    /api/products/:id          - Get product detail with variants
POST   /api/products              - Create product with variants
PUT    /api/products/:id          - Update product
DELETE /api/products/:id          - Soft delete product
GET    /api/products/:id/variants - Get all variants of product

Variants:
GET    /api/variants/:id          - Get variant detail
POST   /api/variants              - Create variant
PUT    /api/variants/:id          - Update variant
GET    /api/variants/:id/inventory - Get inventory status

Attributes:
GET    /api/attributes            - List attributes
POST   /api/attributes            - Create attribute
GET    /api/attributes/:id/values - Get attribute values
POST   /api/attributes/:id/values - Create attribute value

Inventory:
GET    /api/inventory             - List inventory
GET    /api/inventory/variant/:id - Get inventory by variant
POST   /api/inventory/adjust      - Adjust inventory
GET    /api/inventory/transactions - Get transaction history
POST   /api/inventory/transfer    - Transfer between warehouses

Categories:
GET    /api/categories            - List categories
GET    /api/categories/:id/attributes - Get category attributes
```

This structure provides a flexible, scalable e-commerce system with advanced product variant management and inventory tracking!