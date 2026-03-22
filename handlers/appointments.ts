import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectDB } from '../config/database';
import { Appointment } from '../models/Appointment';
import { Coupon } from '../models/Coupon';
import { sendEmail, getBookingConfirmationEmail, getAdminNotificationEmail } from '../services/emailService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await connectDB();
  const { id } = req.query;

  try {
    if (req.method === 'GET') {
      const appointments = await Appointment.find().sort({ createdAt: -1 });
      return res.status(200).json({ success: true, data: appointments });
    } 

    else if (req.method === 'POST') {
      const data = req.body;

      // 1. Strict Validation
      const required = ['fullName', 'email', 'phone', 'streetAddress', 'city', 'state', 'zipCode', 'make', 'vehicleModel', 'year'];
      for (const field of required) {
        if (!data[field]) return res.status(400).json({ success: false, message: `Missing: ${field}` });
      }

      // 2. Pricing & Coupon Calculation
      let processedCoupons: any[] = [];
      let totalDiscount = 0;
      const basePrice = Number(data.basePrice) || 0;

      if (data.coupons && Array.isArray(data.coupons)) {
        const now = new Date();
        for (const c of data.coupons) {
          const code = c.code.toUpperCase();
          // Check DB or allow frontend's hardcoded promo
          let dbCoupon = await Coupon.findOne({ code, isActive: true, expiryDate: { $gt: now } });

          if (dbCoupon || code === 'FIRST10') {
            const pct = dbCoupon ? dbCoupon.discountPercentage : 10;
            const amount = (basePrice * pct) / 100;
            totalDiscount += amount;
            processedCoupons.push({ code, discountPercentage: pct, discountAmount: amount });
          }
        }
      }

      const finalPrice = Math.max(0, basePrice - totalDiscount);

      // 3. Create Appointment (Pre-save hook handles combined address/vehicleName)
      const appointment = new Appointment({
        ...data,
        basePrice,
        totalDiscount,
        totalPrice: finalPrice,
        coupons: processedCoupons,
        discountApplied: processedCoupons.length > 0,
        status: 'Pending'
      });

      await appointment.save();

      // 4. Send Synchronized Emails
      try {
        const fullAddress = `${data.streetAddress}${data.aptUnit ? ', ' + data.aptUnit : ''}, ${data.city}, ${data.state} ${data.zipCode}`;
        const vehicleDisplay = `${data.year} ${data.make} ${data.vehicleModel}`;

        await sendEmail({
          to: data.email,
          subject: 'Appointment Confirmed - Global Integrated Support',
          html: getBookingConfirmationEmail({
            ...data,
            totalPrice: finalPrice,
            basePrice,
            discount: totalDiscount,
            coupons: processedCoupons.map(cp => cp.code).join(', ') || 'None',
          } as any),
        });

        await sendEmail({
          to: process.env.ADMIN_EMAIL || 'info@vornoxlab.com',
          subject: `New Booking: ${data.fullName}`,
          html: getAdminNotificationEmail({
            ...data,
            vehicleName: vehicleDisplay,
            totalPrice: finalPrice,
            address: fullAddress,
          } as any),
        });
      } catch (err) { console.error('Email failed:', err); }

      return res.status(201).json({ success: true, data: appointment });
    }

    else if (req.method === 'PUT') {
      const updated = await Appointment.findByIdAndUpdate(id, req.body, { new: true });
      return res.status(200).json({ success: true, data: updated });
    }

    else if (req.method === 'DELETE') {
      await Appointment.findByIdAndDelete(id);
      return res.status(200).json({ success: true, message: 'Deleted' });
    }

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}