import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const registerSchema = z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().email().max(254), password: z.string().min(8).max(72) });
const loginSchema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(8).max(72) });
const issueToken = (user) => jwt.sign({}, process.env.JWT_SECRET, { subject: user.id, expiresIn: process.env.JWT_EXPIRES_IN || '1d', algorithm: 'HS256' });
const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email });

export const register = asyncHandler(async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Check the name, email, and password fields.', errors: parsed.error.flatten().fieldErrors });
  const { name, email, password } = parsed.data;
  if (await User.exists({ email: email.toLowerCase() })) return res.status(409).json({ message: 'An account with this email already exists.' });
  const rounds = Number(process.env.BCRYPT_ROUNDS) || 12;
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, rounds) });
  res.status(201).json({ token: issueToken(user), user: publicUser(user) });
});

export const login = asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Enter a valid email and password.' });
  const user = await User.findOne({ email: parsed.data.email.toLowerCase() }).select('+passwordHash');
  const matches = user && await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!matches) return res.status(401).json({ message: 'Email or password is incorrect.' });
  res.json({ token: issueToken(user), user: publicUser(user) });
});

export const me = (req, res) => res.json({ user: publicUser(req.user) });
