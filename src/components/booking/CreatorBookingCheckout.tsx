import React, { useState } from 'react';
import { PayPalButtons } from '@paypal/react-paypal-js';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase'; // adjust path to your firebase config

export interface BookingProps {
  creatorId: string;
  creatorName: string;
  creatorPayeeEmail?: string; // or PayPal merchant ID
  clientId: string;
  clientName: string;
  className?: string;
  onSuccess?: (bookingId: string) => void;
}

export default function CreatorBookingCheckout({
  creatorId,
  creatorName,
  creatorPayeeEmail,
  clientId,
  clientName,
  className = '',
  onSuccess,
}: BookingProps) {
  const [packageType, setPackageType] = useState('mixtape_edit');
  const [gameDate, setGameDate] = useState('');
  const [venue, setVenue] = useState('');
  const [athleteName, setAthleteName] = useState('');
  const [isLocked, setIsLocked] = useState(false);

  // Pricing configuration
  const totalAmount = 150.00;
  const platformFee = 15.00; // Your automated platform take
  const creatorPayout = 135.00;

  return (
    <div 
      id="creator-booking-checkout-container"
      className={`bg-zinc-950 border border-zinc-800 rounded-2xl p-6 text-white max-w-lg mx-auto shadow-2xl mb-12 sm:mb-8 ${className}`}
    >
      <h3 id="creator-booking-checkout-title" className="text-xl font-bold text-teal-400 mb-2">
        Book Media Pro: {creatorName}
      </h3>
      <p id="creator-booking-checkout-subtitle" className="text-sm text-zinc-400 mb-6">
        Select your gameday coverage and lock in your creator.
      </p>

      {/* Logistics Inputs */}
      <div id="creator-booking-logistics-section" className="space-y-4 mb-6">
        <div>
          <label 
            htmlFor="booking-athlete-name-input" 
            className="block text-xs uppercase tracking-wider text-zinc-400 mb-1"
          >
            Target Athlete
          </label>
          <input
            id="booking-athlete-name-input"
            type="text"
            placeholder="e.g. Maya Robinson #12"
            value={athleteName}
            onChange={(e) => setAthleteName(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500 transition"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label 
              htmlFor="booking-game-date-input" 
              className="block text-xs uppercase tracking-wider text-zinc-400 mb-1"
            >
              Game Date
            </label>
            <input
              id="booking-game-date-input"
              type="date"
              value={gameDate}
              onChange={(e) => setGameDate(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500 transition cursor-pointer"
            />
          </div>
          <div>
            <label 
              htmlFor="booking-venue-input" 
              className="block text-xs uppercase tracking-wider text-zinc-400 mb-1"
            >
              Field / Venue
            </label>
            <input
              id="booking-venue-input"
              type="text"
              placeholder="e.g. Field 3, Main Turf"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500 transition"
            />
          </div>
        </div>

        {/* Pricing Summary */}
        <div 
          id="creator-booking-pricing-summary" 
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex justify-between items-center text-sm"
        >
          <div>
            <p className="font-semibold text-white">Full Game Mixtape Package</p>
            <p className="text-xs text-zinc-400">Includes 4K Raw + Edited 60s Reel</p>
          </div>
          <span id="creator-booking-total-amount" className="text-xl font-bold text-teal-400">
            ${totalAmount.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Confirmation State */}
      {isLocked ? (
        <div 
          id="creator-booking-confirmed-card" 
          className="p-4 bg-teal-950 border border-teal-500/40 rounded-xl text-center"
        >
          <p className="text-teal-400 font-bold text-base">Booking Locked & Confirmed!</p>
          <p className="text-xs text-zinc-300 mt-1">
            {creatorName} has received this booking. Game film will upload directly to your Athlete Vault once delivered.
          </p>
        </div>
      ) : (
        /* Live PayPal Buttons */
        <div id="creator-booking-paypal-container" className="w-full sticky bottom-0 z-50 pt-2 bg-zinc-950/95 backdrop-blur-md pb-2">
          <PayPalButtons
            style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'checkout' }}
            disabled={!athleteName || !gameDate || !venue}
            createOrder={(data: any, actions: any) => {
              return actions.order.create({
                intent: 'CAPTURE',
                purchase_units: [
                  {
                    description: `Just1Play Media Booking: ${athleteName} by ${creatorName}`,
                    amount: {
                      currency_code: 'USD',
                      value: totalAmount.toFixed(2),
                    },
                    // Metadata passed through to webhook
                    custom_id: `booking_${Date.now()}_${creatorId}`,
                  },
                ],
              });
            }}
            onApprove={async (data: any, actions: any) => {
              if (actions?.order) {
                const capture = await actions.order.capture();

                // Write directly to Firestore /bookings
                const docRef = await addDoc(collection(db, 'bookings'), {
                  creatorId,
                  creatorName,
                  clientId,
                  clientName,
                  athleteName,
                  gameDate,
                  venue,
                  packageType,
                  totalAmount,
                  platformFee,
                  creatorPayout,
                  status: 'confirmed',
                  paymentStatus: 'paid',
                  paypalOrderId: data.orderID,
                  paypalCaptureId: capture?.id || data.orderID,
                  deliveredDriveUrl: null,
                  createdAt: serverTimestamp(),
                });

                setIsLocked(true);
                if (onSuccess && docRef?.id) {
                  onSuccess(docRef.id);
                }
              }
            }}
          />
        </div>
      )}
    </div>
  );
}

export { CreatorBookingCheckout };
