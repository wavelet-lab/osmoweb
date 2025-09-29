import { vi } from 'vitest';
import { UsersService } from '@/users/users.service';
import { AuthService } from '@/auth/auth.service';
import { JwtService } from '@nestjs/jwt';

describe('AuthService', () => {
    let service: AuthService;
    let mockUsers: Partial<UsersService>;
    let mockJwt: Partial<JwtService>;

    beforeEach(() => {
        mockUsers = {
            findUser: vi.fn().mockImplementation((username: string) => {
                if (username === 'admin') {
                    return Promise.resolve({ id: 1, username: 'admin', password: 'password' });
                }
                return Promise.resolve(undefined);
            }),
        };
        mockJwt = {
            signAsync: vi.fn().mockResolvedValue('signed-token'),
            verifyAsync: vi.fn().mockResolvedValue({ sub: 1, username: 'tester' }),
        };
        service = new AuthService(mockUsers as UsersService, mockJwt as JwtService);
    });

    it('validateUser returns safe user without password', async () => {
        const user = await service.validateUser('admin', 'password');
        expect(user).toBeDefined();
        expect((user as any).password).toBeUndefined();
        expect((user as any).username).toBe('admin');
    });

    it('validateUser returns undefined for wrong credentials', async () => {
        const user = await service.validateUser('admin', 'bad');
        expect(user).toBeUndefined();
    });

    it('createAccessToken calls JwtService.signAsync and returns token', async () => {
        const token = await service.createAccessToken({ foo: 'bar' }, '2h');
        expect(token).toBe('signed-token');
        expect((mockJwt.signAsync as any).mock.calls.length).toBeGreaterThan(0);
    });

    it('refreshToken returns new token for valid token', async () => {
        const token = await service.refreshToken('valid-token');
        expect(token).toBe('signed-token');
        expect((mockJwt.verifyAsync as any).mock.calls.length).toBeGreaterThan(0);
    });

    it('refreshToken returns undefined for invalid token', async () => {
        (mockJwt.verifyAsync as any).mockRejectedValueOnce(new Error('invalid'));
        const token = await service.refreshToken('bad-token');
        expect(token).toBeUndefined();
    });
});