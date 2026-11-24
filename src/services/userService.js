import bcrypt from 'bcryptjs';
import { createUser, getAllUsers, deactivateUser, changeUserPassword } from '../repositories/userRepository.js';
import { BusinessError, ConflictError, ForbiddenError, NotFoundError } from '../utils/AppError.js';

const BCRYPT_ROUNDS = 10;
const mapUserError = (error) => {
    if (error.code === '23505' && error.constraint === 'users_tenant_id_email_key') {
        return new ConflictError({ reason: 'EMAIL_ALREADY_EXISTS' });
    }
    if (error.message === 'USER_NOT_IN_TENANT') return new NotFoundError({ reason: error.message });
    if (['LAST_OWNER', 'TEAM_NOT_IN_TENANT', 'ROLE_NOT_ALLOWED'].includes(error.message)) {
        return new BusinessError({ reason: error.message });
    }
    return error;
};

export const createUserService = async (tenantId, callerRole, email, password, displayName, role, teamId) => {
    if (role === 'owner' && callerRole !== 'owner') throw new ForbiddenError();
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    try {
        return await createUser(tenantId, email, passwordHash, displayName, role, teamId);
    } catch (error) { throw mapUserError(error); }
};

export const getAllUsersService = async (tenantId) => {
    const users = await getAllUsers(tenantId, false);
    return users.map(user => ({
        id: user.id, tenantId: user.tenant_id, email: user.email,
        displayName: user.display_name, role: user.role, teamId: user.team_id,
        isActive: user.is_active, createdAt: user.created_at,
    }));
};

export const deactivateUserService = async (tenantId, userId) => {
    try { return { id: await deactivateUser(tenantId, userId) }; }
    catch (error) { throw mapUserError(error); }
};

// All non-owners (including managers) may change only their own password.
// Email-based recovery remains pending mailer configuration.
export const changeUserPasswordService = async (tenantId, userId, callerId, callerRole, password) => {
    if (callerRole !== 'owner' && callerId !== userId) throw new ForbiddenError();
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    try { return { id: await changeUserPassword(tenantId, userId, passwordHash) }; }
    catch (error) { throw mapUserError(error); }
};
