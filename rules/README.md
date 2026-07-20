# 第 20 讲：有章可循 · Rules 规则系统深度剖析

> 指令规则告诉 Claude 该怎么做，权限规则告诉 Claude 能做什么——两套规则协同运作，构成整个系统的行为约束体系。

---

## 你将学到

- 指令规则：`.claude/rules/*.md` 的 paths 条件匹配与加载机制
- 权限规则：`deny → ask → allow` 三层评估顺序
- Rules 与 CLAUDE.md 的分工：全局 vs 领域，常驻 vs 按需
- 企业级管理：托管设置与纵深防御


## 什么时候可以从CLAUDE.md拆分

CLAUDE.md 的总长度如何？
│
├── < 200 行 → 不用拆，CLAUDE.md 一把梭
│               简单就是好，不要为了组织而组织
│
├── 200-500 行 → 考虑拆
│   │
│   └── 有没有"只和特定文件类型相关"的内容？
│       ├── 有 → 拆出来，加 paths
│       │       （如测试规范、前端规范、API 规范）
│       └── 没有 → 拆出来，不加 paths
│                 （纯粹为了文件组织清晰）
│
└── > 500 行 → 必须拆
                CLAUDE.md 太长会稀释重要信息的权重
                把领域规范拆到 rules，CLAUDE.md 只留核心约定

## 权限规则设计

.claude/
├── settings.json          ← 权限规则（团队共享）
├── settings.local.json    ← 个人权限覆盖（.gitignore）
└── rules/
    ├── coding.md          ← 全局编码规范（无 paths）
    ├── frontend.md        ← 前端规范（paths: src/components/**)
    ├── backend.md         ← 后端规范（paths: server/**)
    ├── testing.md         ← 测试规范（paths: **/*.test.*)
    └── security.md        ← 安全规范（无 paths，全局生效）

## 权限规则的安全基线（适用于大多数团队）

{
  "permissions": {
    "allow": [
      "Read",
      "Glob",
      "Grep",
      "Bash(npm run *)",
      "Bash(pnpm *)",
      "Bash(git status)",
      "Bash(git diff *)",
      "Bash(git log *)",
      "Bash(node *)",
      "Bash(npx *)"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(* --force)",
      "Bash(curl *)",
      "Bash(wget *)",
      "Read(./.env)",
      "Read(./.env.*)",
      "Edit(./.env)",
      "Edit(./.env.*)",
      "Read(~/.ssh/*)",
      "Read(~/.aws/*)"
    ]
  }
}

## 代码与文件参考

本讲内容与 Memory 模块紧密关联，配置示例参考：

- Rules 配置示例 → [02-Memory/projects/](../02-Memory/projects/)
- 权限与安全实践 → [06-Hooks/projects/01-safety-hooks/](../06-Hooks/projects/01-safety-hooks/)


## 思考题

1. 你的项目目前有  .claude/rules/  目录吗？如果没有，试着评估一下你的 CLAUDE.md 长度——是否已经到了需要拆分的程度？如果要拆，你会拆出哪几个 rule 文件？
   拆分为：代码风格、API设计规范、数据库规范、安全规范

