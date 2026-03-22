import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectDB } from '../config/database';
import { Appointment } from '../models/Appointment';
import { Coupon } from '../models/Coupon';
import { sendEmail, getBookingConfirmationEmail, getAdminNotificationEmail } from '../services/emailService';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  await connectDB();

  const { id } = req.query;

  try {
    // --- GET ALL ---
    if (req.method === 'GET') {
      const appointments = await Appointment.find().sort({ createdAt: -1 });
      return res.status(200).json({
        success: true,
        data: appointments,
      });
    } 

    // --- CREATE NEW (POST) ---
    else if (req.method === 'POST') {
      const appointmentData = req.body;

      // 1. Validating new required fields from Book.tsx
      const requiredFields = [
        'fullName', 'email', 'phone', 
        'streetAddress', 'city', 'state', 'zipCode', 
        'make', 'vehicleModel', 'year'
      ];
      
      for (const field of requiredFields) {
        if (!appointmentData[field]) {
          return res.status(400).json({
            success: false,
            message: `Missing required field: ${field}`,
          });
        }
      }

      let processedCoupons: any[] = [];
      let totalDiscount = 0;
      const basePrice = Number(appointmentData.basePrice) || 0;

      // 2. Specialized Coupon Logic
      if (appointmentData.coupons && Array.isArray(appointmentData.coupons)) {
        const now = new Date();
        for (const couponData of appointmentData.coupons) {
          const upperCode = couponData.code.toUpperCase();
          
          // Check DB for active coupon
          let coupon = await Coupon.findOne({ 
            code: upperCode,
            isActive: true,
            expiryDate: { $gt: now }
          });

          // Fallback for hardcoded 'FIRST10' from frontend
          if (coupon || upperCode === 'FIRST10') {
            const percentage = coupon ? coupon.discountPercentage : 10;
            const discountAmount = (basePrice * percentage) / 100;
            totalDiscount += discountAmount;

            processedCoupons.push({
              code: upperCode,
              discountPercentage: percentage,
              discountAmount: discountAmount,
            });
          }
        }
      }

      const finalPrice = Math.max(0, basePrice - totalDiscount);

      // 3. Construct vehicleName as required by schema
      const vehicleName = `${appointmentData.year} ${appointmentData.make} ${appointmentData.vehicleModel}`;

      const appointmentToSave = {
        ...appointmentData,
        vehicleName,
        basePrice,
        totalDiscount,
        totalPrice: finalPrice,
        coupons: processedCoupons,
        discountApplied: processedCoupons.length > 0,
        status: 'Pending'
      };

      const appointment = new Appointment(appointmentToSave);
      await appointment.save(); // Note: Model pre-save hook handles the combined 'address' field

      // 4. Emails
      try {
        const couponCodes = processedCoupons.map(c => c.code).join(', ');
        
        await sendEmail({
          to: appointmentData.email,
          subject: 'Global Integrated Support - Appointment Confirmation',
          html: getBookingConfirmationEmail({
            ...appointmentToSave,
            coupons: couponCodes || 'None',
          } as any),
        });

        await sendEmail({
          to: process.env.ADMIN_EMAIL || 'info@vornoxlab.com',
          subject: `New Booking: ${appointmentData.fullName}`,
          html: getAdminNotificationEmail({
            ...appointmentToSave,
            // Re-constructing address for admin readability in email
            address: `${appointmentData.streetAddress}, ${appointmentData.city}, ${appointmentData.state} ${appointmentData.zipCode}`,
          } as any),
        });
      } catch (e) {
        console.error('Email error:', e);
      }

      return res.status(201).json({ success: true, data: appointment });
    }

    // --- UPDATE (PUT) ---
    else if (req.method === 'PUT') {
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ success: false, message: 'Invalid ID' });
      }

      // If updating address or vehicle, we recalculate derived strings
      const updates = { ...req.body };
      if (updates.year && updates.make && updates.vehicleModel) {
        updates.vehicleName = `${updates.year} ${updates.make} ${updates.vehicleModel}`;
      }

      const appointment = await Appointment.findByIdAndUpdate(
        id,
        updates,
        { new: true, runValidators: true }
      );

      if (!appointment) {
        return res.status(404).json({ success: false, message: 'Not found' });
      }

      return res.status(200).json({ success: true, data: appointment });
    }

    // --- DELETE ---
    else if (req.method === 'DELETE') {
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ success: false, message: 'Invalid ID' });
      }

      const appointment = await Appointment.findByIdAndDelete(id);
      if (!appointment) {
        return res.status(404).json({ success: false, message: 'Not found' });
      }

      return res.status(200).json({ success: true, message: 'Deleted' });
    } 
    
    else {
      return res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Appointments error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}