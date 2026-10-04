const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const JWT_SECRET = process.env.JWT_SECRET || 'daias_super_secret_key';

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Replace with your actual PostgreSQL database query here once the users table is active
    const mockUser = {
      id: 1,
      email: email,
      passwordHash: await bcrypt.hash('SecurePassword123!', 10),
      role: 'investigator' // Options: 'investigator', 'insurer', 'law_enforcement', 'admin'
    };

    const isPasswordValid = await bcrypt.compare(password, mockUser.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: mockUser.id, email: mockUser.email, role: mockUser.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.status(200).json({
      message: 'Authentication successful',
      token,
      role: mockUser.role
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error during login' });
  }
};

module.exports = { login };
