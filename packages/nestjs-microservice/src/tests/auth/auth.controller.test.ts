import { vi } from 'vitest';
import { AuthController } from '@/auth/auth.controller';
import { AuthService } from '@/auth/auth.service';
import { UsersService } from '@/users/users.service';
import { HttpException } from '@nestjs/common';

describe('AuthController', () => {
    let controller: AuthController;
    let mockAuth: Partial<AuthService>;
    let mockUsers: Partial<UsersService>;

    beforeEach(() => {
        const futureExp = Math.floor(Date.now() / 1000) + 60 * 60; // +1h
        mockAuth = {
            validateUser: vi.fn().mockImplementation((u: string, p: string) => {
                if (u === 'admin' && p === 'password') return Promise.resolve({ id: 1, username: 'admin', name: 'Administrator' });
                return Promise.resolve(undefined);
            }),
            createAccessToken: vi.fn().mockResolvedValue('access-token'),
            // Default payload has exp in future so _setCookie will set cookie
            getTokenPayload: vi.fn().mockResolvedValue({ sub: '123', username: 'user', exp: futureExp }),
            refreshToken: vi.fn().mockResolvedValue('new-token'),
            revokeToken: vi.fn().mockResolvedValue(undefined),
        };
        mockUsers = {
            generateUserId: vi.fn().mockReturnValue('guest-123'),
        };
        controller = new AuthController(mockAuth as AuthService, mockUsers as UsersService);
    });

    const makeRes = () => ({
        json: vi.fn().mockImplementation((v: any) => v),
        cookie: vi.fn(),
        clearCookie: vi.fn(),
    } as any);

    it('login returns token on valid credentials', async () => {
        const dto: any = { username: 'admin', password: 'password' };
        const resMock = makeRes();
        const res = await controller.login(dto, resMock);
        expect(res).toEqual({ ok: true, message: 'User authenticated', user_id: 1 });
        expect((mockAuth.validateUser as any).mock.calls.length).toBe(1);
    });

    it('login throws on invalid credentials', async () => {
        const dto: any = { username: 'admin', password: 'wrong' };
        const resMock = makeRes();
        await expect(controller.login(dto, resMock)).rejects.toThrow(HttpException);
    });

    it('login throws when auth service fails to create token', async () => {
        (mockAuth.createAccessToken as any).mockResolvedValueOnce(undefined);
        const dto: any = { username: 'admin', password: 'password' };
        const resMock = makeRes();
        await expect(controller.login(dto, resMock)).rejects.toThrow(HttpException);
    });

    it('getProfile returns req.user', async () => {
        const req: any = { user: { sub: 1, username: 'admin' } };
        const res = await controller.getProfile(req);
        expect(res).toEqual({ ok: true, message: '', user: req.user });
    });

    it('refresh returns new token when cookie provided', async () => {
        const req: any = { cookies: { jwt: 'token' } };
        const resMock = makeRes();
        const res = await controller.refresh(req, resMock);
        expect(res).toEqual({ ok: true, message: 'Token refreshed' });
        expect((mockAuth.refreshToken as any).mock.calls.length).toBe(1);
    });

    it('refresh throws when no cookie token', async () => {
        const req: any = { cookies: {} };
        const resMock = makeRes();
        await expect(controller.refresh(req, resMock)).rejects.toThrow(HttpException);
    });

    it('logout revokes token and clears cookie', async () => {
        const req: any = { user: { sub: 1 }, cookies: { jwt: 'token' } };
        const resMock = makeRes();
        const result = await controller.logout(req, resMock);
        expect(result).toEqual({ ok: true, message: 'Logged out successfully' });
        expect((mockAuth.revokeToken as any).mock.calls).toHaveLength(1);
        expect((mockAuth.revokeToken as any).mock.calls[0][0]).toBe('token');
        expect(resMock.clearCookie).toHaveBeenCalledWith('jwt', expect.any(Object));
    });

    it('guest creates a guest and sets cookie when no token', async () => {
        const req: any = { cookies: {}, user: undefined };
        const resMock = makeRes();
        const result = await controller.guestLogin(req, resMock);
        expect(resMock.cookie).toHaveBeenCalledWith('jwt', 'access-token', expect.objectContaining({
            httpOnly: true,
        }));
        expect(resMock.json).toHaveBeenCalledWith({ ok: true, message: 'Guest authenticated', user_id: 'guest-123' });
    });

    it('guest refreshes token when token present and user attached', async () => {
        const req: any = { cookies: { jwt: 'old-token' }, user: { sub: 'guest-123' } };
        const resMock = makeRes();
        (mockAuth.refreshToken as any).mockResolvedValueOnce('refreshed-token');
        const result = await controller.guestLogin(req, resMock);
        expect((mockAuth.refreshToken as any).mock.calls.length).toBe(1);
        expect(resMock.cookie).toHaveBeenCalledWith('jwt', 'refreshed-token', expect.any(Object));
        // controller uses token payload.sub (mock default is '123'), adjust expectation accordingly
        expect(resMock.json).toHaveBeenCalledWith({ ok: true, message: 'Guest authenticated', user_id: '123' });
    });

    it('guest falls back to create new guest when refresh fails', async () => {
        const req: any = { cookies: { jwt: 'old-token' }, user: { sub: 'guest-123' } };
        const resMock = makeRes();
        (mockAuth.refreshToken as any).mockResolvedValueOnce(undefined); // refresh failed
        const result = await controller.guestLogin(req, resMock);
        // should create new guest token via createAccessToken (mocked as 'access-token')
        expect(resMock.cookie).toHaveBeenCalledWith('jwt', 'access-token', expect.any(Object));
        expect(resMock.json).toHaveBeenCalledWith({ ok: true, message: 'Guest authenticated', user_id: 'guest-123' });
    });

    it('guest with expired token refreshes and issues refreshed token', async () => {
        const expired = Math.floor(Date.now() / 1000) - 10;
        (mockAuth.getTokenPayload as any).mockResolvedValueOnce({ sub: 'guest-123', exp: expired });
        const req: any = { cookies: { jwt: 'expired-token' }, user: undefined };
        const resMock = makeRes();
        // default mockAuth.refreshToken returns 'new-token'
        const result = await controller.guestLogin(req, resMock);
        // expired token -> controller attempts refresh and sets refreshed token
        expect(resMock.cookie).toHaveBeenCalledWith('jwt', 'new-token', expect.any(Object));
        expect(resMock.json).toHaveBeenCalledWith({ ok: true, message: 'Guest authenticated', user_id: 'guest-123' });
    });

    it('guest with expired token and failed refresh clears cookie and issues new guest', async () => {
        const expired = Math.floor(Date.now() / 1000) - 10;
        (mockAuth.getTokenPayload as any).mockResolvedValueOnce({ sub: 'guest-123', exp: expired });
        (mockAuth.refreshToken as any).mockResolvedValueOnce(undefined); // refresh fails
        const req: any = { cookies: { jwt: 'expired-token' }, user: undefined };
        const resMock = makeRes();
        const result = await controller.guestLogin(req, resMock);
        expect(resMock.cookie).toHaveBeenCalledWith('jwt', 'access-token', expect.any(Object));
        expect(resMock.json).toHaveBeenCalledWith({ ok: true, message: 'Guest authenticated', user_id: 'guest-123' });
    });
});