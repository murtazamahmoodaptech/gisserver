import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectDB } from '../../config/database';
import { syncFacebookReviews } from '../../services/facebookSync';
import { verifyToken } from '../../utils/jwt';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await connectDB();

  try {
    // 🔐 Only admin can trigger
    const token = req.headers.authorization?.split(' ')[1];
    const user = token ? verifyToken(token) : null;

    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin only',
      });
    }

    if (req.method === 'POST') {
      const result = await syncFacebookReviews();

      return res.status(200).json({
        success: true,
        message: 'Facebook reviews synced',
        data: result,
      });
    }

    return res.status(405).json({ message: 'Method not allowed' });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Sync failed',
    });
  }
}