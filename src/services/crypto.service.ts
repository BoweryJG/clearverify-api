import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export class CryptoService {
  private algorithm = 'aes-256-gcm';
  private secretKey: Buffer;
  private jwtSecret: string;

  constructor() {
    this.secretKey = Buffer.from(
      process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'),
      'hex'
    );
    this.jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
  }

  encrypt(text: string): { encrypted: string; iv: string; authTag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = (cipher as any).getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  decrypt(encrypted: string, iv: string, authTag: string): string {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.secretKey,
      Buffer.from(iv, 'hex')
    );
    
    (decipher as any).setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  async hashPassword(password: string): Promise<string> {
    const bcrypt = await import('bcrypt');
    return bcrypt.hash(password, 12);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = await import('bcrypt');
    return bcrypt.compare(password, hash);
  }

  generateToken(payload: any, expiresIn: string = '1h'): string {
    return jwt.sign(payload, this.jwtSecret, { expiresIn } as jwt.SignOptions);
  }

  verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  async signData(data: any): Promise<string> {
    // Create a signature for data integrity
    const timestamp = new Date().toISOString();
    const payload = {
      data,
      timestamp,
      nonce: crypto.randomBytes(16).toString('hex'),
    };
    
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return `${Buffer.from(JSON.stringify(payload)).toString('base64')}.${signature}`;
  }

  verifySignature(signedData: string): { valid: boolean; data?: any } {
    try {
      const [payloadBase64, signature] = signedData.split('.');
      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
      
      const expectedSignature = crypto
        .createHmac('sha256', this.secretKey)
        .update(JSON.stringify(payload))
        .digest('hex');
      
      if (signature === expectedSignature) {
        return { valid: true, data: payload.data };
      }
      
      return { valid: false };
    } catch (error) {
      return { valid: false };
    }
  }

  generateSecureRandom(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
}