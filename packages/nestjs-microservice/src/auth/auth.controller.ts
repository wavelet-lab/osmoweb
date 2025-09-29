import {
    Controller, Post, Body, Req, Res, UseGuards, Get, HttpException,
    HttpStatus, UnauthorizedException, Logger
} from '@nestjs/common';
import type { Response, CookieOptions } from 'express';
import { AuthService } from '@/auth/auth.service';
import { UsersService } from '@/users/users.service';
import { LoginDto } from '@/auth/dto/login.dto';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import type { AuthRequest } from '@/auth/interfaces/auth-request.interface';

@Controller('api/auth')
export class AuthController {
    protected readonly logger = new Logger(AuthController.name);
    constructor(private readonly authService: AuthService, private readonly usersService: UsersService) { }

    @Post('login')
    async login(@Body() dto: LoginDto, @Res() res: Response) {
        this.logger?.debug('Login request received', dto.username);
        const user = await this.authService.validateUser(dto.username, dto.password);
        if (!user) throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
        const token = await this.authService.createAccessToken({
            sub: user.id,
            username: user.username,
            name: user.name
        });
        await this._setCookie(res, token);
        if (!token) throw new HttpException('Auth service error', HttpStatus.INTERNAL_SERVER_ERROR);
        this.logger?.debug('User logged in', user);
        return res.json({ ok: true, message: 'User authenticated', user_id: user.id });
    }

    @UseGuards(JwtAuthGuard)
    @Post('logout')
    async logout(@Req() req: AuthRequest, @Res() res: Response) {
        this.logger?.debug('Logout request received', req.user);
        if (!req.user) throw new UnauthorizedException('Unauthorized');
        await this.authService.revokeToken(req.cookies?.jwt);
        await this._setCookie(res, undefined);
        return res.json({ ok: true, message: 'Logged out successfully' });
    }

    @Post('guest')
    async guestLogin(@Req() req: AuthRequest, @Res() res: Response) {
        this.logger?.debug('Guest login request received');
        // If already has a valid token, return the existing user info
        let newToken: string | undefined, userId: string | number | undefined;
        const token = req.cookies?.jwt;
        let needNewToken = true;
        if (token) {
            // try to refresh the token
            const payload = await this.authService.getTokenPayload(token);
            if (payload?.sub) {
                // valid token, refresh it
                userId = payload.sub;
                newToken = await this.authService.refreshToken(token);
                if (newToken) needNewToken = false;
            }
        }
        if (needNewToken) {
            // Create a new guest user
            userId = this.usersService.generateUserId();
            newToken = await this.authService.createAccessToken({
                sub: userId,
                username: 'guest',
                name: 'Guest User'
            }, '1h');
        }

        await this._setCookie(res, newToken);
        if (!newToken) throw new HttpException('Auth service error', HttpStatus.INTERNAL_SERVER_ERROR);
        this.logger?.debug('Guest user logged in', userId);
        return res.json({ ok: true, message: 'Guest authenticated', user_id: userId });
    }

    @UseGuards(JwtAuthGuard)
    @Get('profile')
    async getProfile(@Req() req: AuthRequest) {
        this.logger?.debug('Profile request received', req.user);
        if (!req.user) throw new UnauthorizedException('Unauthorized');
        return { ok: true, message: '', user: req.user };
    }

    @UseGuards(JwtAuthGuard)
    @Post('refresh')
    async refresh(@Req() req: AuthRequest, @Res() res: Response) {
        this.logger?.debug('Refresh request received', req.user);
        const token = req.cookies?.jwt;
        if (!token) throw new HttpException('No token', HttpStatus.BAD_REQUEST);
        const newToken = await this.authService.refreshToken(token);

        await this._setCookie(res, newToken);
        if (!newToken) throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
        this.logger?.debug('Token refreshed for user', req.user);
        return res.json({ ok: true, message: 'Token refreshed' });
    }

    private async _setCookie(res: Response, token: string | undefined): Promise<void> {
        let maxAge = 60 * 60 * 1000;
        let needClear = true;

        if (token) {
            // Determine cookie maxAge from token expiry (exp). Fallback to 1h if not available.
            const payload = await this.authService.getTokenPayload(token);
            if (typeof payload?.exp === 'number') {
                maxAge = payload.exp * 1000 - Date.now();
                needClear = maxAge <= 0;
            }
        }

        const cookieOptions: CookieOptions = {
            httpOnly: true,                                 // JS cannot read it
            secure: process.env.NODE_ENV === 'production',  // set true in production with HTTPS
            sameSite: 'strict',                             // CSRF protection
            path: '/',                                      // ensure matches original cookie
        };
        if (needClear) {
            // Clear cookie reliably
            res.clearCookie('jwt', cookieOptions);
        } else {
            // Set cookie
            res.cookie('jwt', token, {
                ...cookieOptions,
                maxAge,                                         // derived from token expiry
            });
        }
    }
}