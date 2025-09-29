import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OmitPassword, UsersService } from '@/users/users.service';
import type { User } from '@/users/users.service';

@Injectable()
export class AuthService {
    // Simple in-memory revoked token store: token -> expiryTimestamp(ms)
    private revokedTokens = new Map<string, number>();

    constructor(private usersService: UsersService, private readonly jwtService: JwtService) { }

    @OmitPassword()
    async validateUser(username: string, password: string): Promise<User | undefined> {
        const user = await this.usersService.findUser(username);
        if (user && user.password === password) {
            return user;
        }
        return undefined;
    }

    async createAccessToken(payload: Record<string, any>, expiresIn?: string) {
        try {
            const options = expiresIn ? { expiresIn } : undefined;
            return this.jwtService.signAsync(payload, options);
        } catch {
            return undefined;
        }
    }

    async getTokenPayload(token: string) {
        try {
            return await this.jwtService.verifyAsync<Record<string, any>>(token);
        } catch {
            return undefined;
        }
    }

    async refreshToken(token: string, expiresIn?: string) {
        try {
            const payload = await this.getTokenPayload(token);
            if (!payload) return undefined;
            const { iat, exp, ...rest } = payload as any;
            return this.createAccessToken(rest, expiresIn);
        } catch {
            return undefined;
        }
    }

    /**
     * Revoke a token until its expiry (or for 1 hour if exp missing).
     */
    async revokeToken(token?: string | null): Promise<void> {
        if (!token) return;
        try {
            const payload = await this.getTokenPayload(token);
            const exp = typeof payload?.exp === 'number' ? payload.exp * 1000 : undefined;
            const until = exp ?? (Date.now() + 60 * 60 * 1000);
            this.revokedTokens.set(token, until);
            setTimeout(() => this.revokedTokens.delete(token), Math.max(0, until - Date.now()));
        } catch { /* ignore */ }
    }

    /**
     * Check whether a token was revoked. Also auto-cleans expired entries.
     */
    async isRevoked(token: string | null | undefined): Promise<boolean> {
        if (!token) return false;
        const until = this.revokedTokens.get(token);
        if (!until) return false;
        if (Date.now() > until) {
            this.revokedTokens.delete(token);
            return false;
        }
        return true;
    }
}