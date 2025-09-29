import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { AuthService } from '@/auth/auth.service';

const JWT_CONFIG = 'JWT_CONFIG';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(
        @Inject(JWT_CONFIG) private readonly jwtConfig: { secret: string },
        private readonly authService: AuthService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (req: any) => req?.cookies?.jwt ?? undefined,
                ExtractJwt.fromAuthHeaderAsBearerToken(),
            ]),
            ignoreExpiration: false,
            secretOrKey: jwtConfig.secret,
        });
    }

    async validate(payload: any) {
        if (!payload) {
            throw new UnauthorizedException();
        }
        // optional load user from UsersService:
        // const user = await this.usersService.findSafeUserById(payload.sub);
        // if (!user) throw new UnauthorizedException();
        // return user;
        return { sub: payload.sub, username: payload.username, ...payload };
    }
}