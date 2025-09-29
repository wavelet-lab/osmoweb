import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const JWT_CONFIG = 'JWT_CONFIG';

@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: JWT_CONFIG,
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                const secret = config.get<string>('JWT_SECRET')
                    || 'just_a_demo_secret_key_you_should_change_me';
                if (!secret) {
                    throw new Error('JWT_SECRET is not set');
                }
                return {
                    secret,
                    algorithm: config.get<string>('JWT_ALGORITHM') || 'HS256',
                    signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN') || '1h' },
                };
            },
        },
    ],
    exports: [JWT_CONFIG],
})
export class JwtConfigModule { }