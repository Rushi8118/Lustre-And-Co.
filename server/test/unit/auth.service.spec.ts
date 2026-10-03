import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../src/modules/auth/auth.service.js';
import { isStrongPassword } from '../../src/common/validators/is-strong-password.validator.js';

describe('AuthService (Security, Password Rules & Token Rotation)', () => {
  let authService: AuthService;
  let mockUsersService: any;
  let mockJwtService: any;
  let mockDb: any;
  let mockAuditLogService: any;
  let mockSmtpService: any;
  let mockConfigService: any;

  beforeEach(() => {
    mockUsersService = {
      findByEmail: vi.fn(),
      touchLastLogin: vi.fn(),
    };
    mockJwtService = {
      sign: vi.fn().mockReturnValue('jwt-mock-access-token'),
      verify: vi.fn(),
    };
    mockDb = {
      from: vi.fn(),
    };
    mockAuditLogService = {
      recordLog: vi.fn(),
    };
    mockSmtpService = {
      sendMail: vi.fn().mockResolvedValue(true),
    };
    mockConfigService = {
      get: vi.fn().mockReturnValue('jwt-secret-key-12345'),
    };

    authService = new AuthService(
      mockUsersService,
      mockJwtService,
      mockConfigService,
      mockDb,
      mockSmtpService,
      mockAuditLogService,
    );
  });

  describe('Password Strength Validation', () => {
    it('should reject passwords shorter than 8 characters', () => {
      expect(isStrongPassword('Ab1!')).toBe(false);
    });

    it('should reject passwords missing uppercase letters', () => {
      expect(isStrongPassword('weakpass123!')).toBe(false);
    });

    it('should reject passwords missing numbers', () => {
      expect(isStrongPassword('WeakPassword!')).toBe(false);
    });

    it('should reject passwords missing special symbols', () => {
      expect(isStrongPassword('WeakPassword123')).toBe(false);
    });

    it('should accept strong passwords meeting all complexity criteria', () => {
      expect(isStrongPassword('Lustre#Admin2026!')).toBe(true);
      expect(isStrongPassword('Jewelry$Store99')).toBe(true);
    });
  });

  describe('Refresh Token Rotation & Replay Attack Detection', () => {
    it('should rotate token successfully when valid refresh token is supplied', async () => {
      const oldRefreshToken = 'valid_raw_token_xyz_12345';
      const mockUser = {
        id: 'usr-1',
        email: 'admin@lustre.com',
        role: 'admin',
        isActive: true,
      };

      // Mock token in DB
      mockDb.from.mockImplementation((table: string) => {
        if (table === 'auth_refresh_tokens') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 'token-uuid-1',
                    user_id: 'usr-1',
                    is_revoked: false,
                    replaced_by_token_id: null,
                    expires_at: new Date(Date.now() + 1000000).toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: true, error: null }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'new-token-uuid-2' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: mockUser,
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const result = await authService.refreshTokens(oldRefreshToken);
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
      expect(result.token).toBe('jwt-mock-access-token');
    });

    // Important security test case: Replay attack revokes all user sessions
    it('should detect a replay attack when an already-replaced refresh token is used and revoke all sessions', async () => {
      const compromisedToken = 'stolen_already_rotated_token';
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: true, error: null }),
      });

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'auth_refresh_tokens') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 'token-uuid-old',
                    user_id: 'usr-breached',
                    revoked: true, // Already revoked or replaced!
                    replaced_by_token_hash: 'some_prior_hash',
                    expires_at: new Date(Date.now() + 1000000).toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
            update: updateMock,
          };
        }
        return { select: vi.fn() };
      });

      await expect(authService.refreshTokens(compromisedToken)).rejects.toThrow(
        UnauthorizedException,
      );

      // Verify that all refresh tokens for this user are revoked
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          revoked: true,
        }),
      );

      // Verify that an audit log of the replay attack is recorded
      expect(mockAuditLogService.recordLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'auth.token_reuse_detected',
          status: 'denied',
        }),
      );
    });
  });
});
