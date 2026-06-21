# API 文档 - Parallel Explore

## 目录结构

```
src/
├── api/            # HTTP 服务器和请求处理
│   ├── index.js    # ApiServer 核心
│   ├── middleware.js # 中间件集合
│   └── routes.js   # 路由定义
├── auth/           # 认证与授权
│   ├── index.js    # AuthService
│   ├── jwt.js      # JWT 工具
│   └── session.js  # 会话管理
└── database/       # 数据库
    ├── index.js    # Database / Transaction
    ├── migrations.js # 数据库迁移
    └── models.js   # 数据模型
```

---

## API 模块 (`api/`)

### `ApiServer` — HTTP 服务器核心

| 方法 | 签名 | 说明 |
|------|------|------|
| `constructor` | `(config?: {port?, host?})` | 创建服务实例，默认 port=3000, host=0.0.0.0 |
| `use` | `(fn: MiddlewareFn)` | 注册中间件 |
| `route` | `(method: string, path: string, handler: HandlerFn)` | 注册路由，path 支持 `:param` 参数 |
| `start` | `async ()` | 注册默认中间件和路由，启动服务 |
| `stop` | `async ()` | 停止服务 |
| `handleRequest` | `async (req: object) => {status, body}` | 模拟请求处理，依次执行中间件 → 路由匹配 → handler |
| `matchPath` | `(pattern: string, path: string) => boolean` | 路径匹配（支持 `:param` 通配） |
| `extractParams` | `(pattern: string, path: string) => object` | 从路径提取参数 |

### 中间件 (`middleware.js`)

| 函数 | 签名 | 说明 |
|------|------|------|
| `requestLogger` | `async (req, res, next)` | 记录请求耗时日志 |
| `errorHandler` | `async (req, res, next)` | 全局错误捕获，返回 `{error, code}` |
| `cors` | `async (req, res, next)` | CORS 头设置，OPTIONS 返回 204 |
| `authenticate` | `(authService) => async (req, res, next)` | Bearer Token 认证，解码后注入 `req.user` |
| `authorize` | `(permission, authService) => async (req, res, next)` | 权限校验 |
| `bodyParser` | `async (req, res, next)` | JSON 请求体解析 |
| `rateLimit` | `(options?: {maxRequests?, windowMs?}) => async (req, res, next)` | 内存速率限制（默认 100 req/60s） |

### 路由 (`routes.js`)

所有路由通过 `register(app)` 注册：

#### 系统
| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/health` | 健康检查 → `{status, timestamp}` |

#### 认证
| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/auth/login` | 登录 → `{token, user}` |
| `POST` | `/api/auth/logout` | 登出 → `{success}` |
| `POST` | `/api/auth/refresh` | 刷新 token → `{token}` |

#### 用户
| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/users/:id` | 获取用户 |
| `PUT` | `/api/users/:id` | 更新用户 |
| `DELETE` | `/api/users/:id` | 删除用户 |

#### 产品
| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/products` | 产品列表（支持 `?category&limit&offset`） |
| `GET` | `/api/products/:id` | 获取产品详情 |
| `GET` | `/api/products/search` | 搜索产品（`?q`） |

