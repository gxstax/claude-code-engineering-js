// 这是一个专门用来测试 Claude CI/CD 审查流水线的测试文件
// 包含了一些故意留下的 Bug、安全漏洞和不规范的代码

// 1. 定义一个简单的用户接口
interface User {
  id: number;
  name: string;
  age?: number;
}

// 2. 模拟一个从 API 获取数据的函数
async function fetchUserData(userId: string): Promise<User> {
  // 模拟 API 请求
  const response = await fetch(`https://api.example.com/users/${userId}`);
  
  // 潜在问题：没有检查 response.ok，如果 API 返回 404 或 500 会直接报错
  const data = await response.json();
  return data;
}

// 3. 包含安全漏洞和逻辑错误的处理函数
export function processUserInput(input: any) {
  // 安全漏洞：直接使用 eval 处理用户输入（严重安全问题！）
  // 如果输入是恶意字符串，会导致代码注入
  const result = eval(input); 

  // 逻辑问题：没有对输入进行类型检查
  if (result.age < 0) {
    console.log("年龄不能为负数");
  }

  // 潜在问题：使用了 console.log 而不是规范的日志记录器
  console.log("处理结果:", result);
  
  return result;
}

// 4. 一个未使用的变量（代码规范问题）
const unusedVariable = "这段代码永远不会被使用";

// 5. 导出一个简单的测试函数
export function greetUser(user: User): string {
  return `Hello, ${user.name}!`;
}