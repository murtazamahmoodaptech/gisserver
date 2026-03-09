import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectDB } from '../backend/config/database.ts';
import { Coupon } from '../backend/models/Coupon.ts';
import { verifyToken } from '../backend/utils/jwt.ts';
import type { JwtPayload } from '../backend/utils/jwt.ts';
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
    /* ===========================
       GET - List all active coupons (public endpoint)
       Query: ?active=true to get only valid/active coupons
    ============================ */
    if (req.method === 'GET' && req.query.active === 'true') {
      const now = new Date();
      const activeCoupons = await Coupon.find({
        isActive: true,
        expiryDate: { $gt: now }
      }).select('code discountPercentage expiryDate').sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        data: activeCoupons,
      });
    }

    // Verify authentication for admin operations
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
       GET - List all coupons (admin only)
    ============================ */
    if (req.method === 'GET') {
      const { search, status } = req.query;

      let query: any = {};

      if (search) {
        query.code = { $regex: search, $options: 'i' };
      }

      if (status && status !== 'all') {
        query.isActive = status === 'active';
      }

      const coupons = await Coupon.find(query)
        .sort({ createdAt: -1 })
        .limit(100);

      return res.status(200).json({
        success: true,
        coupons,
      });
    }

    /* ===========================
       POST - Create new coupon
    ============================ */
    if (req.method === 'POST') {
      const { code, discountPercentage, expiryDate } = req.body;

      // Validation
      if (!code || !discountPercentage || !expiryDate) {
        return res.status(400).json({
          success: false,
          message: 'Code, discount percentage, and expiry date are required',
        });
      }

      if (discountPercentage < 1 || discountPercentage > 100) {
        return res.status(400).json({
          success: false,
          message: 'Discount must be between 1 and 100',
        });
      }

      const expiry = new Date(expiryDate);
      if (expiry <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Expiry date must be in the future',
        });
      }

      // Check if coupon code exists
      const existingCoupon = await Coupon.findOne({
        code: code.toUpperCase(),
      });

      if (existingCoupon) {
        return res.status(400).json({
          success: false,
          message: 'Coupon with this code already exists',
        });
      }

      // Create coupon
      const newCoupon = new Coupon({
        code: code.toUpperCase(),
        discountPercentage,
        expiryDate: expiry,
        isActive: true,
      });

      await newCoupon.save();

      return res.status(201).json({
        success: true,
        coupon: newCoupon,
      });
    }

    /* ===========================
       PUT - Update coupon
    ============================ */
    if (req.method === 'PUT') {
      const { id } = req.query;
      const { discountPercentage, expiryDate, isActive } = req.body;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Coupon ID is required',
        });
      }

      // Validate if updating discount
      if (discountPercentage !== undefined) {
        if (discountPercentage < 1 || discountPercentage > 100) {
          return res.status(400).json({
            success: false,
            message: 'Discount must be between 1 and 100',
          });
        }
      }

      // Validate if updating expiry
      if (expiryDate !== undefined) {
        const expiry = new Date(expiryDate);
        if (expiry <= new Date()) {
          return res.status(400).json({
            success: false,
            message: 'Expiry date must be in the future',
          });
        }
      }

      const updateData: any = {};
      if (discountPercentage !== undefined) updateData.discountPercentage = discountPercentage;
      if (expiryDate !== undefined) updateData.expiryDate = new Date(expiryDate);
      if (isActive !== undefined) updateData.isActive = isActive;

      const updatedCoupon = await Coupon.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!updatedCoupon) {
        return res.status(404).json({
          success: false,
          message: 'Coupon not found',
        });
      }

      return res.status(200).json({
        success: true,
        coupon: updatedCoupon,
      });
    }

    /* ===========================
       DELETE - Delete coupon
    ============================ */
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Coupon ID is required',
        });
      }

      const deletedCoupon = await Coupon.findByIdAndDelete(id);

      if (!deletedCoupon) {
        return res.status(404).json({
          success: false,
          message: 'Coupon not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Coupon deleted successfully',
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  } catch (error) {
    console.error('Coupon API error:', error);

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
