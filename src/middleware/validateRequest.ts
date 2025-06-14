import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

interface ValidationSchema {
  body?: Record<string, any>;
  query?: Record<string, any>;
  params?: Record<string, any>;
}

const validationSchemas: Record<string, ValidationSchema> = {
  verifyInsurance: {
    body: {
      patientInfo: {
        required: true,
        type: 'object',
        properties: {
          firstName: { required: true, type: 'string' },
          lastName: { required: true, type: 'string' },
          dateOfBirth: { required: true, type: 'string', pattern: /^\d{4}-\d{2}-\d{2}$/ },
          memberId: { required: false, type: 'string' },
        },
      },
      insuranceInfo: {
        required: true,
        type: 'object',
        properties: {
          payerId: { required: true, type: 'string' },
          planId: { required: false, type: 'string' },
          groupNumber: { required: false, type: 'string' },
        },
      },
      procedureCode: { required: true, type: 'string' },
      providerId: { required: false, type: 'string' },
    },
  },
  batchVerification: {
    body: {
      verifications: {
        required: true,
        type: 'array',
        minLength: 1,
        maxLength: 100,
      },
    },
  },
  preAuthorization: {
    body: {
      verificationId: { required: true, type: 'string' },
      additionalInfo: { required: false, type: 'object' },
    },
  },
};

export const validateRequest = (schemaName: string) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const schema = validationSchemas[schemaName];
    
    if (!schema) {
      return next(new AppError('Invalid validation schema', 500));
    }
    
    try {
      // Validate body
      if (schema.body) {
        validateObject(req.body, schema.body, 'body');
      }
      
      // Validate query
      if (schema.query) {
        validateObject(req.query, schema.query, 'query');
      }
      
      // Validate params
      if (schema.params) {
        validateObject(req.params, schema.params, 'params');
      }
      
      next();
    } catch (error: any) {
      next(new AppError(error.message, 400));
    }
  };
};

function validateObject(data: any, schema: any, location: string): void {
  Object.keys(schema).forEach(key => {
    const rule = schema[key];
    const value = data[key];
    
    // Check required fields
    if (rule.required && (value === undefined || value === null)) {
      throw new Error(`${location}.${key} is required`);
    }
    
    // Skip validation if field is optional and not provided
    if (!rule.required && value === undefined) {
      return;
    }
    
    // Type validation
    if (rule.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== rule.type) {
        throw new Error(`${location}.${key} must be of type ${rule.type}`);
      }
    }
    
    // Pattern validation
    if (rule.pattern && !rule.pattern.test(value)) {
      throw new Error(`${location}.${key} has invalid format`);
    }
    
    // Array validation
    if (rule.type === 'array') {
      if (rule.minLength && value.length < rule.minLength) {
        throw new Error(`${location}.${key} must have at least ${rule.minLength} items`);
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        throw new Error(`${location}.${key} must have at most ${rule.maxLength} items`);
      }
    }
    
    // Nested object validation
    if (rule.properties && rule.type === 'object') {
      validateObject(value, rule.properties, `${location}.${key}`);
    }
  });
}