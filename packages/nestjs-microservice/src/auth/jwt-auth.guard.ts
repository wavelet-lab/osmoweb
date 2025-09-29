import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '@/auth/auth.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(private readonly authService: AuthService) {
        super();
    }

    async canActivate(context: ExecutionContext) {
        // run default JWT auth (validates signature, sets req.user)
        const ok = (await super.canActivate(context)) as boolean;
        if (!ok) return false;

        const req = context.switchToHttp().getRequest();
        const token = req.cookies?.jwt || (() => {
            const a = req.headers?.authorization;
            return typeof a === 'string' && a.startsWith('Bearer ') ? a.slice(7) : undefined;
        })();

        if (!token) throw new UnauthorizedException('No token');

        const revoked = await this.authService.isRevoked(token);
        if (revoked) throw new UnauthorizedException('Token revoked');

        return true;
    }

    // optional: preserve default error handling
    handleRequest(err: any, user: any, info: any) {
        if (err || !user) {
            throw err || new UnauthorizedException();
        }
        return user;
    }
}