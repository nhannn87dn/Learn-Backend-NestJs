
# 8. SQL Stored Procedures

## 8.1. Khi nào dùng Stored Procedures

**Nên dùng khi:**
- Complex business logic trong database
- Batch operations với performance cao
- Reuse logic across applications
- Security (giới hạn direct table access)

**Không nên dùng khi:**
- Logic đơn giản
- Cần deploy thường xuyên (SPs khó version control)
- Team không familiar với SQL

---

## 8.2. Cách gọi từ TypeORM

**Tạo stored procedure (Postgres):**

```sql
CREATE OR REPLACE FUNCTION get_user_stats(user_id INT)
RETURNS TABLE(
  total_posts INT,
  total_comments INT,
  total_likes INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT p.id)::INT as total_posts,
    COUNT(DISTINCT c.id)::INT as total_comments,
    COUNT(DISTINCT l.id)::INT as total_likes
  FROM users u
  LEFT JOIN posts p ON p.author_id = u.id
  LEFT JOIN comments c ON c.user_id = u.id
  LEFT JOIN likes l ON l.user_id = u.id
  WHERE u.id = user_id;
END;
$$ LANGUAGE plpgsql;
```

**Gọi từ TypeORM:**

```typescript
async getUserStats(userId: number) {
  const result = await this.dataSource.query(
    'SELECT * FROM get_user_stats($1)',
    [userId]
  );

  return result[0];
}
```

**Stored procedure với multiple results:**

```sql
CREATE OR REPLACE FUNCTION process_order(order_id INT)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  new_balance DECIMAL
) AS $$
DECLARE
  order_amount DECIMAL;
  user_id INT;
  current_balance DECIMAL;
BEGIN
  -- Get order info
  SELECT o.amount, o.user_id INTO order_amount, user_id
  FROM orders o WHERE o.id = order_id;

  -- Get user balance
  SELECT balance INTO current_balance FROM users WHERE id = user_id;

  -- Check balance
  IF current_balance < order_amount THEN
    RETURN QUERY SELECT FALSE, 'Insufficient balance'::TEXT, current_balance;
    RETURN;
  END IF;

  -- Process order
  UPDATE users SET balance = balance - order_amount WHERE id = user_id;
  UPDATE orders SET status = 'completed' WHERE id = order_id;

  -- Return success
  RETURN QUERY SELECT TRUE, 'Order processed'::TEXT, (current_balance - order_amount);
END;
$$ LANGUAGE plpgsql;
```

```typescript
async processOrder(orderId: number) {
  const result = await this.dataSource.query(
    'SELECT * FROM process_order($1)',
    [orderId]
  );

  const { success, message, new_balance } = result[0];

  if (!success) {
    throw new BadRequestException(message);
  }

  return { message, newBalance: new_balance };
}
```