2. 假设你的团队中有实习生使用 Claude Code，你会在  settings.json  的 deny 列表中增加哪些规则？与正式员工的配置有什么不同？
   一、 实习生 settings.json 的 deny 列表建议
    针对实习生，deny（直接拦截）规则需要设置得更严格，以筑牢安全底线，防止误操作导致生产事故或敏感信息泄露：
    高危系统命令与提权操作
    Bash(rm -rf *)：绝对禁止递归强制删除，防止误删核心代码或依赖。
    Bash(sudo *)：禁止任何系统提权操作。
    Bash(chmod 777 *)：禁止粗暴地赋予文件最高权限，避免安全漏洞。
    危险的网络请求与脚本执行
    Bash(curl * | bash) 与 Bash(wget * | sh)：严禁直接下载并执行网络脚本，这是极大的安全隐患。
    WebFetch：直接禁止 AI 抓取外部网络内容，防止提示注入或数据外泄。
    敏感文件与机密信息的读取/编辑
    Read(./.env*) 与 Edit(./.env*)：禁止读取和修改环境变量文件。
    Read(./secrets/**)：禁止访问任何存放密钥的目录。
    破坏性的 Git 操作
    Bash(git push --force *)：禁止强制推送，防止覆盖远程分支的历史记录。
    Bash(git reset --hard *)：禁止硬重置，防止本地未提交的代码永久丢失。
    Bash(git clean -f *)：禁止强制清理未跟踪的文件。
    数据库与生产环境高危操作
    Bash(npx prisma migrate *) 或类似的数据库迁移命令：防止实习生在未经过 Code Review 的情况下直接变更数据库结构。
    二、 与正式员工配置的核心差异
    正式员工的配置通常基于“信任与效率”，而实习生的配置则基于“约束与引导”。具体差异体现在以下三个维度：
    权限模式的默认基调（defaultMode）
    正式员工：通常将 defaultMode 设为 acceptEdits（自动接受编辑）。因为正式员工熟悉代码库，高频的代码读写、构建和测试命令可以直接自动放行，最大化研发效率。
    实习生：建议保持默认的 normal-mode 或设为更严格的模式。在执行任何可能改变项目状态的操作时，都需要实习生手动确认，或者强制要求他们使用 Plan Mode（规划模式），先让 AI 展示计划，确认无误后再执行。
    ask（手动确认）列表的覆盖范围
    正式员工：ask 列表相对精简，仅针对 git push 或 npm install 等少数涉及环境变更的操作进行确认。
    实习生：需要大幅扩充 ask 列表。例如，将 Bash(mv *)（移动文件）、Bash(npm run build)（构建）甚至某些核心目录的 Edit 操作都放入 ask 中。这不仅能降低非预期修改的风险，还能让导师通过确认过程了解实习生的操作意图，起到实时指导的作用。
    团队协作与审查流程的约束
    正式员工：拥有较高的自主权，可以直接执行常规的 Git 提交和分支管理命令。
    实习生：在 settings.json 或 CLAUDE.md 中应明确约定，涉及 3 个以上文件的修改，或涉及业务逻辑的变更，必须经过人工审查。可以通过配置限制其直接执行 git push，引导他们将变更限制在本地，通过 Pull Request (PR) 流程，由正式员工审查批准后再合并。
    总结来说，正式员工的配置是为了“减少确认打断，让 AI 在安全边界内自主工作”；而对实习生的配置则是为了“限制变更的爆炸半径”，通过精细化的 deny 和 ask 规则，将他们的操作严格约束在可控范围内，确保项目安全的同时帮助他们养成良好的工程习惯。
   
3. 指令规则是“软约束”——Claude 可能不遵守。如果你有一条绝对不能违反的规则（比如“永远不要删除生产数据库的表”），你会只写在  .claude/rules/  中吗？还是会在权限规则和 Hooks 中也加上对应的硬约束？请设计一个完整的防护方案。
   1. .claude/rules/security.md 明确说明（不一定成功，只能作为认知约束）
   2. .claude/settings.json 的 deny规则，客户端工具执行前直接拦截
      {
        "permissions": {
            "deny": [
            "Bash(*drop table*)",
            "Bash(*truncate table*)",
            "Bash(*rm -rf *database*)",
            "Read(./config/production.env)" 
            ]
        }
        }
    3. 
   
4. 这节课我们强调“rules 不是独立组件，是横切关注点”。在传统软件工程中，也有一个著名的横切关注点——日志（Logging）。它和 Rules 有什么相似之处？这种相似性能给你什么设计启发？
   
   我们实际上也可以把Claude Code 当作一个工程框架，或者在编程领域，把它当作一个编程框架，只要涉及到工程化的问题，都会有切面问题，我认为在系统思想上这个是相通的。
   
> 祝大家学习顺利