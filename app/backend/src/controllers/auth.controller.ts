import { type CookieOptions, type Request, type Response } from "express";
import { ACCESS_TTL_SECONDS } from "../config/jwt";
import { ACCESS_COOKIE, REFRESH_COOKIE, readAuthCookie } from "../middleware/auth.middleware";
import { AppError } from "../middleware/errorHandler.middleware";
import * as auth from "../services/auth.service";
import { endSession, listSessions, refreshSession, revokeSessions, type SessionCredentials } from "../services/session.service";

const common = (): CookieOptions => ({ httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" });
const accessPath = "/api/v1";
const refreshPath = "/api/v1/auth";

function writeCookies(res: Response, credentials: SessionCredentials) {
  const remaining = Math.max(0, credentials.expiresAt.getTime() - Date.now());
  res.cookie(ACCESS_COOKIE, credentials.access, { ...common(), path: accessPath, maxAge: Math.min(remaining, ACCESS_TTL_SECONDS * 1000) });
  res.cookie(REFRESH_COOKIE, credentials.refresh, { ...common(), path: refreshPath, maxAge: remaining });
}

function clearCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, { ...common(), path: accessPath });
  res.clearCookie(REFRESH_COOKIE, { ...common(), path: refreshPath });
}

const client = (req: Request) => ({ ipAddress: req.ip, userAgent: req.get("User-Agent") });
function identity(req: Request) {
  if (!req.user) throw new AppError("Inicia sesión para continuar", 401);
  return req.user;
}

function respond(res: Response, result: { credentials?: SessionCredentials } & Record<string, unknown>, code = 200) {
  const { credentials, ...data } = result;
  if (credentials) writeCookies(res, credentials);
  res.status(code).json({ status: "success", data });
}

export async function register(req: Request, res: Response) { respond(res, await auth.registerUser(req.body, client(req)), 201); }
export async function login(req: Request, res: Response) { respond(res, await auth.loginUser(req.body, client(req))); }
export async function verifyEmailCode(req: Request, res: Response) {
  const { id, sessionId } = identity(req);
  respond(res, await auth.verifyEmailCode(id, sessionId, req.body.code, client(req)));
}
export async function verifyPhoneCode(req: Request, res: Response) {
  const { id, sessionId } = identity(req);
  respond(res, await auth.verifyPhoneCode(id, sessionId, req.body.code, client(req)));
}
export async function resendVerification(req: Request, res: Response) {
  const { id, sessionId } = identity(req);
  respond(res, await auth.resendVerificationCodes(id, sessionId));
}
export async function forgotPassword(req: Request, res: Response) { respond(res, await auth.forgotPassword(req.body.email)); }
export async function resetPassword(req: Request, res: Response) {
  const { token, password, email } = req.body;
  const result = await auth.resetPassword(token, password, email, client(req));
  clearCookies(res);
  respond(res, result);
}
export async function setup2FA(req: Request, res: Response) {
  const { id, sessionId } = identity(req);
  respond(res, await auth.setup2FA(id, sessionId, req.body.password, client(req)));
}
export async function confirm2FA(req: Request, res: Response) {
  const { id, sessionId } = identity(req);
  respond(res, await auth.confirm2FA(id, sessionId, req.body.code, client(req)));
}
export async function disable2FA(req: Request, res: Response) {
  const { id, sessionId } = identity(req);
  respond(res, await auth.disable2FA(id, sessionId, req.body.password, req.body.code, client(req)));
}
export async function changePassword(req: Request, res: Response) {
  const { id, sessionId } = identity(req);
  const { currentPassword, password, code } = req.body;
  const result = await auth.changePassword(id, sessionId, currentPassword, password, code, client(req));
  clearCookies(res);
  respond(res, result);
}
export async function getProfile(req: Request, res: Response) {
  const { id } = identity(req);
  respond(res, await auth.getProfile(id));
}
export async function refresh(req: Request, res: Response) {
  writeCookies(res, await refreshSession(readAuthCookie(req, REFRESH_COOKIE)));
  res.status(204).end();
}
export async function logout(req: Request, res: Response) {
  await endSession(readAuthCookie(req, ACCESS_COOKIE), readAuthCookie(req, REFRESH_COOKIE), client(req));
  clearCookies(res);
  res.status(204).end();
}
export async function sessions(req: Request, res: Response) {
  const { id, sessionId } = identity(req);
  res.json({ status: "success", data: await listSessions(id, sessionId) });
}
export async function revokeSession(req: Request, res: Response) {
  const { id, sessionId } = identity(req);
  respond(res, await revokeSessions(id, sessionId, req.params.id, client(req)));
}
export async function revokeOtherSessions(req: Request, res: Response) {
  const { id, sessionId } = identity(req);
  respond(res, await revokeSessions(id, sessionId, null, client(req)));
}
