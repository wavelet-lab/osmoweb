import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from '@/auth/jwt.strategy';
import { AuthService } from '@/auth/auth.service';

const JWT_CONFIG = 'JWT_CONFIG';

describe('JwtStrategy', () => {
    let strategy: JwtStrategy;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                JwtStrategy,
                {
                    provide: JWT_CONFIG,
                    useValue: { secret: 'test_secret', signOptions: { expiresIn: '1h' } },
                },
                {
                    provide: AuthService,
                    useValue: {},
                },
            ],
        }).compile();

        strategy = module.get<JwtStrategy>(JwtStrategy);
    });

    it('validate returns user-like object built from payload', async () => {
        const payload = { sub: '123', username: 'user', foo: 'bar' };
        const result = await strategy.validate(payload);
        expect(result).toMatchObject({ sub: '123', username: 'user' });
    });
});