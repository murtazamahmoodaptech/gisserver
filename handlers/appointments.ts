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
      const appointmentData = req.body;

      // 1. Validation
      const requiredFields = ['fullName', 'email', 'phone', 'streetAddress', 'city', 'state', 'zipCode', 'make', 'vehicleModel', 'year'];
      for (const field of requiredFields) {
        if (!appointmentData[field]) {
          return res.status(400).json({ success: false, message: `Missing field: ${field}` });
        }
      }

      // 2. Coupon & Pricing Logic
      let processedCoupons: any[] = [];
      let totalDiscount = 0;
      const basePrice = Number(appointmentData.basePrice) || 0;

      if (appointmentData.coupons && Array.isArray(appointmentData.coupons)) {
        const now = new Date();
        for (const couponData of appointmentData.coupons) {
          const upperCode = couponData.code.toUpperCase();
          let coupon = await Coupon.findOne({ code: upperCode, isActive: true, expiryDate: { $gt: now } });

          if (coupon || upperCode === 'FIRST10') {
            const percentage = coupon ? coupon.discountPercentage : 10;
            const amount = (basePrice * percentage) / 100;
            totalDiscount += amount;
            processedCoupons.push({ code: upperCode, discountPercentage: percentage, discountAmount: amount });
          }
        }
      }

      const finalPrice = Math.max(0, basePrice - totalDiscount);
      const vehicleName = `${appointmentData.year} ${appointmentData.make} ${appointmentData.vehicleModel}`;

      // 3. Save to DB
      const appointment = new Appointment({
        ...appointmentData,
        vehicleName,
        basePrice,
        totalDiscount,
        totalPrice: finalPrice,
        coupons: processedCoupons,
        discountApplied: processedCoupons.length > 0,
        status: 'Pending'
      });

      await appointment.save(); // This triggers the pre-save hook we fixed in Step 1

      // 4. Send Emails
      try {
        const couponCodes = processedCoupons.map(c => c.code).join(', ');
        const fullAddress = `${appointmentData.streetAddress}${appointmentData.aptUnit ? ', ' + appointmentData.aptUnit : ''}, ${appointmentData.city}, ${appointmentData.state} ${appointmentData.zipCode}`;

        // Customer Email
        await sendEmail({
          to: appointmentData.email,
          subject: 'Appointment Confirmed - Global Integrated Support',
          html: getBookingConfirmationEmail({
            fullName: appointmentData.fullName,
            serviceType: appointmentData.serviceType,
            date: appointmentData.date,
            timeSlot: appointmentData.timeSlot,
            totalPrice: finalPrice,
            basePrice: basePrice,
            discount: totalDiscount,
            coupons: couponCodes || 'None',
          } as any),
        });

        // Admin Email
        await sendEmail({
          to: process.env.ADMIN_EMAIL || 'info@vornoxlab.com',
          subject: `New Booking: ${appointmentData.fullName}`,
          html: getAdminNotificationEmail({
            fullName: appointmentData.fullName,
            phone: appointmentData.phone,
            email: appointmentData.email,
            serviceType: appointmentData.serviceType,
            date: appointmentData.date,
            timeSlot: appointmentData.timeSlot,
            vehicleName: vehicleName,
            totalPrice: finalPrice,
            address: fullAddress, // Send the combined address to admin
          } as any),
        });
      } catch (e) {
        console.error('Email error:', e);
      }

      return res.status(201).json({ success: true, data: appointment });
    }

    else if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ success: false, message: 'ID required' });
      
      const updates = { ...req.body };
      if (updates.year && updates.make && updates.vehicleModel) {
        updates.vehicleName = `${updates.year} ${updates.make} ${updates.vehicleModel}`;
      }

      const appointment = await Appointment.findByIdAndUpdate(id, updates, { new: true });
      return res.status(200).json({ success: true, data: appointment });
    }

    else if (req.method === 'DELETE') {
      await Appointment.findByIdAndDelete(id);
      return res.status(200).json({ success: true, message: 'Deleted' });
    }

  } catch (error) {
    console.error('Appointments error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}