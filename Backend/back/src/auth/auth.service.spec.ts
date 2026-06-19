import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { UserDocument } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<
    Pick<
      UsersService,
      'create' | 'findByEmail' | 'findByEmailWithPassword' | 'findById'
    >
  >;
  let jwtService: jest.Mocked<Pick<JwtService, 'signAsync'>>;

  beforeEach(async () => {
    usersService = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      findByEmailWithPassword: jest.fn(),
      findById: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: usersService,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('creates an account and returns an authenticated session', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    usersService.create.mockImplementation((data) =>
      Promise.resolve(
        createUser({
          name: data.name,
          email: data.email,
          password: data.password,
        }),
      ),
    );

    const result = await service.signup({
      name: '  Abdelrahman  ',
      email: '  USER@Example.COM ',
      password: 'strong-password',
    });

    expect(usersService.findByEmail).toHaveBeenCalledWith('user@example.com');
    expect(usersService.create).toHaveBeenCalledWith({
      name: 'Abdelrahman',
      email: 'user@example.com',
      password: expect.any(String) as string,
    });

    const createdPassword = usersService.create.mock.calls[0][0].password;
    await expect(
      bcrypt.compare('strong-password', createdPassword),
    ).resolves.toBe(true);

    expect(result).toEqual({
      user: {
        id: 'user-id',
        name: 'Abdelrahman',
        email: 'user@example.com',
      },
      accessToken: 'signed-token',
    });
    expect(result.user).not.toHaveProperty('password');
  });

  it('rejects an email that is already registered', async () => {
    usersService.findByEmail.mockResolvedValue(createUser());

    await expect(
      service.signup({
        name: 'Abdelrahman',
        email: 'user@example.com',
        password: 'strong-password',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(usersService.create).not.toHaveBeenCalled();
  });

  it('logs in with valid credentials', async () => {
    const password = await bcrypt.hash('strong-password', 4);
    usersService.findByEmailWithPassword.mockResolvedValue(
      createUser({ password }),
    );

    await expect(
      service.login({
        email: 'USER@example.com',
        password: 'strong-password',
      }),
    ).resolves.toEqual({
      user: {
        id: 'user-id',
        name: 'Abdelrahman',
        email: 'user@example.com',
      },
      accessToken: 'signed-token',
    });
  });

  it('rejects invalid login credentials', async () => {
    const password = await bcrypt.hash('strong-password', 4);
    usersService.findByEmailWithPassword.mockResolvedValue(
      createUser({ password }),
    );

    await expect(
      service.login({
        email: 'user@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a token whose user no longer exists', async () => {
    usersService.findById.mockResolvedValue(null);

    await expect(service.getProfile('deleted-user')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

function createUser(
  overrides: Partial<{
    id: string;
    name: string;
    email: string;
    password: string;
  }> = {},
) {
  return {
    id: 'user-id',
    name: 'Abdelrahman',
    email: 'user@example.com',
    password: 'hashed-password',
    ...overrides,
  } as UserDocument;
}
