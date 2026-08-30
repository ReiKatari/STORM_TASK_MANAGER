import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'task-manager-super-secret-key-2025';
const TOKEN_EXPIRY = '24h';

// Demo users (in production, use a database)
const users = [
	{
		id: 1,
		username: 'pstasuk',
		passwordHash: bcryptjs.hashSync('X8drFrV1', 10),
		displayName: 'Стасюк П.',
		role: 'admin'
	},
	{
		id: 2,
		username: 'admin',
		passwordHash: bcryptjs.hashSync('admin123', 10),
		displayName: 'Администратор',
		role: 'admin'
	}
];

export function authenticateUser(username, password) {
	const user = users.find(u => u.username === username);
	if (!user) return null;
	if (!bcryptjs.compareSync(password, user.passwordHash)) return null;
	return {
		id: user.id,
		username: user.username,
		displayName: user.displayName,
		role: user.role
	};
}

export function createToken(user) {
	return jwt.sign(
		{ id: user.id, username: user.username, role: user.role },
		JWT_SECRET,
		{ expiresIn: TOKEN_EXPIRY }
	);
}

export function verifyToken(token) {
	try {
		return jwt.verify(token, JWT_SECRET);
	} catch {
		return null;
	}
}
