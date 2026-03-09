import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectDB } from '../backend/config/database';
import { User } from '../backend/models/User';
import { verifyToken, type JwtPayload } from '../backend/utils/jwt';
import { generateToken } from '../backend/utils/jwt';
async function getTokenFromRequest(req: VercelRequest): Promise<JwtPayload | null> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return null;
  return verifyToken(token);
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  await connectDB();

  try {
    // Verify authentication
    const user = await getTokenFromRequest(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Verify admin role
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    /* ===========================
       GET - List all users
    ============================ */
    if (req.method === 'GET') {
      const { search, role, status } = req.query;

      let query: any = {};

      if (search) {
        query.$or = [
          { email: { $regex: search, $options: 'i' } },
          { fullName: { $regex: search, $options: 'i' } },
        ];
      }

      if (role && role !== 'all') {
        query.role = role;
      }

      if (status !== undefined && status !== 'all') {
        query.isActive = status === 'active';
      }

      const users = await User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .limit(100);

      return res.status(200).json({
        success: true,
        users,
      });
    }

    /* ===========================
       POST - Create new user
    ============================ */
    if (req.method === 'POST') {
      const { email, password, fullName, role } = req.body;

      // Validation
      if (!email || !password || !fullName) {
        return res.status(400).json({
          success: false,
          message: 'Email, password, and full name are required',
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters',
        });
      }

      if (fullName.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Full name must be at least 2 characters',
        });
      }

      if (role && !['admin', 'user'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Role must be admin or user',
        });
      }

      // Check if user exists
      const existingUser = await User.findOne({
        email: email.toLowerCase(),
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists',
        });
      }

      // Create user
      const newUser = new User({
        email: email.toLowerCase(),
        password,
        fullName,
        role: role || 'user',
        isActive: true,
      });

      await newUser.save();

      return res.status(201).json({
        success: true,
        user: {
          id: newUser._id,
          email: newUser.email,
          fullName: newUser.fullName,
          role: newUser.role,
          isActive: newUser.isActive,
          createdAt: newUser.createdAt,
        },
      });
    }

    /* ===========================
       PUT - Update user
    ============================ */
    if (req.method === 'PUT') {
      const { id } = req.query;
      const { fullName, role, isActive } = req.body;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
      }

      // Prevent self-deletion/deactivation
      if (user.userId === id && isActive === false) {
        return res.status(400).json({
          success: false,
          message: 'Cannot deactivate your own account',
        });
      }

      const updatedUser = await User.findByIdAndUpdate(
        id,
        {
          ...(fullName && { fullName }),
          ...(role && { role }),
          ...(isActive !== undefined && { isActive }),
        },
        { new: true, runValidators: true }
      ).select('-password');

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      return res.status(200).json({
        success: true,
        user: updatedUser,
      });
    }

    /* ===========================
       DELETE - Delete user
    ============================ */
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
      }

      // Prevent self-deletion
      if (user.userId === id) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete your own account',
        });
      }

      const deletedUser = await User.findByIdAndDelete(id);

      if (!deletedUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'User deleted successfully',
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  } catch (error) {
    console.error('User API error:', error);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error:
        process.env.NODE_ENV === 'development'
          ? error instanceof Error
            ? error.message
            : String(error)
          : undefined,
    });
  }
}
