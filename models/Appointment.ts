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
  // New address fields
  streetAddress: string;
  aptUnit?: string;
  city: string;
  state: string;
  zipCode: string;
  // Legacy address field for backward compatibility
  address?: string;
  // Vehicle info (simplified - only make, model, year)
  vehicleName: string;
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
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
    },
    // New address fields
    streetAddress: {
      type: String,
      required: [true, 'Street address is required'],
    },
    aptUnit: {
      type: String,
      default: '',
    },
    city: {
      type: String,
      required: [true, 'City is required'],
    },
    state: {
      type: String,
      required: [true, 'State is required'],
    },
    zipCode: {
      type: String,
      required: [true, 'Zip code is required'],
    },
    // Legacy address field (kept for backward compatibility, auto-computed)
    address: {
      type: String,
      default: '',
    },
    vehicleName: {
      type: String,
    },
    make: {
      type: String,
      required: [true, 'Vehicle make is required'],
    },
    vehicleModel: {
      type: String,
      required: [true, 'Vehicle model is required'],
    },
    year: {
      type: String,
      required: [true, 'Vehicle year is required'],
    },
    serviceType: {
      type: String,
      required: [true, 'Service type is required'],
    },
    vehicleCategory: {
      type: String,
      required: [true, 'Vehicle category is required'],
    },
    date: {
      type: String,
      required: [true, 'Date is required'],
    },
    timeSlot: {
      type: String,
      required: [true, 'Time slot is required'],
    },
    promoCode: {
      type: String,
      default: '',
    },
    coupons: [
      {
        code: {
          type: String,
          required: true,
        },
        discountPercentage: {
          type: Number,
          required: true,
        },
        discountAmount: {
          type: Number,
          required: true,
        },
      },
    ],
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
    },
    totalDiscount: {
      type: Number,
      default: 0,
    },
    discountApplied: {
      type: Boolean,
      default: false,
    },
    totalPrice: {
      type: Number,
      required: [true, 'Total price is required'],
    },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'],
      default: 'Pending',
    },
  },
  { timestamps: true }
);

// Pre-save middleware to auto-compute legacy address field
appointmentSchema.pre('save', function(next) {
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
  next();
});

export const Appointment =
  mongoose.models.Appointment ||
  mongoose.model<IAppointment>('Appointment', appointmentSchema);
