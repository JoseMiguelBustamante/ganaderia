import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ConflictError, NotFoundError, UnauthorizedError } from '../utils/AppError.js';
import {
    createTenantWithOwner,
    getLoginContextByEmail,
    getUserById,
} from '../repositories/authRepository.js';
import { logger } from '../config/logger.js';

const BCRYPT_ROUNDS = 10;
// Valid bcrypt-format hash of an unreachable secret. Compared against when the
// user does not exist, so login spends the same bcrypt work regardless of
// account existence (timing-based enumeration stays flat).
const DUMMY_HASH = '$2b$10$Ds6vJPiwagSIsb3sVXmXG.lmkc/1MqJl2SSydoGhfAIHcMWuKi66a';
const UNIQUE_SLUG_VIOLATION = 'tenants_slug_key';
const UNIQUE_USER_EMAIL_VIOLATION = 'users_tenant_id_email_key';

export const registerService = async (tenantName, slug, email, password, displayName) => {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    let result;
    try {
        result = await createTenantWithOwner(tenantName, slug, email, passwordHash, displayName);
    } catch (error) {
        throw mapUniqueViolation(error);
    }
    const payload = result[0]?.p_result ?? result[0];
    return buildSession(payload.user, payload.tenant);
};

export const loginService = async (email, password) => {
    const context = await getLoginContextByEmail(email);
    // Constant work: bcrypt always runs, against the dummy hash when missing.
    const passwordMatches = await bcrypt.compare(
        password, context?.user?.passwordHash ?? DUMMY_HASH,
    );
    // One generic reason for every miss: existence of the account stays secret.
    if (!context || !passwordMatches) {
        throw new UnauthorizedError({ reason: 'INVALID_CREDENTIALS' });
    }
    return buildSession(context.user, context.tenant);
};

export const getMeService = async (tenantId, userId) => {
    const user = await getUserById(tenantId, userId);
    if (!user) throw new NotFoundError();
    return toPublicUser(user);
};

export const verifyToken = (token) => jwt.verify(token, env.JWT_SECRET);

function mapUniqueViolation(error) {
    if (error?.code !== '23505') throw error;
    if (error.constraint === UNIQUE_SLUG_VIOLATION) {
        return new ConflictError({ reason: 'SLUG_ALREADY_EXISTS' });
    }
    if (error.constraint === UNIQUE_USER_EMAIL_VIOLATION) {
        return new ConflictError({ reason: 'EMAIL_ALREADY_EXISTS' });
    }
    return new ConflictError({ reason: 'UNIQUE_VIOLATION' });
}

function buildSession(user, tenant) {
    const token = jwt.sign(
        { sub: user.id, tenantId: user.tenantId, role: user.role },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN },
    );
    logger.info(`auth session issued for user ${user.id} in tenant ${tenant.id}`);
    return { token, user: toPublicUser(user), tenant };
}

function toPublicUser(user) {
    return {
        id: user.id,
        tenantId: user.tenant_id ?? user.tenantId,
        email: user.email,
        displayName: user.display_name ?? user.displayName,
        role: user.role,
    };
}
