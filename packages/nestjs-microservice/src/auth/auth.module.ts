import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { JwtStrategy } from '@/auth/jwt.strategy';
import { AuthService } from '@/auth/auth.service';
import { AuthController } from '@/auth/auth.controller';
import { UsersModule } from '@/users/users.module';
import { JwtConfigModule, JWT_CONFIG } from '@/auth/jwt-config.module';

@Module({
    imports: [
        ConfigModule,
        UsersModule,
        JwtConfigModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            imports: [JwtConfigModule],
            inject: [JWT_CONFIG],
            useFactory: (jwtConfig: { secret: string; signOptions?: any }) => jwtConfig,
        }),
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        JwtStrategy,
        JwtAuthGuard,
    ],
    exports: [AuthService],
})
export class AuthModule { }