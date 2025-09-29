import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

// User entity and SafeUser type
export interface User {
    id: number;
    username: string;
    password: string;
    name?: string;
}

export type SafeUser = Omit<User, 'password'>;

// Method decorator to omit password field from returned User or User[] objects
export function OmitPassword() {
    return function (
        _target: any,
        _propertyKey: string,
        descriptor: PropertyDescriptor,
    ) {
        const original = descriptor.value;
        descriptor.value = function (...args: any[]) {
            const handle = (value: any) => {
                if (value == null) return value;
                const strip = (v: any) => {
                    if (v && typeof v === 'object') {
                        const { password, ...rest } = v;
                        return rest;
                    }
                    return v;
                };
                if (Array.isArray(value)) return value.map(strip);
                return strip(value);
            };

            try {
                const result = original.apply(this, args);
                if (result && typeof result.then === 'function') {
                    return result.then(handle);
                }
                return handle(result);
            } catch (err) {
                throw err;
            }
        };
        return descriptor;
    };
}

@Injectable()
export class UsersService {
    // Demo users (in real app you should use a real module with DB)
    private readonly users: User[] = [
        { id: 1, username: 'admin', password: 'admin', name: 'Administrator' },
        { id: 2, username: 'user', password: 'user', name: 'User' },
    ];

    // Find user by username
    async findUser(username: string): Promise<User | undefined> {
        return this.users.find(user => user.username === username);
    }

    // Find user by username, omitting password field
    @OmitPassword()
    async findSafeUser(username: string): Promise<SafeUser | undefined> {
        return this.findUser(username);
    }

    // Find user by Id
    async findUserById(id: number): Promise<User | undefined> {
        return this.users.find(user => user.id === id);
    }

    // Find user by Id, omitting password field
    @OmitPassword()
    async findSafeUserById(id: number): Promise<SafeUser | undefined> {
        return this.findUserById(id);
    }

    // Generate a new random user ID (UUID v4)
    generateUserId(): string {
        return randomUUID();
    }
}
