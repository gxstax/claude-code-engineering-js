#
# skills

## description 写作公式
> description = [做什么] + [怎么做] + [什么时候用]

套用公式创作几个示例 Skill:
```yaml
# 代码审查 Skill
description: Review code for quality, security, and best practices. Checks for bugs, performance issues, and style violations. Use when the user asks for code review, wants feedback on their code, mentions reviewing changes, or asks about code quality.
# API 文档 Skill
description: Generate API documentation from code. Extracts endpoints, parameters, and response schemas. Use when the user wants to document APIs, create API reference, generate endpoint documentation, or needs help with OpenAPI/Swagger specs.
# 数据库查询 Skill
description: Query databases and analyze results. Supports SQL generation, query optimization, and result interpretation. Use when the user asks about data, wants to run queries, needs database information, or mentions tables/schemas.
```


## 任务型 skill 设计方法论

### 七步设计清单

> 1. 动作是什么？ → 命名（commit、deplo，y、review）
> 2. 谁能触发？   → disable-model-invocation: true
> 3. 需要什么权限？→ allowed-tools 精确到命令级
> 4. 启动时需要什么上下文？→ !`command` 预注入
> 5. 执行过程需要什么安全网？→ hooks
> 6. 输出量大不大？→ 大则 context: fork
> 7. 用什么模型？ → model（简单 haiku，复杂 sonnet）

### 设计原则

#### 单一职责原则
一个命令做一件事
```bash
✅ /commit, /push, /review
❌ /git-all-in-one
```

#### 清晰命名原则
从命令名就能知道它做什么
```bash
✅ /test:unit, /deploy:staging, /pr-create
❌ /do-stuff, /cmd1, /x
```

#### 有意义的参数提示：让使用者了解如何传参
```bash
✅ argument-hint: [commit message]
✅ argument-hint: [source file] [target directory]
❌ argument-hint: [args]
```

#### 权限最小化原则：严格控制每个任务的权限边界。
```bash
# ✅ 精确授权——只允许 git 的特定子命令
allowed-tools: Bash(git status:*), Bash(git add:*), Bash(git commit:*)

# ❌ 过于宽泛——等于授权所有 shell 命令
allowed-tools: Bash(*)
```

|Skill类型|推荐权限范围|
|:----------|:-------------|
|Git操作|Bash(git status:*),Bash(git addd:*),Bash(git commit:*)|
|代码审查|Read,Grep,Glob（只读，不可修改）|
|部署|Bash(git:*),Bash(npm:*),Bash(ssh:*)（危险，需hooks审计）|
|PR操作|Bash(git:*),Bash(gh:*)|
|测试|Bash(npm test:*),Bash(pytest:*)|
  

## 渐进式披露架构设计

### 契约式引用
> SKILL.md 引用辅助文件时，不要只写一个路径——要写一个契约，让 Claude 知道什么时候该加载、加载后能得到什么：

1. 触发条件：什么情况下应该加载（“当用户问到 X 时”）
2. 文件路径：去哪里找
3. 内容预期：加载后能得到什么（“计算公式和行业基准”）

```
# ❌ 弱引用（Claude 不知道何时该加载）
See `reference/revenue.md` for more details.

# ✅ 契约式引用（Claude 清楚加载条件和预期内容）
## Revenue Analysis
When the user asks about revenue growth, ARPU, or revenue composition:
→ Load `reference/revenue.md` for calculation formulas and industry benchmarks
```