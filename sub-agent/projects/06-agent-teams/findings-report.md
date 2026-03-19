# 调查报告

## 调查摘要

**调查日期**：2026-03-18
**调查团队**：Session侦探、数据库侦探、缓存侦探、架构侦探
**调查对象**：ShopStream 电商平台 — 会话丢失/性能退化/数据泄漏

---

## 发现的 Bug 列表

### Bug #1: 缓存键设计缺陷导致数据泄漏
- **文件**：`buggy-app/middleware/cache.js:22`
- **严重性**：P0
- **类型**：安全
- **描述**：缓存键只包含URL路径（`${prefix}:${req.originalUrl}`），不包含用户标识（如user_id或session_id）。导致所有用户的相同API路径共享同一缓存，用户A的订单数据可能被用户B看到。
- **代码片段**：
```javascript
const key = `${CACHE_PREFIX}:${req.originalUrl}`;
```
- **建议修复**：
```javascript
const userId = req.user?.id || req.session?.userId || 'anonymous';
const key = `${CACHE_PREFIX}:${userId}:${req.originalUrl}`;
```

### Bug #2: 缓存竞态条件导致数据不一致
- **文件**：`buggy-app/middleware/cache.js:31-40`
- **严重性**：P1
- **类型**：可靠性
- **描述**：缓存过期处理存在竞态条件。当缓存过期时，多个并发请求可能同时发现缓存过期，都执行数据库查询并尝试写入缓存，导致数据不一致和潜在的数据泄漏。
- **代码片段**：
```javascript
if (cached && Date.now() < cached.expires) {
  return res.json(cached.data);
}
cache.delete(key); // 删除过期缓存
// 多个请求可能同时到达这里
```
- **建议修复**：
```javascript
// 使用锁机制或单例模式确保只有一个请求刷新缓存
```

### Bug #3: Redis连接缺乏重连机制
- **文件**：`buggy-app/middleware/session.js:14-17`
- **严重性**：P1
- **类型**：可靠性
- **描述**：Redis客户端错误处理只有日志记录，没有重连逻辑。当Redis连接断开时（尤其在高峰期），会话写入会静默失败，导致用户会话丢失。
- **代码片段**：
```javascript
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redisClient.on('error', (err) => console.error('Redis error:', err));
```
- **建议修复**：
```javascript
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  retry_strategy: function(options) {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      return new Error('The server refused the connection');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      return new Error('Retry time exhausted');
    }
    return Math.min(options.attempt * 100, 3000);
  }
});
```

### Bug #4: Session保存未等待异步完成
- **文件**：`buggy-app/routes/auth.js:52`
- **严重性**：P1
- **类型**：可靠性
- **描述**：`req.session.save()`调用后没有等待回调或使用await。如果Redis写入慢或失败，用户可能拿到JWT但会话未持久化，导致后续请求无法验证会话。
- **代码片段**：
```javascript
req.session.userId = user.id;
req.session.save(); // 没有回调或await
res.json({ token, user: { id: user.id, email: user.email } });
```
- **建议修复**：
```javascript
req.session.userId = user.id;
req.session.save((err) => {
  if (err) {
    console.error('Session save error:', err);
    return res.status(500).json({ error: 'Failed to save session' });
  }
  res.json({ token, user: { id: user.id, email: user.email } });
});
```

### Bug #5: 数据库连接池配置严重不足
- **文件**：`buggy-app/db.js:12-16`
- **严重性**：P1
- **类型**：性能
- **描述**：连接池最大连接数仅为5，空闲超时5秒（太短），连接超时3秒（高峰期易超时）。在50+并发用户的高峰期，连接池迅速耗尽，导致请求排队和超时。
- **代码片段**：
```javascript
const pool = new Pool({
  max: 5,           // 严重不足
  idleTimeoutMillis: 5000,  // 太短，连接频繁回收
  connectionTimeoutMillis: 3000  // 高峰期易超时
});
```
- **建议修复**：
```javascript
const pool = new Pool({
  max: 50,           // 根据实际负载调整
  idleTimeoutMillis: 30000,  // 30秒
  connectionTimeoutMillis: 10000  // 10秒
});
```

### Bug #6: N+1查询导致性能瓶颈
- **文件**：`buggy-app/routes/orders.js:30-39`
- **严重性**：P1
- **类型**：性能
- **描述**：获取订单列表时对每个订单单独查询订单项。用户有50个订单时产生51次数据库查询（1次主查询 + 50次子查询），严重消耗连接池资源。
- **代码片段**：
```javascript
const orders = await pool.query('SELECT * FROM orders WHERE user_id = $1', [userId]);
for (const order of orders.rows) {
  const items = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
  order.items = items.rows;
}
```
- **建议修复**：
```javascript
const orders = await pool.query(`
  SELECT o.*,
         json_agg(oi.*) as items
  FROM orders o
  LEFT JOIN order_items oi ON o.id = oi.order_id
  WHERE o.user_id = $1
  GROUP BY o.id
