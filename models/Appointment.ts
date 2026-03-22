import mongoose from 'mongoose';

export interface CouponDetail {
  code: string;
  discountPercentage: number;
  discountAmount: number;
}

export interface IAppointment extends mongoose.Document {
  fullName: string;
  phone: string;
  email: string;
  streetAddress: string;
  aptUnit?: string;
  city: string;
  state: string;
  zipCode: string;
  address?: string; // Legacy combined string
  vehicleName: string; // Combined string
  make: string;
  vehicleModel: string;
  year: string;
  serviceType: string;
  vehicleCategory: string;
  date: string;
  timeSlot: string;
  promoCode?: string;
  coupons: CouponDetail[];
  basePrice: number;
  totalDiscount: number;
  discountApplied: boolean;
  totalPrice: number;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new mongoose.Schema<IAppointment>(
  {
    fullName: { type: String, required: [true, 'Full name is required'] },
    phone: { type: String, required: [true, 'Phone number is required'] },
    email: { type: String, required: [true, 'Email is required'], lowercase: true },
    streetAddress: { type: String, required: [true, 'Street address is required'] },
    aptUnit: { type: String, default: '' },
    city: { type: String, required: [true, 'City is required'] },
    state: { type: String, required: [true, 'State is required'] },
    zipCode: { type: String, required: [true, 'Zip code is required'] },
    address: { type: String, default: '' },
    vehicleName: { type: String, default: '' },
    make: { type: String, required: [true, 'Vehicle make is required'] },
    vehicleModel: { type: String, required: [true, 'Vehicle model is required'] },
    year: { type: String, required: [true, 'Vehicle year is required'] },
    serviceType: { type: String, required: [true, 'Service type is required'] },
    vehicleCategory: { type: String, required: [true, 'Vehicle category is required'] },
    date: { type: String, required: [true, 'Date is required'] },
    timeSlot: { type: String, required: [true, 'Time slot is required'] },
    promoCode: { type: String, default: '' },
    coupons: [
      {
        code: { type: String, required: true },
        discountPercentage: { type: Number, required: true },
        discountAmount: { type: Number, required: true },
      },
    ],
    basePrice: { type: Number, required: [true, 'Base price is required'] },
    totalDiscount: { type: Number, default: 0 },
    discountApplied: { type: Boolean, default: false },
    totalPrice: { type: Number, required: [true, 'Total price is required'] },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'],
      default: 'Pending',
    },
  },
  { timestamps: true }
);

// Pre-save middleware (Fixes the "next is not a function" error)
appointmentSchema.pre('save', function(next) {
  // 1. Compute Legacy Address
  if (this.streetAddress) {
    const addressParts = [
      this.streetAddress,
      this.aptUnit ? `Apt/Unit: ${this.aptUnit}` : '',
      this.city,
      this.state,
      this.zipCode
    ].filter(Boolean);
    this.address = addressParts.join(', ');
  }

  // 2. Compute Vehicle Name
  if (this.make && this.vehicleModel && this.year) {
    this.vehicleName = `${this.year} ${this.make} ${this.vehicleModel}`;
  }
  
  next();
});

export const Appointment = mongoose.models.Appointment || mongoose.model<IAppointment>('Appointment', appointmentSchema);