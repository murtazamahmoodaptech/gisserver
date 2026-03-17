import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectDB } from '../../config/database';
import { syncFacebookReviews } from '../../services/facebookSync';
import { verifyToken } from '../../utils/jwt';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await connectDB();

    // 🔐 Validate token and admin role
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Missing authorization token',
      });
    }

    const user = verifyToken(token);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    // Validate Facebook credentials exist
    if (!process.env.FB_PAGE_ID || !process.env.FB_ACCESS_TOKEN) {
      return res.status(400).json({
        success: false,
        message: 'Facebook credentials not configured. Please set FB_PAGE_ID and FB_ACCESS_TOKEN in environment variables.',
      });
    }

    if (req.method === 'POST') {
      const result = await syncFacebookReviews();

      return res.status(200).json({
        success: true,
        message: `Successfully synced ${result.inserted} Facebook reviews`,
        data: result,
      });
    }

    return res.status(405).json({ 
      success: false,
      message: 'Method not allowed. Use POST to sync reviews.' 
    });

  } catch (error) {
    console.error("[v0] Facebook sync error:", error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to sync Facebook reviews. Please check your credentials and try again.';
    
    return res.status(500).json({
      success: false,
      message: errorMessage,
    });
  }
}
