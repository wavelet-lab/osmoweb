import type { Request } from 'express';

export interface AuthUser {
    sub?: string;
    [key: string]: any;
}

export interface AuthRequest extends Request {
    user?: AuthUser;
    cookies: { [key: string]: any };
}