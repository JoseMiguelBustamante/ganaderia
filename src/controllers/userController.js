import { createUserService, getAllUsersService, deactivateUserService, changeUserPasswordService } from '../services/userService.js';
import { sendError } from '../utils/sendError.js';

export const createUserController = async (req, res) => {
    try {
        const { email, password, displayName, role, teamId } = req.validated.body;
        const user = await createUserService(req.user.tenantId, req.user.role, email, password, displayName, role, teamId);
        return res.status(201).json({ data: user });
    } catch (error) { return sendError(res, error); }
};
export const getAllUsersController = async (req, res) => {
    try {
        return res.status(200).json({ data: await getAllUsersService(req.user.tenantId) });
    } catch (error) { return sendError(res, error); }
};
export const deactivateUserController = async (req, res) => {
    try {
        return res.status(200).json({ data: await deactivateUserService(req.user.tenantId, req.validated.params.id) });
    } catch (error) { return sendError(res, error); }
};
export const changeUserPasswordController = async (req, res) => {
    try {
        const data = await changeUserPasswordService(req.user.tenantId, req.validated.params.id,
            req.user.sub, req.user.role, req.validated.body.password);
        return res.status(200).json({ data });
    } catch (error) { return sendError(res, error); }
};