#### 订单
| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/orders` | 订单列表 |
| `GET` | `/api/orders/:id` | 获取订单详情 |
| `POST` | `/api/orders` | 创建订单 → 201 |
| `PUT` | `/api/orders/:id/status` | 更新订单状态 |

---

## 认证模块 (`auth/`)

### `AuthService` — 认证服务

| 方法 | 签名 | 说明 |
|------|------|------|
| `constructor` | `(config?: {jwtSecret?, sessionStore?, tokenExpiry?})` | 默认 `JWT_SECRET` 从环境变量读取 |
| `login` | `async (username, password) => {token, user}` | 登录：校验凭据 → 签发 JWT → 创建会话 |
| `verifyToken` | `async (token) => payload` | 验证 JWT + 检查会话有效性 |
| `logout` | `async (userId, token)` | 登出：使会话失效 |
| `refreshToken` | `async (oldToken) => newToken` | 刷新 token：验证旧 token → 签发新 token → 更新会话 |
| `hasPermission` | `(user, permission) => boolean` | 权限检查（admin/editor/viewer 三级） |

### JWT 工具 (`jwt.js`)

| 函数 | 签名 | 说明 |
|------|------|------|
| `sign` | `(payload, secret, options?) => token` | 签发 JWT（HS256），支持 `expiresIn`（s/m/h/d） |
| `verify` | `(token, secret) => payload` | 验证签名 + 过期时间 |
| `decode` | `(token) => {header, payload}` | 解码 JWT（不验证） |

### 会话管理 (`session.js`)

内存存储，每个用户最多 5 个活跃会话，30 天不活跃自动过期。

| 函数 | 签名 | 说明 |
|------|------|------|
| `create` | `async (userId, token)` | 创建会话 |
| `isValid` | `async (userId, token) => boolean` | 检查会话有效性，更新最后活跃时间 |
| `update` | `async (userId, oldToken, newToken)` | 更新 token |
| `invalidate` | `async (userId, token)` | 使单个会话失效 |
| `invalidateAll` | `async (userId)` | 使用户所有会话失效 |
| `getActiveCount` | `async (userId) => number` | 获取活跃会话数 |
| `cleanup` | `async ()` | 清理 30 天不活跃的会话 |

---

## 数据库模块 (`database/`)

### `Database` — 数据库核心

| 方法 | 签名 | 说明 |
|------|------|------|
| `constructor` | `(config?: {host?, port?, database?, user?, password?, poolSize?})` | 默认从环境变量读取 |
| `connect` | `async ()` | 初始化连接池和模型 |
| `disconnect` | `async ()` | 关闭连接 |
| `query` | `async (sql, params?) => array` | 执行原始查询 |
| `beginTransaction` | `async () => Transaction` | 开启事务 |
| `migrate` | `async (direction?)` | 运行迁移（`up`/`down`） |
| `healthCheck` | `async () => boolean` | 数据库健康检查 |

### `Transaction` — 事务

| 方法 | 签名 | 说明 |
|------|------|------|
| `begin` | `async ()` | 开始事务 |
| `commit` | `async ()` | 提交 |
| `rollback` | `async ()` | 回滚 |
| `query` | `async (sql, params?)` | 在事务内执行查询 |

### `getInstance(config?)` — 单例工厂

### 数据模型 (`models.js`)

通过 `init(db)` 初始化返回四个模型：

#### User (`users` 表)

| 方法 | 说明 |
|------|------|
| `findById(id)` | 按 ID 查询 |
| `findByEmail(email)` | 按邮箱查询 |
| `create(data)` | 创建用户（email, passwordHash, name, role） |
| `update(id, data)` | 更新用户（动态字段） |
| `delete(id)` | 软删除（设置 `deleted_at`） |

#### Product (`products` 表)

| 方法 | 说明 |
|------|------|
| `findById(id)` | 按 ID 查询（排除软删除） |
| `findByCategory(category, options?)` | 按分类查询，支持分页 |
| `search(query, options?)` | 按名称模糊搜索 |
| `updateInventory(id, quantity)` | 调整库存 |

#### Order (`orders` 表)

| 方法 | 说明 |
|------|------|
| `findById(id)` | 按 ID 查询 |
| `findByUser(userId, options?)` | 按用户查询，支持分页 |
| `create(data, items)` | 创建订单（含订单项，事务保护） |
| `updateStatus(id, status)` | 更新订单状态 |

#### OrderItem (`order_items` 表)

| 方法 | 说明 |
|------|------|
| `findByOrder(orderId)` | 按订单查询（JOIN product_name） |

### 迁移 (`migrations.js`)

| 版本 | 名称 | 说明 |
|------|------|------|
| 1 | `create_users_table` | users 表 + email 索引 |
| 2 | `create_products_table` | products 表 + category/name 索引 |
| 3 | `create_orders_table` | orders 表 + user/status 索引 |
| 4 | `create_order_items_table` | order_items 表 + order_id 索引 |

| 函数 | 说明 |
|------|------|
| `up(db)` | 运行所有待执行迁移 |
| `down(db)` | 回滚最后一个迁移 |
| `status(db)` | 查看迁移状态（已执行/待执行） |