`, [userId]);
```

### Bug #7: 内存缓存与多进程部署不兼容
- **文件**：`buggy-app/middleware/cache.js:1-10`
- **严重性**：P2
- **类型**：可靠性
- **描述**：使用内存Map作为缓存，在多进程/多服务器部署中无法共享缓存数据，导致缓存不一致和性能下降。
- **代码片段**：
```javascript
const cache = new Map();
```
- **建议修复**：
```javascript
// 使用Redis或其他分布式缓存替代内存Map
```

---

## 级联关系分析

```
Bug #5 (连接池不足) + Bug #6 (N+1查询) → 数据库压力剧增 → Redis连接不稳定 → Bug #3 (Redis无重连) → 会话保存失败 → Bug #4 (Session保存未等待) → 会话丢失

Bug #1 (缓存键缺陷) + Bug #2 (缓存竞态) + 高峰期并发 → 缓存数据混乱 → 用户看到他人数据 → 数据泄漏

Bug #5 + Bug #6 + Bug #7 → 系统整体性能下降 → API响应变慢
```

**关键洞察**：单独修复某个bug不够，因为问题相互关联形成恶性循环。例如，修复连接池配置可以减少数据库压力，从而稳定Redis连接，减少会话丢失。修复缓存键设计可以直接防止数据泄漏，但还需要修复竞态条件以确保可靠性。

---

## 与用户报告的症状对应

| 用户症状 | 直接原因 | 根本原因 | 涉及的 Bug |
|---------|---------|---------|-----------|
| 会话丢失 | Redis连接断开，会话保存失败 | 1. Redis无重连机制<br>2. Session保存未等待<br>3. 数据库压力导致Redis不稳定 | Bug #3, Bug #4, Bug #5, Bug #6 |
| API 变慢 | 数据库查询慢，连接池耗尽 | 1. N+1查询<br>2. 连接池配置不足<br>3. 缓存无效 | Bug #5, Bug #6, Bug #1 |
| 数据泄漏 | 用户看到其他用户的订单数据 | 1. 缓存键无用户标识<br>2. 缓存竞态条件 | Bug #1, Bug #2 |

---

## 修复优先级建议

1. **立即修复**：Bug #1 (缓存键设计缺陷) 和 Bug #2 (缓存竞态条件)。这是P0安全漏洞，直接导致数据泄漏，必须立即修复。

2. **其次修复**：Bug #5 (数据库连接池配置) 和 Bug #6 (N+1查询)。这些是性能瓶颈，修复后可以显著减少数据库压力，间接改善Redis稳定性和会话丢失问题。

3. **随后修复**：Bug #3 (Redis重连机制)、Bug #4 (Session保存异步问题) 和 Bug #7 (内存缓存问题)。这些是可靠性问题，修复后提高系统整体稳定性。

---

## 调查过程记录

### Teammate 发现
- Session 侦探：
  - Redis连接缺乏重连机制
  - Session保存未等待异步完成
  - Redis错误处理不完善
  - 高峰期Redis压力增加

- 数据库侦探：
  - 数据库连接池配置严重不足（最大5连接）
  - N+1查询问题
  - 连接泄露风险
  - 慢查询日志记录

- 缓存侦探：
  - 缓存键设计缺陷（缺少用户标识）
  - 缓存竞态条件
  - 内存缓存与多进程不兼容
  - 缓存击穿风险

- 架构侦探：
  - 系统级监控缺失
  - 错误处理不完整
  - 资源管理问题
  - 组件间错误传播

### 关键交叉发现
1. **Session侦探与数据库侦探的关联**：数据库侦探发现的连接池压力问题（Bug #5）会导致系统整体变慢，间接影响Redis连接稳定性，加剧Session侦探发现的会话丢失问题。

2. **缓存侦探与数据库侦探的关联**：缓存侦探发现的缓存键设计缺陷（Bug #1）导致缓存无效，所有请求都打到数据库，放大了数据库侦探发现的N+1查询问题（Bug #6）。

3. **所有侦探与架构侦探的关联**：架构侦探发现的系统级问题（缺乏监控、错误处理不完整）使得其他侦探发现的各个层的问题更难被及时发现和诊断。

4. **三个症状的关联性**：数据泄漏（Bug #1+Bug #2）和API变慢（Bug #5+Bug #6）在高峰期同时发生，系统压力增加导致Redis不稳定，进而引发会话丢失（Bug #3+Bug #4），形成完整的故障链。