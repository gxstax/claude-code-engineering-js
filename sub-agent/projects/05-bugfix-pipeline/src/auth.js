/**
 * 认证服务
 * 包含 token 验证 bug 供练习
 */

const { toNumber } = require('./utils');

class AuthService {
  constructor(db, jwtSecret) {
    this.db = db;
    this.jwtSecret = jwtSecret;
    this.tokenCache = new Map(); // 简单的 token 缓存
  }

  /**
   * 生成 JWT token
   * @param {object} user
   * @returns {string}
   */
  generateToken(user) {
    // 模拟 JWT 生成
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
      userId: user.id,
      email: user.email,
      exp: Date.now() + 24 * 60 * 60 * 1000, // 24小时过期
      iat: Date.now()
    };

    // 简化的 JWT 生成（实际应该使用 crypto）
    const headerBase64 = Buffer.from(JSON.stringify(header)).toString('base64');
    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = 'mock_signature'; // 简化

    return `${headerBase64}.${payloadBase64}.${signature}`;
  }

  /**
   * 验证 token
   * BUG: 偶尔会失败 - 当用户不存在时访问 user.isActive 属性
   *
   * @param {string} token
   * @returns {Promise<object>}
   */
  async verifyToken(token) {
    if (!token) {
      throw new Error('Token is required');
    }

    // 检查缓存
    if (this.tokenCache.has(token)) {
      const cached = this.tokenCache.get(token);
      if (cached.exp > Date.now()) {
        return cached;
      }
      this.tokenCache.delete(token);
    }

    try {
      // 解析 token
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }

      const payloadBase64 = parts[1];
      const payloadStr = Buffer.from(payloadBase64, 'base64').toString('utf8');
      const payload = JSON.parse(payloadStr);

      // 检查过期时间
      if (payload.exp < Date.now()) {
        throw new Error('Token expired');
      }

      // 验证签名（简化）
      if (parts[2] !== 'mock_signature') {
        throw new Error('Invalid token signature');
      }

      // 获取用户信息
      const user = await this.db.query(
        'SELECT * FROM users WHERE id = $1',
        [payload.userId]
      );

      // BUG: 这里存在 null pointer 错误
      // 当用户不存在时，user 可能是 null 或 undefined
      // 访问 user.isActive 会抛出 TypeError
      if (!user || !user.isActive) {
        throw new Error('User is not active');
      }

      // 检查用户状态
      if (user.status === 'suspended') {
        throw new Error('User account is suspended');
      }

      // 缓存验证结果
      const result = {
        userId: payload.userId,
        email: payload.email,
        exp: payload.exp,
        user: user
      };

      this.tokenCache.set(token, result);
      return result;

    } catch (error) {
      // 记录错误但不暴露细节
      console.error('Token verification failed:', error.message);
      throw new Error('Invalid token');
    }
  }

  /**
   * 刷新 token
   * @param {string} token
   * @returns {Promise<string>}
   */
  async refreshToken(token) {
    const verified = await this.verifyToken(token);

    // 清除旧 token 缓存
    this.tokenCache.delete(token);

    // 生成新 token
    const newToken = this.generateToken(verified.user);
    return newToken;
  }

  /**
   * 验证用户凭据
   * @param {string} email
   * @param {string} password
   * @returns {Promise<object>}
   */
  async authenticate(email, password) {
    const user = await this.db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // 简化密码验证（实际应该使用 bcrypt）
    if (user.password !== password) {
      throw new Error('Invalid credentials');
    }

    if (!user.isActive) {
      throw new Error('User account is not active');
    }

    const token = this.generateToken(user);
    return { user, token };
  }

  /**
   * 登出（使 token 失效）
   * @param {string} token
   */
  logout(token) {
    this.tokenCache.delete(token);
  }

  /**
   * 清除过期缓存
   */
  cleanupCache() {
    const now = Date.now();
    for (const [token, data] of this.tokenCache.entries()) {
      if (data.exp < now) {
        this.tokenCache.delete(token);
      }
    }
  }

  /**
   * 获取用户权限
   * BUG: 没有处理用户不存在的情况
   *
   * @param {string} userId
   * @returns {Promise<string[]>}
   */
  async getUserPermissions(userId) {
    const user = await this.db.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );

    // BUG: 这里也有同样的问题
    // 如果用户不存在，user.roles 会抛出错误
    return user.roles || ['user'];
  }
}

module.exports = { AuthService };